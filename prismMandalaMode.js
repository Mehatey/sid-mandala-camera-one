// Prism Mandala — 9-fold rainbow crystal spectrum.
// Each arm refracts through the full spectrum; layers rotate at different speeds.
// Blink: prism burst — white light splits into a full rainbow shockwave.
class PrismMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._split = 0;
        this._rings = [];
    }

    startScene() {
        this.t      = 0;
        this._split = 0;
        this._rings = [];
    }

    onBlink() {
        this._split = 1.0;
        const S = Math.min(this.canvas.width, this.canvas.height);
        // Rainbow rings — one per colour band
        const hues = [0, 40, 80, 160, 210, 260, 300];
        hues.forEach((h, i) => {
            this._rings.push({
                r: S * 0.03 + i * 4,
                maxR: S * 0.50,
                a: 0.60,
                hue: h
            });
        });
    }

    draw(time) {
        this.t += 0.016;
        this._split = Math.max(0, this._split - 0.016 * 1.0);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.41;
        const sp = this._split;

        // Very dark background
        ctx.fillStyle = 'rgba(0, 0, 2, 0.10)';
        ctx.fillRect(0, 0, W, H);

        const FOLDS = 9;

        ctx.save();
        ctx.translate(cx, cy);

        // ── Crystal facet arms (3 layers, each hue-shifted) ────────────
        for (let layer = 0; layer < 3; layer++) {
            const layerSpeed = 0.009 + layer * 0.005;
            const layerPhase = (layer / 3) * Math.PI * 2;
            const layerScale = 1.0 - layer * 0.20;

            for (let i = 0; i < FOLDS; i++) {
                const hue   = ((i / FOLDS) * 360 + layer * 120 + t * 8) % 360;
                const angle = (i / FOLDS) * Math.PI * 2 + t * layerSpeed + layerPhase;
                const armLen = R * layerScale * (0.74 + sp * 0.14 + 0.04 * Math.sin(t * 0.9 + i + layer));
                const armW   = R * 0.055 * layerScale;

                ctx.save();
                ctx.rotate(angle);

                // Crystal prism shape: asymmetric parallelogram
                const baseR = R * (0.12 - layer * 0.02);
                ctx.beginPath();
                ctx.moveTo(baseR, 0);
                ctx.lineTo(baseR + armW * 0.4, armW * 0.35);
                ctx.lineTo(armLen, armW * 0.10);
                ctx.lineTo(armLen, -armW * 0.10);
                ctx.lineTo(baseR + armW * 0.4, -armW * 0.35);
                ctx.closePath();

                const a = (0.38 - layer * 0.08) + sp * 0.18;
                const cg = ctx.createLinearGradient(baseR, 0, armLen, 0);
                cg.addColorStop(0,   `hsla(${hue},      100%, 80%, ${a})`);
                cg.addColorStop(0.45,`hsla(${(hue+80)%360}, 100%, 65%, ${a * 0.70})`);
                cg.addColorStop(0.80,`hsla(${(hue+180)%360},100%, 55%, ${a * 0.40})`);
                cg.addColorStop(1,   `hsla(${(hue+240)%360},100%, 45%, 0)`);
                ctx.fillStyle = cg;
                ctx.fill();

                // Crystal edge highlight
                ctx.strokeStyle = `hsla(${hue}, 100%, 90%, ${0.22 + sp * 0.14})`;
                ctx.lineWidth   = 0.5;
                ctx.stroke();

                ctx.restore();
            }
        }

        // ── Inner star polygon ──────────────────────────────────────────
        ctx.beginPath();
        for (let i = 0; i <= FOLDS * 2; i++) {
            const isOuter = i % 2 === 0;
            const angle   = (i / (FOLDS * 2)) * Math.PI * 2 + t * 0.016;
            const rr      = R * (isOuter ? 0.32 : 0.18);
            const px      = Math.cos(angle) * rr;
            const py      = Math.sin(angle) * rr;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        const starH = (t * 30) % 360;
        ctx.strokeStyle = `hsla(${starH}, 100%, 80%, ${0.22 + sp * 0.20})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();

        ctx.restore();

        // ── Rainbow concentric rings ────────────────────────────────────
        const ringFracs = [0.13, 0.21, 0.30, 0.40, 0.52];
        for (let ri = 0; ri < ringFracs.length; ri++) {
            const rr    = R * ringFracs[ri];
            const pulse = 1 + 0.035 * Math.sin(t * 1.3 + ri * 1.1);
            const hue   = ((ri * 72 + t * 20) % 360);
            const a     = 0.10 + ri * 0.025 + sp * 0.16;
            ctx.beginPath();
            ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${a})`;
            ctx.lineWidth   = 0.85 - ri * 0.09;
            ctx.stroke();
        }

        // Spectrum dots
        for (let i = 0; i < FOLDS * 2; i++) {
            const angle = (i / (FOLDS * 2)) * Math.PI * 2 + t * 0.030;
            const dr    = R * (0.40 + 0.018 * Math.sin(t * 2.0 + i * 0.8));
            const hue   = ((i / (FOLDS * 2)) * 360 + t * 15) % 360;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * dr, cy + Math.sin(angle) * dr, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${0.22 + sp * 0.30})`;
            ctx.fill();
        }

        // ── White prism nucleus ─────────────────────────────────────────
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.12);
        ng.addColorStop(0,   `rgba(255, 255, 255, ${0.92 + sp * 0.08})`);
        ng.addColorStop(0.25,`rgba(255, 240, 200, ${0.65 + sp * 0.18})`);
        ng.addColorStop(0.6, `rgba(180, 200, 255, 0.25)`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // ── Rainbow burst rings on blink ────────────────────────────────
        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.5;
            r.a *= 0.972;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${r.hue}, 100%, 75%, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 2.2;
            ctx.stroke();
        }
    }
}
