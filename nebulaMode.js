// Nebula Mode — a stellar nursery seen in false-colour emission imaging.
//
// In the Orion Nebula, the Pillars of Creation, the Crab Nebula, gas and dust
// collapse under gravity and ignite new suns. What we see from Earth, rendered
// by Hubble, is light we cannot see with our eyes — mapped to false colour:
//
//   H-alpha  (hydrogen ionised by ultraviolet): crimson / deep red
//   O-III    (doubly-ionised oxygen, extremely hot regions): electric teal
//   S-II     (singly-ionised sulfur, cooler ionised gas): deep orange-red
//   Dust     (cold molecular clouds occulting background light): dark ochre
//   Stars    (forming and formed, blue-white hot, orange old): bright cores
//
// The gas does not sit still. Stellar winds carve tunnels through the clouds.
// Shockwaves from supernovae compress pillars into new stars.
// It moves — but it moves on a scale of thousands of years per pixel.
// Here it moves at a scale you can meditate to.
//
// Three gas layers use independent domain warp paths, giving each its own
// turbulent character while remaining one coherent scene.
//
// Blink: a new star ignites — a flash, then an ionisation shockwave ring
// expands outward through the gas, briefly brightening O-III in its path.
// Stars are permanent: they accumulate across blinks.
class NebulaMode {
    constructor(ctx, canvas) {
        this.ctx       = ctx;
        this.canvas    = canvas;
        this.t         = 0;
        this._stars    = [];
        this._shockwave = null;
        this._off      = null;
        this._offCtx   = null;
    }

    startScene() {
        this.t          = 0;
        this._shockwave = null;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 200, OH = Math.round(200 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }

        // Seed initial stars — a mix of hot blue-white (ionising) and old orange-red
        this._stars = [];
        const OC = Math.min(OW, OH);
        for (let i = 0; i < 18; i++) {
            const hot = Math.random() < 0.55;
            this._stars.push({
                x:         OW * (0.08 + Math.random() * 0.84),
                y:         OH * (0.08 + Math.random() * 0.84),
                coreR:     (hot ? 0.8 : 1.2) * (0.8 + Math.random() * 0.5),
                haloR:     OC * (hot ? 0.055 : 0.032) * (0.7 + Math.random() * 0.6),
                intensity: 0.55 + Math.random() * 0.45,
                hot,        // hot = blue-white O-type; cold = orange K/M giant
            });
        }
    }

    onBlink() {
        if (!this._off) return;
        const OW = this._off.width, OH = this._off.height;
        const OC = Math.min(OW, OH);
        const sx = OW * (0.12 + Math.random() * 0.76);
        const sy = OH * (0.12 + Math.random() * 0.76);

        // New star ignition: adds to permanent star field
        this._stars.push({
            x:         sx,
            y:         sy,
            coreR:     1.2 + Math.random() * 0.8,
            haloR:     OC * (0.06 + Math.random() * 0.04),
            intensity: 1.0,
            hot:       true,
        });
        if (this._stars.length > 32) this._stars.shift();

        // Ionisation shockwave from the new star
        this._shockwave = {
            x:         sx,
            y:         sy,
            r:         0,
            rate:      OC * 0.40,  // buffer-pixels per second
            intensity: 1.0,
        };
    }

