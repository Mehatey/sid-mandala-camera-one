// WaterRipple — realistic water-lens post-process for zentangle
//
// Applied after each scene's draw() when the scene has no native mouse interaction.
// Hand/body movement drives ripple amplitude; faster = larger, faster waves.
// When input stops, waves decay naturally over ~0.6s.
//
// Technique:
//   1. Wave simulation using the classic 2-buffer equation at 1/6 canvas resolution
//   2. Per-pixel bilinear displacement sampling
//   3. Subtle chromatic aberration (R/G/B sample at slightly offset scales)
//   4. Upscaled back to full canvas with imageSmoothingQuality 'high'

class WaterRipple {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx    = ctx;

        this._scale = 4;   // 1/4 resolution — sharper than 1/6, less upscale blur
        this._RW    = 0;
        this._RH    = 0;
        this._buf1  = null;
        this._buf2  = null;

        this._thumb = document.createElement('canvas');
        this._tCtx  = this._thumb.getContext('2d', { willReadFrequently: true });
        this._disp  = document.createElement('canvas');
        this._dCtx  = this._disp.getContext('2d');

        this._active  = false;
        this._hasWave = false;

        this._prevNX = -1;
        this._prevNY = -1;
    }

    init() {
        const W = this.canvas.width  || window.innerWidth;
        const H = this.canvas.height || window.innerHeight;
        this._RW = Math.max(4, Math.ceil(W / this._scale));
        this._RH = Math.max(4, Math.ceil(H / this._scale));

        this._thumb.width  = this._RW;
        this._thumb.height = this._RH;
        this._disp.width   = this._RW;
        this._disp.height  = this._RH;

        const N    = this._RW * this._RH;
        this._buf1 = new Float32Array(N);
        this._buf2 = new Float32Array(N);
        this._active = true;
    }

    resize() { if (this._active) this.init(); }

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
        const amp = Math.min(600, speed * 7000);
        const rad = 1.8 + speed * 14;

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

    apply() {
        if (!this._active || !this._buf1) return;

        const RW = this._RW, RH = this._RH;
        const b1 = this._buf1, b2 = this._buf2;

        let maxAmp = 0;
        for (let y = 1; y < RH - 1; y++) {
            for (let x = 1; x < RW - 1; x++) {
                const i   = y * RW + x;
                const val = (b1[i - 1] + b1[i + 1] + b1[i - RW] + b1[i + RW]) * 0.5 - b2[i];
                b2[i] = val * 0.940;   // faster decay — ripple dies in ~2s not ~10s
                const av = b2[i] < 0 ? -b2[i] : b2[i];
                if (av > maxAmp) maxAmp = av;
            }
        }
        this._buf1 = b2;
        this._buf2 = b1;

        if (maxAmp < 2.5) { this._hasWave = false; return; }   // only displace pixels when waves are substantial

        const W = this.canvas.width;
        const H = this.canvas.height;

        this._tCtx.drawImage(this.canvas, 0, 0, RW, RH);
        const src = this._tCtx.getImageData(0, 0, RW, RH);
        const out = this._dCtx.createImageData(RW, RH);
        const sd  = src.data;
        const od  = out.data;
        const b   = this._buf1;

        const DISP = 0.16;   // subtler displacement = cleaner lens effect, less smear

        for (let y = 1; y < RH - 1; y++) {
            for (let x = 1; x < RW - 1; x++) {
                const i  = y * RW + x;
                const dx = (b[i + 1]  - b[i - 1])  * DISP;
                const dy = (b[i + RW] - b[i - RW]) * DISP;

                const rx = x + dx * 1.00,  ry = y + dy * 1.00;
                const gx = x + dx * 0.94,  gy = y + dy * 0.94;
                const bx = x + dx * 0.88,  by = y + dy * 0.88;

                const oi   = (y * RW + x) * 4;
                od[oi]     = this._bsamp(sd, RW, RH, rx, ry, 0);
                od[oi + 1] = this._bsamp(sd, RW, RH, gx, gy, 1);
                od[oi + 2] = this._bsamp(sd, RW, RH, bx, by, 2);
                od[oi + 3] = 255;
            }
        }

        this._dCtx.putImageData(out, 0, 0);

        this.ctx.save();
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.drawImage(this._disp, 0, 0, W, H);
        this.ctx.restore();
    }

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

    // ── Cursor warp — very subtle standing shimmer at cursor position ──
    stirCursor(nx, ny) {
        if (!this._active || !this._buf1) return;
        const gx = Math.round(nx * (this._RW - 2)) + 1;
        const gy = Math.round(ny * (this._RH - 2)) + 1;
        this._disturb(gx, gy, 1.8, 7);   // tiny — barely perceptible, not water-like
        this._hasWave = true;
    }

    // ── Frame-diff motion — intensity comes from pixel delta (0..1) ───
    onMotionDelta(nx, ny, intensity) {
        if (!this._active || !this._buf1) return;
        const gx  = Math.round(nx * (this._RW - 2)) + 1;
        const gy  = Math.round(ny * (this._RH - 2)) + 1;
        const amp = Math.min(450, intensity * 12000);
        const rad = 2.5 + intensity * 15;
        this._disturb(gx, gy, rad, amp);
        this._hasWave = true;
    }

    // ── Pose wrist fallback — pre-filtered by PoseTracker speed ──────
    // Keeps its own prev position to avoid interfering with onHandMove.
    onPoseWave(nx, ny, speed) {
        if (!this._active || !this._buf1) return;
        const gx  = Math.round(nx * (this._RW - 2)) + 1;
        const gy  = Math.round(ny * (this._RH - 2)) + 1;
        const amp = Math.min(500, speed * 6000);
        const rad = 2 + speed * 12;
        this._disturb(gx, gy, rad, amp);
        this._hasWave = true;
    }

    stop() {
        this._active  = false;
        this._hasWave = false;
        if (this._buf1) { this._buf1.fill(0); this._buf2.fill(0); }
        this._prevNX = -1;
        this._prevNY = -1;
    }
}
