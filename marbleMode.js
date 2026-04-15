// Marble Mode — a polished stone slab seen from above, slowly panning.
// Turbulence-displaced sine waves make the flowing veins: each frequency band
// adds another scale of geological detail, from broad ribbons to hairline cracks.
// Three slab variants cycle on blink: white Carrara, deep green forest marble,
// nero marquina (near-black with white lightning).
// A slow specular highlight sweeps across as if a lamp moves overhead.
// Mouse / hand: shifts the light-source position, raking the surface.
class MarbleMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this._variant = 0;   // 0 = Carrara, 1 = Forest, 2 = Nero
        this._surge   = 0;
        this._panX    = 0;
        this._panY    = 0;
        this._panVX   = 0.0016;
        this._panVY   = 0.0010;
        this._lightX  = 0.3;  // normalised light position [0,1]
        this._lightY  = 0.2;
        this._mx      = null;
        this._my      = null;
        this._off     = null;
        this._offCtx  = null;
    }

    startScene() {
        this.t        = 0;
        this._surge   = 0;
        this._variant = 0;
        this._panX    = Math.random() * 10;
        this._panY    = Math.random() * 10;
        this._panVX   = (Math.random() < 0.5 ? 1 : -1) * (0.0010 + Math.random() * 0.0014);
        this._panVY   = (Math.random() < 0.5 ? 1 : -1) * (0.0007 + Math.random() * 0.0009);
        this._lightX  = 0.2 + Math.random() * 0.6;
        this._lightY  = 0.1 + Math.random() * 0.4;
        this._mx      = null;

        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 200, OH = Math.round(200 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }
    }

    onBlink() {
        this._variant = (this._variant + 1) % 3;
        this._surge   = 1.0;
    }

    onMouseMove(x, y) { this._mx = x; this._my = y; }
    onHandMove(nx, ny) {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._mx = (1 - nx) * W; this._my = ny * H;
    }

    // Base color, primary vein, secondary vein, highlight for each variant
    _palette(v) {
        if (v === 0) {
            // White Carrara: creamy base, blue-grey veins, rusty secondary
            return {
                base:  [242, 238, 230],
                vein1: [ 58,  54,  70],
                vein2: [128, 110, 100],
                hi:    [255, 252, 248],
            };
        } else if (v === 1) {
            // Forest green: deep malachite base, gold veins, cream secondary
            return {
                base:  [ 34,  68,  48],
                vein1: [195, 170,  72],
                vein2: [218, 208, 178],
                hi:    [225, 215, 145],
            };
        } else {
            // Nero marquina: near-black, bright white veins, gold hairlines
            return {
                base:  [ 18,  16,  22],
                vein1: [225, 222, 215],
                vein2: [185, 155,  62],
                hi:    [255, 255, 255],
            };
        }
    }

    draw(time) {
        this.t      += 0.016;
        this._surge *= 0.94;
        this._panX  += this._panVX;
        this._panY  += this._panVY;

        const OW = this._off.width;
        const OH = this._off.height;
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;

        // Smoothly steer light toward mouse
        if (this._mx !== null) {
            this._lightX += (this._mx / W - this._lightX) * 0.025;
            this._lightY += (this._my / H - this._lightY) * 0.025;
        }
        // Slow autonomous light drift when no mouse
        const lx = this._lightX + Math.sin(this.t * 0.08) * 0.10;
        const ly = this._lightY + Math.cos(this.t * 0.06) * 0.06;

        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const t   = this.t;
        const px0 = this._panX;
        const py0 = this._panY;
        const sur = this._surge;
        const pal = this._palette(this._variant);

        const [bR, bG, bB]   = pal.base;
        const [v1R, v1G, v1B] = pal.vein1;
        const [v2R, v2G, v2B] = pal.vein2;
        const [hiR, hiG, hiB] = pal.hi;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                const OC = Math.min(OW, OH);
                // World coordinates: pan across infinite slab
                const wx = (px - OW * 0.5) / (OC * 0.5) + px0;
                const wy = (py - OH * 0.5) / (OC * 0.5) + py0;

                // ── Turbulence field: 5 octaves of sine-based distortion ──────
                // Each octave adds a different scale of geological complexity
                const tb =
                    Math.sin(wx * 2.80 + wy * 1.40 + t * 0.016) * 1.22 +
                    Math.sin(wx * 1.22 - wy * 3.10 + t * 0.011 + 2.10) * 0.80 +
                    Math.sin(wx * 4.50 + wy * 2.80 - t * 0.008 + 1.35) * 0.44 +
                    Math.sin(wx * 7.80 - wy * 4.20 + t * 0.006 + 3.82) * 0.22 +
                    Math.sin(wx * 13.2 + wy * 9.70 - t * 0.004 + 0.66) * 0.10;

                // ── Primary veins: broad ribbons flowing diagonally ───────────
                const pv1 = Math.sin(wx * 0.52 + tb * 1.68 + t * 0.013);
                const pv2 = Math.sin(wy * 0.70 + tb * 1.25 - t * 0.010 + 1.84);

                // ── Secondary veins: finer cross-cutting fractures ────────────
                const pv3 = Math.sin((wx - wy) * 0.48 + tb * 2.20 + t * 0.008 + 4.20);
                // Hairline cracks: very high frequency, low amplitude
                const pv4 = Math.sin(wx * 2.20 + tb * 0.80 + t * 0.005 + 0.90) * 0.38
                          + Math.sin(wy * 1.90 + tb * 0.65 - t * 0.004 + 2.60) * 0.28;

                // Sharpen veins: convert to [0,1] raised to a power
                const vs1 = Math.pow(Math.max(0, pv1), 2.4);
                const vs2 = Math.pow(Math.max(0, pv2), 2.8) * 0.65;
                const vs3 = Math.pow(Math.max(0, pv3), 3.2) * 0.42;
                const vs4 = Math.pow(Math.max(0, pv4), 1.8) * 0.22;

                // ── Fine surface grain: microscopic crystal texture ───────────
                const grain =
                    Math.sin(wx * 24.8 + wy * 18.6) * 0.55 +
                    Math.cos(wx * 16.2 - wy * 27.4) * 0.30 +
                    Math.sin(wx * 38.5 + wy * 31.2) * 0.15;

                // ── Specular: raking light from lx,ly normalised position ─────
                // Normal of the vein surface approximated from gradient of vs1
                const dvdx = Math.sin(wx * 0.52 + tb * 1.68 + t * 0.013 + 0.1) - pv1 / Math.max(0.1, vs1 + 0.01);
                const spec0 = Math.max(0, dvdx) * vs1;   // light catching vein edges
                // Overall soft Phong highlight
                const nx_norm = px / OW - lx;
                const ny_norm = py / OH - ly;
                const distL   = Math.sqrt(nx_norm * nx_norm + ny_norm * ny_norm);
                const phong   = Math.exp(-distL * distL / 0.28) * 0.35;

                // ── Compose ───────────────────────────────────────────────────
                let R = bR + grain * 3.8;
                let G = bG + grain * 3.2;
                let B = bB + grain * 2.6;

                // Primary vein blend
                R = R + (v1R - R) * vs1;
                G = G + (v1G - G) * vs1;
                B = B + (v1B - B) * vs1;

                // Secondary vein overlay
                const vs12 = Math.min(1, vs2 + vs3);
                R = R + (v2R - R) * vs12 * 0.55;
                G = G + (v2G - G) * vs12 * 0.55;
                B = B + (v2B - B) * vs12 * 0.55;

                // Hairline cracks (darken slightly)
                R = R * (1 - vs4 * 0.35);
                G = G * (1 - vs4 * 0.35);
                B = B * (1 - vs4 * 0.35);

                // Specular + Phong
                const specTotal = (phong + spec0 * 0.18 + sur * 0.22) * 1.0;
                R = R + (hiR - R) * specTotal;
                G = G + (hiG - G) * specTotal;
                B = B + (hiB - B) * specTotal;

                const idx = (py * OW + px) * 4;
                buf[idx]     = Math.max(0, Math.min(255, R | 0));
                buf[idx + 1] = Math.max(0, Math.min(255, G | 0));
                buf[idx + 2] = Math.max(0, Math.min(255, B | 0));
                buf[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        // Blink surge: brief white flare across the slab
        if (sur > 0.05) {
            const prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(255, 252, 235, ${sur * 0.18})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = prev;
        }
    }
}