    draw(time) {
        this.t += 0.016;

        // Expand and decay shockwave
        if (this._shockwave) {
            this._shockwave.r         += this._shockwave.rate * 0.016;
            this._shockwave.intensity *= 0.965;
            const OC = Math.min(this._off.width, this._off.height);
            if (this._shockwave.intensity < 0.015 || this._shockwave.r > OC * 1.6) {
                this._shockwave = null;
            }
        }

        const OW  = this._off.width;
        const OH  = this._off.height;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const t   = this.t;
        const OC  = Math.min(OW, OH);
        const halfOW = OW * 0.5, halfOH = OH * 0.5, halfOC = OC * 0.5;

        // Precompute time phases for warp parameters
        // Three independent gas layers drift at different rates
        const ta1 = t * 0.028, ta2 = t * 0.022, ta3 = t * 0.016;
        const tb1 = t * 0.032, tb2 = t * 0.018, tb3 = t * 0.012;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                const nx = (px - halfOW) / halfOC;
                const ny = (py - halfOH) / halfOC;

                // ── Layer 1: H-alpha (hydrogen) — large slow turbulence ───────
                // This dominates the scene: broad crimson clouds
                const ha_wx = nx + Math.sin(nx * 1.42 + ny * 0.88 + ta1) * 0.72
                                 + Math.cos(ny * 1.18 + nx * 0.55 + ta1 * 0.7) * 0.44;
                const ha_wy = ny + Math.cos(nx * 1.08 - ny * 1.32 + tb1) * 0.68
                                 + Math.sin(nx * 1.75 + ny * 0.72 + tb1 * 0.8) * 0.38;

                // H-alpha field: layered octaves with only positive values (emission)
                const ha_raw =
                    Math.sin(ha_wx * 1.82 + ha_wy * 1.24 + ta1 * 0.5) * 0.44 +
                    Math.cos(ha_wx * 2.68 - ha_wy * 1.88 + ta1 * 0.6) * 0.28 +
                    Math.sin(ha_wx * 3.94 + ha_wy * 2.75 + ta1 * 0.4) * 0.16 +
                    Math.cos(ha_wx * 0.88 + ha_wy * 1.44 + ta1 * 0.3) * 0.08 +
                    Math.sin(ha_wx * 6.22 - ha_wy * 4.18 + ta1 * 0.2) * 0.04;
                const h_alpha = Math.max(0, ha_raw * 1.1);  // clip to positive = emission only

                // ── Layer 2: O-III (oxygen) — more turbulent, near hot stars ──
                // Teal/cyan — concentrated near ionising UV sources
                const o3_wx = nx + Math.sin(nx * 2.18 - ny * 1.42 + ta2) * 0.55
                                 + Math.cos(nx * 0.88 + ny * 2.05 + ta2 * 1.2) * 0.32;
                const o3_wy = ny + Math.cos(nx * 1.65 + ny * 1.88 + tb2) * 0.50
                                 + Math.sin(nx * 2.42 - ny * 1.22 + tb2 * 0.9) * 0.28;

                const o3_raw =
                    Math.sin(o3_wx * 2.55 + o3_wy * 1.85 + ta2 * 0.8) * 0.38 +
                    Math.cos(o3_wx * 3.80 - o3_wy * 2.62 + ta2 * 1.0) * 0.25 +
                    Math.sin(o3_wx * 5.55 + o3_wy * 3.88 + ta2 * 0.6) * 0.14 +
                    Math.cos(o3_wx * 1.25 + o3_wy * 2.18 + ta2 * 0.4) * 0.07;
                const o_iii  = Math.max(0, o3_raw * 1.0);

                // ── Layer 3: Dust — cold dense molecular clouds ───────────────
                // Absorbs: creates dark lanes silhouetted against glowing gas
                const du_wx = nx + Math.sin(nx * 1.12 + ny * 1.58 + ta3) * 0.62
                                 + Math.cos(nx * 2.28 - ny * 0.88 + ta3 * 0.8) * 0.38;
                const du_wy = ny + Math.cos(nx * 1.88 + ny * 1.22 + tb3) * 0.55
                                 + Math.sin(nx * 0.72 + ny * 2.15 + tb3 * 0.6) * 0.32;

                const du_raw =
                    Math.sin(du_wx * 2.12 + du_wy * 1.48 + ta3 * 0.5) * 0.42 +
                    Math.cos(du_wx * 3.22 - du_wy * 2.18 + ta3 * 0.7) * 0.28 +
                    Math.sin(du_wx * 4.85 + du_wy * 3.32 + ta3 * 0.4) * 0.18 +
                    Math.cos(du_wx * 7.15 - du_wy * 5.05 + ta3 * 0.3) * 0.08 +
                    Math.sin(du_wx * 1.08 + du_wy * 0.72 + ta3 * 0.2) * 0.04;
                const dust   = Math.max(0, du_raw * 0.9);  // [0, ∞) clipped below

                // ── Colour composition ────────────────────────────────────────
                // Background: deep cosmic purple-black
                let R =  7 + h_alpha * 14;
                let G =  4 + h_alpha *  6;
                let B = 16 + h_alpha *  8;

                // H-alpha emission: crimson/red
                R += h_alpha * 222;
                G += h_alpha *  22;
                B += h_alpha *  30;

                // O-III emission: electric teal
                R += o_iii  *  14;
                G += o_iii  * 195;
                B += o_iii  * 178;

                // Warm dust glow: heated by nearby stars (ochre-amber)
                // Dust itself is dark, but the edges glow warm where irradiated
                const dustGlow = Math.max(0, dust - 0.15) * 0.6;
                R += dustGlow * 165;
                G += dustGlow *  88;
                B += dustGlow *  18;

                // Dust occlusion: dark lanes absorb background light
                const occlusion = Math.min(1, Math.max(0, dust * 0.78));
                R *= (1 - occlusion * 0.68);
                G *= (1 - occlusion * 0.72);
                B *= (1 - occlusion * 0.78);

                // ── Shockwave ring ────────────────────────────────────────────
                if (this._shockwave) {
                    const sw   = this._shockwave;
                    const dx   = px - sw.x, dy = py - sw.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const ringW = sw.r * 0.08 + 2;
                    const ring  = Math.exp(-Math.pow(dist - sw.r, 2) / (ringW * ringW))
                                * sw.intensity;
                    // Shockwave front: brief flash of O-III + H-alpha
                    R += ring * 185;
                    G += ring *  82;
                    B += ring * 118;
                }

                // ── Star points ───────────────────────────────────────────────
                for (const star of this._stars) {
                    const dx   = px - star.x, dy = py - star.y;
                    const d2   = dx * dx + dy * dy;
                    const core = Math.exp(-d2 / (star.coreR * star.coreR)) * star.intensity * 1.4;
                    const halo = Math.exp(-d2 / (star.haloR * star.haloR)) * star.intensity * 0.15;
                    const contribution = core + halo;
                    if (star.hot) {
                        // Blue-white O-type: ionising ultraviolet source
                        R += 185 * contribution;
                        G += 215 * contribution;
                        B += 255 * contribution;
                    } else {
                        // Orange-red K/M giant: old evolved star
                        R += 255 * contribution;
                        G += 195 * contribution;
                        B += 118 * contribution;
                    }
                }

                // Clamp with mild gamma (nebula images are slightly soft)
                R = Math.min(255, Math.pow(Math.min(1, R / 255), 0.88) * 255) | 0;
                G = Math.min(255, Math.pow(Math.min(1, G / 255), 0.88) * 255) | 0;
                B = Math.min(255, Math.pow(Math.min(1, B / 255), 0.85) * 255) | 0;

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

        // Blink flash: star ignition flare visible on main canvas
        if (this._shockwave && this._shockwave.intensity > 0.5) {
            const fl   = (this._shockwave.intensity - 0.5) * 2;
            const prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(255, 200, 120, ${fl * 0.22})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = prev;
        }
    }
}
