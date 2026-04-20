// Voronoi Mode — "living cells"
// Pixel-by-pixel Voronoi at 1/8 canvas resolution, scaled up pixelated for beautiful chunky cells.
// 18 seeds drift, bounce, attract/repel weakly. Borders glow bright gold. Cells breathe with hue.
// Cell death+birth: when 2 seeds get very close, one is absorbed and a new one spawns elsewhere.
// onBlink: full flash + randomise all seed positions and hues.
class VoronoiMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._NSEEDS  = 18;
        this._SCALE   = 8;   // 1/8 resolution
        this._seeds   = [];

        // Low-res offscreen buffer
        this._buf    = null;
        this._bufCtx = null;
        this._imgData = null;

        this._flash = 0;
    }

    startScene() {
        this.t      = 0;
        this._flash = 0;
        this._initBuffer();
        this._initSeeds(true);
    }

    onBlink() {
        this._flash = 1.0;
        this._initSeeds(false);
    }

    onGaze(nx, ny) {
        // Gently attract seeds toward gaze point
        if (nx == null || ny == null) return;
        const W = this.canvas.width  / this._SCALE;
        const H = this.canvas.height / this._SCALE;
        const gx = nx * W, gy = ny * H;
        for (const s of this._seeds) {
            const dx = gx - s.x, dy = gy - s.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 0.001) continue;
            const f = 0.002 / Math.sqrt(dist2);
            s.vx += dx * f;
            s.vy += dy * f;
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────

    _initBuffer() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const bw = Math.floor(W / this._SCALE);
        const bh = Math.floor(H / this._SCALE);
        if (!this._buf) this._buf = document.createElement('canvas');
        this._buf.width  = bw;
        this._buf.height = bh;
        this._bufCtx = this._buf.getContext('2d');
        this._imgData = this._bufCtx.createImageData(bw, bh);
    }

    _initSeeds(spread) {
        const W = (this.canvas.width  || 800) / this._SCALE;
        const H = (this.canvas.height || 600) / this._SCALE;
        this._seeds = [];
        for (let i = 0; i < this._NSEEDS; i++) {
            this._seeds.push({
                x:    spread ? W * 0.1 + Math.random() * W * 0.8 : Math.random() * W,
                y:    spread ? H * 0.1 + Math.random() * H * 0.8 : Math.random() * H,
                vx:   (Math.random() - 0.5) * 0.25,
                vy:   (Math.random() - 0.5) * 0.25,
                hue:  Math.random() * 360,
                age:  Math.random() * 200,
            });
        }
    }

    // Inline HSL → RGB: returns [r, g, b] in 0..255
    _hsl2rgb(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if      (h < 60)  { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else              { r = c; g = 0; b = x; }
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
        ];
    }

    _updateSeeds() {
        const W = (this.canvas.width  || 800) / this._SCALE;
        const H = (this.canvas.height || 600) / this._SCALE;
        const MERGE_DIST2 = (W * 0.07) ** 2;
        const REPEL_DIST2 = (W * 0.18) ** 2;
        const ATTRACT_DIST2 = (W * 0.50) ** 2;

        for (let i = 0; i < this._seeds.length; i++) {
            const a = this._seeds[i];
            for (let j = i + 1; j < this._seeds.length; j++) {
                const b = this._seeds[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 0.001) continue;
                if (d2 < MERGE_DIST2) {
                    // Absorb the younger seed, spawn new one far away
                    const younger = a.age < b.age ? i : j;
                    const seed = this._seeds[younger];
                    seed.x   = W * 0.1 + Math.random() * W * 0.8;
                    seed.y   = H * 0.1 + Math.random() * H * 0.8;
                    seed.vx  = (Math.random() - 0.5) * 0.3;
                    seed.vy  = (Math.random() - 0.5) * 0.3;
                    seed.hue = Math.random() * 360;
                    seed.age = 0;
                    break; // one merge per frame is fine
                }
                const d = Math.sqrt(d2);
                let fx = 0, fy = 0;
                if (d2 < REPEL_DIST2) {
                    // Weak repulsion
                    const f = 0.0008 * (REPEL_DIST2 - d2) / REPEL_DIST2 / d;
                    fx = -dx * f; fy = -dy * f;
                } else if (d2 < ATTRACT_DIST2) {
                    // Very weak attraction
                    const f = 0.0002 * (d2 - REPEL_DIST2) / ATTRACT_DIST2 / d;
                    fx = dx * f; fy = dy * f;
                }
                a.vx += fx; a.vy += fy;
                b.vx -= fx; b.vy -= fy;
            }
        }

        for (const s of this._seeds) {
            s.age++;
            s.hue = (s.hue + 0.06) % 360;
            s.vx  *= 0.98;
            s.vy  *= 0.98;
            s.x   += s.vx;
            s.y   += s.vy;
            // Bounce
            if (s.x < 0)  { s.x = 0;  s.vx =  Math.abs(s.vx); }
            if (s.x > W)  { s.x = W;  s.vx = -Math.abs(s.vx); }
            if (s.y < 0)  { s.y = 0;  s.vy =  Math.abs(s.vy); }
            if (s.y > H)  { s.y = H;  s.vy = -Math.abs(s.vy); }
        }
    }

    _renderVoronoi() {
        const bw = this._buf.width;
        const bh = this._buf.height;
        const data = this._imgData.data;
        const seeds = this._seeds;
        const ns = seeds.length;

        for (let py = 0; py < bh; py++) {
            for (let px = 0; px < bw; px++) {
                // Find 2 nearest seeds
                let d1 = Infinity, d2 = Infinity;
                let idx1 = 0;
                for (let k = 0; k < ns; k++) {
                    const dx = px - seeds[k].x, dy = py - seeds[k].y;
                    const d = dx * dx + dy * dy;
                    if (d < d1) { d2 = d1; d1 = d; idx1 = k; }
                    else if (d < d2) { d2 = d; }
                }
                const borderT = 2.5; // squared-distance delta threshold for border
                const isBorder = (d2 - d1) < borderT;
                const idx = py * bw + px;
                let r, g, b, a;
                if (isBorder) {
                    // Bright gold/white border
                    const compHue = (seeds[idx1].hue + 55) % 360;
                    const lum = 82 + 15 * Math.sin(this.t * 1.2 + idx1);
                    [r, g, b] = this._hsl2rgb(compHue, 88, lum);
                    a = 255;
                } else {
                    // Interior — hue of nearest seed, darker away from centre
                    const cellR  = Math.sqrt(d1);
                    const maxR   = Math.min(bw, bh) * 0.35;
                    const vignette = Math.max(0, 1 - cellR / maxR * 0.6);
                    const lum    = 30 + vignette * 22;
                    const sat    = 55 + vignette * 20;
                    [r, g, b] = this._hsl2rgb(seeds[idx1].hue, sat, lum);
                    a = 255;
                }
                const base = idx * 4;
                data[base]     = r;
                data[base + 1] = g;
                data[base + 2] = b;
                data[base + 3] = a;
            }
        }
        this._bufCtx.putImageData(this._imgData, 0, 0);
    }

    // ── Main draw ───────────────────────────────────────────────────────

    draw(ts) {
        this.t += 0.016;
        this._flash = Math.max(0, this._flash - 0.04);

        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;

        // Ensure buffer matches
        if (!this._buf ||
            this._buf.width  !== Math.floor(W / this._SCALE) ||
            this._buf.height !== Math.floor(H / this._SCALE)) {
            this._initBuffer();
        }

        this._updateSeeds();
        this._renderVoronoi();

        // Draw scaled-up — disable smoothing for crisp pixelated look
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this._buf, 0, 0, W, H);
        ctx.restore();

        // Flash overlay on blink
        if (this._flash > 0) {
            ctx.save();
            ctx.globalAlpha = this._flash * 0.55;
            ctx.fillStyle   = '#fff';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // Always reset
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
