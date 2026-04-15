// Lava Mode — a slow lava lamp rendered with metaball implicit surfaces.
// Warm wax blobs rise through dark amber liquid, merge when they meet, split
// apart when they cool. The same physics as oil in water, the same drowsy rhythm.
// Blink: a heat surge — all blobs pulse outward and glow brilliant amber-white.
// Mouse / hand: gentle heat — nearby blobs are drawn toward your presence.
class LavaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._blobs = [];
        this._flash = 0;
        this._off   = null; this._offCtx = null;
        this._ramp  = null;
        this._mx    = null; this._my = null;
        this._buildRamp();
    }

    // Color ramp: deep midnight → indigo → soft violet → pale lavender core
    // Shifted to cool tones — meditatively dark, not lava-lamp warm
    _buildRamp() {
        const N = 512;
        this._ramp = new Uint8Array(N * 3);
        const stops = [
            { f: 0.00, r:   1, g:   1, b:   6 },
            { f: 0.22, r:   6, g:   4, b:  22 },
            { f: 0.50, r:  22, g:  12, b:  68 },
            { f: 0.72, r:  75, g:  30, b: 165 },
            { f: 0.88, r: 120, g:  55, b: 220 },
            { f: 1.00, r: 162, g:  85, b: 248 },  // surface
            { f: 1.18, r: 195, g: 138, b: 255 },  // just inside
            { f: 1.50, r: 228, g: 192, b: 255 },  // interior
            { f: 2.00, r: 248, g: 238, b: 255 },  // soft core
        ];
        const maxF = 2.0;
        for (let i = 0; i < N; i++) {
            const ft = (i / (N - 1)) * maxF;
            let s0 = stops[0], s1 = stops[1];
            for (let s = 1; s < stops.length - 1; s++) {
                if (ft >= stops[s].f) { s0 = stops[s]; s1 = stops[s + 1]; }
            }
            const span = s1.f - s0.f || 1;
            const u    = Math.max(0, Math.min(1, (ft - s0.f) / span));
            this._ramp[i * 3]     = Math.round(s0.r + (s1.r - s0.r) * u);
            this._ramp[i * 3 + 1] = Math.round(s0.g + (s1.g - s0.g) * u);
            this._ramp[i * 3 + 2] = Math.round(s0.b + (s1.b - s0.b) * u);
        }
    }

    startScene() {
        this.t = 0; this._flash = 0; this._mx = null;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 200, OH = Math.round(200 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off = document.createElement('canvas');
            this._off.width = OW; this._off.height = OH;
            this._offCtx = this._off.getContext('2d');
        }
        this._blobs = [];
        const N = 7;
        for (let i = 0; i < N; i++) {
            const r = 8 + Math.random() * 10;
            this._blobs.push({
                x:        (0.15 + Math.random() * 0.70) * OW,
                y:        (0.15 + Math.random() * 0.70) * OH,
                vx:       (Math.random() - 0.5) * 0.04,
                vy:       (Math.random() - 0.5) * 0.03,
                r,
                // Blob oscillates vertically: warm = rises, cool = falls
                risePhase: Math.random() * Math.PI * 2,
                riseRate:  0.22 + Math.random() * 0.28,
                // Horizontal sway
                swayPhase: Math.random() * Math.PI * 2,
                swayAmp:   OW * (0.04 + Math.random() * 0.06),
                swayRate:  0.12 + Math.random() * 0.10,
                // Home column
                homeX:    (0.15 + Math.random() * 0.70) * OW,
            });
        }
    }

    onMouseMove(x, y)  { this._mx = x; this._my = y; }
    onHandMove(nx, ny) {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._mx = (1 - nx) * W; this._my = ny * H;
    }
    onBlink() {
        this._flash = 1.0;
        for (const b of this._blobs) {
            b.vy -= 0.12 + Math.random() * 0.10;
        }
    }

    draw(time) {
        this.t += 0.016;
        this._flash *= 0.945;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const OW  = this._off.width;
        const OH  = this._off.height;

        // Mouse in buffer space
        let mBX = null, mBY = null;
        if (this._mx !== null) { mBX = (this._mx / W) * OW; mBY = (this._my / H) * OH; }

        // Update blob positions
        for (const b of this._blobs) {
            // Vertical oscillation (heat convection)
            const rise = Math.sin(this.t * b.riseRate + b.risePhase);
            b.vy += rise * 0.0025;

            // Horizontal sway around home column
            const sway = b.homeX + Math.sin(this.t * b.swayRate + b.swayPhase) * b.swayAmp;
            b.vx += (sway - b.x) * 0.0008;

            // Weak gravity when cold (bottom half)
            if (b.y > OH * 0.6) b.vy += 0.003;

            // Heat source at base — gentle upward drift
            b.vy -= 0.001;

            // Mouse / hand warmth — attract blobs
            if (mBX !== null) {
                const mdx = mBX - b.x, mdy = mBY - b.y;
                const md  = Math.hypot(mdx, mdy);
                const inf = b.r * 5;
                if (md < inf && md > 0.5) {
                    const f = Math.pow((inf - md) / inf, 2) * 0.012;
                    b.vx += (mdx / md) * f;
                    b.vy += (mdy / md) * f;
                }
            }

            b.vx *= 0.975; b.vy *= 0.975;
            b.x  += b.vx;  b.y  += b.vy;

            // Soft bounce at walls
            const pad = b.r * 1.5;
            if (b.x < pad)       { b.vx +=  0.05; }
            if (b.x > OW - pad)  { b.vx -=  0.05; }
            if (b.y < pad)       { b.vy +=  0.05; }
            if (b.y > OH - pad)  { b.vy -=  0.05; }
        }

        // Pixel-level metaball render
        const img  = this._offCtx.createImageData(OW, OH);
        const buf  = img.data;
        const ramp = this._ramp;
        const RAMP_MAX = (this._ramp.length / 3) - 1;
        const flashBoost = 1 + this._flash * 0.7;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                let field = 0;
                for (const b of this._blobs) {
                    const dx = px - b.x, dy = py - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 0.01) { field += 50; continue; }
                    field += (b.r * b.r) / d2;
                }
                field *= flashBoost;
                // Clamp field to ramp range (0 – 2.0)
                const ri = Math.min(RAMP_MAX, Math.round((field / 2.0) * RAMP_MAX));
                const idx = (py * OW + px) * 4;
                buf[idx]     = ramp[ri * 3];
                buf[idx + 1] = ramp[ri * 3 + 1];
                buf[idx + 2] = ramp[ri * 3 + 2];
                buf[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        // Flash bloom on blink
        if (this._flash > 0.04) {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(140, 80, 255, ${this._flash * 0.22})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
