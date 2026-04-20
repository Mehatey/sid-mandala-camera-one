// Localized liquid distortion effect - only affects geometry near cursor
class LiquidEffect {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.time = 0;
        this.isActive = false; // Track if actually affecting geometry
        this.resize();
    }

    resize() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    setMousePosition(x, y, centerX = null, centerY = null, maxRadius = null) {
        this.mouseX = x;
        this.mouseY = y;
        // Check if we're actually affecting geometry
        if (centerX !== null && centerY !== null && maxRadius !== null) {
            this.updateActiveState(centerX, centerY, maxRadius);
        } else {
            // Fallback: just check if in bounds
            this.isActive = (this.mouseX >= 0 && this.mouseY >= 0 && 
                            this.mouseX < this.width && this.mouseY < this.height);
        }
    }

    updateActiveState(centerX, centerY, actualRadius) {
        // Check if cursor is directly on mandala geometry - NO safety margin, extremely precise
        const wasActive = this.isActive;
        
        if (this.mouseX >= 0 && this.mouseY >= 0 && 
            this.mouseX < this.width && this.mouseY < this.height && actualRadius > 0) {
            // Check if cursor is within actual drawn mandala radius - precise, no margin
            const dx = this.mouseX - centerX;
            const dy = this.mouseY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Only active if cursor is directly on mandala (within actual radius)
            // No safety margin - extremely direct reactive
            // The 150px influence radius is for visual effect only, not sound detection
            this.isActive = dist <= actualRadius;
        } else {
            this.isActive = false;
        }
        
        // Return true if state changed
        return wasActive !== this.isActive;
    }

    isLiquifying() {
        return this.isActive;
    }

    // Get displacement for a point based on distance from cursor
    getDisplacement(px, py) {
        if (!this.isActive) {
            return { dx: 0, dy: 0 };
        }

        const dx = px - this.mouseX;
        const dy = py - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Influence radius - only affect points within this distance
        const influenceRadius = 150;
        
        if (dist > influenceRadius || dist === 0) {
            return { dx: 0, dy: 0 };
        }

        // Calculate strength based on distance (stronger when closer)
        const strength = 1 - (dist / influenceRadius);
        const powerStrength = Math.pow(strength, 1.5); // More localized effect
        
        // Create a push/pull effect - points are pushed away from cursor
        const angle = Math.atan2(dy, dx);
        const pushDistance = 30 * powerStrength; // Maximum displacement
        
        // Add some wave motion for fluidity
        this.time += 0.1;
        const wave = Math.sin(this.time + dist * 0.1) * 0.3 + 0.7;
        const finalDistance = pushDistance * wave;
        
        return {
            dx: Math.cos(angle) * finalDistance,
            dy: Math.sin(angle) * finalDistance
        };
    }

    // Apply displacement to a point
    displacePoint(px, py) {
        const disp = this.getDisplacement(px, py);
        return {
            x: px + disp.dx,
            y: py + disp.dy
        };
    }
}
