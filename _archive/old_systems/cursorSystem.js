// Sacred Cursor — 6-fold lotus mandala with hexagram core and outer dharma ring.
// Three counter-rotating layers give constant subtle movement.
// Golden ivory palette — warm, sacred, never distracting.
class CursorSystem {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.x      = -2000;
        this.y      = -2000;
        this.time   = 0;
        this._alpha = 1.0;
    }

    resize() {}
    setAlpha(a) { this._alpha = Math.max(0, Math.min(1, a)); }
    setPosition(x, y) { this.x = x; this.y = y; }

    draw() {
        this.time += 0.016;
        const ctx = this.ctx;
        if (this.x < -100) return;
        const ga = this._alpha !== undefined ? this._alpha : 1.0;
        if (ga <= 0.01) return;

        const x = this.x, y = this.y, t = this.time;

        // Radii
        const Rout  = 19;   // outer dharma ring
        const Rpet  = 12.5; // petal reach
        const Rinn  = 7.2;  // inner ring / petal base
        const Rhex  = 4.2;  // hexagram radius
        const Rbind = 1.5;  // central bindhu

        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = ga;
        ctx.lineCap = 'round';

        // ── Soft glow halo ──────────────────────────────────────────────────────
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, Rout * 2.4);
        glow.addColorStop(0,   `rgba(255, 230, 130, ${0.18 * ga})`);
        glow.addColorStop(0.45,`rgba(220, 185,  90, ${0.07 * ga})`);
        glow.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, Rout * 2.4, 0, Math.PI * 2);
        ctx.fill();

        // ── Layer A: outer dharma ring — 12 spokes, slow CW ────────────────────
        ctx.save();
        ctx.rotate(t * 0.16);

        ctx.beginPath();
        ctx.arc(0, 0, Rout, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 215, 110, ${0.50 * ga})`;
        ctx.lineWidth   = 0.80;
        ctx.stroke();

        for (let i = 0; i < 12; i++) {
            const a    = (i / 12) * Math.PI * 2;
            const long = (i % 3 === 0);  // 4 long marks at cardinal + intercardinal
            const r0   = long ? Rout - 4.2 : Rout - 2.2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r0,   Math.sin(a) * r0);
            ctx.lineTo(Math.cos(a) * Rout,  Math.sin(a) * Rout);
            ctx.strokeStyle = long
                ? `rgba(255, 240, 155, ${0.82 * ga})`
                : `rgba(245, 215, 110, ${0.42 * ga})`;
            ctx.lineWidth = long ? 1.10 : 0.60;
            ctx.stroke();
        }
        ctx.restore();

        // ── Layer B: 6 lotus petals — slow CCW ─────────────────────────────────
        ctx.save();
        ctx.rotate(-t * 0.11);
        ctx.strokeStyle = `rgba(240, 230, 195, ${0.68 * ga})`;
        ctx.lineWidth   = 0.85;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            ctx.save();
            ctx.rotate(a);
            // Symmetrical teardrop petal from inner ring to petal reach
            ctx.beginPath();
            ctx.moveTo(0, -Rinn);
            ctx.bezierCurveTo(
                 Rinn * 0.72, -(Rinn + (Rpet - Rinn) * 0.38),
                 Rinn * 0.52, -Rpet * 0.97,
                 0,           -Rpet
            );
            ctx.bezierCurveTo(
                -Rinn * 0.52, -Rpet * 0.97,
                -Rinn * 0.72, -(Rinn + (Rpet - Rinn) * 0.38),
                 0,           -Rinn
            );
            ctx.stroke();
            ctx.restore();
        }
        // 6 small accent dots at petal tips
        ctx.fillStyle = `rgba(255, 245, 175, ${0.72 * ga})`;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * Rpet, Math.sin(a) * Rpet, 0.95, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // ── Inner ring (static) ─────────────────────────────────────────────────
        ctx.beginPath();
        ctx.arc(0, 0, Rinn, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 215, 110, ${0.55 * ga})`;
        ctx.lineWidth   = 0.72;
        ctx.stroke();

        // ── Layer C: Shatkona (Star of David / hexagram) — faster CW ───────────
        ctx.save();
        ctx.rotate(t * 0.28);
        ctx.strokeStyle = `rgba(255, 250, 210, ${0.85 * ga})`;
        ctx.lineWidth   = 0.80;

        // Triangle 1 — pointing up
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a  = (i / 3) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * Rhex;
            const py = Math.sin(a) * Rhex;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Triangle 2 — pointing down
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a  = (i / 3) * Math.PI * 2 + Math.PI / 2;
            const px = Math.cos(a) * Rhex;
            const py = Math.sin(a) * Rhex;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // 6 tiny dots at hexagram vertices
        ctx.fillStyle = `rgba(255, 252, 220, ${0.80 * ga})`;
        for (let i = 0; i < 6; i++) {
            const a  = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * Rhex;
            const py = Math.sin(a) * Rhex;
            ctx.beginPath();
            ctx.arc(px, py, 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // ── Central bindhu ──────────────────────────────────────────────────────
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, Rbind * 2.5);
        core.addColorStop(0,   `rgba(255, 255, 235, ${0.98 * ga})`);
        core.addColorStop(0.6, `rgba(255, 240, 160, ${0.55 * ga})`);
        core.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, Rbind * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
