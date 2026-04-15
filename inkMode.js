// Ink Mode — four inks bleed slowly across warm paper.
// Drop by drop, colour diffuses outward in organic, asymmetric blooms.
// Where inks meet they mix — indigo bleeds into sienna, viridian into rose.
// The paper is permanent. Each blink drops a new ink.
// Wait long enough and the whole sheet turns to depth.
class InkMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this.GW = 200;
        this.GH = 150;
        const sz = this.GW * this.GH;

        // Four ink concentration grids: indigo, sienna, viridian, rose
        this._inks = [
            new Float32Array(sz),
            new Float32Array(sz),
            new Float32Array(sz),
            new Float32Array(sz),
        ];
        this._tmp = new Float32Array(sz);  // scratch for diffusion

        // Ink RGB values — saturated watercolour pigments
        this._inkRGB = [
            [18,  12, 145],   // ultramarine indigo
            [182, 62,   8],   // burnt sienna
            [12, 118,  72],   // viridian green
            [168,  8,  88],   // rose carmine
        ];

        // Background: warm cream paper
        this._bgR = 242; this._bgG = 234; this._bgB = 210;

        // Off-screen canvas at grid resolution — upscaled to main canvas
        this._off    = document.createElement('canvas');
        this._off.width  = this.GW;
        this._off.height = this.GH;
        this._offCtx = this._off.getContext('2d');

        // Anisotropy noise: per-cell bias (precomputed, gives organic edge)
        this._aniso = new Float32Array(sz);
        this._nextDrop = 0;
        this._dropIdx  = 0;
    }

    _buildAniso() {
        const GW = this.GW, GH = this.GH;
        for (let y = 0; y < GH; y++) {
            for (let x = 0; x < GW; x++) {
                // Sum of a few sine waves → values in [-1, 1]
                // Controls directional bias of diffusion
                this._aniso[y * GW + x] =
                    0.38 * Math.sin(x * 0.18 + y * 0.09 + 1.2) +
                    0.28 * Math.cos(x * 0.07 - y * 0.21 + 2.8) +
                    0.22 * Math.sin((x + y) * 0.12 + 0.4) +
                    0.12 * Math.cos(x * 0.31 + y * 0.05 - 1.1);
            }
        }
    }

    startScene() {
        this.t = 0;
        const sz = this.GW * this.GH;
        for (const ink of this._inks) ink.fill(0);
        this._buildAniso();
        this._nextDrop = 0.5;
        this._dropIdx  = 0;

        // White out the offscreen canvas (paper)
        this._offCtx.fillStyle = `rgb(${this._bgR},${this._bgG},${this._bgB})`;
        this._offCtx.fillRect(0, 0, this.GW, this.GH);

        // Seed one drop of each ink at organic positions to immediately cover canvas
        const positions = [
            [this.GW * 0.38, this.GH * 0.42],  // indigo — left-centre
            [this.GW * 0.64, this.GH * 0.35],  // sienna — right-upper
            [this.GW * 0.45, this.GH * 0.68],  // viridian — lower-centre
            [this.GW * 0.72, this.GH * 0.62],  // rose — right-lower
        ];
        for (let k = 0; k < 4; k++) {
            this._addDrop(positions[k][0], positions[k][1], k);
        }

        this.ctx.fillStyle = `rgb(${this._bgR},${this._bgG},${this._bgB})`;
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() {
        // Drop ink at a random position with the next ink color
        const margin = 18;
        const x = margin + Math.random() * (this.GW - margin * 2);
        const y = margin + Math.random() * (this.GH - margin * 2);
        const inkIdx = Math.floor(Math.random() * this._inks.length);
        this._addDrop(x, y, inkIdx);
    }

    _addDrop(gx, gy, inkIdx) {
        const GW = this.GW, GH = this.GH;
        const R  = 6 + Math.random() * 5;   // initial concentration radius
        const gxi = Math.round(gx), gyi = Math.round(gy);
        const sigma2 = (R / 2) * (R / 2);
        const ink = this._inks[inkIdx];

        for (let dy = -Math.ceil(R); dy <= Math.ceil(R); dy++) {
            for (let dx = -Math.ceil(R); dx <= Math.ceil(R); dx++) {
                const nx = gxi + dx, ny = gyi + dy;
                if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
                const d2   = dx * dx + dy * dy;
                if (d2 > R * R) continue;
                const conc = Math.exp(-d2 / (2 * sigma2)) * 0.95;
                const idx  = ny * GW + nx;
                ink[idx]   = Math.min(1, ink[idx] + conc);
            }
        }
    }

    // Diffuse one ink channel with anisotropy
    _diffuseInk(inkIdx) {
        const GW = this.GW, GH = this.GH;
        const src = this._inks[inkIdx];
        const dst = this._tmp;
        const D   = 0.055;   // base diffusion coefficient
        const an  = this._aniso;

        for (let y = 1; y < GH - 1; y++) {
            for (let x = 1; x < GW - 1; x++) {
                const i   = y * GW + x;
                const val = src[i];
                if (val < 0.0008) { dst[i] = val; continue; }

                // Anisotropy: bias from precomputed noise
                const a  = an[i];
                const wL = D * (0.25 + a  * 0.18);   // left weight
                const wR = D * (0.25 - a  * 0.18);   // right
                const wU = D * (0.25 + a  * 0.12);   // up
                const wD = D * (0.25 - a  * 0.12);   // down
                const wC = 1 - wL - wR - wU - wD;

                // Small random wander for cauliflower edges
                const jitter = (Math.random() - 0.5) * 0.012;

                dst[i] = Math.max(0, Math.min(1,
                    wC  * val +
                    wL  * src[i - 1] +
                    wR  * src[i + 1] +
                    wU  * src[i - GW] +
                    wD  * src[i + GW] +
                    jitter
                ));
            }
        }
        // Copy back (skip border — acts as absorbing boundary)
        for (let i = 0; i < GW * GH; i++) {
            if (dst[i] !== 0 || src[i] !== 0) src[i] = dst[i];
        }
    }

    draw(time) {
        this.t += 0.016;

        const GW = this.GW, GH = this.GH;
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;

        // Auto-drop new ink every ~18-35s
        if (this.t >= this._nextDrop) {
            this._dropIdx = (this._dropIdx + 1) % this._inks.length;
            const margin  = 20;
            this._addDrop(
                margin + Math.random() * (GW - margin * 2),
                margin + Math.random() * (GH - margin * 2),
                this._dropIdx
            );
            this._nextDrop = this.t + 18 + Math.random() * 17;
        }

        // Two passes per channel — deliberately slow, paper-like spread
        for (let pass = 0; pass < 2; pass++) {
            this._diffuseInk(0);
            this._diffuseInk(1);
            this._diffuseInk(2);
            this._diffuseInk(3);
        }

        // ── Render to ImageData ────────────────────────────────────────────────
        const img = this._offCtx.createImageData(GW, GH);
        const d   = img.data;
        const bgR = this._bgR, bgG = this._bgG, bgB = this._bgB;

        for (let i = 0; i < GW * GH; i++) {
            const c0 = this._inks[0][i];
            const c1 = this._inks[1][i];
            const c2 = this._inks[2][i];
            const c3 = this._inks[3][i];

            // Sum concentrations — where they meet, they mix (additive)
            const total = Math.min(1.0, c0 + c1 + c2 + c3);

            let inkR = 0, inkG = 0, inkB = 0;
            if (total > 0.001) {
                // Weight each ink color by its concentration
                const [r0,g0,b0] = this._inkRGB[0];
                const [r1,g1,b1] = this._inkRGB[1];
                const [r2,g2,b2] = this._inkRGB[2];
                const [r3,g3,b3] = this._inkRGB[3];
                inkR = (c0*r0 + c1*r1 + c2*r2 + c3*r3) / total;
                inkG = (c0*g0 + c1*g1 + c2*g2 + c3*g3) / total;
                inkB = (c0*b0 + c1*b1 + c2*b2 + c3*b3) / total;
            }

            // Dilution: ink mixes with paper at low concentration
            const dilute = Math.pow(total, 0.65);

            const p = i * 4;
            d[p]     = Math.round(bgR * (1 - dilute) + inkR * dilute);
            d[p + 1] = Math.round(bgG * (1 - dilute) + inkG * dilute);
            d[p + 2] = Math.round(bgB * (1 - dilute) + inkB * dilute);
            d[p + 3] = 255;
        }

        this._offCtx.putImageData(img, 0, 0);

        // Upscale to main canvas with smooth interpolation
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        // Paper vignette: darken edges slightly (gives depth)
        const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.30, W/2, H/2, Math.max(W,H)*0.78);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(20,14,8,0.30)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Hint
        if (this.t < 4) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(80, 40, 20, 0.30)';
            ctx.fillText('blink to drop ink', W / 2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
