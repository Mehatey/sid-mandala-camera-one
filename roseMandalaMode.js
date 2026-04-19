// Rose Mandala — 5-fold deep rose/magenta fibonacci-inspired petals.
// Spiral arms unfurl like a blooming flower; petals pulse with breathing rhythm.
// Blink: bloom eruption — petals flare open and a blush wave expands.
class RoseMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._bloom = 0;
        this._rings = [];
    }

    startScene() {
        this.t      = 0;
        this._bloom = 0;
        this._rings = [];
    }

    onBlink() {
        this._bloom = 1.0;
        const S = Math.min(this.canvas.width, this.canvas.height);
        this._rings.push({ r: S * 0.04, maxR: S * 0.50, a: 0.60 });
    }

    draw(time) {
        this.t += 0.016;
        this._bloom = Math.max(0, this._bloom - 0.016 * 1.1);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.41;
        const bl = this._bloom;

        // Deep rose background
        ctx.fillStyle = 'rgba(4, 0, 2, 0.10)';
        ctx.fillRect(0, 0, W, H);

        const FOLDS = 5;
        const PHI   = 1.6180339887;

        ctx.save();
        ctx.translate(cx, cy);

        // ── Outer petals (fibonacci-scaled arcs) ───────────────────────
        for (let layer = 0; layer < 3; layer++) {
            const layerR   = R * (0.72 - layer * 0.18);
            const layerRot = t * (0.010 + layer * 0.006);
            const layerBl  = 0.45 - layer * 0.10;

            for (let i = 0; i < FOLDS; i++) {
                const angle   = (i / FOLDS) * Math.PI * 2 + layerRot;
                const petalL  = layerR * (1.0 + bl * (0.18 - layer * 0.04));
                const petalW  = layerR * (0.22 + 0.025 * Math.sin(t * 0.8 + i + layer));

                ctx.save();
                ctx.rotate(angle);

                // Petal shape: two bezier curves
                const tipX  = petalL;
                const midX  = petalL * 0.55;
                const midY  = petalW * 0.9;
                const baseR = R * (0.10 - layer * 0.02);

                ctx.beginPath();
                ctx.moveTo(baseR, 0);
                ctx.bezierCurveTo(midX * 0.5, midY, midX, midY, tipX, 0);
                ctx.bezierCurveTo(midX, -midY, midX * 0.5, -midY, baseR, 0);
                ctx.closePath();

                const pg = ctx.createLinearGradient(baseR, 0, tipX, 0);
                const alpha = layerBl + bl * 0.20;
                pg.addColorStop(0,   `rgba(240, 80,  160, ${alpha})`);
                pg.addColorStop(0.4, `rgba(210, 50,  130, ${alpha * 0.80})`);
                pg.addColorStop(0.75,`rgba(180, 30,  100, ${alpha * 0.55})`);
                pg.addColorStop(1,   'rgba(120, 10, 60, 0)');
                ctx.fillStyle = pg;
                ctx.fill();

                // Petal vein
                ctx.beginPath();
                ctx.moveTo(baseR, 0);
                ctx.lineTo(tipX * 0.85, 0);
                ctx.strokeStyle = `rgba(255, 160, 220, ${0.18 + bl * 0.12})`;
                ctx.lineWidth   = 0.5;
                ctx.stroke();

                ctx.restore();
            }
        }

        // ── Spiral golden-ratio arms ────────────────────────────────────
        for (let arm = 0; arm < FOLDS * 2; arm++) {
            const startAngle = (arm / (FOLDS * 2)) * Math.PI * 2 + t * 0.018;
            ctx.save();
            ctx.rotate(startAngle);

            const spiralLen = R * (0.36 + 0.04 * Math.sin(t * 1.3 + arm));
            const sg = ctx.createLinearGradient(R * 0.10, 0, spiralLen, 0);
            sg.addColorStop(0,   `rgba(255, 130, 200, ${0.32 + bl * 0.18})`);
            sg.addColorStop(1,   'rgba(200, 50, 120, 0)');
            ctx.beginPath();
            ctx.moveTo(R * 0.11, 0);
            ctx.lineTo(R * 0.13, R * 0.015);
            ctx.lineTo(spiralLen, 0);
            ctx.lineTo(R * 0.13, -R * 0.015);
            ctx.closePath();
            ctx.fillStyle = sg;
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // ── Corona rings ────────────────────────────────────────────────
        const ringFracs = [0.13, 0.21, 0.30, 0.41, 0.53];
        for (let ri = 0; ri < ringFracs.length; ri++) {
            const rr    = R * ringFracs[ri];
            const pulse = 1 + 0.04 * Math.sin(t * 1.2 + ri * PHI);
            const a     = 0.09 + ri * 0.03 + bl * 0.16;
            ctx.beginPath();
            ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(230, ${80 + ri * 12}, ${130 + ri * 10}, ${a})`;
            ctx.lineWidth   = 0.9 - ri * 0.10;
            ctx.stroke();
        }

        // Petal-tip dots
        for (let i = 0; i < FOLDS * 3; i++) {
            const angle = (i / (FOLDS * 3)) * Math.PI * 2 + t * 0.030;
            const dr    = R * (0.41 + 0.020 * Math.sin(t * 1.9 + i * 0.7));
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * dr, cy + Math.sin(angle) * dr, 1.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 160, 220, ${0.20 + bl * 0.32})`;
            ctx.fill();
        }

        // ── Nucleus ──────────────────────────────────────────────────────
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.11);
        ng.addColorStop(0,   `rgba(255, 230, 240, ${0.92 + bl * 0.08})`);
        ng.addColorStop(0.3, `rgba(255, 120, 190, ${0.65 + bl * 0.18})`);
        ng.addColorStop(0.7, `rgba(180, 30,  100, 0.28)`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // ── Bloom rings on blink ────────────────────────────────────────
        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.6;
            r.a *= 0.970;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 130, 200, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 2.2;
            ctx.stroke();
        }
    }
}
