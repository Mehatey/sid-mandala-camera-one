// Cymatics Mode — three wave sources radiating across dark water.
// Each source emits circular traveling waves. Where waves from different
// sources meet, they superpose: constructive interference makes bright bands,
// destructive makes silence. The result is the true ripple-tank interference
// pattern — not just overlapping circles, but the actual physics of waves.
// Blink: sources jump to new positions, palette cycles.
class CymaticsMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this._sources = [];
        this._off     = null;
        this._offCtx  = null;
        this._ramp    = null;
        this._buildRamp(205);
    }

    // ── Minimal HSL → RGB for ramp building ──────────────────────────────────
    _hslToRgb(h, s, l) {
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

    _buildRamp(hue) {
        this._hueBase = hue;
        this._ramp    = new Uint8Array(256 * 3);
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            // Near zero → near-black; peak → white-hot
            const h = (hue + (1 - t) * 22) % 360;
            const s = 52 + t * 28;
            const l = Math.min(92, t < 0.5 ? t * t * 128 : 28 + t * 62);
            const [r, g, b] = this._hslToRgb(h, s, l);
            this._ramp[i * 3]     = r;
            this._ramp[i * 3 + 1] = g;
            this._ramp[i * 3 + 2] = b;
        }
        // Force ramp[0] to absolute black
        this._ramp[0] = 0; this._ramp[1] = 1; this._ramp[2] = 5;
    }

    startScene() {
        this.t        = 0;
        this._buildRamp(195 + Math.random() * 20);

        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const OW = 240, OH = Math.round(240 * H / W);

        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }

        this._sources = [
            { sx: OW * 0.38, sy: OH * 0.52, vx: 0, vy: 0, homeX: OW * 0.38, homeY: OH * 0.52, phOff: 0.00 },
            { sx: OW * 0.62, sy: OH * 0.52, vx: 0, vy: 0, homeX: OW * 0.62, homeY: OH * 0.52, phOff: 2.09 },
            { sx: OW * 0.50, sy: OH * 0.28, vx: 0, vy: 0, homeX: OW * 0.50, homeY: OH * 0.28, phOff: 4.19 },
        ];
    }

    onBlink() {
        const OW = this._off ? this._off.width  : 240;
        const OH = this._off ? this._off.height : 135;
        for (const s of this._sources) {
            s.homeX = OW * (0.18 + Math.random() * 0.64);
            s.homeY = OH * (0.18 + Math.random() * 0.64);
        }
        // Cycle hue on blink — new "element" feeling
        const hues = [205, 165, 270, 35, 300, 185, 340, 50];
        this._buildRamp(hues[Math.floor(Math.random() * hues.length)]);
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const OW  = this._off.width;
        const OH  = this._off.height;

        // ── Move sources gently toward their target homes ─────────────────────
        for (const s of this._sources) {
            s.vx += (s.homeX - s.sx) * 0.0010;
            s.vy += (s.homeY - s.sy) * 0.0010;
            // Slow sinusoidal wander around home
            s.vx += Math.sin(this.t * 0.17 + s.phOff * 2.3) * 0.018;
            s.vy += Math.cos(this.t * 0.12 + s.phOff * 1.9) * 0.014;
            s.vx *= 0.982;
            s.vy *= 0.982;
            s.sx += s.vx;
            s.sy += s.vy;
        }

        // ── Per-pixel wave superposition ──────────────────────────────────────
        // k = wavenumber (2π/λ), λ ≈ 33 buffer-pixels gives ~7 rings per source
        const k   = 0.190;
        const ω   = 2.20;   // radians per second — governs wave travel speed
        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const ramp = this._ramp;
        const t    = this.t;
        const s0   = this._sources[0];
        const s1   = this._sources[1];
        const s2   = this._sources[2];

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                // Sum of three traveling waves — each source contributes sin(k·r - ω·t + φ)
                const dx0 = px - s0.sx, dy0 = py - s0.sy;
                const dx1 = px - s1.sx, dy1 = py - s1.sy;
                const dx2 = px - s2.sx, dy2 = py - s2.sy;

                const d0  = Math.sqrt(dx0 * dx0 + dy0 * dy0);
                const d1  = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                const d2  = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                const val = Math.sin(k * d0 - ω * t + s0.phOff)
                          + Math.sin(k * d1 - ω * t + s1.phOff)
                          + Math.sin(k * d2 - ω * t + s2.phOff);

                // Normalize from [-3, 3] → [0, 1], then gamma-compress
                // The gamma (1.6) sharpens interference bands, widening the dark troughs
                const norm   = Math.max(0, Math.min(1, (val / 3 + 1) / 2));
                const bright = Math.pow(norm, 1.6);
                const ri     = Math.round(bright * 255);

                const pidx       = (py * OW + px) * 4;
                buf[pidx]     = ramp[ri * 3];
                buf[pidx + 1] = ramp[ri * 3 + 1];
                buf[pidx + 2] = ramp[ri * 3 + 2];
                buf[pidx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);

        // ── Upscale to canvas ─────────────────────────────────────────────────
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        // ── Faint source halos (so you can see where the origins are) ─────────
        for (const s of this._sources) {
            const wx = (s.sx / OW) * W;
            const wy = (s.sy / OH) * H;
            const sg = ctx.createRadialGradient(wx, wy, 0, wx, wy, 20);
            sg.addColorStop(0, 'rgba(210, 235, 255, 0.22)');
            sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(wx, wy, 20, 0, Math.PI * 2); ctx.fill();
        }
    }
}
