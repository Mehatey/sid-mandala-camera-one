// Iris Mode — thin-film interference. The rainbow you see on oil in a puddle,
// on a soap bubble, on the back of a CD. Optically real: colour comes from
// the thickness of a transparent film — half-nanometre changes shift the
// whole spectrum. A slowly living surface, endlessly cycling colour.
//
// Eight overlapping sine waves (different frequencies, directions, speeds)
// produce organic flowing regions. Their sum maps to Newton's colour series:
// near-zero thickness → black · growing → magenta · violet · blue · cyan
// · green · yellow · red → back to white at second order.
//
// Mouse / hand: local ripple — surface tilts, colours shift, interference changes.
// Blink: global phase jump — the whole film shimmers to a new colour state.
class IrisMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._phaseShift = 0;
        this._waves      = [];
        this._ripples    = [];   // mouse-induced local disturbances
        this._mx         = null; this._my = null;
        this._off        = null; this._offCtx = null;
        this._buildWaves();
    }

    _buildWaves() {
        // 8 plane waves — vary scale, direction, speed
        // kx, ky in 1/pixel (low-res pixel)
        this._waves = [
            { kx:  0.072, ky:  0.038, spd: 0.195, ph: 0.00 },
            { kx: -0.048, ky:  0.082, spd: 0.162, ph: 1.40 },
            { kx:  0.031, ky: -0.065, spd: 0.228, ph: 2.80 },
            { kx:  0.090, ky:  0.055, spd: 0.148, ph: 0.70 },
            { kx: -0.062, ky: -0.044, spd: 0.185, ph: 3.50 },
            { kx:  0.025, ky:  0.095, spd: 0.175, ph: 5.10 },
            { kx: -0.085, ky:  0.028, spd: 0.138, ph: 4.20 },
            { kx:  0.058, ky: -0.082, spd: 0.210, ph: 1.90 },
        ];
    }

    startScene() {
        this.t           = 0;
        this._phaseShift = 0;
        this._ripples    = [];
        this._mx         = null;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 240, OH = Math.round(240 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off = document.createElement('canvas');
            this._off.width = OW; this._off.height = OH;
            this._offCtx = this._off.getContext('2d');
        }
    }

    onMouseMove(x, y) { this._mx = x; this._my = y; }
    onHandMove(nx, ny) {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._mx = (1 - nx) * W; this._my = ny * H;
    }

    onBlink() {
        // Sudden phase jump — the film tilts, all colours re-map
        this._phaseShift += Math.PI * (0.8 + Math.random() * 1.4);
        // Also drop a radial ripple at screen centre
        const OW = this._off ? this._off.width  : 120;
        const OH = this._off ? this._off.height : 68;
        this._ripples.push({ cx: OW / 2, cy: OH / 2, r: 0, maxR: Math.max(OW, OH), amp: 2.2 });
    }

    // Convert HSL to RGB (h 0-360, s 0-1, l 0-1) → [r, g, b] 0-255
    _hsl(h, s, l) {
        const a = s * Math.min(l, 1 - l);
        const f = (n, k = (n + h / 30) % 12) =>
            l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const OW  = this._off.width;
        const OH  = this._off.height;

        // Mouse ripple: press on the film
        if (this._mx !== null) {
            const mBX = (this._mx / W) * OW;
            const mBY = (this._my / H) * OH;
            // Add ripple only every 0.5s
            if (Math.floor(this.t * 2) !== this._lastRippleT) {
                this._lastRippleT = Math.floor(this.t * 2);
                this._ripples.push({ cx: mBX, cy: mBY, r: 0, maxR: Math.max(OW, OH) * 0.6, amp: 1.0 });
            }
        }

        // Update ripples
        this._ripples = this._ripples.filter(r => r.r < r.maxR && r.amp > 0.04);
        for (const r of this._ripples) {
            r.r   += 0.55;
            r.amp *= 0.978;
        }

        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const ws  = this._waves;
        const nW  = ws.length;
        const ps  = this._phaseShift;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                // Sum the plane waves
                let n = 0;
                for (let wi = 0; wi < nW; wi++) {
                    const w = ws[wi];
                    n += Math.sin(px * w.kx + py * w.ky + this.t * w.spd + w.ph + ps);
                }
                n /= nW;  // -1 to 1

                // Mouse / ripple disturbances — local film tilt
                for (const r of this._ripples) {
                    const dr  = Math.sqrt((px - r.cx) ** 2 + (py - r.cy) ** 2);
                    n += r.amp * Math.sin((dr - r.r) * 0.38) * Math.exp(-Math.abs(dr - r.r) * 0.045);
                }

                // Map n (-1..1) → thickness parameter (0..1, twice around spectrum)
                const thickness = (n + 1) * 0.5;

                // Subtle iridescence — like dark oiled silk or a beetle's wing.
                // Newton's colour series but pulled toward monochrome: low saturation,
                // dark overall. Only the slenderest rainbow reveals itself.
                const hue  = ((thickness * 760 + 30) % 360);
                // Saturation: kept very low — a whisper of colour, not a scream
                const sat  = 0.22 + 0.18 * Math.abs(Math.sin(thickness * Math.PI * 3));
                // Lightness: dark field, subtle shimmer at constructive peaks
                const rawL = Math.sin(thickness * Math.PI);
                const lit  = 0.03 + 0.28 * rawL * rawL;

                const [r8, g8, b8] = this._hsl(hue, sat, lit);
                const idx = (py * OW + px) * 4;
                buf[idx]     = r8;
                buf[idx + 1] = g8;
                buf[idx + 2] = b8;
                buf[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);
    }
}
