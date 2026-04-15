// Nacre Mode — thin-film iridescence across the entire canvas.
//
// Mother of pearl, soap bubbles, beetle wings, oil on water — they share the same
// physics: light reflecting from both surfaces of a thin transparent film interferes
// with itself. Constructive interference at one wavelength, destructive at another.
// The result is pure spectral color determined entirely by film thickness.
//
// Newton's rings color sequence (zero → thick): near-black → silver → yellow →
// orange → red → purple → blue → blue-green → green → yellow-green → (repeat).
//
// Here, a domain-warped thickness field maps every pixel to a spectral color.
// The field drifts slowly — the surface breathes, shifts, flows.
// A specular highlight moves across the surface like a lamp overhead.
// Mouse: touch sends a ripple across the film, locally shifting the colors outward.
// Blink: phase jump — the entire pattern rearranges, new colors rise.
class NacreMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this._phase   = 0;   // phase offset, accumulated on blink
        this._surge   = 0;
        this._ripples = [];
        this._mx      = null;
        this._my      = null;
        this._off     = null;
        this._offCtx  = null;
        this._ramp    = null;
        this._buildRamp();
    }

    // Newton's rings spectral ramp — 512 entries, cycling from black → full spectrum → black
    _buildRamp() {
        const N = 512;
        this._ramp = new Uint8Array(N * 3);
        const stops = [
            { t: 0.000, r:  8, g:  6, b: 14 },   // 0th order dark
            { t: 0.052, r:162, g:160, b:172 },   // silver
            { t: 0.105, r:255, g:248, b:135 },   // pale yellow
            { t: 0.162, r:255, g:198, b: 44 },   // golden yellow
            { t: 0.215, r:252, g: 98, b: 28 },   // orange
            { t: 0.264, r:228, g: 30, b: 42 },   // red
            { t: 0.320, r:178, g: 12, b:128 },   // crimson
            { t: 0.388, r: 88, g: 10, b:188 },   // violet
            { t: 0.452, r: 16, g: 46, b:228 },   // deep blue
            { t: 0.518, r: 12, g:148, b:202 },   // blue-cyan
            { t: 0.592, r: 16, g:195, b: 80 },   // green
            { t: 0.652, r:152, g:218, b: 32 },   // yellow-green
            { t: 0.705, r:250, g:235, b: 46 },   // yellow (2nd order)
            { t: 0.752, r:255, g:155, b: 32 },   // orange
            { t: 0.796, r:238, g: 48, b: 36 },   // red
            { t: 0.844, r:165, g: 16, b:140 },   // magenta
            { t: 0.902, r: 36, g: 40, b:210 },   // blue
            { t: 0.956, r: 12, g:128, b:168 },   // blue-green
            { t: 1.000, r:  8, g:  6, b: 14 },   // back to dark (seamless cycle)
        ];
        for (let i = 0; i < N; i++) {
            const ft = i / (N - 1);
            let s0 = stops[0], s1 = stops[1];
            for (let s = 1; s < stops.length - 1; s++) {
                if (ft >= stops[s].t) { s0 = stops[s]; s1 = stops[s + 1]; }
            }
            const span = s1.t - s0.t || 1;
            const u    = Math.max(0, Math.min(1, (ft - s0.t) / span));
            this._ramp[i * 3]     = Math.round(s0.r + (s1.r - s0.r) * u);
            this._ramp[i * 3 + 1] = Math.round(s0.g + (s1.g - s0.g) * u);
            this._ramp[i * 3 + 2] = Math.round(s0.b + (s1.b - s0.b) * u);
        }
    }

    startScene() {
        this.t        = 0;
        this._phase   = 0;
        this._surge   = 0;
        this._ripples = [];
        this._mx      = null;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 220, OH = Math.round(220 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }
    }

    onBlink() {
        // Phase jump: the entire colour topology rearranges
        this._phase += 0.26 + Math.random() * 0.24;
        this._surge  = 1.0;
    }

    onMouseMove(x, y) {
        if (!this._off) return;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._ripples.push({
            bx:  (x / W) * this._off.width,
            by:  (y / H) * this._off.height,
            t0:  this.t,
            amp: 0.13 + Math.random() * 0.09,
        });
        if (this._ripples.length > 6) this._ripples.shift();
    }

    onHandMove(nx, ny) {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this.onMouseMove((1 - nx) * W, ny * H);
    }

    draw(time) {
        this.t      += 0.016;
        this._surge *= 0.93;
        this._ripples = this._ripples.filter(r => (this.t - r.t0) < 4.0);

        const OW   = this._off.width;
        const OH   = this._off.height;
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;
        const img  = this._offCtx.createImageData(OW, OH);
        const buf  = img.data;
        const ramp = this._ramp;
        const RN   = (ramp.length / 3) - 1;
        const t    = this.t;
        const ph   = this._phase + t * 0.010;  // very slow phase drift
        const sur  = this._surge;

        const OC     = Math.min(OW, OH);
        const halfOW = OW * 0.5, halfOH = OH * 0.5, halfOC = OC * 0.5;

        // Specular highlight position: slow autonomous orbit + surge brightness
        const specX = Math.sin(t * 0.16) * 0.48;
        const specY = Math.cos(t * 0.11) * 0.34;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                const nx = (px - halfOW) / halfOC;
                const ny = (py - halfOH) / halfOC;

                // ── Domain warp: organic drift of the film surface ────────────
                // Level 1: large slow bands
                const wA = Math.sin(nx * 1.88 + ny * 0.94 + t * 0.110) * 0.96
                         + Math.cos(ny * 1.44 - nx * 0.70 + t * 0.082) * 0.58;
                const wB = Math.cos(nx * 1.24 - ny * 1.58 + t * 0.092) * 0.88
                         + Math.sin(nx * 2.02 + ny * 0.84 + t * 0.072) * 0.52;

                const wx = nx + wA * 0.46;
                const wy = ny + wB * 0.40;

                // ── Thickness field: multi-octave iridescent structure ────────
                let thick =
                    Math.sin(wx * 2.64 + wy * 1.88 + t * 0.054) * 0.44 +
                    Math.cos(wx * 1.94 - wy * 2.30 + t * 0.038) * 0.28 +
                    Math.sin(wx * 4.22 + wy * 3.08 + t * 0.027) * 0.15 +
                    Math.cos(wx * 0.84 + wy * 1.20 + t * 0.018) * 0.08 +
                    Math.sin(wx * 6.44 - wy * 4.78 + t * 0.014) * 0.05;

                // Fine micro-texture: platelet edges of nacre
                thick +=
                    Math.sin(nx * 26.8 + ny * 22.2 + t * 0.020) * 0.052 +
                    Math.cos(nx * 18.2 - ny * 29.8 + t * 0.014) * 0.030;

                // Phase offset (blink + slow drift)
                thick += ph;

                // Ripple contributions
                for (const rip of this._ripples) {
                    const rd  = Math.sqrt((px - rip.bx) * (px - rip.bx) + (py - rip.by) * (py - rip.by));
                    const age = t - rip.t0;
                    const rR  = age * 30;  // expanding ring
                    thick += Math.exp(-Math.pow(rd - rR, 2) / 36) * rip.amp * Math.exp(-age * 1.3);
                }

                // Normalise to [0, 1] with periodic wrap
                let th = (thick * 0.5 + 0.5);
                th = th - Math.floor(th);

                // Ramp lookup
                const ri = Math.min(RN, th * RN | 0);
                let R = ramp[ri * 3], G = ramp[ri * 3 + 1], B = ramp[ri * 3 + 2];

                // ── Specular highlight: moving lamp raking the surface ────────
                const sdx   = nx - specX, sdy = ny - specY;
                const spec  = Math.exp(-(sdx * sdx + sdy * sdy) / 0.34) * (0.28 + sur * 0.24);
                R = Math.min(255, R + spec * (255 - R) * 0.52) | 0;
                G = Math.min(255, G + spec * (255 - G) * 0.52) | 0;
                B = Math.min(255, B + spec * (255 - B) * 0.52) | 0;

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
