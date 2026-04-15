// Mycelium Mode — delicate filigree threads grow outward like fungi under UV light.
// The network structure is the visual: thin branching filaments, not glowing blobs.
// Hue drifts from deep teal → pale aqua → soft violet over the scene's lifetime.
// Blinks trigger new bursts from center.
class MyceliumMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this.tips     = [];
        this.MAX_TIPS = 80;
    }

    startScene() {
        this.t    = 0;
        this.tips = [];
        this._seedTrunks(8);
    }

    onBlink() {
        this._seedTrunks(6);
    }

    _seedTrunks(count) {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        for (let i = 0; i < count; i++) {
            const baseAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            this._addTip(cx, cy, baseAngle, 0.9, 0);
        }
    }

    _addTip(x, y, angle, thickness, depth) {
        if (this.tips.length >= this.MAX_TIPS) return;
        this.tips.push({
            x, y,
            angle,
            drift:    0,
            thickness,
            depth,
            speed:    0.55 + Math.random() * 0.60,
            wPhase:   Math.random() * Math.PI * 2,
            wSpd:     0.025 + Math.random() * 0.040,
            wAmp:     0.018 + Math.random() * 0.035,
            age:      0,
            maxAge:   160 + Math.random() * 220,
        });
    }

    // Hue arc: teal → aqua → violet
    _tipHue(t, depth) {
        const base = t < 20
            ? 172 - (t / 20) * (172 - 190)
            : t < 45
                ? 190 + ((t - 20) / 25) * (270 - 190)
                : 270;
        return (base + depth * 8) % 360;
    }

    draw(t) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Very slow fade — let the network accumulate as drawn lines
        ctx.fillStyle = 'rgba(1, 2, 10, 0.012)';
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        const dead = [];
        for (let i = 0; i < this.tips.length; i++) {
            const tip = this.tips[i];
            tip.age++;
            tip.wPhase += tip.wSpd;

            // Gentle organic wander
            tip.drift += Math.sin(tip.wPhase) * tip.wAmp;
            tip.drift *= 0.88;
            const heading = tip.angle + tip.drift;

            const nx = tip.x + Math.cos(heading) * tip.speed;
            const ny = tip.y + Math.sin(heading) * tip.speed;

            const ageFade   = 1 - Math.min(1, tip.age / tip.maxAge);
            const depthFade = 1 / (1 + tip.depth * 0.55);
            const alpha     = 0.55 * depthFade * (ageFade * 0.45 + 0.55);

            const hue = this._tipHue(this.t, tip.depth);
            // Deeper branches get slightly cooler / lighter
            const sat = 55 + (1 - depthFade) * 20;
            const lit = 72 + tip.depth * 4;

            // Draw strand — NO shadowBlur; the line itself is the visual
            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${alpha})`;
            ctx.lineWidth   = tip.thickness;
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y);
            ctx.lineTo(nx, ny);
            ctx.stroke();

            // Tiny precise glow only at the living tip, shallow threads only
            if (tip.depth <= 1 && ageFade > 0.12) {
                const gR = 2.5 + tip.depth * 0.5;
                ctx.save();
                ctx.shadowColor = `hsla(${hue}, 90%, 88%, ${ageFade * 0.5 * depthFade})`;
                ctx.shadowBlur  = 5;
                ctx.fillStyle   = `hsla(${hue}, 80%, 90%, ${ageFade * 0.45 * depthFade})`;
                ctx.beginPath();
                ctx.arc(nx, ny, gR, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            tip.x = nx;
            tip.y = ny;

            // Branching — sparse, only shallow tips branch
            if (
                tip.age > 18 &&
                tip.depth < 5 &&
                this.tips.length < this.MAX_TIPS &&
                Math.random() < 0.005
            ) {
                const side = Math.random() > 0.5 ? 1 : -1;
                const bAng = heading + side * (0.22 + Math.random() * 0.45);
                this._addTip(tip.x, tip.y, bAng, tip.thickness * 0.55, tip.depth + 1);
            }

            if (nx < -10 || nx > W + 10 || ny < -10 || ny > H + 10 || tip.age > tip.maxAge) {
                dead.push(i);
            }
        }
        for (let i = dead.length - 1; i >= 0; i--) this.tips.splice(dead[i], 1);

        // ── Connection fibers: tips that wander close enough attract ──────────
        // When two growing threads nearly meet, a faint spanning fiber appears —
        // the moment of network closure.
        const connThresh = Math.min(W, H) * 0.040;
        ctx.lineCap = 'butt';
        for (let i = 0; i < this.tips.length - 1; i++) {
            const ti = this.tips[i];
            for (let j = i + 1; j < this.tips.length; j++) {
                const tj  = this.tips[j];
                const d   = Math.hypot(ti.x - tj.x, ti.y - tj.y);
                if (d < connThresh && d > 1) {
                    const f   = Math.pow(1 - d / connThresh, 1.5);
                    const hue = this._tipHue(this.t, Math.min(ti.depth, tj.depth));
                    ctx.strokeStyle = `hsla(${hue}, 62%, 82%, ${f * 0.11})`;
                    ctx.lineWidth   = 0.45;
                    ctx.beginPath();
                    ctx.moveTo(ti.x, ti.y);
                    ctx.lineTo(tj.x, tj.y);
                    ctx.stroke();
                }
            }
        }
        ctx.lineCap = 'round';

        // Re-seed when sparse
        if (this.tips.length < 6 && Math.random() < 0.04) this._seedTrunks(6);
    }
}
