// Psychedelic Mode — infinite mirror tunnel · sacred geometry · spectral color cycling
//
// The kaleidoscope fold maps every angle into a single symmetric sector.
// The log-radial transform wraps log(r) into [0,1], creating infinite concentric
// layers that recede toward zero — the illusion of a tunnel with no end.
// Two levels of domain warp distort the folded space organically.
// Color: full HSL hue cycling, slow and continuous, with hue derived from
// the fold angle, depth layer, and time — so every point in space has its
// own colour identity that drifts over years.
//
// Blink: phase jump shifts the entire colour topology and cycles fold count
// through 6 → 8 → 10 → 12 → back, changing the geometry of the symmetry.
class PsychedelicMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this._phase  = 0;
        this._folds  = 8;
        this._off    = null;
        this._offCtx = null;
    }

    startScene() {
        this.t      = 0;
        this._phase = 0;
        this._folds = 8;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 200, OH = Math.round(200 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }
    }

    onBlink() {
        this._phase += 0.38 + Math.random() * 0.28;
        const opts  = [6, 8, 10, 12];
        this._folds = opts[Math.floor(Math.random() * opts.length)];
    }

    draw(time) {
        this.t += 0.016;
        const t   = this.t;
        const OW  = this._off.width, OH = this._off.height;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const cx  = OW * 0.5, cy = OH * 0.5;
        const OC  = Math.min(OW, OH);
        const N   = this._folds;
        const sA  = Math.PI / N;
        const TAU = Math.PI * 2;
        const ph  = this._phase;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                const nx = (px - cx) / (OC * 0.46);
                const ny = (py - cy) / (OC * 0.46);

                const r     = Math.sqrt(nx * nx + ny * ny);
                let   theta = Math.atan2(ny, nx);

                // ── Kaleidoscope fold: N-fold radial symmetry ──────────────
                theta = ((theta % TAU) + TAU) % TAU;
                theta = theta % (2 * sA);
                if (theta > sA) theta = 2 * sA - theta;
                // theta now in [0, sA] — one symmetric wedge

                // Back to cartesian in folded space
                const fx = Math.cos(theta) * r;
                const fy = Math.sin(theta) * r;

                // ── Log-spiral tunnel: infinite depth illusion ─────────────
                const rSafe   = Math.max(r, 0.001);
                const logR    = Math.log(rSafe) * 0.38 + t * 0.020 + ph * 0.35;
                const logFrac = logR - Math.floor(logR);   // [0,1], periodic

                // ── Domain warp level 1 (large-scale organic drift) ────────
                const w1x = fx + Math.sin(fy * 4.8 + t * 0.110 + logFrac * 7.5) * 0.120
                               + Math.cos(fx * 3.5 + t * 0.082 + logFrac * 5.2) * 0.082;
                const w1y = fy + Math.cos(fx * 4.2 - t * 0.095 + logFrac * 6.0) * 0.138
                               + Math.sin(fy * 5.5 - t * 0.068 + logFrac * 4.8) * 0.075;

                // ── Domain warp level 2 (fine capillary texture) ──────────
                const w2x = w1x + Math.sin(w1y * 9.2 + t * 0.055) * 0.038;
                const w2y = w1y + Math.cos(w1x * 7.8 - t * 0.044) * 0.042;

                // ── Interference: four overlapping wave systems ────────────
                const v1 = Math.sin(w2x * 9.5  + t * 0.198 + ph);
                const v2 = Math.cos(w2y * 8.8  - t * 0.172 + ph * 1.28);
                const v3 = Math.sin(logFrac * 17 + theta * N * 0.5 + t * 0.132);
                const v4 = Math.cos(w2x * 6.2  + w2y * 5.8 + t * 0.095);
                const v  = (v1 * 0.35 + v2 * 0.28 + v3 * 0.24 + v4 * 0.13) * 0.5 + 0.5;

                // ── Spectral colour: full HSL cycling ─────────────────────
                const hue = ((theta / sA) * 195 + logFrac * 105 + t * 15 + ph * 52) % 360;
                const sat = 0.78 + v * 0.22;
                const lit = 0.04 + v * 0.60;

                const [R, G, B] = _psyHSL(hue, sat, lit);
                const idx = (py * OW + px) * 4;
                buf[idx]     = R;
                buf[idx + 1] = G;
                buf[idx + 2] = B;
                buf[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch (e) {}
        ctx.drawImage(this._off, 0, 0, W, H);
    }
}

function _psyHSL(h, s, l) {
    h /= 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = t => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    return [f(h + 1/3) * 255 | 0, f(h) * 255 | 0, f(h - 1/3) * 255 | 0];
}
