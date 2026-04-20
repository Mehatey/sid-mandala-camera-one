// Coral Mode — branching reef grows upward from the sea floor.
// L-system style growth: each tip branches probabilistically.
// Colours shift from deep root to bright coral tip.
// Blink: growth surge — all tips extend rapidly and a new colony seeds.
class CoralMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._branches = [];   // { x1,y1,x2,y2, gen, hue, alpha, lw }
        this._tips     = [];   // active growing tips
        this._surge    = 0;
        this._off      = null;
        this._offCtx   = null;
    }

    startScene() {
        this.t     = 0;
        this._surge = 0;
        this._branches = [];
        this._tips     = [];
        this._initOff();
        // Seed 3–5 starter colonies along the bottom
        const W = this.canvas.width, H = this.canvas.height;
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
            const x = W * (0.15 + (i / (n - 1)) * 0.70 + (Math.random() - 0.5) * 0.08);
            const y = H * 0.92;
            this._tips.push({
                x, y,
                angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.3,
                gen: 0,
                hue: 10 + Math.random() * 30,
                energy: 1.0,
                len: 8 + Math.random() * 8,
            });
        }
    }

    _initOff() {
        const W = this.canvas.width, H = this.canvas.height;
        if (!this._off) this._off = document.createElement('canvas');
        this._off.width  = W;
        this._off.height = H;
        this._offCtx = this._off.getContext('2d');
        this._offCtx.clearRect(0, 0, W, H);
    }

    onBlink() {
        this._surge = 1.0;
        const W = this.canvas.width, H = this.canvas.height;
        // Seed a new mini-colony at a random bottom position
        const x = W * (0.1 + Math.random() * 0.8);
        const y = H * 0.92;
        this._tips.push({
            x, y,
            angle:  -Math.PI / 2 + (Math.random() - 0.5) * 0.4,
            gen:    0,
            hue:    10 + Math.random() * 40,
            energy: 1.0,
            len:    10,
        });
    }

    draw(time) {
        this.t += 0.016;
        this._surge = Math.max(0, this._surge - 0.016 * 1.0);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const t  = this.t;

        // Underwater background
        ctx.fillStyle = 'rgba(0, 8, 18, 0.14)';
        ctx.fillRect(0, 0, W, H);

        // Caustic shimmer near top
        const caust = ctx.createLinearGradient(0, 0, 0, H * 0.4);
        caust.addColorStop(0, `rgba(10, 40, 80, ${0.06 + 0.02 * Math.sin(t * 0.4)})`);
        caust.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = caust;
        ctx.fillRect(0, 0, W, H * 0.4);

        // ── Grow tips ─────────────────────────────────────────────
        const STEPS = this._surge > 0 ? 6 : 2;
        const maxBranches = 3000;
        const newTips = [];

        for (let s = 0; s < STEPS; s++) {
            if (this._tips.length === 0) break;
            if (this._branches.length >= maxBranches) break;

            const idx = Math.floor(Math.random() * this._tips.length);
            const tip = this._tips[idx];

            // Grow one segment
            const sway   = (Math.random() - 0.5) * 0.25;
            const angle  = tip.angle + sway;
            const segLen = tip.len * (0.88 + Math.random() * 0.24);

            const x2 = tip.x + Math.cos(angle) * segLen;
            const y2 = tip.y + Math.sin(angle) * segLen;

            if (y2 < H * 0.04 || x2 < 0 || x2 > W) {
                this._tips.splice(idx, 1); continue;
            }

            const gen    = tip.gen;
            const genFrac = Math.min(1, gen / 12);
            const hue    = tip.hue + genFrac * 25;
            const sat    = 55 + genFrac * 30;
            const lum    = 22 + genFrac * 42;
            const lw     = Math.max(0.4, 3.5 - gen * 0.25);

            // Paint to off-canvas
            const ctx2 = this._offCtx;
            ctx2.beginPath();
            ctx2.moveTo(tip.x, tip.y);
            ctx2.lineTo(x2, y2);
            ctx2.strokeStyle = `hsla(${hue}, ${sat}%, ${lum}%, 0.80)`;
            ctx2.lineWidth   = lw;
            ctx2.lineCap     = 'round';
            ctx2.stroke();

            // Also store for sparkle overlay
            this._branches.push({ x2, y2, hue, gen, lw });

            tip.x     = x2;
            tip.y     = y2;
            tip.angle = angle;
            tip.gen++;
            tip.len  *= 0.96;
            tip.energy *= 0.992;

            // Branch
            const branchP = 0.08 - gen * 0.003;
            if (Math.random() < Math.max(0.01, branchP) && gen < 18) {
                const bAng = angle + (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
                newTips.push({
                    x: x2, y: y2,
                    angle: bAng,
                    gen: gen + 1,
                    hue: tip.hue,
                    energy: tip.energy * 0.85,
                    len: tip.len * 0.85,
                });
            }

            if (tip.energy < 0.06 || tip.len < 1.5) {
                this._tips.splice(idx, 1);
            }
        }
        this._tips.push(...newTips);

        // Draw coral static layer
        ctx.drawImage(this._off, 0, 0);

        // ── Ambient particles (tiny bubbles rising) ────────────────
        if (!this._bubbles) {
            this._bubbles = [];
            for (let i = 0; i < 40; i++) {
                this._bubbles.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.0, vy: -(0.2 + Math.random() * 0.5) });
            }
        }
        for (const b of this._bubbles) {
            b.y += b.vy;
            b.x += Math.sin(t * 0.8 + b.r * 10) * 0.3;
            if (b.y < -5) { b.y = H + 5; b.x = Math.random() * W; }
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(140, 200, 220, 0.18)`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
        }

        // Tip glow
        for (const tip of this._tips) {
            const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 5);
            g.addColorStop(0,   `hsla(${tip.hue + 20}, 80%, 75%, 0.40)`);
            g.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Vignette
        const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.22,W/2,H/2,Math.max(W,H)*0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,6,18,0.65)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
