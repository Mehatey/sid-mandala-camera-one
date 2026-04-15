// Tide Mode — four planar sine waves crossing at different angles create slow interference.
// Bioluminescent ocean: dark abyss lit from within by impossible living light.
// Blinks phase-shift a wave and send a ripple from centre.
class TideMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this.waves   = [];
        this.ripples = [];

        // 240×135 — 3× higher resolution, smooth upscale without pixelation
        this._off    = document.createElement('canvas');
        this._off.width  = 240;
        this._off.height = 135;
        this._offCtx = this._off.getContext('2d');
    }

    startScene() {
        this.t       = 0;
        this.ripples = [];
        this.waves   = [
            { fx:  0.0155, fy:  0.0000, phase: 0.00, speed: 0.260 },
            { fx:  0.0000, fy:  0.0135, phase: 1.57, speed: 0.228 },
            { fx:  0.0098, fy:  0.0098, phase: 3.14, speed: 0.196 },
            { fx:  0.0098, fy: -0.0098, phase: 0.79, speed: 0.214 },
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
            amp:  1.4,
        });
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
            r.amp *= 0.9915;
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

                for (const rip of this.ripples) {
                    const dr  = Math.sqrt((wx - rip.cx) ** 2 + (wy - rip.cy) ** 2);
                    const ripV = rip.amp
                        * Math.sin((dr - rip.r) * 0.048)
                        * Math.exp(-Math.abs(dr - rip.r) * 0.011);
                    val += ripV;
                }

                const norm   = Math.max(0, Math.min(1, (val + 5) / 10));
                const bright = Math.pow(norm, 1.18);

                // Bioluminescent ocean palette:
                // darkness (0)   → deep abyss:   (1, 2, 8)
                // low (0–0.35)   → dark navy:     (5, 20, 40)
                // mid (0.35–0.7) → deep teal:     (12, 65, 85)
                // high (0.7–0.9) → vivid teal-green: (50, 185, 155)
                // peak (0.9–1.0) → bright seafoam: (160, 245, 220)
                let r8, g8, b8;
                if (bright > 0.90) {
                    // Constructive peak — bright seafoam surge
                    const surge = (bright - 0.90) / 0.10;
                    r8 = Math.round(50  + surge * 110);
                    g8 = Math.round(185 + surge * 60);
                    b8 = Math.round(155 + surge * 65);
                } else if (bright > 0.70) {
                    // Vivid teal-green
                    const f = (bright - 0.70) / 0.20;
                    r8 = Math.round(12  + f * 38);
                    g8 = Math.round(65  + f * 120);
                    b8 = Math.round(85  + f * 70);
                } else if (bright > 0.35) {
                    // Deep teal zone
                    const f = (bright - 0.35) / 0.35;
                    r8 = Math.round(5   + f * 7);
                    g8 = Math.round(20  + f * 45);
                    b8 = Math.round(40  + f * 45);
                } else {
                    // Near-black abyss
                    const f = bright / 0.35;
                    r8 = Math.round(1 + f * 4);
                    g8 = Math.round(2 + f * 18);
                    b8 = Math.round(8 + f * 32);
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
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);
    }
}
