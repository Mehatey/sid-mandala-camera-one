// Wax Mode — encaustic wax panel seen from above.
// Hot beeswax is layered in translucent sheets: each layer is a different amber,
// ivory, or ochre tone. Where layers pool and cool they form crystalline structure —
// the same hexagonal tiling you see in beeswax combs, but looser and organic.
// Drips form and sag slowly. The surface has a deep lustrous glow — light scatters
// inside the wax before emerging, like skin in raking light.
// Mouse / hand: a gentle heat source melts nearby wax, disturbing the crystal grid.
// Blink: fresh hot wax poured — a bright molten event that cools into new layers.
class WaxMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._drips = [];
        this._pools = [];
        this._flash = 0;
        this._mx    = null;
        this._my    = null;
        this._off   = null;
        this._offCtx = null;
    }

    startScene() {
        this.t      = 0;
        this._flash = 0;
        this._mx    = null;

        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 180, OH = Math.round(180 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }

        // Wax layer "pools": slow-drifting warm blobs that define pooling centres
        // Each pool carries its own pigment tint
        this._pools = [];
        const tints = [
            [242, 198,  80],   // golden yellow
            [228, 168,  55],   // deep amber
            [248, 228, 165],   // pale ivory
            [210, 145,  42],   // burnt ochre
            [250, 215, 120],   // honey
            [195, 125,  38],   // dark amber
            [252, 238, 185],   // beeswax white
        ];
        for (let i = 0; i < 8; i++) {
            const tc = tints[i % tints.length];
            this._pools.push({
                x:     Math.random() * OW,
                y:     Math.random() * OH,
                vx:    (Math.random() - 0.5) * 0.015,
                vy:    (Math.random() - 0.5) * 0.010,
                r:     OW * (0.18 + Math.random() * 0.22),
                phase: Math.random() * Math.PI * 2,
                rate:  0.08 + Math.random() * 0.12,
                tR:    tc[0],
                tG:    tc[1],
                tB:    tc[2],
            });
        }
        this._drips = [];
    }

    onMouseMove(x, y) { this._mx = x; this._my = y; }
    onHandMove(nx, ny) {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._mx = (1 - nx) * W; this._my = ny * H;
    }

    onBlink() {
        this._flash = 1.0;
        // Pour a new hot pool at a random location
        const OW = this._off ? this._off.width  : 180;
        const OH = this._off ? this._off.height : 100;
        this._pools.push({
            x:     OW * (0.2 + Math.random() * 0.6),
            y:     OH * (0.2 + Math.random() * 0.6),
            vx:    (Math.random() - 0.5) * 0.025,
            vy:    (Math.random() - 0.5) * 0.018,
            r:     OW * (0.10 + Math.random() * 0.14),
            phase: Math.random() * Math.PI * 2,
            rate:  0.10 + Math.random() * 0.18,
            tR:    245 + Math.random() * 10,
            tG:    200 + Math.random() * 30,
            tB:     80 + Math.random() * 40,
        });
        if (this._pools.length > 12) this._pools.shift();
    }

    draw(time) {
        this.t      += 0.016;
        this._flash *= 0.94;

        const OW = this._off.width;
        const OH = this._off.height;
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;

        // Mouse position in buffer space
        let mBX = null, mBY = null;
        if (this._mx !== null) {
            mBX = (this._mx / W) * OW;
            mBY = (this._my / H) * OH;
        }

        // Update pool drift
        for (const p of this._pools) {
            p.vx += (Math.random() - 0.5) * 0.0008;
            p.vy += (Math.random() - 0.5) * 0.0006;
            // Heat disturbance: pools drift away from mouse (wax pushed aside)
            if (mBX !== null) {
                const dx = p.x - mBX, dy = p.y - mBY;
                const d  = Math.sqrt(dx*dx + dy*dy);
                if (d < p.r * 2 && d > 0.5) {
                    const f = Math.pow(1 - d / (p.r * 2), 2) * 0.012;
                    p.vx += (dx / d) * f;
                    p.vy += (dy / d) * f;
                }
            }
            p.vx *= 0.990; p.vy *= 0.990;
            p.x  += p.vx;  p.y  += p.vy;
            // Soft boundary wrap
            const pad = p.r;
            if (p.x < -pad)      p.x = OW + pad;
            if (p.x > OW + pad)  p.x = -pad;
            if (p.y < -pad)      p.y = OH + pad;
            if (p.y > OH + pad)  p.y = -pad;
        }

        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const t   = this.t;
        const fl  = this._flash;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                // ── Per-pixel wax composition ─────────────────────────────────
                let wR = 0, wG = 0, wB = 0, wTotal = 0;

                for (const p of this._pools) {
                    const dx    = px - p.x;
                    const dy    = py - p.y;
                    const dist  = Math.sqrt(dx * dx + dy * dy);
                    const pulse = 1 + 0.04 * Math.sin(t * p.rate + p.phase);
                    const r     = p.r * pulse;

                    // Main pool contribution: soft Gaussian
                    const mainW = Math.exp(-dist * dist / (r * r * 0.55));
                    // Edge pooling: translucent rim where wax thickens at edge
                    const rimD  = dist - r * 0.82;
                    const rimW  = Math.exp(-rimD * rimD / (r * r * 0.014)) * 0.50;

                    const contrib = mainW + rimW;
                    wR     += p.tR * contrib;
                    wG     += p.tG * contrib;
                    wB     += p.tB * contrib;
                    wTotal += contrib;
                }

                // ── Crystalline structure ─────────────────────────────────────
                // Hexagonal tiling: distance to nearest hex grid point
                // Standard hex grid in axial coordinates
                const hx = px / 6.8;   // scale to hex cell size
                const hy = py / 6.8;
                // Skewed to hex: compute fractional hex coordinates
                const q  = (2/3) * hx;
                const r  = (-1/3) * hx + (Math.sqrt(3)/3) * hy;
                const s  = -q - r;
                // Round to nearest hex
                let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
                const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
                if (dq > dr && dq > ds) rq = -rr - rs;
                else if (dr > ds) rr = -rq - rs;
                // Distance from pixel to cell centre
                const cxH = (3/2) * rq * 6.8;
                const cyH = (Math.sqrt(3) * (rq/2 + rr)) * 6.8;
                const dToCell = Math.sqrt((px - cxH) * (px - cxH) + (py - cyH) * (py - cyH));
                // Crystal facet value: bright at facet centre, dark at facet edges
                const cellR  = 6.8 * (Math.sqrt(3) / 2);  // inscribed radius
                const crystal = Math.pow(Math.max(0, 1 - dToCell / cellR), 1.4) * 0.22 + 0.78;
                // Vary crystal with time (subtle thermal shimmer)
                const shimmer = 1 + Math.sin(t * 0.25 + rq * 1.72 + rr * 2.34) * 0.018;

                // ── Subsurface scattering approximation ──────────────────────
                // Light scatters inside wax: blend toward a warm interior glow
                const interiorDepth = Math.min(1, wTotal * 0.60);
                const scatterR = 255, scatterG = 230, scatterB = 130;

                // ── Mouse heat: glowing melt spot ─────────────────────────────
                let heatGlow = 0;
                if (mBX !== null) {
                    const mDist = Math.sqrt((px - mBX) * (px - mBX) + (py - mBY) * (py - mBY));
                    heatGlow = Math.exp(-mDist * mDist / (OW * OW * 0.004)) * 0.55;
                }

                // ── Compose final pixel ───────────────────────────────────────
                let R, G, B;

                if (wTotal < 0.01) {
                    // Dark uncovered base (old cold wax, near black-brown)
                    R = 28; G = 18; B = 8;
                } else {
                    const avgR = wR / wTotal;
                    const avgG = wG / wTotal;
                    const avgB = wB / wTotal;

                    // Transparency blend: wax isn't perfectly opaque
                    const opacity = Math.min(1, wTotal * 0.72);
                    R = 28 * (1 - opacity) + avgR * opacity;
                    G = 18 * (1 - opacity) + avgG * opacity;
                    B =  8 * (1 - opacity) + avgB * opacity;

                    // Subsurface scatter brightens interior
                    R = R + (scatterR - R) * interiorDepth * 0.30;
                    G = G + (scatterG - G) * interiorDepth * 0.30;
                    B = B + (scatterB - B) * interiorDepth * 0.30;
                }

                // Crystal facet modulation
                R *= crystal * shimmer;
                G *= crystal * shimmer;
                B *= crystal * shimmer;

                // Heat glow (orange-white)
                R = Math.min(255, R + heatGlow * 80);
                G = Math.min(255, G + heatGlow * 45);
                B = Math.min(255, B + heatGlow * 10);

                // Blink pour flash: hot molten white-gold
                R = Math.min(255, R * (1 + fl * 0.55));
                G = Math.min(255, G * (1 + fl * 0.42));
                B = Math.min(255, B * (1 + fl * 0.22));

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
    }
}
