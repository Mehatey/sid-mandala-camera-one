// Terrain Mode — geological survey from orbit, domain-warped topography.
// Two-level coordinate warping folds flat sine waves into organic mountain ranges,
// river deltas, and coastal shelves. The palette reads like a physical relief map:
// abyssal blue → continental shelf → beach sand → grassland → bare rock → ice cap.
// The whole terrain drifts slowly — tectonic drift, seen from space.
// Blink: sudden phase jump — the landscape lurches, then settles into a new valley.
class TerrainMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._phaseJump = 0;   // accumulates on blink
        this._surge     = 0;
        this._off       = null;
        this._offCtx    = null;
    }

    startScene() {
        this.t          = 0;
        this._phaseJump = 0;
        this._surge     = 0;
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
        this._phaseJump += Math.PI * (0.72 + Math.random() * 1.1);
        this._surge      = 1.0;
    }

    // Topographic color ramp — ocean → shelf → sand → grass → rock → snow
    _topoColor(h) {
        // h in [0,1]; split into biome bands
        if (h < 0.22) {
            // Deep ocean → shelf blue
            const u = h / 0.22;
            return [
                Math.round(  8 + u * 24),
                Math.round( 32 + u * 68),
                Math.round(118 + u * 62),
            ];
        } else if (h < 0.30) {
            // Shallow shelf → sand
            const u = (h - 0.22) / 0.08;
            return [
                Math.round( 32 + u * 180),
                Math.round(100 + u *  72),
                Math.round(180 + u * -78),
            ];
        } else if (h < 0.38) {
            // Wet sand → dry sand
            const u = (h - 0.30) / 0.08;
            return [
                Math.round(212 + u *  8),
                Math.round(172 + u * -8),
                Math.round(102 - u * 20),
            ];
        } else if (h < 0.55) {
            // Sand → grassland green
            const u = (h - 0.38) / 0.17;
            return [
                Math.round(220 - u * 158),
                Math.round(164 - u *  42),
                Math.round( 82 - u *  42),
            ];
        } else if (h < 0.70) {
            // Grassland → highland grass
            const u = (h - 0.55) / 0.15;
            return [
                Math.round( 62 + u *  38),
                Math.round(122 - u *  32),
                Math.round( 40 - u *   8),
            ];
        } else if (h < 0.84) {
            // Rock grey
            const u = (h - 0.70) / 0.14;
            return [
                Math.round(100 + u *  68),
                Math.round( 90 + u *  60),
                Math.round( 80 + u *  62),
            ];
        } else {
            // Snow / ice cap
            const u = Math.min(1, (h - 0.84) / 0.16);
            return [
                Math.round(168 + u *  87),
                Math.round(150 + u * 100),
                Math.round(142 + u * 113),
            ];
        }
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

        // Drift: slow rotation of the entire coordinate frame
        const drift = this.t * 0.028;
        const cosD  = Math.cos(drift), sinD = Math.sin(drift);

        const t  = this.t + this._phaseJump;
        const sur = this._surge;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                // Normalised coordinates centred on image, ±1 in shorter dim
                const OC = Math.min(OW, OH);
                let nx = (px - OW * 0.5) / (OC * 0.5);
                let ny = (py - OH * 0.5) / (OC * 0.5);

                // Apply slow global drift rotation
                const rx = nx * cosD - ny * sinD;
                const ry = nx * sinD + ny * cosD;
                nx = rx; ny = ry;

                // ── Level-1 domain warp ───────────────────────────────────────
                // Displacement fields wx, wy: large-scale geological folding
                const wx1 = Math.sin(nx * 1.8 + ny * 0.9 + t * 0.14) * 0.62
                          + Math.cos(nx * 0.7 - ny * 2.1 + t * 0.09 + 1.3) * 0.38;
                const wy1 = Math.cos(nx * 1.4 + ny * 1.6 + t * 0.11 + 2.2) * 0.55
                          + Math.sin(nx * 2.2 - ny * 0.8 + t * 0.12 + 0.8) * 0.32;

                const wx = nx + wx1;
                const wy = ny + wy1;

                // ── Level-2 domain warp ───────────────────────────────────────
                // Fine-grain warp on top of coarse: river channels, ridgelines
                const wx2 = Math.sin(wx * 3.6 + wy * 2.2 + t * 0.19) * 0.28
                          + Math.cos(wx * 2.1 - wy * 3.4 + t * 0.15 + 2.7) * 0.18;
                const wy2 = Math.cos(wx * 2.8 + wy * 3.1 + t * 0.17 + 1.1) * 0.24
                          + Math.sin(wx * 3.9 - wy * 1.8 + t * 0.13 + 3.4) * 0.15;

                const fx = wx + wx2;
                const fy = wy + wy2;

                // ── Terrain height field (3 octaves of tilted sine waves) ─────
                const h0 = Math.sin(fx * 2.20 + fy * 1.40 + t * 0.065);
                const h1 = Math.sin(fx * 3.80 + fy * 4.10 + t * 0.085 + 1.6) * 0.50;
                const h2 = Math.sin(fx * 6.50 + fy * 5.30 + t * 0.110 + 3.1) * 0.28;

                const raw = (h0 + h1 + h2) / 1.78;   // in [-1, +1]
                let height = (raw + 1) * 0.5;          // remap to [0, 1]

                // Surge: flash lifts everything toward peaks briefly
                height = Math.min(1, height + sur * 0.12);

                // ── Topographic contour lines ─────────────────────────────────
                // Sharp dark lines at integer elevation bands — "contour map" effect
                const CONTOURS = 14;
                const contourFrac = (height * CONTOURS) % 1.0;
                const contourLine = Math.exp(-Math.pow((contourFrac - 0.5) * 2, 2) / 0.015) * 0.62;

                // ── Color ─────────────────────────────────────────────────────
                let [R, G, B] = this._topoColor(height);

                // Darken at contour lines
                R = Math.round(R * (1 - contourLine * 0.55));
                G = Math.round(G * (1 - contourLine * 0.55));
                B = Math.round(B * (1 - contourLine * 0.55));

                // Subtle highlight on ridge peaks (steep local brightness)
                const ridge = Math.max(0, raw - 0.65) * 2.8;
                R = Math.min(255, Math.round(R + ridge * 28));
                G = Math.min(255, Math.round(G + ridge * 24));
                B = Math.min(255, Math.round(B + ridge * 20));

                const idx = (py * OW + px) * 4;
                buf[idx]     = Math.max(0, Math.min(255, R));
                buf[idx + 1] = Math.max(0, Math.min(255, G));
                buf[idx + 2] = Math.max(0, Math.min(255, B));
                buf[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);
    }
}
