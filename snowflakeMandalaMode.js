// Snowflake Mandala — fractal 6-fold dendritic ice crystal.
// Each arm branches recursively: main spine → side branches → sub-branches.
// Ice-blue/white/cyan on deep night blue. Grows gradually, resets on blink.
class SnowflakeMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._growT = 0;     // 0..1 growth progress
        this._flash = 0;
        this._rings = [];
    }

    startScene() {
        this.t      = 0;
        this._growT = 0;
        this._flash = 0;
        this._rings = [];
    }

    onBlink() {
        // Reset growth — crystal shatters and regrows
        this._growT = 0;
        this._flash = 1.0;
        const S = Math.min(this.canvas.width, this.canvas.height);
        this._rings.push({ r: S * 0.02, maxR: S * 0.50, a: 0.60 });
    }

    // Recursive branch drawing
    // x,y: start; angle: direction; len: length; depth: recursion level; progress: 0..1 reveal
    _branch(ctx, x, y, angle, len, depth, progress, t) {
        if (depth === 0 || len < 1.5) return;
        if (progress <= 0) return;

        const visLen = len * Math.min(1, progress * (1 + depth * 0.4));
        const ex = x + Math.cos(angle) * visLen;
        const ey = y + Math.sin(angle) * visLen;

        const lum   = 70 + depth * 8;
        const alpha = 0.55 + depth * 0.10;
        const lw    = 0.5 + depth * 0.35;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(${180 + depth * 15}, ${210 + depth * 12}, 255, ${alpha})`;
        ctx.lineWidth   = lw;
        ctx.stroke();

        // Small ice facet dot at tip
        if (depth <= 2 && progress > 0.8) {
            ctx.beginPath();
            ctx.arc(ex, ey, lw * 1.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 240, 255, ${alpha * 0.8})`;
            ctx.fill();
        }

        // Side branches: at 1/3 and 2/3 along
        const sideAngles = [Math.PI / 3, -Math.PI / 3];
        for (const positions of [0.38, 0.62]) {
            const bx = x + Math.cos(angle) * visLen * positions;
            const by = y + Math.sin(angle) * visLen * positions;
            const subProgress = Math.max(0, progress - positions * 0.5);
            for (const sa of sideAngles) {
                this._branch(ctx, bx, by, angle + sa, len * 0.42, depth - 1, subProgress, t);
            }
        }
    }

    draw(time) {
        this.t += 0.016;
        this._growT  = Math.min(1, this._growT + 0.016 * 0.08);  // ~12s full grow
        this._flash  = Math.max(0, this._flash - 0.016 * 1.1);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.42;
        const fl = this._flash;

        ctx.fillStyle = 'rgba(0, 1, 6, 0.11)';
        ctx.fillRect(0, 0, W, H);

        const FOLDS = 6;
        const grow  = this._growT;
        const rot   = t * 0.005;   // very slow master rotation

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // ── Six main arms ────────────────────────────────────────────
        for (let i = 0; i < FOLDS; i++) {
            const angle = (i / FOLDS) * Math.PI * 2;
            // Main spine
            const spineLen = R * 0.82;
            const spineVis = spineLen * Math.min(1, grow * 1.2);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * spineVis, Math.sin(angle) * spineVis);
            ctx.strokeStyle = `rgba(200, 230, 255, ${0.60 + fl * 0.25})`;
            ctx.lineWidth   = 1.1;
            ctx.stroke();

            // Recursive branches along the spine
            const steps = 4;
            for (let s = 1; s <= steps; s++) {
                const frac = s / (steps + 1);
                const bx   = Math.cos(angle) * spineLen * frac;
                const by   = Math.sin(angle) * spineLen * frac;
                const bLen = R * 0.30 * (1 - frac * 0.5);
                const bProgress = Math.max(0, grow - frac * 0.6);
                for (const sa of [Math.PI / 3, -Math.PI / 3]) {
                    this._branch(ctx, bx, by, angle + sa, bLen, 3, bProgress, t);
                }
            }

            // Tip crystal
            if (grow > 0.85) {
                const tipAlpha = (grow - 0.85) / 0.15;
                ctx.beginPath();
                ctx.arc(Math.cos(angle) * spineLen, Math.sin(angle) * spineLen, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(220, 245, 255, ${tipAlpha * (0.65 + fl * 0.25)})`;
                ctx.fill();
            }
        }

        ctx.restore();

        // ── Hexagonal ring guides ─────────────────────────────────────
        const hexR = [0.12, 0.28, 0.48, 0.68, 0.88];
        for (let ri = 0; ri < hexR.length; ri++) {
            const rr = R * hexR[ri];
            ctx.beginPath();
            for (let i = 0; i <= 6; i++) {
                const a  = rot + (i / 6) * Math.PI * 2;
                const px = cx + Math.cos(a) * rr;
                const py = cy + Math.sin(a) * rr;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.strokeStyle = `rgba(120, 170, 230, ${0.08 + fl * 0.12})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
        }

        // ── Nucleus ice core ──────────────────────────────────────────
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.09);
        ng.addColorStop(0,   `rgba(240, 250, 255, ${0.90 + fl * 0.10})`);
        ng.addColorStop(0.4, `rgba(160, 210, 255, ${0.55 + fl * 0.18})`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // ── Blink shatter pulse ───────────────────────────────────────
        if (fl > 0.05) {
            ctx.fillStyle = `rgba(220, 240, 255, ${fl * 0.12})`;
            ctx.fillRect(0, 0, W, H);
        }

        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.5;
            r.a *= 0.973;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(180, 220, 255, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 1.8;
            ctx.stroke();
        }
    }
}
