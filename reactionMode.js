// Reaction Mode — Gray-Scott reaction-diffusion chemistry.
// Two virtual chemicals (U and V) react and diffuse across the canvas.
// From a few seeds, life-like patterns spontaneously emerge:
//   coral reefs, leopard spots, zebra stripes, mitosis, worm networks.
// Hand injects "activator" chemical at your palm — you seed new growth.
// Pinch cycles through five distinct parameter universes.
// Entirely emergent — no curves, no particles, just chemistry.
class ReactionMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        // Simulation grid (independent of canvas size)
        this.GW = 240;
        this.GH = 180;

        this._U = null;   // Float32Array
        this._V = null;
        this._nU = null;  // next-gen buffers
        this._nV = null;

        this._off    = null;   // offscreen canvas for rendering
        this._offCtx = null;
        this._imgData = null;

        // Gray-Scott parameters — the entire universe lives in (F, k) space
        this._presets = [
            { name: 'coral',        F: 0.0545, k: 0.0620, Du: 0.16, Dv: 0.08 },
            { name: 'mitosis',      F: 0.0367, k: 0.0649, Du: 0.19, Dv: 0.05 },
            { name: 'fingerprints', F: 0.0220, k: 0.0510, Du: 0.16, Dv: 0.08 },
            { name: 'worms',        F: 0.0300, k: 0.0565, Du: 0.16, Dv: 0.08 },
            { name: 'uskate',       F: 0.0620, k: 0.0610, Du: 0.16, Dv: 0.08 },
        ];
        this._presetIdx = 0;
        this._params = { ...this._presets[0] };

        this.handX = null;
        this.handY = null;
        this._lastHandTime = -999;

        // Color palette: index 0-255 → [r, g, b]
        // Built from V concentration: 0 = deep ocean, 1 = hot bioluminescent
        this._palette = new Uint8Array(256 * 3);
        this._buildPalette(0);
    }

    _buildPalette(hueShift) {
        // Maps V ∈ [0,1] → colour
        // 0.0 = background (dark blue-black)
        // 0.3 = mid (deep teal)
        // 0.7 = active (bright cyan / lime)
        // 1.0 = peak (white-hot)
        for (let i = 0; i < 256; i++) {
            const v  = i / 255;
            const h  = (200 + hueShift - v * 160) % 360;  // blue → cyan → green → warm
            const s  = 0.75 + v * 0.20;
            const l  = 0.05 + Math.pow(v, 0.65) * 0.80;
            const [r, g, b] = _hsl2rgb(h, s, l);
            this._palette[i * 3]     = r;
            this._palette[i * 3 + 1] = g;
            this._palette[i * 3 + 2] = b;
        }
    }

    startScene() {
        this.t           = 0;
        this._presetIdx  = 0;
        this._params     = { ...this._presets[0] };
        this.handX       = null;
        this.handY       = null;
        this._lastHandTime = -999;
        this._buildPalette(0);
        this._initGrids();
        this._initOffscreen();

        // Pre-warm: run 400 simulation steps to let patterns form before showing
        for (let i = 0; i < 400; i++) this._step();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    _initGrids() {
        const N = this.GW * this.GH;
        this._U  = new Float32Array(N);
        this._V  = new Float32Array(N);
        this._nU = new Float32Array(N);
        this._nV = new Float32Array(N);

        // Equilibrium: U=1, V=0
        this._U.fill(1);
        this._V.fill(0);

        // Seed 20 random patches with V=0.25 noise — patterns emerge from these
        const GW = this.GW, GH = this.GH;
        const seeds = 20 + Math.floor(Math.random() * 20);
        for (let s = 0; s < seeds; s++) {
            const cx = 4 + Math.floor(Math.random() * (GW - 8));
            const cy = 4 + Math.floor(Math.random() * (GH - 8));
            const r  = 3 + Math.floor(Math.random() * 4);
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx*dx + dy*dy > r*r) continue;
                    const x = cx + dx, y = cy + dy;
                    if (x < 0 || x >= GW || y < 0 || y >= GH) continue;
                    const i = y * GW + x;
                    this._U[i] = 0.50 + (Math.random() - 0.5) * 0.10;
                    this._V[i] = 0.25 + (Math.random() - 0.5) * 0.10;
                }
            }
        }
    }

    _initOffscreen() {
        if (!this._off) this._off = document.createElement('canvas');
        this._off.width  = this.GW;
        this._off.height = this.GH;
        this._offCtx  = this._off.getContext('2d');
        this._imgData = this._offCtx.createImageData(this.GW, this.GH);
    }

    _step() {
        const { F, k, Du, Dv } = this._params;
        const GW = this.GW, GH = this.GH;
        const U = this._U, V = this._V, nU = this._nU, nV = this._nV;
        const dt = 1.0;

        for (let y = 1; y < GH - 1; y++) {
            for (let x = 1; x < GW - 1; x++) {
                const i   = y * GW + x;
                const ui  = U[i], vi = V[i];

                // 5-point Laplacian (up, down, left, right, centre)
                const lapU = U[i - GW] + U[i + GW] + U[i - 1] + U[i + 1] - 4 * ui;
                const lapV = V[i - GW] + V[i + GW] + V[i - 1] + V[i + 1] - 4 * vi;

                const uvv  = ui * vi * vi;
                nU[i] = Math.min(1, Math.max(0, ui + dt * (Du * lapU - uvv + F * (1 - ui))));
                nV[i] = Math.min(1, Math.max(0, vi + dt * (Dv * lapV + uvv - (F + k) * vi)));
            }
        }

        // Swap buffers
        this._U = nU; this._V = nV;
        this._nU = U; this._nV = V;
    }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.handX = (1 - normX) * W;
        this.handY = normY * H;
        this._lastHandTime = this.t;

        // Inject V at hand position on the grid
        const gx = ((1 - normX) * this.GW) | 0;
        const gy = (normY * this.GH) | 0;
        const r  = 5;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx*dx + dy*dy > r*r) continue;
                const x = gx + dx, y = gy + dy;
                if (x < 0 || x >= this.GW || y < 0 || y >= this.GH) continue;
                const idx = y * this.GW + x;
                this._V[idx] = Math.min(1, this._V[idx] + 0.3);
                this._U[idx] = Math.max(0, this._U[idx] - 0.15);
            }
        }
    }

    onPinch(label, normX, normY) {
        this._presetIdx = (this._presetIdx + 1) % this._presets.length;
        this._params    = { ...this._presets[this._presetIdx] };
        this._buildPalette(this._presetIdx * 55);
        // Inject a cluster at pinch location so the new chemistry has something to react with
        const gx = ((1 - normX) * this.GW) | 0;
        const gy = (normY * this.GH) | 0;
        const r  = 10;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx*dx + dy*dy > r*r) continue;
                const x = gx + dx, y = gy + dy;
                if (x < 0 || x >= this.GW || y < 0 || y >= this.GH) continue;
                const idx = y * this.GW + x;
                this._V[idx] = 0.5 + (Math.random() - 0.5) * 0.2;
                this._U[idx] = 0.5 + (Math.random() - 0.5) * 0.1;
            }
        }
    }

    onBlink() {
        this.onPinch('R', 0.5, 0.5);
    }

    draw(time) {
        this.t += 0.016;

        if (this.handX !== null && this.t - this._lastHandTime > 0.5) {
            this.handX = null;
            this.handY = null;
        }

        // Run 4 simulation steps per frame — balances speed vs quality
        this._step();
        this._step();
        this._step();
        this._step();

        // Render V concentration to ImageData via palette lookup
        const data = this._imgData.data;
        const V    = this._V;
        const pal  = this._palette;

        for (let i = 0; i < this.GW * this.GH; i++) {
            const vi  = (V[i] * 255 + 0.5) | 0;
            const idx = i << 2;
            const p   = vi < 0 ? 0 : vi > 255 ? 255 : vi;
            data[idx]   = pal[p * 3];
            data[idx+1] = pal[p * 3 + 1];
            data[idx+2] = pal[p * 3 + 2];
            data[idx+3] = 255;
        }

        this._offCtx.putImageData(this._imgData, 0, 0);

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this._off, 0, 0, W, H);

        // Hand pulse indicator — shows where chemistry is being injected
        if (this.handX !== null) {
            const rg = ctx.createRadialGradient(this.handX, this.handY, 0, this.handX, this.handY, 60);
            rg.addColorStop(0,   'rgba(100, 255, 200, 0.18)');
            rg.addColorStop(0.5, 'rgba(50,  200, 150, 0.06)');
            rg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(this.handX, this.handY, 60, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Shared HSL → RGB helper (also used by attractorMode)
function _hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const hh = h / 360;
    const q  = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p  = 2 * l - q;
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    return [
        Math.round(hue2rgb(p, q, hh + 1/3) * 255),
        Math.round(hue2rgb(p, q, hh)       * 255),
        Math.round(hue2rgb(p, q, hh - 1/3) * 255),
    ];
}
