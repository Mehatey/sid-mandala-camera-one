// Solar Mandala — 12-fold sun geometry.
// Sharp triangular spikes radiate from a golden nucleus.
// Inner atomic rings glow like a solar corona.
// Blink: solar flare erupts outward, spikes elongate.
class SolarMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._flare = 0;
        this._rings = [];   // animated flare rings
    }

    startScene() {
        this.t      = 0;
        this._flare = 0;
        this._rings = [];
    }

    onBlink() {
        this._flare = 1.0;
        const W = this.canvas.width, H = this.canvas.height;
        this._rings.push({ r: 0, maxR: Math.min(W, H) * 0.52, a: 0.7 });
    }

    draw(time) {
        this.t += 0.016;
        this._flare = Math.max(0, this._flare - 0.016 * 1.4);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.42;

        ctx.fillStyle = 'rgba(2, 1, 0, 0.10)';
        ctx.fillRect(0, 0, W, H);

        const FOLDS = 12;
        const flare = this._flare;

        // ── Outer spike arms ──────────────────────────────────────────
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < FOLDS; i++) {
            const angle = (i / FOLDS) * Math.PI * 2 + t * 0.018;
            const spikeLen = R * (0.78 + flare * 0.30 + 0.08 * Math.sin(t * 0.9 + i * 0.7));
            const spikeW   = R * 0.045;

            ctx.save();
            ctx.rotate(angle);

            // Outer spike — bright gold core
            const spg = ctx.createLinearGradient(R * 0.15, 0, spikeLen, 0);
            spg.addColorStop(0,   `rgba(255, 210, 60, ${0.55 + flare * 0.3})`);
            spg.addColorStop(0.5, `rgba(255, 165, 20, ${0.40 + flare * 0.2})`);
            spg.addColorStop(1,   'rgba(255, 100, 0, 0)');
            ctx.beginPath();
            ctx.moveTo(R * 0.18, 0);
            ctx.lineTo(R * 0.22, spikeW * 0.5);
            ctx.lineTo(spikeLen, 0);
            ctx.lineTo(R * 0.22, -spikeW * 0.5);
            ctx.closePath();
            ctx.fillStyle = spg;
            ctx.fill();

            // Glow halo around spike
            const hg = ctx.createLinearGradient(R * 0.15, 0, spikeLen * 0.7, 0);
            hg.addColorStop(0, `rgba(255, 200, 50, ${0.12 + flare * 0.15})`);
            hg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath();
            ctx.moveTo(R * 0.15, 0);
            ctx.lineTo(R * 0.20, spikeW * 1.4);
            ctx.lineTo(spikeLen * 0.85, 0);
            ctx.lineTo(R * 0.20, -spikeW * 1.4);
            ctx.closePath();
            ctx.fillStyle = hg;
            ctx.fill();

            ctx.restore();
        }

        // ── Inner secondary spikes (alternating, shorter) ────────────
        for (let i = 0; i < FOLDS; i++) {
            const angle = (i / FOLDS) * Math.PI * 2 + Math.PI / FOLDS + t * 0.024;
            const spikeLen = R * (0.38 + 0.05 * Math.sin(t * 1.2 + i));

            ctx.save();
            ctx.rotate(angle);
            const sg2 = ctx.createLinearGradient(R * 0.14, 0, spikeLen, 0);
            sg2.addColorStop(0, `rgba(255, 230, 120, ${0.50 + flare * 0.25})`);
            sg2.addColorStop(1, 'rgba(255, 160, 0, 0)');
            ctx.beginPath();
            ctx.moveTo(R * 0.16, 0);
            ctx.lineTo(R * 0.18, R * 0.022);
            ctx.lineTo(spikeLen, 0);
            ctx.lineTo(R * 0.18, -R * 0.022);
            ctx.closePath();
            ctx.fillStyle = sg2;
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();

        // ── Concentric corona rings ────────────────────────────────────
        const rings = [0.16, 0.24, 0.32, 0.44, 0.56];
        for (let ri = 0; ri < rings.length; ri++) {
            const rr = R * rings[ri];
            const pulse = 1 + 0.04 * Math.sin(t * 1.8 + ri * 0.9);
            const a = 0.12 + ri * 0.04 + flare * 0.18;
            ctx.beginPath();
            ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, ${160 + ri * 14}, ${20 + ri * 8}, ${a})`;
            ctx.lineWidth = 1.0 - ri * 0.12;
            ctx.stroke();
        }

        // Dot ring at mid-radius
        for (let i = 0; i < FOLDS * 2; i++) {
            const angle = (i / (FOLDS * 2)) * Math.PI * 2 + t * 0.04;
            const dr = R * (0.44 + 0.022 * Math.sin(t * 2.2 + i * 0.8));
            const da = 0.25 + flare * 0.35;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * dr, cy + Math.sin(angle) * dr, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 220, 80, ${da})`;
            ctx.fill();
        }

        // ── Nucleus ─────────────────────────────────────────────────
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.14);
        ng.addColorStop(0,   `rgba(255, 255, 220, ${0.90 + flare * 0.10})`);
        ng.addColorStop(0.3, `rgba(255, 200, 50,  ${0.65 + flare * 0.20})`);
        ng.addColorStop(0.7, `rgba(220, 100, 10,  0.30)`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // ── Flare rings ─────────────────────────────────────────────
        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.8;
            r.a *= 0.972;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 180, 30, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 2.5;
            ctx.stroke();
        }
    }
}
