// Tide Mode — four planar sine waves crossing at different angles create slow interference.
// Like staring into deep water where light bends in impossible ways.
// Blinks phase-shift a wave and send a ripple from centre.
// Monochromatic deep blue-silver: purely about movement, not colour.
class TideMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this.waves   = [];
        this.ripples = [];

        // 80×45 pixel buffer — very smooth upscale gives water-surface look
        this._off    = document.createElement('canvas');
        this._off.width  = 80;
        this._off.height = 45;
        this._offCtx = this._off.getContext('2d');
    }

    startScene() {
        this.t       = 0;
        this.ripples = [];
        this.waves   = [
            { fx:  0.0155, fy:  0.0000, phase: 0.00, speed: 0.260 },  // horizontal
            { fx:  0.0000, fy:  0.0135, phase: 1.57, speed: 0.228 },  // vertical
            { fx:  0.0098, fy:  0.0098, phase: 3.14, speed: 0.196 },  // diagonal ↘
            { fx:  0.0098, fy: -0.0098, phase: 0.79, speed: 0.214 },  // diagonal ↗
        ];
    }

    onBlink() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.ripples.push({
            cx:   W / 2,
            cy:   H / 2,
            r:    0,
            maxR: Math.max(W, H) * 0.82,
            amp:  1.3,
        });
        // Phase-shift a random wave — whole pattern reorganises
        const w   = this.waves[Math.floor(Math.random() * this.waves.length)];
        w.phase  += Math.PI * (0.55 + Math.random() * 0.90);
    }

    draw(t) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        for (const w of this.waves) {
            w.phase += w.speed * 0.016;
        }
        this.ripples = this.ripples.filter(r => r.r < r.maxR);
        for (const r of this.ripples) {
            r.r   += 0.55;
            r.amp *= 0.9920;
        }

        const ow  = this._off.width;
        const oh  = this._off.height;
        const img = this._offCtx.createImageData(ow, oh);
        const d   = img.data;

        for (let py = 0; py < oh; py++) {
            for (let px = 0; px < ow; px++) {
                const wx = (px / ow) * W;
                const wy = (py / oh) * H;

                let val = 0;
                for (const w of this.waves) {
                    val += Math.sin(wx * w.fx + wy * w.fy + w.phase);
                }
                // val ∈ [-4, 4]

                for (const rip of this.ripples) {
                    const dr  = Math.sqrt((wx - rip.cx) ** 2 + (wy - rip.cy) ** 2);
                    const ripV = rip.amp
                        * Math.sin((dr - rip.r) * 0.048)
                        * Math.exp(-Math.abs(dr - rip.r) * 0.011);
                    val += ripV;
                }

                const norm    = Math.max(0, Math.min(1, (val + 5) / 10));
                const bright  = Math.pow(norm, 1.22);

                // Base: deep navy → steel blue → cold silver
                // Peaks: brief saturated teal-white flash where all waves constructively interfere
                let r8, g8, b8;
                if (bright > 0.82) {
                    // Constructive peak — vivid teal-white surge
                    const surge = (bright - 0.82) / 0.18;
                    r8 = Math.round(140 + surge * 115);
                    g8 = Math.round(185 + surge * 70);
                    b8 = Math.round(220 + surge * 35);
                } else {
                    r8 = Math.round(bright * 140 + 5);
                    g8 = Math.round(bright * 168 + 10);
                    b8 = Math.round(bright * 210 + 18);
                }

                const idx = (py * ow + px) * 4;
                d[idx]     = r8;
                d[idx + 1] = g8;
                d[idx + 2] = b8;
                d[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'medium'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);
    }
}
