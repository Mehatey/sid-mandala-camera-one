// Interference Mode — "holographic"
// 6 circular wave sources sum at each pixel: Σ cos(k_i·dist - ω_i·t + φ_i).
// Rendered at 1/4 resolution, upscaled with smoothing for a silky soap-film look.
// Rainbow diffraction grating colours driven by the summed value.
// onBlink: spawn a new source (max 8 total) or reset to 4 if already at 8.
// Sources drift slowly with a gentle centering force.
class InterferenceMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._SCALE   = 4;   // 1/4 resolution
        this._sources = [];
        this._buf     = null;
        this._bufCtx  = null;
        this._imgData = null;
        this._sumBuf  = null; // Float32Array
    }

    startScene() {
        this.t = 0;
        this._initBuffer();
        this._initSources(6);
    }

    onBlink() {
        if (this._sources.length >= 8) {
            this._initSources(4);
        } else {
            this._addSource();
        }
    }

    onGaze(nx, ny) {
        // Nudge nearest source toward gaze point
        if (nx == null || ny == null) return;
        let minD = Infinity, closest = null;
        for (const s of this._sources) {
            const dx = s.x - nx, dy = s.y - ny;
            const d = dx * dx + dy * dy;
            if (d < minD) { minD = d; closest = s; }
        }
        if (closest) {
            closest.vx += (nx - closest.x) * 0.008;
            closest.vy += (ny - closest.y) * 0.008;
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────

    _initBuffer() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const bw = Math.floor(W / this._SCALE);
        const bh = Math.floor(H / this._SCALE);
        if (!this._buf) this._buf = document.createElement('canvas');
        this._buf.width  = bw;
        this._buf.height = bh;
        this._bufCtx = this._buf.getContext('2d');
        this._imgData = this._bufCtx.createImageData(bw, bh);
        this._sumBuf  = new Float32Array(bw * bh);
    }

    _makeSource() {
        return {
            x:    0.15 + Math.random() * 0.70, // normalised 0..1
            y:    0.15 + Math.random() * 0.70,
            vx:   (Math.random() - 0.5) * 0.0015,
            vy:   (Math.random() - 0.5) * 0.0015,
            wl:   50 + Math.random() * 70,      // wavelength px (at full res)
            phi:  Math.random() * Math.PI * 2,  // initial phase
            omega:0.8 + Math.random() * 1.0,    // angular velocity
            amp:  1.0,
        };
    }

    _initSources(n) {
        this._sources = [];
        for (let i = 0; i < n; i++) this._sources.push(this._makeSource());
    }

    _addSource() {
        this._sources.push(this._makeSource());
    }

    _updateSources() {
        for (const s of this._sources) {
            // Gentle centering force
            s.vx += (0.5 - s.x) * 0.00004;
            s.vy += (0.5 - s.y) * 0.00004;
            s.vx *= 0.998;
            s.vy *= 0.998;
            s.x  += s.vx;
            s.y  += s.vy;
            // Soft wall bounce
            if (s.x < 0.05) { s.x = 0.05; s.vx =  Math.abs(s.vx); }
            if (s.x > 0.95) { s.x = 0.95; s.vx = -Math.abs(s.vx); }
            if (s.y < 0.05) { s.y = 0.05; s.vy =  Math.abs(s.vy); }
            if (s.y > 0.95) { s.y = 0.95; s.vy = -Math.abs(s.vy); }
        }
    }

    // Inline HSL → RGB (0..255)
    _hsl2rgb(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if      (h < 60)  { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else              { r = c; g = 0; b = x; }
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
        ];
    }

    _renderInterference() {
        const bw = this._buf.width;
        const bh = this._buf.height;
        const data = this._imgData.data;
        const src  = this._sources;
        const ns   = src.length;
        const t    = this.t;

        // Pre-compute source positions in buffer pixels + k values
        const sx    = new Float32Array(ns);
        const sy    = new Float32Array(ns);
        const k     = new Float32Array(ns);  // wave number = 2π/wavelength
        const omega = new Float32Array(ns);
        const phi   = new Float32Array(ns);
        // wavelength is specified at full-res, buffer is 1/SCALE
        const wlScale = 1 / this._SCALE;
        for (let i = 0; i < ns; i++) {
            sx[i]    = src[i].x * bw;
            sy[i]    = src[i].y * bh;
            k[i]     = (Math.PI * 2) / (src[i].wl * wlScale);
            omega[i] = src[i].omega;
            phi[i]   = src[i].phi;
        }

        for (let py = 0; py < bh; py++) {
            for (let px = 0; px < bw; px++) {
                let sum = 0;
                for (let i = 0; i < ns; i++) {
                    const dx = px - sx[i], dy = py - sy[i];
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    sum += Math.cos(k[i] * dist - omega[i] * t + phi[i]);
                }
                this._sumBuf[py * bw + px] = sum;
            }
        }

        // Map sum (approx -ns..ns) to colour
        // Use the sum to drive hue cycling + saturation/lightness
        const range = ns; // max absolute value
        for (let idx = 0; idx < bw * bh; idx++) {
            const v   = this._sumBuf[idx] / range; // -1..1
            // Hue: full spectrum based on value + time drift
            const hue = ((v * 180 + t * 25) % 360 + 360) % 360;
            // Saturation: always high — we want vivid
            const sat = 88;
            // Lightness: driven by |v|, clamped so it doesn't go fully black/white
            const absV = Math.abs(v);
            const lum  = 14 + absV * 56;
            const [r, g, b] = this._hsl2rgb(hue, sat, lum);
            const base = idx * 4;
            data[base]     = r;
            data[base + 1] = g;
            data[base + 2] = b;
            data[base + 3] = 255;
        }
        this._bufCtx.putImageData(this._imgData, 0, 0);
    }

    // ── Main draw ───────────────────────────────────────────────────────

    draw(ts) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;

        // Ensure buffer matches canvas
        if (!this._buf ||
            this._buf.width  !== Math.floor(W / this._SCALE) ||
            this._buf.height !== Math.floor(H / this._SCALE)) {
            this._initBuffer();
        }

        this._updateSources();
        this._renderInterference();

        // Draw scaled-up with smoothing (silky holographic look)
        ctx.save();
        ctx.imageSmoothingEnabled  = true;
        ctx.imageSmoothingQuality  = 'high';
        ctx.drawImage(this._buf, 0, 0, W, H);
        ctx.restore();

        // Always reset
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
