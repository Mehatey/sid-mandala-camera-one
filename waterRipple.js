// WaterRipple — realistic water-lens post-process for zentangle
//
// Applied after each scene's draw() when the scene has no native mouse interaction.
// Hand movement drives ripple amplitude; faster hand = larger, faster waves.
// When hand stops, waves decay naturally over ~2s.
//
// Technique:
//   1. Wave simulation using the classic 2-buffer equation at 1/6 canvas resolution
//   2. Per-pixel bilinear displacement sampling
//   3. Subtle chromatic aberration (R/G/B sample at slightly offset scales)
//      → gives the refraction quality of light through water or glass
//   4. Upscaled back to full canvas with imageSmoothingQuality 'high'
//      → inherent blur from upscaling reads as soft water depth
//
// Performance: ~3-5ms per frame on modern hardware (240×135 displacement map).

class WaterRipple {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx    = ctx;

        this._scale = 6;       // downsample factor (higher = faster, softer)
        this._RW    = 0;
        this._RH    = 0;
        this._buf1  = null;    // current wave heights
        this._buf2  = null;    // previous wave heights

        // Low-res working canvases
        this._thumb = document.createElement('canvas');
        this._tCtx  = this._thumb.getContext('2d', { willReadFrequently: true });
        this._disp  = document.createElement('canvas');
        this._dCtx  = this._disp.getContext('2d');

        this._active  = false;
        this._hasWave = false;

        // Velocity tracking
        this._prevNX = -1;
        this._prevNY = -1;
    }

    // Call once (and again on canvas resize)
    init() {
        const W = this.canvas.width  || window.innerWidth;
        const H = this.canvas.height || window.innerHeight;
        this._RW = Math.max(4, Math.ceil(W / this._scale));
        this._RH = Math.max(4, Math.ceil(H / this._scale));

        this._thumb.width  = this._RW;
        this._thumb.height = this._RH;
        this._disp.width   = this._RW;
        this._disp.height  = this._RH;

        const N     = this._RW * this._RH;
        this._buf1  = new Float32Array(N);
        this._buf2  = new Float32Array(N);
        this._active = true;
    }

    resize() { if (this._active) this.init(); }

    // nx/ny: normalised hand position 0–1 (from HandTracker)
    onHandMove(nx, ny) {
        if (!this._active || !this._buf1) return;

        let speed = 0;
        if (this._prevNX >= 0) {
            const dvx = nx - this._prevNX;
            const dvy = ny - this._prevNY;
            speed = Math.sqrt(dvx * dvx + dvy * dvy);
        }
        this._prevNX = nx;
        this._prevNY = ny;

        if (speed < 0.0004) return;

        const gx  = Math.round(nx * (this._RW - 2)) + 1;
        const gy  = Math.round(ny * (this._RH - 2)) + 1;
        const amp = Math.min(1400, speed * 20000);
        const rad = 1.8 + speed * 32;

        this._disturb(gx, gy, rad, amp);
        this._hasWave = true;
    }

    _disturb(cx, cy, r, amp) {
        const RW = this._RW, RH = this._RH;
        const ri = Math.ceil(r);
        for (let dy = -ri; dy <= ri; dy++) {
            const gy = cy + dy;
            if (gy < 1 || gy >= RH - 1) continue;
            for (let dx = -ri; dx <= ri; dx++) {
                const gx = cx + dx;
                if (gx < 1 || gx >= RW - 1) continue;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > r) continue;
                this._buf1[gy * RW + gx] += amp * (1 - d / r);
            }
        }
    }

    // Call AFTER mode.draw() — simulates wave, displaces canvas pixels
    apply() {
        if (!this._active || !this._buf1) return;

        const RW = this._RW, RH = this._RH;
        const b1 = this._buf1, b2 = this._buf2;

        // ── Wave propagation step ──────────────────────────────────────
        let maxAmp = 0;
        for (let y = 1; y < RH - 1; y++) {
            for (let x = 1; x < RW - 1; x++) {
                const i   = y * RW + x;
                const val = (b1[i - 1] + b1[i + 1] + b1[i - RW] + b1[i + RW]) * 0.5 - b2[i];
                b2[i] = val * 0.987;            // damping — 0.987 ≈ 2s decay at 60fps
                const av = b2[i] < 0 ? -b2[i] : b2[i];
                if (av > maxAmp) maxAmp = av;
            }
        }
        // Swap buffers
        this._buf1 = b2;
        this._buf2 = b1;

        if (maxAmp < 0.35) { this._hasWave = false; return; }

        // ── Sample scene at low resolution ─────────────────────────────
        const W = this.canvas.width;
        const H = this.canvas.height;

        this._tCtx.drawImage(this.canvas, 0, 0, RW, RH);
        const src = this._tCtx.getImageData(0, 0, RW, RH);
        const out = this._dCtx.createImageData(RW, RH);
        const sd  = src.data;
        const od  = out.data;
        const b   = this._buf1;

        // How many pixels of max displacement at unit wave amplitude
        const DISP = 0.24;

        for (let y = 1; y < RH - 1; y++) {
            for (let x = 1; x < RW - 1; x++) {
                const i  = y * RW + x;

                // Wave surface gradient → refraction direction
                const dx = (b[i + 1]  - b[i - 1])  * DISP;
                const dy = (b[i + RW] - b[i - RW]) * DISP;

                // Chromatic aberration — R, G, B refract at slightly different strengths
                // Mimics how different wavelengths bend differently through water
                const rx = x + dx * 1.00,  ry = y + dy * 1.00;
                const gx = x + dx * 0.88,  gy = y + dy * 0.88;
                const bx = x + dx * 0.76,  by = y + dy * 0.76;

                const oi   = (y * RW + x) * 4;
                od[oi]     = this._bsamp(sd, RW, RH, rx, ry, 0);   // R
                od[oi + 1] = this._bsamp(sd, RW, RH, gx, gy, 1);   // G
                od[oi + 2] = this._bsamp(sd, RW, RH, bx, by, 2);   // B
                od[oi + 3] = 255;
            }
        }

        this._dCtx.putImageData(out, 0, 0);

        // ── Upscale back to full canvas ─────────────────────────────────
        // The soft blur from upscaling naturally reads as depth/underwater quality
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.drawImage(this._disp, 0, 0, W, H);
        this.ctx.restore();
    }

    // Bilinear sample — smooth sub-pixel reads, no aliasing
    _bsamp(data, W, H, x, y, ch) {
        const x0 = x < 0 ? 0 : x >= W ? W - 1 : x | 0;
        const y0 = y < 0 ? 0 : y >= H ? H - 1 : y | 0;
        const x1 = x0 < W - 1 ? x0 + 1 : x0;
        const y1 = y0 < H - 1 ? y0 + 1 : y0;
        const fx = x - (x | 0);
        const fy = y - (y | 0);
        const i00 = (y0 * W + x0) * 4 + ch;
        const i10 = (y0 * W + x1) * 4 + ch;
        const i01 = (y1 * W + x0) * 4 + ch;
        const i11 = (y1 * W + x1) * 4 + ch;
        return (data[i00] * (1 - fx) + data[i10] * fx) * (1 - fy) +
               (data[i01] * (1 - fx) + data[i11] * fx) * fy;
    }

    stop() {
        this._active  = false;
        this._hasWave = false;
        if (this._buf1) { this._buf1.fill(0); this._buf2.fill(0); }
        this._prevNX = -1;
        this._prevNY = -1;
    }
}
