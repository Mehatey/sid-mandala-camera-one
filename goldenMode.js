// Golden Mode — sacred geometry from mathematics and nature
//
// The golden ratio φ = (1 + √5)/2 ≈ 1.618034…
// The golden angle = 2π − 2π/φ ≈ 137.507765°
//
// Phyllotaxis: leaves, seeds, florets arrange themselves at the golden angle
// to maximise packing without ever lining up in rows. The sunflower has exactly
// 55 CW and 34 CCW spirals — consecutive Fibonacci numbers. The ratio 55/34
// converges to φ. This pattern is not designed; it emerges from each new seed
// taking the one gap that minimises competition with all previous seeds.
//
// Three phases cycling on blink:
//   0  Phyllotaxis      — accumulating seed field, golden angle intervals
//   1  Spiral Arms      — 5 or 8 logarithmic golden spirals from centre
//   2  Hybrid           — both together, lower opacity, full complexity
//
// Blink: phase jump + burst of 89 seeds erupting outward in a golden spiral.
class GoldenMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._phase = 0;
        this._seeds = 0;
        this._burst = null;
    }

    startScene() {
        this.t      = 0;
        this._phase = 0;
        this._seeds = 0;
        this._burst = null;
    }

    onBlink() {
        this._phase = (this._phase + 1) % 3;
        this._seeds = 0;
        this._burst = { t0: this.t };
    }

    draw(time) {
        this.t += 0.016;
        const t   = this.t;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W * 0.5, cy = H * 0.5;
        const maxR = Math.min(W, H) * 0.435;

        // Slow fade: let previous frames persist as a trail
        ctx.fillStyle = 'rgba(0, 0, 0, 0.055)';
        ctx.fillRect(0, 0, W, H);

        const PHI          = 1.6180339887498949;
        const GOLDEN_ANGLE = 2.3999632297286535;  // 2π / φ² = golden angle in radians

        // Accumulate seeds over time (slow reveal)
        this._seeds = Math.min(720, Math.floor(t * 13));
        const N = this._seeds;

        // ── Phase 0 / 2: Phyllotaxis seed field ───────────────────────────
        if (this._phase !== 1 && N > 0) {
            const alphaScale = this._phase === 2 ? 0.55 : 1.0;
            for (let i = 0; i < N; i++) {
                const angle  = i * GOLDEN_ANGLE + t * 0.004;
                const r      = Math.sqrt(i / N) * maxR;
                const x      = cx + Math.cos(angle) * r;
                const y      = cy + Math.sin(angle) * r;
                const prog   = i / N;
                const size   = 0.9 + prog * 3.0;
                const hue    = 30 + prog * 88;
                const alpha  = (0.24 + prog * 0.56) * alphaScale;
                ctx.fillStyle = `hsla(${hue}, 68%, 60%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Phase 1 / 2: Logarithmic golden spiral arms ───────────────────
        if (this._phase !== 0) {
            const arms = this._phase === 1 ? 5 : 8;
            for (let arm = 0; arm < arms; arm++) {
                const armOff = (arm / arms) * Math.PI * 2;
                ctx.beginPath();
                let moved = false;
                for (let a = 0; a < Math.PI * 11; a += 0.035) {
                    const r   = 4.5 * Math.pow(PHI, a * 0.27);
                    if (r > maxR * 1.02) break;
                    const ang = a + armOff + t * 0.007;
                    const x   = cx + Math.cos(ang) * r;
                    const y   = cy + Math.sin(ang) * r;
                    if (!moved) { ctx.moveTo(x, y); moved = true; }
                    else          ctx.lineTo(x, y);
                }
                const alpha  = 0.22 + 0.12 * Math.sin(t * 0.09 + arm * 0.7);
                ctx.strokeStyle = `rgba(210, 168, 55, ${alpha})`;
                ctx.lineWidth   = 0.75;
                ctx.stroke();
            }
        }

        // ── Fibonacci rectangles: nested, very subtle ─────────────────────
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.0025);
        let s = maxR * 0.075;
        for (let i = 0; i < 9; i++) {
            const a = 0.035 + 0.018 * Math.sin(t * 0.045 + i * 0.9);
            ctx.strokeStyle = `rgba(218, 162, 55, ${a})`;
            ctx.lineWidth   = 0.5;
            ctx.strokeRect(-s, -s / PHI, s * 2, s * 2 / PHI);
            s *= PHI;
        }
        ctx.restore();

        // ── Central radial glow ────────────────────────────────────────────
        const gA   = 0.18 + Math.sin(t * 0.38) * 0.08;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.15);
        grad.addColorStop(0,   `rgba(255, 220, 80, ${gA})`);
        grad.addColorStop(0.45,`rgba(255, 138, 28, ${gA * 0.28})`);
        grad.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // ── Blink burst: 89 seeds explode in a golden spiral ──────────────
        if (this._burst) {
            const age = t - this._burst.t0;
            if (age < 2.8) {
                const fade = Math.max(0, 1 - age / 2.8);
                for (let i = 0; i < 89; i++) {
                    const angle = i * GOLDEN_ANGLE;
                    const r     = age * 78 + i * 0.85;
                    if (r > maxR * 1.85) continue;
                    const x   = cx + Math.cos(angle) * r;
                    const y   = cy + Math.sin(angle) * r;
                    const hue = 38 + (i / 89) * 65;
                    ctx.fillStyle = `hsla(${hue}, 82%, 66%, ${fade * 0.82})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 1.7, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                this._burst = null;
            }
        }
    }
}
