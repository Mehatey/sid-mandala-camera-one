// Cymatics Mode — three circular wave sources create Chladni-like interference.
// Rendered as a pixel field: rings of constructive/destructive interference form
// hypnotic standing-wave patterns that slowly shift as frequencies drift.
// Blinks reorganise the pattern and shift the palette hue.
class CymaticsMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this.sources = [];
        this.hueBase = 128;

        // Offscreen pixel buffer — low-res, drawn scaled-up
        this._off    = document.createElement('canvas');
        this._off.width  = 160;
        this._off.height = 90;
        this._offCtx = this._off.getContext('2d');
    }

    startScene() {
        this.t       = 0;
        // Cycle starting hue through a few vivid phosphor colours
        const hues   = [128, 285, 188, 52];
        this.hueBase = hues[Math.floor(Math.random() * hues.length)];

        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.sources = [
            { nx: 0.50, ny: 0.50, freq: 0.0192, phase: 0,    phaseSpd: 0.380 },
            { nx: 0.30, ny: 0.36, freq: 0.0214, phase: 2.09, phaseSpd: 0.352 },
            { nx: 0.70, ny: 0.62, freq: 0.0174, phase: 4.19, phaseSpd: 0.414 },
        ];
    }

    onBlink() {
        const src   = this.sources[Math.floor(Math.random() * this.sources.length)];
        src.freq   *= 0.93 + Math.random() * 0.14;
        src.freq    = Math.max(0.010, Math.min(0.032, src.freq));
        this.hueBase = (this.hueBase + 68 + Math.random() * 45) % 360;
    }

    // Inline HSL → [r,g,b 0-255]
    _hsl(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const c = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        return [
            Math.round(c(p, q, h + 1/3) * 255),
            Math.round(c(p, q, h)       * 255),
            Math.round(c(p, q, h - 1/3) * 255),
        ];
    }

    draw(t) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        for (const src of this.sources) {
            src.phase += src.phaseSpd * 0.016;
        }

        const ow  = this._off.width;
        const oh  = this._off.height;
        const img = this._offCtx.createImageData(ow, oh);
        const d   = img.data;

        for (let py = 0; py < oh; py++) {
            for (let px = 0; px < ow; px++) {
                const wx = (px / ow) * W;
                const wy = (py / oh) * H;

                let val = 0;
                for (const src of this.sources) {
                    const dx  = wx - src.nx * W;
                    const dy  = wy - src.ny * H;
                    const dst = Math.sqrt(dx * dx + dy * dy);
                    val      += Math.sin(dst * src.freq - src.phase);
                }
                // val ∈ [-3, 3]
                // |sin(val)| gives Chladni ring pattern — bright at nodes
                const v       = Math.abs(Math.sin(val * 1.20));
                const bCurved = Math.pow(v, 1.55);
                const lit     = 4  + bCurved * 54;
                const sat     = 82 + bCurved * 15;
                const hue     = (this.hueBase + v * 30) % 360;

                const [r, g, b] = this._hsl(hue, sat, lit);
                const idx = (py * ow + px) * 4;
                d[idx]     = r;
                d[idx + 1] = g;
                d[idx + 2] = b;
                d[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'medium'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);
    }
}
