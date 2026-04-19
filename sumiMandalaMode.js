// Sumi-e Mandala — Japanese ink-brush calligraphy in radial symmetry.
// Variable-width brushstrokes radiate outward with pressure variation.
// Near-monochrome: dark ink on warm rice-paper tone. Blink: ink splatter burst.
class SumiMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._ink   = 0;   // blink ink burst
        this._splats = [];
        this._strokes = [];   // pre-generated stroke geometry (regenerated on blink)
        this._strokeSeed = 0;
    }

    startScene() {
        this.t        = 0;
        this._ink     = 0;
        this._splats  = [];
        this._strokeSeed = Math.random() * 10000;
        this._buildStrokes();
    }

    onBlink() {
        this._ink = 1.0;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const S  = Math.min(W, H);
        // Ink splatter drops
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = Math.random() * S * 0.36;
            this._splats.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                r: 2 + Math.random() * 7,
                a: 0.55 + Math.random() * 0.35,
                life: 0, maxLife: 3.0 + Math.random() * 3.0,
            });
        }
        // Regenerate stroke set for variety
        this._strokeSeed = Math.random() * 10000;
        this._buildStrokes();
    }

    // Seeded pseudo-random
    _rand(seed) {
        const s = Math.sin(seed) * 43758.5453;
        return s - Math.floor(s);
    }

    _buildStrokes() {
        const R    = Math.min(this.canvas.width, this.canvas.height) * 0.41;
        const FOLD = 12;
        this._strokes = [];
        const seed = this._strokeSeed;

        for (let i = 0; i < FOLD; i++) {
            const angle  = (i / FOLD) * Math.PI * 2;
            const rLen   = this._rand(seed + i * 7.1);
            const rWide  = this._rand(seed + i * 3.3);
            const rCurve = this._rand(seed + i * 11.7);
            const rOff   = this._rand(seed + i * 5.9);

            const len  = R * (0.40 + rLen * 0.50);
            const maxW = R * (0.025 + rWide * 0.045);
            // Curve: lateral displacement at mid-point
            const curve = (rCurve - 0.5) * R * 0.14;
            const startR = R * (0.06 + rOff * 0.10);

            // Build centreline
            const N   = 32;
            const pts = [];
            for (let j = 0; j <= N; j++) {
                const s    = j / N;
                const r    = startR + len * s;
                // Lateral offset: bell-curve pressure creates a bowed stroke
                const lat  = curve * Math.sin(s * Math.PI);
                const perp = angle + Math.PI / 2;
                pts.push({
                    x: Math.cos(angle) * r + Math.cos(perp) * lat,
                    y: Math.sin(angle) * r + Math.sin(perp) * lat,
                    // Width profile: wide near root, taper to hair at tip
                    w: maxW * (1 - s) * Math.sin(s * Math.PI * 0.9 + 0.1) * 2.2,
                });
            }
            this._strokes.push({ pts, angle });
        }

        // Add a few short cross strokes (like brush accent marks)
        for (let i = 0; i < FOLD / 2; i++) {
            const angle  = (i / (FOLD / 2)) * Math.PI * 2 + Math.PI / FOLD;
            const rLen   = this._rand(seed + i * 17.3);
            const rOff   = this._rand(seed + i * 9.1);
            const len    = R * (0.15 + rLen * 0.20);
            const startR = R * (0.20 + rOff * 0.30);
            const N      = 12;
            const pts    = [];
            for (let j = 0; j <= N; j++) {
                const s = j / N;
                const r = startR + len * s;
                pts.push({
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r,
                    w: R * 0.012 * Math.sin(s * Math.PI),
                });
            }
            this._strokes.push({ pts, angle });
        }
    }

    _drawBrushStroke(ctx, pts, alpha, cx, cy) {
        const N = pts.length;
        if (N < 2) return;

        // Build left/right ribbon
        const left = [], right = [];
        for (let i = 0; i < N; i++) {
            const prev = pts[Math.max(0, i - 1)];
            const next = pts[Math.min(N - 1, i + 1)];
            const tx   = next.x - prev.x, ty = next.y - prev.y;
            const len  = Math.sqrt(tx * tx + ty * ty) + 0.001;
            const nx   = -ty / len, ny = tx / len;
            const w    = pts[i].w;
            left.push ({ x: cx + pts[i].x + nx * w, y: cy + pts[i].y + ny * w });
            right.push({ x: cx + pts[i].x - nx * w, y: cy + pts[i].y - ny * w });
        }

        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        for (let i = 1; i < N; i++) ctx.lineTo(left[i].x, left[i].y);
        for (let i = N - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
        ctx.closePath();
        ctx.fillStyle = `rgba(10, 6, 4, ${alpha})`;
        ctx.fill();
    }

    draw(time) {
        this.t += 0.016;
        this._ink = Math.max(0, this._ink - 0.016 * 1.0);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.41;
        const ink = this._ink;

        // Warm rice-paper background fade
        ctx.fillStyle = 'rgba(245, 238, 225, 0.05)';
        ctx.fillRect(0, 0, W, H);

        // Very slow rotation — almost imperceptible
        const rot = t * 0.003;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // ── Main brush strokes ────────────────────────────────────────
        for (const stroke of this._strokes) {
            // Breathing alpha: slight pulse
            const breathAlpha = 0.62 + 0.06 * Math.sin(t * 0.5 + stroke.angle * 3) + ink * 0.15;
            this._drawBrushStroke(ctx, stroke.pts, breathAlpha, 0, 0);
        }

        ctx.restore();

        // ── Ink splatter dots ─────────────────────────────────────────
        for (let si = this._splats.length - 1; si >= 0; si--) {
            const sp = this._splats[si];
            sp.life += 0.016;
            if (sp.life > sp.maxLife) { this._splats.splice(si, 1); continue; }
            const lr  = sp.life / sp.maxLife;
            const env = Math.max(0, 1 - lr * lr);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(10, 6, 4, ${sp.a * env})`;
            ctx.fill();
        }

        // ── Concentric ink rings ──────────────────────────────────────
        const ringFracs = [0.10, 0.20, 0.42, 0.72];
        for (let ri = 0; ri < ringFracs.length; ri++) {
            const rr    = R * ringFracs[ri];
            const pulse = 1 + 0.012 * Math.sin(t * 0.7 + ri);
            ctx.beginPath();
            ctx.arc(cx, cy, rr * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(10, 6, 4, ${0.12 + ink * 0.12})`;
            ctx.lineWidth   = 0.6 + ri * 0.1;
            ctx.stroke();
        }

        // ── Nucleus ink blot ──────────────────────────────────────────
        // Organic blot via slightly irregular circle
        ctx.beginPath();
        const blobR = R * 0.065;
        for (let i = 0; i <= 24; i++) {
            const a   = (i / 24) * Math.PI * 2;
            const rr  = blobR * (1 + 0.12 * Math.sin(a * 5 + t * 0.3));
            const px  = cx + Math.cos(a) * rr;
            const py  = cy + Math.sin(a) * rr;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(6, 3, 2, ${0.85 + ink * 0.12})`;
        ctx.fill();

        // Ink burst flash
        if (ink > 0.05) {
            ctx.fillStyle = `rgba(10, 6, 4, ${ink * 0.10})`;
            ctx.fillRect(0, 0, W, H);
        }
    }
}
