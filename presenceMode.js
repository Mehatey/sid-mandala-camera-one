// Presence Mode — gaze-driven particle attractor.
// Particles are drawn toward wherever you look, forming a living constellation.
// When gaze is still, particles settle into orbits. Blink scatters them.
class PresenceMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._particles = [];
        this._gazeX = null;
        this._gazeY = null;
        this._lastGaze = -999;
        this._scatter = 0;
        this._MAX_P = 280;
    }

    startScene() {
        this.t = 0;
        this._scatter = 0;
        this._gazeX = null;
        this._gazeY = null;
        this._lastGaze = -999;
        this._particles = [];
        const W = this.canvas.width, H = this.canvas.height;
        for (let i = 0; i < 140; i++) {
            this._spawnRandom(W, H, true);
        }
    }

    onGaze(nx, ny) {
        this._gazeX = nx * this.canvas.width;
        this._gazeY = ny * this.canvas.height;
        this._lastGaze = this.t;
    }

    onBlink() {
        this._scatter = 1.0;
    }

    _spawnRandom(W, H, initial = false) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = 60 + Math.random() * Math.min(W, H) * 0.38;
        const cx    = W / 2, cy = H / 2;
        this._particles.push({
            x:    cx + Math.cos(angle) * dist,
            y:    cy + Math.sin(angle) * dist,
            vx:   (Math.random() - 0.5) * 0.8,
            vy:   (Math.random() - 0.5) * 0.8,
            hue:  160 + Math.random() * 120,
            size: 1.0 + Math.random() * 2.2,
            alpha: 0.4 + Math.random() * 0.5,
            life: initial ? Math.random() * 8 : 0,
            maxLife: 10 + Math.random() * 12,
        });
    }

    draw(time) {
        this.t += 0.016;
        this._scatter = Math.max(0, this._scatter - 0.016 * 1.5);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;

        // Fade background
        ctx.fillStyle = 'rgba(0, 2, 6, 0.09)';
        ctx.fillRect(0, 0, W, H);

        // Gaze fades out after 1.5s of no movement
        const gazeAge = this.t - this._lastGaze;
        const gazeFade = gazeAge < 0.3 ? 1 : Math.max(0, 1 - (gazeAge - 0.3) / 1.2);
        const targX = this._gazeX !== null ? this._gazeX : cx;
        const targY = this._gazeY !== null ? this._gazeY : cy;

        // Gaze reticle
        if (gazeFade > 0.05) {
            ctx.save();
            ctx.globalAlpha = gazeFade * 0.35;
            ctx.strokeStyle = 'rgba(140, 220, 255, 1)';
            ctx.lineWidth   = 1.0;
            ctx.beginPath();
            ctx.arc(targX, targY, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(targX, targY, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(180, 240, 255, 1)';
            ctx.fill();
            ctx.restore();
        }

        // Spawn trickle
        if (this._particles.length < this._MAX_P && Math.random() < 0.55) {
            this._spawnRandom(W, H);
        }

        const sc = this._scatter;

        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life += 0.016;
            if (p.life > p.maxLife) { this._particles.splice(i, 1); continue; }

            const lr  = p.life / p.maxLife;
            const env = lr < 0.1 ? lr / 0.1 : Math.max(0, 1 - Math.pow((lr - 0.1) / 0.9, 0.7));

            // Attraction toward gaze target
            const dx = targX - p.x;
            const dy = targY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            const force = (gazeFade * 0.012 * (1 - sc * 0.7)) / (1 + dist * 0.003);
            p.vx += dx / dist * force;
            p.vy += dy / dist * force;

            // Scatter impulse on blink
            if (sc > 0.02) {
                const sdx = p.x - cx, sdy = p.y - cy;
                const sd = Math.sqrt(sdx * sdx + sdy * sdy) + 1;
                p.vx += (sdx / sd) * sc * 3.5;
                p.vy += (sdy / sd) * sc * 3.5;
            }

            // Tangential swirl
            const orbitSpeed = 0.0004;
            p.vx += -dy / (dist + 1) * orbitSpeed * dist;
            p.vy +=  dx / (dist + 1) * orbitSpeed * dist;

            p.vx *= 0.972;
            p.vy *= 0.972;
            p.x  += p.vx;
            p.y  += p.vy;

            const a  = p.alpha * env;
            const sz = p.size;

            // Glow
            ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${a * 0.08})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, sz * 8, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${p.hue}, 95%, 82%, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.4, sz), 0, Math.PI * 2);
            ctx.fill();
        }

        // Connective threads between nearby particles
        ctx.save();
        for (let i = 0; i < this._particles.length; i++) {
            const p = this._particles[i];
            for (let j = i + 1; j < this._particles.length; j++) {
                const q = this._particles[j];
                const dx = p.x - q.x, dy = p.y - q.y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (d < 55) {
                    const lrP = p.life / p.maxLife;
                    const lrQ = q.life / q.maxLife;
                    const envP = lrP < 0.1 ? lrP / 0.1 : Math.max(0, 1 - Math.pow((lrP - 0.1) / 0.9, 0.7));
                    const envQ = lrQ < 0.1 ? lrQ / 0.1 : Math.max(0, 1 - Math.pow((lrQ - 0.1) / 0.9, 0.7));
                    const a   = (1 - d / 55) * 0.10 * envP * envQ;
                    ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2}, 80%, 75%, ${a})`;
                    ctx.lineWidth   = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }
}
