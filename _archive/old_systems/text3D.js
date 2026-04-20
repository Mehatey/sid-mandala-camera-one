// Interactive Text with separated, pushable letters
class Text3D {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.letters = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.isDragging = false;
        this.draggedLetter = null;
        this.resize();
        this.setupInteraction();
    }

    resize() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    setupInteraction() {
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.updateLetterInteraction();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.checkLetterClick(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.draggedLetter = null;
        });
    }

    checkLetterClick(x, y) {
        for (let letter of this.letters) {
            const dx = x - letter.x;
            const dy = y - letter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < letter.radius) {
                this.isDragging = true;
                this.draggedLetter = letter;
                break;
            }
        }
    }

    updateLetterInteraction() {
        if (this.isDragging && this.draggedLetter) {
            const dx = this.mouseX - this.draggedLetter.x;
            const dy = this.mouseY - this.draggedLetter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const force = Math.min(dist * 0.15, 8);
                this.draggedLetter.vx += (dx / dist) * force * 0.15;
                this.draggedLetter.vy += (dy / dist) * force * 0.15;
            }
        }

        // Apply repulsion from mouse for non-dragged letters - push them away
        for (let letter of this.letters) {
            if (letter !== this.draggedLetter) {
                const dx = letter.x - this.mouseX;
                const dy = letter.y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120 && dist > 0) {
                    const force = (120 - dist) / 120;
                    letter.vx += (dx / dist) * force * 0.08;
                    letter.vy += (dy / dist) * force * 0.08;
                }
            }
        }
    }

    drawInteractive(text, time, mandalaX, mandalaY, foldCount) {
        const ctx = this.ctx;
        
        // Clear with transparency
        ctx.clearRect(0, 0, this.width, this.height);

        if (foldCount === 0) return;

        // Initialize letters if needed
        if (this.letters.length === 0) {
            this.initializeLetters(text, mandalaX, mandalaY);
        }

        // Calculate orbit parameters
        const orbitRadius = Math.min(this.width, this.height) * 0.35 + foldCount * 8;
        const orbitSpeed = 0.25;
        const orbitAngle = time * orbitSpeed;
        const orbitX = Math.cos(orbitAngle);
        const orbitY = Math.sin(orbitAngle);
        const orbitZ = Math.sin(orbitAngle * 2) * 0.5;

        // Update letter positions
        const centerX = mandalaX + orbitX * orbitRadius;
        const centerY = mandalaY + orbitY * orbitRadius;
        
        // Update letters
        for (let i = 0; i < this.letters.length; i++) {
            const letter = this.letters[i];
            
            // Target position in orbit - more separated
            const angle = (Math.PI * 2 / this.letters.length) * i + orbitAngle;
            const separation = 90 + Math.sin(time * 0.5 + i) * 20; // More separation, animated
            const targetX = centerX + Math.cos(angle) * separation;
            const targetY = centerY + Math.sin(angle) * separation;

            // Spring to target (weaker spring for more freedom)
            const dx = targetX - letter.x;
            const dy = targetY - letter.y;
            letter.vx += dx * 0.015;
            letter.vy += dy * 0.015;

            // Apply velocity
            letter.x += letter.vx;
            letter.y += letter.vy;

            // Lighter damping for more fluid movement
            letter.vx *= 0.97;
            letter.vy *= 0.97;

            // Repulsion between letters - stronger for better separation
            for (let j = i + 1; j < this.letters.length; j++) {
                const other = this.letters[j];
                const dx = letter.x - other.x;
                const dy = letter.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 60 && dist > 0) {
                    const force = (60 - dist) / 60;
                    const fx = (dx / dist) * force * 0.8;
                    const fy = (dy / dist) * force * 0.8;
                    letter.vx += fx;
                    letter.vy += fy;
                    other.vx -= fx;
                    other.vy -= fy;
                }
            }
        }

        // Draw letters with 3D effect
        for (let i = 0; i < this.letters.length; i++) {
            const letter = this.letters[i];
            const depth = orbitZ * 0.3;
            const scale = 1 + depth * 0.2;
            const fontSize = 48 * scale;

            ctx.font = `${fontSize}px 'Crimson Text', serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw 3D layers - more dramatic depth
            const layers = 15;
            for (let j = layers; j >= 0; j--) {
                const layerProgress = j / layers;
                const offsetZ = layerProgress * 20;
                const alpha = 0.15 + layerProgress * 0.85;
                
                // More pronounced 3D offset
                const textRotation = orbitAngle + Math.PI / 2;
                const offsetX = -Math.sin(textRotation) * offsetZ * 0.5;
                const offsetY = Math.cos(textRotation) * offsetZ * 0.5;

                // Color shifts based on orbit
                const hue = (orbitAngle * 180 / Math.PI + i * 40 + j * 3) % 360;
                const r = 180 + Math.sin(hue * Math.PI / 180) * 75;
                const g = 200 + Math.sin((hue + 120) * Math.PI / 180) * 55;
                const b = 240 + Math.sin((hue + 240) * Math.PI / 180) * 15;

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.shadowBlur = 10 - layerProgress * 8;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.7)`;

                ctx.save();
                ctx.translate(letter.x + offsetX, letter.y + offsetY);
                
                // Rotation based on orbit
                ctx.rotate(textRotation * 0.1);
                
                const layerScale = 1 - offsetZ / 20 * 0.25;
                ctx.scale(layerScale, layerScale);
                ctx.fillText(letter.char, 0, 0);
                ctx.restore();
            }

            // Front layer with bright glow
            ctx.fillStyle = `rgba(255, 255, 255, 0.98)`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
            ctx.save();
            ctx.translate(letter.x, letter.y);
            ctx.rotate((orbitAngle + Math.PI / 2) * 0.1);
            ctx.fillText(letter.char, 0, 0);
            ctx.restore();
            ctx.shadowBlur = 0;
        }
    }

    initializeLetters(text, centerX, centerY) {
        this.letters = [];
        for (let i = 0; i < text.length; i++) {
            const angle = (Math.PI * 2 / text.length) * i;
            // Start with more separation
            this.letters.push({
                char: text[i],
                x: centerX + Math.cos(angle) * 120,
                y: centerY + Math.sin(angle) * 120,
                vx: 0,
                vy: 0,
                radius: 30 // Larger interaction radius
            });
        }
    }
}
