// Celtic Mandala — over/under ribbon knotwork in 8-fold symmetry.
// Two interlaced ribbon paths weave over and under each other in a continuous loop.
// Amber/copper tones on dark linen. Blink: the knot traces itself in bright gold.
class CelticMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._trace = 0;   // 0..1 blink trace animation
        this._rings = [];
    }

    startScene() {
        this.t      = 0;
        this._trace = 0;
        this._rings = [];
    }

    onBlink() {
        this._trace = 1.0;
        const S = Math.min(this.canvas.width, this.canvas.height);
        this._rings.push({ r: S * 0.03, maxR: S * 0.50, a: 0.50 });
    }

    // Build the ribbon centreline points for one arm, pre-rotated.
    // Returns array of {x, y} in canvas space.
    _armPoints(cx, cy, angle, R, t) {
        const N = 48;
        const pts = [];
        for (let i = 0; i <= N; i++) {
            const s  = i / N;                      // 0 → 1 along arm
            const r  = R * 0.12 + (R * 0.80) * s; // radial distance
            // Lateral weave: sine wave that crosses zero at 3 points
            const weave = Math.sin(s * Math.PI * 3) * R * 0.06 * (1 - s * 0.5);
            const perp  = angle + Math.PI / 2;
            pts.push({
                x: cx + Math.cos(angle) * r + Math.cos(perp) * weave,
                y: cy + Math.sin(angle) * r + Math.sin(perp) * weave,
            });
        }
        return pts;
    }

    _drawRibbon(pts, width, strokeColor, fillColor) {
        const ctx = this.ctx;
        const N = pts.length;
        if (N < 2) return;

        // Compute normals
        const left  = [], right = [];
        for (let i = 0; i < N; i++) {
            const prev = pts[Math.max(0, i - 1)];
            const next = pts[Math.min(N - 1, i + 1)];
            const tx   = next.x - prev.x, ty = next.y - prev.y;
            const len  = Math.sqrt(tx * tx + ty * ty) + 0.001;
            const nx   = -ty / len, ny = tx / len;
            left.push ({ x: pts[i].x + nx * width, y: pts[i].y + ny * width });
            right.push({ x: pts[i].x - nx * width, y: pts[i].y - ny * width });
        }

        // Fill
        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        for (let i = 1; i < N; i++) ctx.lineTo(left[i].x, left[i].y);
        for (let i = N - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Stroke edges
        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        for (let i = 1; i < N; i++) ctx.lineTo(left[i].x, left[i].y);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(right[0].x, right[0].y);
        for (let i = 1; i < N; i++) ctx.lineTo(right[i].x, right[i].y);
        ctx.stroke();
    }

    draw(time) {
        this.t += 0.016;
        this._trace = Math.max(0, this._trace - 0.016 * 0.7);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.42;
        const tr = this._trace;

        ctx.fillStyle = 'rgba(3, 2, 1, 0.10)';
        ctx.fillRect(0, 0, W, H);

        const FOLDS    = 8;
        const baseRot  = t * 0.006;
        const ribbonW  = R * 0.038;

        // Draw two interlaced ribbon sets — one offset by half a fold
        for (let pass = 0; pass < 2; pass++) {
            const passOffset = pass * (Math.PI / FOLDS);
            const hue  = pass === 0 ? 30 : 20;
            const lum  = pass === 0 ? 52 : 38;
            const alpha = 0.62 - pass * 0.08;

            for (let i = 0; i < FOLDS; i++) {
                const angle = baseRot + passOffset + (i / FOLDS) * Math.PI * 2;
                const pts   = this._armPoints(cx, cy, angle, R, t);

                // Clip the "under" crossing regions by drawing dark rectangles
                // (simple approach: alternate pass draws slightly narrower + darker)
                const w    = pass === 0 ? ribbonW : ribbonW * 0.88;
                const fill = `hsla(${hue}, 70%, ${lum}%, ${alpha + tr * 0.18})`;
                const edge = `hsla(${hue + 10}, 80%, ${lum + 22}%, ${0.50 + tr * 0.25})`;

                this._drawRibbon(pts, w, edge, fill);

                // Over-cross shadow bars — create the illusion of weaving
                // at the 3 crossing points along the arm
                for (let cross = 1; cross <= 2; cross++) {
                    const s   = cross / 3;
                    const idx = Math.floor(s * (pts.length - 1));
                    const p   = pts[idx];
                    if (pass === 1) {
                        // "Over" ribbon draws a dark band to hide the under ribbon
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, ribbonW * 0.95, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(3, 2, 1, 0.75)`;
                        ctx.fill();
                        ctx.restore();
                    }
                }
            }
        }

        // ── Concentric decorative rings ─────────────────────────────
        const ringFracs = [0.13, 0.22, 0.45, 0.72, 0.90];
        for (let ri = 0; ri < ringFracs.length; ri++) {
            const rr    = R * ringFracs[ri];
            const pulse = 1 + 0.018 * Math.sin(t * 0.9 + ri * 1.2);
            const a     = 0.18 + tr * 0.25;
            ctx.beginPath();
            ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 130, 40, ${a - ri * 0.02})`;
            ctx.lineWidth   = 0.8;
            ctx.stroke();
        }

        // Celtic dot pattern on outer ring
        for (let i = 0; i < FOLDS * 3; i++) {
            const angle = (i / (FOLDS * 3)) * Math.PI * 2 + baseRot * 1.5;
            const dr    = R * (0.72 + 0.012 * Math.sin(t * 1.5 + i));
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * dr, cy + Math.sin(angle) * dr, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 150, 50, ${0.30 + tr * 0.35})`;
            ctx.fill();
        }

        // ── Nucleus boss ────────────────────────────────────────────
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.11);
        ng.addColorStop(0,   `rgba(255, 220, 120, ${0.90 + tr * 0.08})`);
        ng.addColorStop(0.35,`rgba(200, 130, 40,  ${0.55 + tr * 0.18})`);
        ng.addColorStop(0.7, `rgba(100,  50, 10,  0.28)`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // 8-petal boss incised ring
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.085, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 200, 80, ${0.35 + tr * 0.30})`;
        ctx.lineWidth   = 1.2;
        ctx.stroke();

        // ── Blink pulse ──────────────────────────────────────────────
        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.2;
            r.a *= 0.976;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(220, 160, 50, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 2.0;
            ctx.stroke();
        }
    }
}
