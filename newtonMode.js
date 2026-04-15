// Newton Mode — Newton's method fractal for z^n − 1.
// Each pixel is a seed z₀ in the complex plane. Newton iteration converges to one
// of the n roots of unity; which root it lands on determines the color region.
// Near boundaries between basins, convergence is chaotic — this is where the
// fractal complexity lives: infinitely detailed filigree at every scale.
// The exponent n cycles (3 → 4 → 5 → 6 → 7) on blink — each n produces a
// completely different symmetry group, like a kaleidoscope turning.
// The coordinate frame rotates slowly — the whole mandala precesses.
// Blink: n increments → new symmetry; flash of white.
class NewtonMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._n     = 5;       // current exponent (3–7)
        this._surge = 0;
        this._zoom  = 1.0;
        this._off   = null;
        this._offCtx = null;
    }

    startScene() {
        this.t      = 0;
        this._n     = 5;
        this._surge = 0;
        this._zoom  = 1.0;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 120, OH = Math.round(120 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }
    }

    onBlink() {
        // Cycle through n = 3, 4, 5, 6, 7, 3, 4, ...
        this._n = this._n >= 7 ? 3 : this._n + 1;
        this._surge = 1.0;
    }

    // HSL to [R, G, B]
    _hsl(h, s, l) {
        h = h % 360; if (h < 0) h += 360;
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2*l - 1)) * s;
        const x = c * (1 - Math.abs((h/60) % 2 - 1));
        const m = l - c/2;
        let r=0,g=0,b=0;
        if      (h < 60)  { r=c; g=x; b=0; }
        else if (h < 120) { r=x; g=c; b=0; }
        else if (h < 180) { r=0; g=c; b=x; }
        else if (h < 240) { r=0; g=x; b=c; }
        else if (h < 300) { r=x; g=0; b=c; }
        else              { r=c; g=0; b=x; }
        return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)];
    }

    draw(time) {
        this.t      += 0.016;
        this._surge *= 0.92;

        const OW = this._off.width;
        const OH = this._off.height;
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;

        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;

        const n   = this._n;
        const sur = this._surge;

        // Slow rotation of coordinate frame
        const rot   = this.t * 0.040;
        const cosR  = Math.cos(rot), sinR = Math.sin(rot);

        // Pre-compute n roots of unity and their hues
        const roots = [];
        const hues  = [];
        // Palette inspired by the video: cobalt, amber, forest, rose, violet
        const baseHues = [215, 35, 145, 340, 275, 50, 185];
        for (let k = 0; k < n; k++) {
            const angle = (2 * Math.PI * k) / n;
            roots.push({ re: Math.cos(angle), im: Math.sin(angle) });
            hues.push(baseHues[k % baseHues.length]);
        }

        const MAX_ITER = 20;
        const TOL2     = 1e-6;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                const OC = Math.min(OW, OH);
                // Map pixel to complex plane, centred, ±1.6 in shorter axis
                let re = (px - OW * 0.5) / (OC * 0.5) * 1.52;
                let im = (py - OH * 0.5) / (OC * 0.5) * 1.52;

                // Rotate the plane slowly
                const re2 = re * cosR - im * sinR;
                const im2 = re * sinR + im * cosR;
                re = re2; im = im2;

                // Newton iteration: z ← z − f(z)/f'(z) = z − (z^n − 1)/(n·z^(n−1))
                //   = z*(1 − 1/n) + 1/(n·z^(n−1))
                let iter = 0;
                let root = -1;
                let speed = 0;   // convergence speed (brightness)

                // Handle z = 0 (singularity)
                if (re * re + im * im < 1e-10) {
                    const idx = (py * OW + px) * 4;
                    buf[idx] = buf[idx+1] = buf[idx+2] = 0; buf[idx+3] = 255;
                    continue;
                }

                for (iter = 0; iter < MAX_ITER; iter++) {
                    // Compute z^(n-1) and z^n via repeated multiplication
                    let zRe = re, zIm = im;
                    let pRe = 1, pIm = 0;   // z^(n-1)
                    for (let k = 0; k < n - 1; k++) {
                        const tmp = pRe * zRe - pIm * zIm;
                        pIm = pRe * zIm + pIm * zRe;
                        pRe = tmp;
                    }
                    // z^n = p * z
                    const qRe = pRe * re - pIm * im;
                    const qIm = pRe * im + pIm * re;

                    // f(z) = z^n − 1
                    const fRe = qRe - 1;
                    const fIm = qIm;

                    // f'(z) = n * z^(n-1)
                    const dfRe = n * pRe;
                    const dfIm = n * pIm;

                    // Newton step: re -= f/f'  (complex division)
                    const denom = dfRe * dfRe + dfIm * dfIm;
                    if (denom < 1e-14) break;
                    re -= (fRe * dfRe + fIm * dfIm) / denom;
                    im -= (fIm * dfRe - fRe * dfIm) / denom;

                    // Check convergence: find closest root
                    for (let k = 0; k < n; k++) {
                        const dre = re - roots[k].re;
                        const dim = im - roots[k].im;
                        if (dre*dre + dim*dim < TOL2) {
                            root  = k;
                            speed = 1 - iter / MAX_ITER;
                            break;
                        }
                    }
                    if (root >= 0) break;
                }

                if (root < 0) {
                    // Max iterations reached — colour as very dark
                    const idx = (py * OW + px) * 4;
                    buf[idx] = 4; buf[idx+1] = 3; buf[idx+2] = 8; buf[idx+3] = 255;
                    continue;
                }

                // Map root index to hue, speed to lightness
                const hue = hues[root];
                // speed ∈ [0,1]: slow = dark, fast = bright
                // Add surge glow on blink
                const lightBase = 0.08 + speed * 0.52;
                const light     = Math.min(0.88, lightBase + sur * 0.18);
                // Saturation: near boundaries (slow convergence) = lower sat, vivid at fast
                const sat       = 55 + speed * 40;

                const [R, G, B] = this._hsl(hue, sat, light * 100);

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
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        // Blink flash — white-gold overexposure
        if (sur > 0.06) {
            const prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(240, 220, 160, ${sur * 0.22})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = prev;
        }
    }
}
