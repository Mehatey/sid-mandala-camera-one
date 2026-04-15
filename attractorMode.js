// Attractor Mode — strange attractor density fields.
// Millions of iterated map points accumulate into fractal dust.
// Dense regions glow hot-white; sparse paths shimmer cool blue.
// Hand slowly warps the four parameters — the shape breathes and morphs.
// Pinch / blink jumps to a new attractor identity.
// Uses: Clifford attractors — x = sin(a·y) + c·cos(a·x), y = sin(b·x) + d·cos(b·y)
class AttractorMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._a = -1.4; this._b = 1.6; this._c = 1.0; this._d = 0.7;
        this._ta = this._a; this._tb = this._b; this._tc = this._c; this._td = this._d;
        this._x = 0.1;  this._y = 0.1;
        this._hue  = 200;

        // Off-screen density buffer (half canvas resolution)
        this._off    = null;   // HTMLCanvasElement
        this._offCtx = null;
        this._buf    = null;   // Float32Array
        this._bufW   = 0;
        this._bufH   = 0;
        this._imgData = null;

        this.handX = null;
        this.handY = null;
        this._lastHandTime = -999;
        this._frameCount = 0;
    }

    startScene() {
        this.t           = 0;
        this._frameCount = 0;
        this.handX       = null;
        this.handY       = null;
        this._lastHandTime = -999;
        this._jumpToNew();
        this._initBuffer();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    _initBuffer() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const bW = Math.floor(W / 2);
        const bH = Math.floor(H / 2);

        if (!this._off) {
            this._off = document.createElement('canvas');
        }
        this._off.width  = bW;
        this._off.height = bH;
        this._offCtx  = this._off.getContext('2d');
        this._bufW    = bW;
        this._bufH    = bH;
        this._buf     = new Float32Array(bW * bH);
        this._imgData = this._offCtx.createImageData(bW, bH);
    }

    _jumpToNew() {
        const presets = [
            [-1.4,  1.6,  1.0,  0.7 ],
            [-1.7,  1.3, -0.1, -1.21],
            [-1.8,  1.9, -1.7, -0.5 ],
            [-1.9, -1.9, -1.7,  1.5 ],
            [ 1.7,  1.7,  0.6,  1.2 ],
            [-1.5,  2.0, -0.7,  0.8 ],
            [ 2.0, -1.9, -1.8, -1.3 ],
            [-2.0,  1.5,  1.8, -0.5 ],
            [-1.3, -1.3, -1.8, -0.1 ],
            [ 1.9, -1.8, -2.0, -0.9 ],
            [-1.6,  1.2, -1.9,  1.7 ],
            [ 1.5, -1.7,  2.0, -1.4 ],
        ];
        const p = presets[Math.floor(Math.random() * presets.length)];
        this._a  = p[0]; this._b  = p[1]; this._c  = p[2]; this._d  = p[3];
        this._ta = p[0]; this._tb = p[1]; this._tc = p[2]; this._td = p[3];
        this._x  = Math.random() * 0.1 - 0.05;
        this._y  = Math.random() * 0.1 - 0.05;
        this._hue = (this._hue + 60 + Math.random() * 90) % 360;
        if (this._buf) this._buf.fill(0);
    }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.handX = (1 - normX) * W;
        this.handY = normY * H;
        this._lastHandTime = this.t;

        // Hand nudges a and b parameters — shape breathes under the hand
        this._ta = this._a + (normX - 0.5) * 0.25;
        this._tb = this._b + (normY - 0.5) * 0.25;
    }

    onPinch(label, normX, normY) { this._jumpToNew(); }
    onBlink()                     { this._jumpToNew(); }

    draw(time) {
        this.t += 0.016;
        this._frameCount++;

        if (this.handX !== null && this.t - this._lastHandTime > 0.5) {
            this.handX = null;
            this.handY = null;
            this._ta = this._a;
            this._tb = this._b;
        }

        // Smooth param interpolation — shape morphs gently
        const A = this._a + (this._ta - this._a) * 0.025;
        const B = this._b + (this._tb - this._b) * 0.025;
        const C = this._c + (this._tc - this._c) * 0.025;
        const D = this._d + (this._td - this._d) * 0.025;
        this._a = A; this._b = B; this._c = C; this._d = D;

        const ctx  = this.ctx;
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;

        if (!this._buf || this._bufW !== Math.floor(W / 2)) {
            this._initBuffer();
        }

        const bW = this._bufW;
        const bH = this._bufH;

        // Iterate Clifford attractor — more iters per frame = faster build-up
        const ITERS = 11000;
        let x = this._x, y = this._y;

        for (let i = 0; i < ITERS; i++) {
            const nx = Math.sin(A * y) + C * Math.cos(A * x);
            const ny = Math.sin(B * x) + D * Math.cos(B * y);
            x = nx; y = ny;

            // Clifford attractor lives roughly in [-2.5, 2.5]
            const px = ((x + 2.5) / 5.0 * bW) | 0;
            const py = ((y + 2.5) / 5.0 * bH) | 0;

            if (px >= 0 && px < bW && py >= 0 && py < bH) {
                this._buf[py * bW + px] += 1;
            }
        }
        this._x = x; this._y = y;

        // Slow exponential decay — old paths fade, recent paths glow
        const DECAY = 0.9988;
        for (let i = 0; i < bW * bH; i++) this._buf[i] *= DECAY;

        // Find max density for normalization (scan every 4th pixel for speed)
        let gMax = 1;
        for (let i = 0; i < bW * bH; i += 4) {
            if (this._buf[i] > gMax) gMax = this._buf[i];
        }
        const logMax = Math.log(gMax + 1);

        // Render buffer → ImageData using a hot colourmap
        // Colourmap: 0 → black, low → deep indigo, mid → cyan, high → white
        const data = this._imgData.data;
        const hue  = this._hue;

        for (let i = 0; i < bW * bH; i++) {
            const v    = this._buf[i];
            const norm = v > 0 ? Math.log(v + 1) / logMax : 0;
            const idx  = i << 2;

            if (norm < 0.004) {
                data[idx]   = 0;
                data[idx+1] = 0;
                data[idx+2] = 3;
                data[idx+3] = 255;
            } else {
                // Density → colour: low=cool blue, mid=teal-cyan, high=bright white
                const t  = Math.pow(norm, 0.55);
                const t2 = Math.pow(norm, 0.28);   // wider highlight
                const r  = (t2 * 200 + (1 - t2) * 10)  | 0;
                const g  = (t  * 240 + (1 - t)  * 60)  | 0;
                const b  = (t2 * 255 + (1 - t2) * 180) | 0;
                // Tint by hue: shift channels slightly
                const hf = ((hue % 360) / 360);
                data[idx]   = Math.min(255, (r * (0.6 + hf * 0.8))  | 0);
                data[idx+1] = Math.min(255, (g * (0.8 + (1-hf)*0.4))| 0);
                data[idx+2] = Math.min(255, (b * (1.0 - hf * 0.35)) | 0);
                data[idx+3] = 255;
            }
        }

        this._offCtx.putImageData(this._imgData, 0, 0);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(this._off, 0, 0, W, H);

        // Subtle vignette
        const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.75);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,6,0.55)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
