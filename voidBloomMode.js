// Void Bloom — 7-fold near-black mandala with deep violet/crimson accents.
// Petals emerge from darkness like ink spreading in water.
// Blink: a void pulse — everything dims then flares back with dark color.
class VoidBloomMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._pulse = 0;
        this._rings = [];
    }

    startScene() {
        this.t      = 0;
        this._pulse = 0;
        this._rings = [];
    }

    onBlink() {
        this._pulse = 1.0;
        const S = Math.min(this.canvas.width, this.canvas.height);
        this._rings.push({ r: S * 0.03, maxR: S * 0.48, a: 0.55 });
        this._rings.push({ r: S * 0.10, maxR: S * 0.38, a: 0.35 });
    }

    draw(time) {
        this.t += 0.016;
        this._pulse = Math.max(0, this._pulse - 0.016 * 1.0);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.41;
        const pu = this._pulse;

        // Very dark background — near-black with subtle dark purple
        ctx.fillStyle = 'rgba(2, 0, 4, 0.12)';
        ctx.fillRect(0, 0, W, H);

        const FOLDS = 7;

        ctx.save();
        ctx.translate(cx, cy);

        // ── Outer void petals (slow rotation, heavy shadow look) ────────
        for (let i = 0; i < FOLDS; i++) {
            const angle  = (i / FOLDS) * Math.PI * 2 + t * 0.008;
            const spread = R * (0.75 + pu * 0.14 + 0.04 * Math.sin(t * 0.7 + i));

            ctx.save();
            ctx.rotate(angle);

            const bw = R * 0.19;
            ctx.beginPath();
            ctx.moveTo(R * 0.13, 0);
            ctx.bezierCurveTo(spread * 0.30, bw, spread * 0.65, bw * 0.7, spread, 0);
            ctx.bezierCurveTo(spread * 0.65, -bw * 0.7, spread * 0.30, -bw, R * 0.13, 0);
            ctx.closePath();

            const pg = ctx.createLinearGradient(R * 0.13, 0, spread, 0);
            pg.addColorStop(0,   `rgba(80,  0,  120, ${0.50 + pu * 0.20})`);
            pg.addColorStop(0.35,`rgba(100, 5,  90,  ${0.35 + pu * 0.12})`);
            pg.addColorStop(0.70,`rgba(60,  0,  40,  ${0.22})`);
            pg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = pg;
            ctx.fill();

            ctx.restore();
        }

        // ── Crimson accent spikes (secondary, faster rotation) ──────────
        for (let i = 0; i < FOLDS; i++) {
            const angle  = (i / FOLDS) * Math.PI * 2 + Math.PI / FOLDS + t * 0.016;
            const spikeL = R * (0.46 + 0.05 * Math.sin(t * 1.1 + i * 1.3));

            ctx.save();
            ctx.rotate(angle);

            const sg = ctx.createLinearGradient(R * 0.12, 0, spikeL, 0);
            sg.addColorStop(0,   `rgba(180, 20, 60, ${0.40 + pu * 0.22})`);
            sg.addColorStop(0.5, `rgba(120, 10, 40, ${0.25 + pu * 0.10})`);
            sg.addColorStop(1,   'rgba(60, 0, 20, 0)');
            ctx.beginPath();
            ctx.moveTo(R * 0.13, 0);
            ctx.lineTo(R * 0.15, R * 0.020);
            ctx.lineTo(spikeL, 0);
            ctx.lineTo(R * 0.15, -R * 0.020);
            ctx.closePath();
            ctx.fillStyle = sg;
            ctx.fill();
            ctx.restore();
        }

        // ── Inner geometry: heptagon outline ────────────────────────────
        ctx.beginPath();
        for (let i = 0; i <= FOLDS; i++) {
            const angle = (i / FOLDS) * Math.PI * 2 + t * 0.014;
            const rr    = R * (0.28 + 0.015 * Math.sin(t * 1.6 + i));
            const px    = Math.cos(angle) * rr;
            const py    = Math.sin(angle) * rr;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(120, 0, 160, ${0.18 + pu * 0.22})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();

        ctx.restore();

        // ── Concentric dark rings ───────────────────────────────────────
        const ringFracs = [0.12, 0.20, 0.29, 0.38, 0.50];
        for (let ri = 0; ri < ringFracs.length; ri++) {
            const rr    = R * ringFracs[ri];
            const pulse = 1 + 0.03 * Math.sin(t * 1.3 + ri * 1.3);
            const a     = 0.10 + ri * 0.025 + pu * 0.15;
            ctx.beginPath();
            ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${80 + ri * 8}, 0, ${100 + ri * 12}, ${a})`;
            ctx.lineWidth   = 0.85;
            ctx.stroke();
        }

        // Dim star dots
        for (let i = 0; i < FOLDS * 2; i++) {
            const angle = (i / (FOLDS * 2)) * Math.PI * 2 + t * 0.025;
            const dr    = R * (0.38 + 0.016 * Math.sin(t * 1.8 + i * 0.9));
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * dr, cy + Math.sin(angle) * dr, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(160, 40, 200, ${0.18 + pu * 0.28})`;
            ctx.fill();
        }

        // ── Void nucleus ────────────────────────────────────────────────
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.11);
        ng.addColorStop(0,   `rgba(200, 160, 255, ${0.85 + pu * 0.12})`);
        ng.addColorStop(0.3, `rgba(120,  40, 180, ${0.55 + pu * 0.20})`);
        ng.addColorStop(0.7, `rgba(40,    0,  80, 0.30)`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // ── Void pulse rings ────────────────────────────────────────────
        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.2;
            r.a *= 0.976;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(140, 30, 200, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 2.0;
            ctx.stroke();
        }
    }
}
