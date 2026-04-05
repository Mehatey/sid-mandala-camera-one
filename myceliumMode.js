// Mycelium Mode — organic neural threads grow from the centre outward.
// Branching is probabilistic and fractal. The network shifts hue as time passes:
// phosphorescent teal → amber → deep magenta — like watching a fungal network age.
// Blinks trigger explosive radial bursts from the centre.
class MyceliumMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this.tips     = [];
        this.MAX_TIPS = 72;
    }

    startScene() {
        this.t    = 0;
        this.tips = [];
        this._seedTrunks(10);
    }

    onBlink() {
        this._seedTrunks(13);
    }

    _seedTrunks(count) {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        for (let i = 0; i < count; i++) {
            const baseAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
            this._addTip(cx, cy, baseAngle, 2.6, 0);
        }
    }

    _addTip(x, y, angle, thickness, depth) {
        if (this.tips.length >= this.MAX_TIPS) return;
        this.tips.push({
            x, y,
            angle,
            drift:       0,                          // cumulative angular drift
            thickness,
            depth,
            speed:       0.55 + Math.random() * 0.65,
            wPhase:      Math.random() * Math.PI * 2,
            wSpd:        0.038 + Math.random() * 0.058,
            wAmp:        0.036 + Math.random() * 0.062,
            age:         0,
            maxAge:      110 + Math.random() * 160,
        });
    }

    // Global hue shifts across the full scene timeline
    _tipHue(t, depth) {
        // 0–20s: teal (162°), 20–45s: amber (38°), 45s+: magenta (310°)
        const base = t < 20
            ? 162 - (t / 20) * (162 - 38)         // teal → amber
            : t < 45
                ? 38  + ((t - 20) / 25) * (310 - 38) // amber → magenta
                : 310;
        return (base + depth * 12) % 360;
    }

    draw(t) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Very slow fade — network persists, older strands ghost into the background
        ctx.fillStyle = 'rgba(2, 4, 14, 0.018)';
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap = 'round';

        const dead = [];
        for (let i = 0; i < this.tips.length; i++) {
            const tip = this.tips[i];
            tip.age++;
            tip.wPhase += tip.wSpd;

            // Organic curvature: sine drift, slowly returns to original direction
            tip.drift += Math.sin(tip.wPhase) * tip.wAmp;
            tip.drift *= 0.93;
            const heading = tip.angle + tip.drift;

            const nx = tip.x + Math.cos(heading) * tip.speed;
            const ny = tip.y + Math.sin(heading) * tip.speed;

            // Per-segment visuals
            const depthFade = 1 / (1 + tip.depth * 0.48);
            const ageFade   = 1 - Math.min(1, tip.age / tip.maxAge);
            const alpha     = 0.58 * depthFade * (ageFade * 0.55 + 0.45);
            const hue       = this._tipHue(this.t, tip.depth);
            const sat       = 78 + ageFade * 18;
            const lit       = 48 + ageFade * 24;

            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${alpha})`;
            ctx.lineWidth   = tip.thickness * (0.42 + ageFade * 0.58);
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y);
            ctx.lineTo(nx, ny);
            ctx.stroke();

            // Phosphorescent tip glow
            const gR = tip.thickness * (3.2 - tip.depth * 0.35);
            if (gR > 0.5 && ageFade > 0.10) {
                const tg = ctx.createRadialGradient(nx, ny, 0, nx, ny, gR * 3.0);
                tg.addColorStop(0, `hsla(${(hue + 20) % 360}, 100%, 86%, ${ageFade * 0.52 * depthFade})`);
                tg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = tg;
                ctx.beginPath();
                ctx.arc(nx, ny, gR * 3.0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Spore drift: tiny particles shed from tips
            if (tip.age % 18 === 0 && Math.random() < 0.35 && tip.depth <= 2) {
                const sR    = 0.6 + Math.random() * 1.2;
                const sOff  = (Math.random() - 0.5) * tip.thickness * 4;
                const sPx   = nx + Math.cos(heading + Math.PI/2) * sOff;
                const sPy   = ny + Math.sin(heading + Math.PI/2) * sOff;
                ctx.beginPath();
                ctx.arc(sPx, sPy, sR, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${ageFade * 0.30})`;
                ctx.fill();
            }

            tip.x = nx;
            tip.y = ny;

            // Probabilistic branch — deeper branches are finer
            if (
                tip.age > 18 &&
                tip.depth < 6 &&
                this.tips.length < this.MAX_TIPS &&
                Math.random() < 0.0050
            ) {
                const side = Math.random() > 0.5 ? 1 : -1;
                const bAng = heading + side * (0.24 + Math.random() * 0.46);
                this._addTip(tip.x, tip.y, bAng, tip.thickness * 0.64, tip.depth + 1);
            }

            if (nx < -8 || nx > W + 8 || ny < -8 || ny > H + 8 || tip.age > tip.maxAge) {
                dead.push(i);
            }
        }
        for (let i = dead.length - 1; i >= 0; i--) this.tips.splice(dead[i], 1);

        // Re-seed from centre when canvas goes sparse
        if (this.tips.length < 7 && Math.random() < 0.040) this._seedTrunks(6);
    }
}
