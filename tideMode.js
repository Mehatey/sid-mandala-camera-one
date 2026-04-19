// Tide Mode — bioluminescent ocean interference.
// Five planar sine waves crossing at different angles create slow, deep patterns.
// Where waves constructively interfere, bioluminescent organisms ignite.
// Blink: phase-shifts two waves and sends a radial ripple from centre.
class TideMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this.waves   = [];
        this.ripples = [];

        // 300×169 — higher resolution for smoother gradients
        this._off    = document.createElement('canvas');
        this._off.width  = 300;
        this._off.height = 169;
        this._offCtx = this._off.getContext('2d');
    }

    startScene() {
        this.t       = 0;
        this.ripples = [];
        // Five waves for richer, more complex interference
        this.waves   = [
            { fx:  0.0140, fy:  0.0000, phase: 0.00, speed: 0.240 },
            { fx:  0.0000, fy:  0.0120, phase: 1.57, speed: 0.210 },
            { fx:  0.0088, fy:  0.0088, phase: 3.14, speed: 0.185 },
            { fx:  0.0088, fy: -0.0088, phase: 0.79, speed: 0.200 },
            { fx: -0.0095, fy:  0.0055, phase: 2.35, speed: 0.175 },
        ];
    }

    onBlink() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        // Two ripples — slightly offset for more organic look
        this.ripples.push({
            cx: W / 2 + (Math.random() - 0.5) * 40,
            cy: H / 2 + (Math.random() - 0.5) * 30,
            r:    0,
            maxR: Math.max(W, H) * 0.90,
            amp:  2.2,
        });
        // Phase-shift two random waves
        const shuffle = [...this.waves].sort(() => Math.random() - 0.5);
        shuffle[0].phase += Math.PI * (0.60 + Math.random() * 1.0);
        shuffle[1].phase += Math.PI * (0.40 + Math.random() * 0.80);
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
            r.r   += 0.70;
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

                for (const rip of this.ripples) {
                    const dr  = Math.sqrt((wx - rip.cx) ** 2 + (wy - rip.cy) ** 2);
                    const ripV = rip.amp
                        * Math.sin((dr - rip.r) * 0.052)
                        * Math.exp(-Math.abs(dr - rip.r) * 0.009);
                    val += ripV;
                }

                // Tighter normalization — more of the range falls in the vivid zone
                const norm   = Math.max(0, Math.min(1, (val + 6) / 12));
                const bright = Math.pow(norm, 1.05);   // gentler gamma = more vivid midtones

                // Bioluminescent ocean palette — boosted saturation and brightness
                let r8, g8, b8;
                if (bright > 0.88) {
                    // Constructive peak — electric seafoam surge
                    const surge = (bright - 0.88) / 0.12;
                    r8 = Math.round(40  + surge * 160);
                    g8 = Math.round(220 + surge * 35);
                    b8 = Math.round(170 + surge * 85);
                } else if (bright > 0.65) {
                    // Vivid teal-blue zone — the glowing organism layer
                    const f = (bright - 0.65) / 0.23;
                    r8 = Math.round(8   + f * 32);
                    g8 = Math.round(80  + f * 140);
                    b8 = Math.round(110 + f * 60);
                } else if (bright > 0.38) {
                    // Deep teal — waves visible, dark but alive
                    const f = (bright - 0.38) / 0.27;
                    r8 = Math.round(3   + f * 5);
                    g8 = Math.round(18  + f * 62);
                    b8 = Math.round(45  + f * 65);
                } else {
                    // Abyss — near total darkness
                    const f = bright / 0.38;
                    r8 = Math.round(1 + f * 2);
                    g8 = Math.round(2 + f * 16);
                    b8 = Math.round(8 + f * 37);
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
