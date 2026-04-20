// Lichtenberg Mode — electric discharge tree (dielectric breakdown).
// Branches grow fractally from the centre over ~12 seconds, then fade and regrow.
// Blink: instant full discharge explosion, then slow regrowth.
class LichtenbergMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._branches = [];   // { x1,y1,x2,y2, age, hue, alpha }
        this._tips     = [];   // active growing tips { x,y,angle,energy }
        this._phase    = 'grow';  // 'grow' | 'hold' | 'fade'
        this._holdT    = 0;
        this._flash    = 0;
        this._hue      = 220;
    }

    startScene() {
        this.t       = 0;
        this._flash  = 0;
        this._hue    = 200 + Math.random() * 80;
        this._reset();
    }

    _reset() {
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        this._branches = [];
        this._phase    = 'grow';
        this._holdT    = 0;
        // Start with 6 seed tips radiating outward
        this._tips = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
            this._tips.push({ x: cx, y: cy, angle, energy: 1.0 });
        }
    }

    onBlink() {
        this._flash = 1.0;
        this._hue   = (this._hue + 60 + Math.random() * 80) % 360;
        // Instant full discharge: spawn all remaining tips at max speed
        const W = this.canvas.width, H = this.canvas.height;
        const R = Math.min(W, H) * 0.48;
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = Math.random() * R * 0.5;
            const cx    = W / 2, cy = H / 2;
            this._tips.push({
                x:      cx + Math.cos(angle) * dist,
                y:      cy + Math.sin(angle) * dist,
                angle:  angle + (Math.random() - 0.5) * Math.PI,
                energy: 0.8 + Math.random() * 0.4,
            });
        }
        this._phase = 'grow';
    }

    _growTips() {
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const R  = Math.min(W, H) * 0.46;
        const MAX_BRANCHES = 1400;

        const STEPS_PER_FRAME = this._flash > 0 ? 80 : 12;
        const newTips = [];

        for (let s = 0; s < STEPS_PER_FRAME && this._tips.length > 0; s++) {
            if (this._branches.length >= MAX_BRANCHES) { this._tips = []; break; }

            // Pick a random active tip
            const idx = Math.floor(Math.random() * this._tips.length);
            const tip = this._tips[idx];

            // Grow segment
            const segLen = 4 + Math.random() * 10 * tip.energy;
            // Wander slightly off main angle
            const wander = (Math.random() - 0.5) * 0.7;
            const ang    = tip.angle + wander;

            const x2 = tip.x + Math.cos(ang) * segLen;
            const y2 = tip.y + Math.sin(ang) * segLen;

            const dx = x2 - cx, dy = y2 - cy;
            if (Math.sqrt(dx * dx + dy * dy) > R) {
                // This tip has hit the edge, kill it
                this._tips.splice(idx, 1);
                continue;
            }

            const hueShift = (this._hue + (1 - tip.energy) * 60) % 360;
            this._branches.push({
                x1: tip.x, y1: tip.y,
                x2, y2,
                age:   0,
                hue:   hueShift,
                alpha: 0.55 + tip.energy * 0.40,
                lw:    0.5 + tip.energy * 1.2,
            });

            // Advance tip
            tip.x     = x2;
            tip.y     = y2;
            tip.angle = ang;
            tip.energy *= 0.985;

            // Probabilistically branch
            const branchP = 0.06 * tip.energy;
            if (Math.random() < branchP && tip.energy > 0.15 && this._tips.length < 120) {
                const branchAng = ang + (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5);
                newTips.push({ x: x2, y: y2, angle: branchAng, energy: tip.energy * 0.75 });
            }

            // Kill very low energy tips
            if (tip.energy < 0.08 || Math.random() < 0.004) {
                this._tips.splice(idx, 1);
            }
        }
        this._tips.push(...newTips);
    }

    draw(time) {
        this.t += 0.016;
        this._flash = Math.max(0, this._flash - 0.016 * 1.6);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const fl = this._flash;

        ctx.fillStyle = 'rgba(0, 0, 4, 0.14)';
        ctx.fillRect(0, 0, W, H);

        // ── Phase logic ───────────────────────────────────────────
        if (this._phase === 'grow') {
            this._growTips();
            if (this._tips.length === 0 && this._branches.length > 0) {
                this._phase = 'hold';
                this._holdT = 0;
            }
        } else if (this._phase === 'hold') {
            this._holdT += 0.016;
            if (this._holdT > 4.0) this._phase = 'fade';
        } else {
            // Fade: reduce all alphas
            let allGone = true;
            for (const b of this._branches) {
                b.alpha -= 0.016 * 0.25;
                if (b.alpha > 0.01) allGone = false;
            }
            if (allGone) {
                this._hue = (this._hue + 40 + Math.random() * 60) % 360;
                this._reset();
            }
        }

        // ── Draw branches ─────────────────────────────────────────
        ctx.lineCap = 'round';
        for (const b of this._branches) {
            if (b.alpha <= 0) continue;
            const a = Math.max(0, b.alpha);
            // Outer glow
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2, b.y2);
            ctx.strokeStyle = `hsla(${b.hue}, 80%, 65%, ${a * 0.15})`;
            ctx.lineWidth   = b.lw * 5;
            ctx.stroke();
            // Core
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2, b.y2);
            ctx.strokeStyle = `hsla(${b.hue}, 90%, 85%, ${a})`;
            ctx.lineWidth   = b.lw;
            ctx.stroke();
        }

        // Active tip sparks
        if (this._phase === 'grow') {
            for (const tip of this._tips) {
                const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 8);
                g.addColorStop(0,   `hsla(${this._hue}, 100%, 95%, ${tip.energy * 0.80})`);
                g.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Flash
        if (fl > 0.02) {
            ctx.fillStyle = `hsla(${this._hue}, 70%, 70%, ${fl * 0.20})`;
            ctx.fillRect(0, 0, W, H);
        }

        // Vignette
        const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.20,W/2,H/2,Math.max(W,H)*0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,8,0.65)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
