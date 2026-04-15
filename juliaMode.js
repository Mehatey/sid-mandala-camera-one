// Julia Mode — animated Julia set fractals with smooth continuous colouring
//
// The Julia set for parameter c is the boundary between bounded and escaping
// orbits under iteration z → z² + c, starting from each pixel as a complex z.
// Every c value produces a different geometry — the same mathematics, infinite
// variation. Some c values are connected (dendrites); others are disconnected
// dust (Cantor sets). The boundary between them is the Mandelbrot set itself.
//
// Seven c waypoints, each producing a distinct visual language:
//   (−0.7269, +0.1889)  Douady rabbit / Seahorse valley
//   (−0.4000, +0.6000)  fractal dendrite
//   (+0.2850, +0.0100)  sea creature / fat spirals
//   (−0.8000, +0.1560)  lightning tree / branching filaments
//   (−0.7000, +0.2700)  classical Julia / symmetric arms
//   ( 0.0000, +0.8000)  cauliflower / fat fractal
//   (−0.1000, +0.6510)  parabolic cusp
//
// Smooth colouring: n + 1 − log₂(log₂(|z|)) removes discrete banding.
// Blink: jump to next waypoint; c interpolates over 6s via smoothstep.
class JuliaMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this._wIdx   = 0;
        this._tBlink = -25;
        this._wps    = [
            [-0.7269,  0.1889],
            [-0.4,     0.6   ],
            [ 0.285,   0.01  ],
            [-0.8,     0.156 ],
            [-0.7,     0.27  ],
            [ 0.0,     0.8   ],
            [-0.1,     0.651 ],
            [ 0.28,    0.008 ],
        ];
        this._off    = null;
        this._offCtx = null;
    }

    startScene() {
        this.t       = 0;
        this._wIdx   = 0;
        this._tBlink = -25;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 160, OH = Math.round(160 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }
    }

    onBlink() {
        this._wIdx   = (this._wIdx + 1) % this._wps.length;
        this._tBlink = this.t;
    }

    draw(time) {
        this.t += 0.016;
        const t = this.t;

        // Smoothstep interpolation between current and next c waypoint
        const w0  = this._wps[this._wIdx];
        const w1  = this._wps[(this._wIdx + 1) % this._wps.length];
        const age = Math.max(0, t - this._tBlink);
        const u   = Math.min(1, age / 7);
        const e   = u * u * (3 - 2 * u);               // smoothstep ease
        // Gentle slow breathing drift superimposed
        const cx_c = w0[0] + (w1[0] - w0[0]) * e + Math.sin(t * 0.005) * 0.014;
        const cy_c = w0[1] + (w1[1] - w0[1]) * e + Math.cos(t * 0.0038) * 0.011;

        const OW  = this._off.width, OH = this._off.height;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const OC  = Math.min(OW, OH);
        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;

        const MAX_ITER = 92;
        const ESCAPE   = 4.0;
        const scale    = 1.58 + Math.sin(t * 0.007) * 0.20;
        const hueBase  = this._wIdx * 44 + t * 9;
        const LOG2     = Math.log(2);

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                let zx  = (px - OW * 0.5) / (OC * 0.5) * scale;
                let zy  = (py - OH * 0.5) / (OC * 0.5) * scale;
                let zx2 = zx * zx, zy2 = zy * zy;
                let iter = 0;

                while (zx2 + zy2 < ESCAPE && iter < MAX_ITER) {
                    zy   = 2 * zx * zy  + cy_c;
                    zx   = zx2 - zy2    + cx_c;
                    zx2  = zx * zx;
                    zy2  = zy * zy;
                    iter++;
                }

                let R, G, B;
                if (iter === MAX_ITER) {
                    // Interior of set: near-black deep blue
                    R = 2; G = 3; B = 12;
                } else {
                    // Smooth colouring: removes discrete bands
                    const modZ   = Math.sqrt(zx2 + zy2);
                    const smooth = iter + 1 - Math.log(Math.max(1e-10, Math.log(modZ))) / LOG2;
                    const n      = smooth / MAX_ITER;

                    const hue = (n * 285 + hueBase) % 360;
                    const sat = 0.68 + n * 0.32;
                    const lit = Math.pow(Math.max(0, n), 0.46) * 0.72;
                    [R, G, B] = _jHSL(hue, sat, lit);
                }

                const idx    = (py * OW + px) * 4;
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

function _jHSL(h, s, l) {
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
