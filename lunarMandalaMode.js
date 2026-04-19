// Lunar Mandala — 8-fold silver/indigo moon geometry.
// Crescent arc pairs orbit a cool blue-white nucleus.
// Blink: moonrise pulse — silver rings bloom outward.
class LunarMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._flash = 0;
        this._rings = [];
    }

    startScene() {
        this.t      = 0;
        this._flash = 0;
        this._rings = [];
    }

    onBlink() {
        this._flash = 1.0;
        const S = Math.min(this.canvas.width, this.canvas.height);
        this._rings.push({ r: S * 0.05, maxR: S * 0.55, a: 0.65 });
        this._rings.push({ r: S * 0.02, maxR: S * 0.38, a: 0.45 });
    }

    draw(time) {
        this.t += 0.016;
        this._flash = Math.max(0, this._flash - 0.016 * 1.2);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.40;
        const fl = this._flash;

        // Dark indigo background fade
        ctx.fillStyle = 'rgba(1, 1, 8, 0.11)';
        ctx.fillRect(0, 0, W, H);

        const FOLDS = 8;

        ctx.save();
        ctx.translate(cx, cy);

        // ── Outer crescent arcs ─────────────────────────────────────────
        for (let i = 0; i < FOLDS; i++) {
            const angle = (i / FOLDS) * Math.PI * 2 + t * 0.012;
            const pulse = 1 + 0.05 * Math.sin(t * 1.1 + i * 0.9);

            ctx.save();
            ctx.rotate(angle);

            const armR = R * (0.72 + fl * 0.12) * pulse;

            // Outer arc (full)
            ctx.beginPath();
            ctx.arc(armR * 0.5, 0, armR * 0.38, 0, Math.PI * 2);
            const outerG = ctx.createRadialGradient(armR * 0.5, 0, 0, armR * 0.5, 0, armR * 0.38);
            outerG.addColorStop(0, `rgba(200, 220, 255, ${0.0})`);
            outerG.addColorStop(0.65, `rgba(160, 190, 245, ${0.06 + fl * 0.06})`);
            outerG.addColorStop(1,   `rgba(100, 130, 220, ${0.22 + fl * 0.12})`);
            ctx.fillStyle = outerG;
            ctx.fill();

            // Crescent cutout (offset circle subtracted via destination-out trick — use path instead)
            // Draw crescent as two-arc path
            ctx.beginPath();
            const cX = armR * 0.5;
            const r1  = armR * 0.38;
            const r2  = armR * 0.32;
            const off = armR * 0.09;
            // Outer circle
            ctx.arc(cX, 0, r1, -Math.PI * 0.72, Math.PI * 0.72, false);
            // Inner cutout arc (reversed)
            ctx.arc(cX + off, 0, r2, Math.PI * 0.72, -Math.PI * 0.72, true);
            ctx.closePath();

            const cg = ctx.createLinearGradient(cX - r1, 0, cX + r1, 0);
            cg.addColorStop(0,   `rgba(180, 200, 255, ${0.55 + fl * 0.25})`);
            cg.addColorStop(0.5, `rgba(140, 170, 240, ${0.35 + fl * 0.15})`);
            cg.addColorStop(1,   `rgba(80,  100, 200, ${0.18})`);
            ctx.fillStyle = cg;
            ctx.fill();

            // Rim glow stroke
            ctx.strokeStyle = `rgba(200, 215, 255, ${0.28 + fl * 0.22})`;
            ctx.lineWidth   = 0.8;
            ctx.stroke();

            ctx.restore();
        }

        // ── Secondary inner petal arms ──────────────────────────────────
        for (let i = 0; i < FOLDS; i++) {
            const angle = (i / FOLDS) * Math.PI * 2 + Math.PI / FOLDS + t * 0.020;
            ctx.save();
            ctx.rotate(angle);

            const len = R * (0.34 + 0.04 * Math.sin(t * 1.5 + i));
            const g2  = ctx.createLinearGradient(R * 0.10, 0, len, 0);
            g2.addColorStop(0,   `rgba(160, 190, 255, ${0.40 + fl * 0.20})`);
            g2.addColorStop(1,   'rgba(80, 100, 200, 0)');
            ctx.beginPath();
            ctx.moveTo(R * 0.12, 0);
            ctx.lineTo(R * 0.14, R * 0.018);
            ctx.lineTo(len, 0);
            ctx.lineTo(R * 0.14, -R * 0.018);
            ctx.closePath();
            ctx.fillStyle = g2;
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // ── Concentric rings ────────────────────────────────────────────
        const ringR = [0.14, 0.22, 0.30, 0.42, 0.55];
        for (let ri = 0; ri < ringR.length; ri++) {
            const rr    = R * ringR[ri];
            const pulse = 1 + 0.035 * Math.sin(t * 1.4 + ri * 1.1);
            const a     = 0.10 + ri * 0.035 + fl * 0.15;
            ctx.beginPath();
            ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${150 - ri * 10}, ${175 + ri * 8}, 255, ${a})`;
            ctx.lineWidth   = 0.85 - ri * 0.10;
            ctx.stroke();
        }

        // Dot ring
        for (let i = 0; i < FOLDS * 2; i++) {
            const angle = (i / (FOLDS * 2)) * Math.PI * 2 + t * 0.035;
            const dr    = R * (0.42 + 0.018 * Math.sin(t * 2.0 + i));
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * dr, cy + Math.sin(angle) * dr, 1.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(190, 210, 255, ${0.22 + fl * 0.30})`;
            ctx.fill();
        }

        // ── Nucleus ──────────────────────────────────────────────────────
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.12);
        ng.addColorStop(0,   `rgba(230, 240, 255, ${0.92 + fl * 0.08})`);
        ng.addColorStop(0.3, `rgba(160, 190, 255, ${0.60 + fl * 0.18})`);
        ng.addColorStop(0.7, `rgba(60,  80,  180, 0.25)`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // ── Expanding rings on blink ────────────────────────────────────
        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.4;
            r.a *= 0.974;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(180, 210, 255, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 2.0;
            ctx.stroke();
        }
    }
}
