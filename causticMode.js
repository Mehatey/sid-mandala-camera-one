// Caustic Mode — wet glass at night.
//
// Water droplets on a cold window act as tiny lenses, bending warm street-lamp
// light into organic pooling caustics: bright rings that overlap into amber blobs,
// dark channels between them, the whole surface slowly alive.
//
// The same phenomenon as the circles that burn into your eyes after looking at
// the sun — light concentrated by an imperfect lens to a bright ring, then fading
// outward into darkness.
//
// Rendered at 240×135 pixel buffer. Each "drop" contributes two gaussian rings
// (caustic + secondary) and an outer diffuse halo. Rings overlap → organic shapes.
//
// Mouse / hand: gently disturbs nearby drops like pressing the glass.
// Blink: sudden overexposure flash → the whole pane flares white-gold.

class CausticMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._drops    = [];
        this._flash    = 0;   // blink flash intensity
        this._mx       = null;
        this._my       = null;
        this._off      = null;
        this._offCtx   = null;
        // Pre-built color ramp: 256 entries, each [r,g,b]
        this._ramp     = null;
        this._buildRamp();
    }

    // Warm caustic color ramp: near-black → deep amber → gold → warm white
    _buildRamp() {
        this._ramp = new Uint8Array(256 * 3);
        const stops = [
            { t: 0.00, r:   3, g:   2, b:   0 },
            { t: 0.18, r:  55, g:  28, b:   3 },
            { t: 0.38, r: 160, g:  80, b:  12 },
            { t: 0.58, r: 235, g: 155, b:  35 },
            { t: 0.76, r: 255, g: 210, b:  90 },
            { t: 0.90, r: 255, g: 238, b: 160 },
            { t: 1.00, r: 255, g: 252, b: 220 },
        ];
        for (let i = 0; i < 256; i++) {
            const ft = i / 255;
            let s0 = stops[0], s1 = stops[1];
            for (let s = 1; s < stops.length - 1; s++) {
                if (ft >= stops[s].t) { s0 = stops[s]; s1 = stops[s + 1]; }
            }
            const span = s1.t - s0.t || 1;
            const u    = Math.max(0, Math.min(1, (ft - s0.t) / span));
            this._ramp[i * 3 + 0] = Math.round(s0.r + (s1.r - s0.r) * u);
            this._ramp[i * 3 + 1] = Math.round(s0.g + (s1.g - s0.g) * u);
            this._ramp[i * 3 + 2] = Math.round(s0.b + (s1.b - s0.b) * u);
        }
    }

    startScene() {
        this.t      = 0;
        this._flash = 0;
        this._mx    = null;

        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        // 240×135 pixel caustic buffer — smooth upscale to full canvas
        const OW = 240, OH = Math.round(240 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }

        // Seed drops in buffer coordinate space
        const N = 20;
        this._drops = [];
        for (let i = 0; i < N; i++) {
            const r = 7 + Math.random() * 14;   // caustic ring radius in buf px
            this._drops.push({
                x:         Math.random() * OW,
                y:         Math.random() * OH,
                vx:        (Math.random() - 0.5) * 0.028,
                vy:        (Math.random() - 0.5) * 0.022,
                ax:        0, ay: 0,
                r,
                intensity: 0.55 + Math.random() * 0.45,
                phase:     Math.random() * Math.PI * 2,
                pulseRate: 0.18 + Math.random() * 0.28,
            });
        }
    }

    onMouseMove(x, y) {
        this._mx = x;
        this._my = y;
    }
    onHandMove(nx, ny) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this._mx = (1 - nx) * W;
        this._my = ny * H;
    }

    onBlink() {
        // Flash: the scene overexposes like a camera in bright light
        this._flash = 1.0;
        // A few drops pulse outward — rings flare
        for (const d of this._drops) {
            d.phase += Math.random() * Math.PI;
        }
    }

    draw(time) {
        this.t += 0.016;
        this._flash *= 0.940;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const OW  = this._off.width;
        const OH  = this._off.height;

        // ── Map mouse to buffer coordinates ──────────────────────────────────────
        let mBufX = null, mBufY = null;
        if (this._mx !== null) {
            mBufX = (this._mx / W) * OW;
            mBufY = (this._my / H) * OH;
        }

        // ── Update drop physics ───────────────────────────────────────────────────
        for (const d of this._drops) {
            // Gentle Brownian wander
            d.vx += (Math.random() - 0.5) * 0.0012;
            d.vy += (Math.random() - 0.5) * 0.0009;

            // Mouse repulsion: finger on glass pushes drops
            if (mBufX !== null) {
                const mdx  = d.x - mBufX;
                const mdy  = d.y - mBufY;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                const inf   = d.r * 3.5;
                if (mdist < inf && mdist > 0.1) {
                    const f = Math.pow((inf - mdist) / inf, 2) * 0.018;
                    d.vx += (mdx / mdist) * f;
                    d.vy += (mdy / mdist) * f;
                }
            }

            d.vx *= 0.988;
            d.vy *= 0.988;
            d.x  += d.vx;
            d.y  += d.vy;

            // Wrap at edges
            const pad = d.r * 2;
            if (d.x < -pad)       d.x = OW + pad;
            if (d.x > OW + pad)   d.x = -pad;
            if (d.y < -pad)       d.y = OH + pad;
            if (d.y > OH + pad)   d.y = -pad;
        }

        // ── Pixel-level caustic render ────────────────────────────────────────────
        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const ramp = this._ramp;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                let brightness = 0;

                for (const d of this._drops) {
                    const pulse = 0.91 + 0.09 * Math.sin(this.t * d.pulseRate + d.phase);
                    const r     = d.r * pulse;

                    const dx   = px - d.x;
                    const dy   = py - d.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const inv  = d.intensity;

                    // Primary caustic ring: gaussian at r * 0.70
                    const caustR = r * 0.70;
                    const dRing  = dist - caustR;
                    const wRing  = r * 0.22;
                    brightness  += Math.exp(-(dRing * dRing) / (wRing * wRing)) * inv * 1.00;

                    // Secondary inner ring (total internal reflection):  r * 0.38
                    const innerR  = r * 0.38;
                    const dInner  = dist - innerR;
                    const wInner  = r * 0.13;
                    brightness   += Math.exp(-(dInner * dInner) / (wInner * wInner)) * inv * 0.52;

                    // Soft outer diffuse halo
                    const haloR   = r * 1.55;
                    brightness   += Math.exp(-(dist * dist) / (haloR * haloR)) * inv * 0.20;
                }

                // Blink flash lifts entire brightness
                brightness *= (1 + this._flash * 1.2);

                // Gamma-correct and clamp to [0, 1]
                const norm   = Math.min(1, Math.pow(Math.min(2, brightness) * 0.72, 0.82));
                const ri     = Math.round(norm * 255);

                const pidx   = (py * OW + px) * 4;
                buf[pidx]     = ramp[ri * 3];
                buf[pidx + 1] = ramp[ri * 3 + 1];
                buf[pidx + 2] = ramp[ri * 3 + 2];
                buf[pidx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);

        // ── Upscale caustic layer ─────────────────────────────────────────────────
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        // ── Ambient street-lamp glow overlaid with screen blend ───────────────────
        const prevComp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'screen';

        // Warm point source (bottom-left, like the lamp in the video)
        const lx = W * 0.36;
        const ly = H * 0.88;
        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, H * 0.55);
        lg.addColorStop(0,   `rgba(255, 230, 110, ${0.10 + this._flash * 0.15})`);
        lg.addColorStop(0.35, `rgba(255, 190, 50,  ${0.04 + this._flash * 0.06})`);
        lg.addColorStop(1,    'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, W, H);

        // Blink overexposure wash
        if (this._flash > 0.04) {
            ctx.fillStyle = `rgba(255, 240, 170, ${this._flash * 0.28})`;
            ctx.fillRect(0, 0, W, H);
        }

        ctx.globalCompositeOperation = prevComp;
    }
}
