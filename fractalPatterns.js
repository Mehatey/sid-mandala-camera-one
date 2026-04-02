// Three Distinct Fractal Styles
class FractalPatterns {
    constructor(ctx, colorSystem) {
        this.ctx = ctx;
        this.colorSystem = colorSystem;
        this.time = 0;
    }

    update(deltaTime) {
        this.time += deltaTime;
    }

    // STYLE 1: Mandelbrot Set - Mathematical, point-based
    drawMandelbrot(x, y, size, depth, maxDepth, colorMode, intensity, z = 0) {
        if (depth > maxDepth || size < 3) return;

        const iterations = 60;
        const zoom = 1 + depth * 0.3;
        const offsetX = (x - this.ctx.canvas.width / 2) * 0.0001 * zoom;
        const offsetY = (y - this.ctx.canvas.height / 2) * 0.0001 * zoom;
        const step = Math.max(2, size / 25);

        const points = [];

        for (let px = -size; px < size; px += step) {
            for (let py = -size; py < size; py += step) {
                const cx = offsetX + px * 0.0004 * zoom;
                const cy = offsetY + py * 0.0004 * zoom;
                
                let zx = 0;
                let zy = 0;
                let iter = 0;

                while (iter < iterations && (zx * zx + zy * zy) < 4) {
                    const tmp = zx * zx - zy * zy + cx;
                    zy = 2 * zx * zy + cy;
                    zx = tmp;
                    iter++;
                }

                if (iter < iterations) {
                    const t = iter / iterations;
                    const color = this.colorSystem.getColor(
                        x + px, y + py, z + t * 0.3, colorMode, intensity
                    );
                    color.alpha = 0.4 + t * 0.6;
                    
                    points.push({
                        x: x + px,
                        y: y + py,
                        color: this.colorSystem.toRGBA(color),
                        size: 1.5 + t * 2.5
                    });
                }
            }
        }

        // Draw points with glow
        points.forEach(point => {
            this.ctx.fillStyle = point.color;
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = point.color;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.shadowBlur = 0;

        // Recursive mini Mandelbrots
        if (depth < maxDepth && size > 15) {
            const branchCount = 2;
            for (let i = 0; i < branchCount; i++) {
                const angle = (Math.PI * 2 / branchCount) * i + this.time * 0.15;
                const dist = size * 0.5;
                this.drawMandelbrot(
                    x + Math.cos(angle) * dist,
                    y + Math.sin(angle) * dist,
                    size * 0.4, depth + 1, maxDepth,
                    colorMode, intensity * 0.8, z + 0.2
                );
            }
        }
    }

    // STYLE 2: Branching Tree - Organic, line-based
    drawBranchingTree(x, y, length, angle, depth, maxDepth, colorMode, intensity, z = 0) {
        if (depth > maxDepth || length < 2) return;

        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        // Draw branch with thickness based on depth
        const thickness = (maxDepth - depth + 1) * 2.5;
        const color = this.colorSystem.getColor(x, y, z, colorMode, intensity);
        
        this.ctx.strokeStyle = this.colorSystem.toRGBA(color);
        this.ctx.lineWidth = thickness;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.colorSystem.toRGBA(color);

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        
        // Add slight curve
        const midX = (x + endX) / 2 + Math.sin(angle + Math.PI / 2) * length * 0.1;
        const midY = (y + endY) / 2 + Math.cos(angle + Math.PI / 2) * length * 0.1;
        this.ctx.quadraticCurveTo(midX, midY, endX, endY);
        
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Branch recursively
        if (depth < maxDepth && length > 5) {
            const branchAngle1 = angle - Math.PI / 5 + Math.sin(this.time + depth) * 0.3;
            const branchAngle2 = angle + Math.PI / 5 + Math.cos(this.time + depth) * 0.3;
            const branchLength = length * (0.65 + Math.sin(this.time * 0.5) * 0.15);

            this.drawBranchingTree(
                endX, endY, branchLength, branchAngle1,
                depth + 1, maxDepth, colorMode, intensity, z + 0.1
            );
            this.drawBranchingTree(
                endX, endY, branchLength, branchAngle2,
                depth + 1, maxDepth, colorMode, intensity, z + 0.1
            );
        }
    }

    // STYLE 3: Particle Swirl - Dynamic, flowing particles
    drawParticleSwirl(x, y, radius, particleCount, rotation, colorMode, intensity, z = 0) {
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i + rotation;
            const dist = radius * (0.3 + Math.sin(this.time * 2 + i * 0.1) * 0.7);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            
            // Create trailing effect
            const trailLength = 5;
            for (let t = 0; t < trailLength; t++) {
                const trailAngle = angle - t * 0.1;
                const trailDist = dist * (1 - t * 0.15);
                const trailX = x + Math.cos(trailAngle) * trailDist;
                const trailY = y + Math.sin(trailAngle) * trailDist;
                
                const color = this.colorSystem.getColor(
                    trailX, trailY, z + t * 0.05, colorMode, intensity
                );
                color.alpha = (1 - t / trailLength) * 0.8;
                
                particles.push({
                    x: trailX,
                    y: trailY,
                    color: this.colorSystem.toRGBA(color),
                    size: 2 + Math.sin(this.time + i) * 1.5
                });
            }
        }

        // Draw particles
        particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.shadowBlur = 0;

        // Inner swirl
        if (radius > 20) {
            this.drawParticleSwirl(
                x, y, radius * 0.6, Math.floor(particleCount * 0.7),
                rotation * -1.5, colorMode, intensity * 0.8, z + 0.2
            );
        }
    }
}
