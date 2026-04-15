// Abyss Mode — the hadal zone. The deep ocean below 6,000 metres.
//
// No sunlight reaches here. No photosynthesis. No seasons. No sky.
// Only pressure, darkness, and life that makes its own light.
//
// Bioluminescence evolved here independently at least 27 times.
// It is the most common form of communication on Earth — we just can't see it.
//
// What you're watching: organic glowing colonies drifting in absolute dark water.
// Each form has its own rhythm, its own colour, its own irregular shape.
// Marine snow — organic particles raining down from the surface — passes through.
// The water itself has texture: particulate, cold, immensely heavy.
//
// The organisms are not circles. They breathe and deform like amoebae.
// The dominant colour is ~480nm — deep blue — the only wavelength that
// travels more than a few metres in seawater. Green-blue for some species.
// Rare warm yellow-green for ostracod crustaceans (the ocean's shooting stars).
//
// Blink: a massive bioluminescent event — a whale or a giant squid releases
// a cloud of luminescent ink. The water briefly blazes, then returns to dark.
class AbyssMode {
    constructor(ctx, canvas) {
        this.ctx       = ctx;
        this.canvas    = canvas;
        this.t         = 0;
        this._orgs     = [];    // bioluminescent organisms
        this._chains   = [];    // siphonophore colonies (chains of nodes)
        this._snow     = [];    // marine snow particles
        this._bigEvent = null;  // bioluminescent mass event (from blink)
        this._off      = null;
        this._offCtx   = null;
    }

    startScene() {
        this.t         = 0;
        this._bigEvent = null;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 160, OH = Math.round(160 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }

        // Organic bioluminescent organisms — amorphous glowing forms
        // Colors: the specific wavelengths of deep-sea bioluminescence
        const orgColors = [
            [0,   140, 255],   // electric blue (most common: ~480nm)
            [10,  165, 245],   // bright blue
            [0,   210, 188],   // cyan-green (some dinoflagellates)
            [0,   195, 170],   // teal-green
            [175, 242, 72],    // ostracod yellow-green (rare)
        ];
        this._orgs = [];
        for (let i = 0; i < 9; i++) {
            const c = orgColors[i < 7 ? (i % 4) : 4];  // last two are rare yellow-green
            this._orgs.push({
                x:         Math.random() * OW,
                y:         Math.random() * OH,
                vx:        (Math.random() - 0.5) * 0.018,
                vy:        (Math.random() - 0.5) * 0.012,
                r:         OW * (0.038 + Math.random() * 0.052),
                intensity: 0.55 + Math.random() * 0.45,
                phase:     Math.random() * Math.PI * 2,
                rate:      0.15 + Math.random() * 0.30,
                cr: c[0], cg: c[1], cb: c[2],
                flare: 0,
            });
        }

        // Siphonophore chains — colonial organisms that can reach 40+ metres
        // Rendered as wavy chains of connected bright nodes
        this._chains = [];
        for (let ci = 0; ci < 3; ci++) {
            const nc   = 6 + Math.floor(Math.random() * 6);
            const cx0  = Math.random() * OW;
            const cy0  = Math.random() * OH;
            const ang  = Math.random() * Math.PI * 2;
            const step = OW * 0.022;
            const col  = orgColors[ci % 2];
            const nodes = [];
            for (let ni = 0; ni < nc; ni++) {
                nodes.push({
                    x: cx0 + Math.cos(ang) * step * ni,
                    y: cy0 + Math.sin(ang) * step * ni,
                    r: OW * 0.012,
                    phase: Math.random() * Math.PI * 2,
                });
            }
            this._chains.push({
                nodes,
                vx:    (Math.random() - 0.5) * 0.009,
                vy:    (Math.random() - 0.5) * 0.006,
                phase: Math.random() * Math.PI * 2,
                rate:  0.08 + Math.random() * 0.12,
                cr: col[0], cg: col[1], cb: col[2],
                intensity: 0.65 + Math.random() * 0.35,
            });
        }

        // Marine snow — fine organic particles drifting down from the surface world
        this._snow = [];
        for (let i = 0; i < 110; i++) {
            this._snow.push({
                x:       Math.random() * W,
                y:       Math.random() * H,
                vy:      0.18 + Math.random() * 0.28,  // slow drift down
                vx:      (Math.random() - 0.5) * 0.06,
                wobble:  0.4 + Math.random() * 0.8,
                phase:   Math.random() * Math.PI * 2,
                size:    0.5 + Math.random() * 1.1,
                bright:  0.06 + Math.random() * 0.14,
            });
        }
    }

    onBlink() {
        if (!this._off) return;
        const OW = this._off.width, OH = this._off.height;
        // Mass bioluminescent event
        this._bigEvent = {
            x:         OW * (0.15 + Math.random() * 0.70),
            y:         OH * (0.15 + Math.random() * 0.70),
            r:         OW * (0.28 + Math.random() * 0.30),
            intensity: 1.0,
            cr: 0, cg: 200, cb: 255,
        };
        // All organisms flare
        for (const o of this._orgs)   o.flare = 0.8 + Math.random() * 0.6;
        for (const c of this._chains) c.intensity = Math.min(1.5, c.intensity + 0.5);
    }

    draw(time) {
        this.t += 0.016;
        const t = this.t;

        const OW   = this._off.width;
        const OH   = this._off.height;
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;

        // Decay big event
        if (this._bigEvent) {
            this._bigEvent.intensity *= 0.952;
            if (this._bigEvent.intensity < 0.018) this._bigEvent = null;
        }

        // Update organism physics — slow Brownian drift with gentle boundaries
        for (const o of this._orgs) {
            o.vx += (Math.random() - 0.5) * 0.0008;
            o.vy += (Math.random() - 0.5) * 0.0006;
            o.vx *= 0.988; o.vy *= 0.988;
            o.x  += o.vx;  o.y  += o.vy;
            const pad = o.r * 2;
            if (o.x < -pad)      o.x = OW + pad;
            if (o.x > OW + pad)  o.x = -pad;
            if (o.y < -pad)      o.y = OH + pad;
            if (o.y > OH + pad)  o.y = -pad;
            o.flare *= 0.94;
        }

        // Update chain positions — the whole colony drifts as one
        for (const ch of this._chains) {
            ch.vx += (Math.random() - 0.5) * 0.0004;
            ch.vy += (Math.random() - 0.5) * 0.0003;
            ch.vx *= 0.992; ch.vy *= 0.992;
            for (const nd of ch.nodes) {
                nd.x += ch.vx;
                nd.y += ch.vy;
            }
            // Gentle snake undulation: displace nodes perpendicular to chain axis
            for (let ni = 0; ni < ch.nodes.length; ni++) {
                const nd   = ch.nodes[ni];
                const wave = Math.sin(t * ch.rate + ch.phase + ni * 0.55) * OW * 0.008;
                const perp = Math.cos(t * ch.rate * 0.7 + ni * 0.4);
                nd.x += perp * wave * 0.016;
                nd.y += wave * 0.016;
            }
            // Wrap as a unit at first node
            const fn = ch.nodes[0];
            const pad = OW * 0.12;
            if (fn.x < -pad) { for (const nd of ch.nodes) nd.x += OW + 2*pad; }
            if (fn.x > OW+pad) { for (const nd of ch.nodes) nd.x -= OW + 2*pad; }
            if (fn.y < -pad) { for (const nd of ch.nodes) nd.y += OH + 2*pad; }
            if (fn.y > OH+pad) { for (const nd of ch.nodes) nd.y -= OH + 2*pad; }
        }

        // ── Pixel-level render ────────────────────────────────────────────────
        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                // ── Water texture: fine particulate + cold pressure ────────────
                const wnx = px / OW, wny = py / OH;
                const wt =
                    Math.sin(px * 5.2 + py * 3.8 + t * 0.14) * 0.10 +
                    Math.cos(px * 3.4 - py * 6.2 + t * 0.10) * 0.07 +
                    Math.sin(px * 9.8 + py * 7.5 + t * 0.07) * 0.04 +
                    Math.cos(px * 15.2 - py * 12.4 + t * 0.04) * 0.02;
                // Base: deep-sea black-blue
                let R =  4 + wt *  6;
                let G =  6 + wt * 12;
                let B = 18 + wt * 38;

                // ── Organic organism glow ─────────────────────────────────────
                for (const o of this._orgs) {
                    const dx    = px - o.x, dy = py - o.y;
                    const dist  = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);

                    // Organic shape: angular distortion makes each blob unique
                    const angDist =
                        Math.sin(angle * 4 + o.phase + t * o.rate)         * 0.20 +
                        Math.cos(angle * 3 - o.phase * 1.4 + t * o.rate * 0.7) * 0.12 +
                        Math.sin(angle * 6 + o.phase * 0.8 + t * o.rate * 1.3) * 0.06;
                    const eDist = dist * (1 + angDist);

                    const pulse = 0.82 + 0.18 * Math.sin(t * o.rate + o.phase);
                    const brite = Math.exp(-eDist * eDist / (o.r * o.r * 0.40))
                                * o.intensity * pulse * (1 + o.flare);

                    R += o.cr * brite;
                    G += o.cg * brite;
                    B += o.cb * brite;
                }

                // ── Siphonophore chain glow ───────────────────────────────────
                for (const ch of this._chains) {
                    const pulse = 0.78 + 0.22 * Math.sin(t * ch.rate + ch.phase);
                    for (const nd of ch.nodes) {
                        const dx   = px - nd.x, dy = py - nd.y;
                        const d2   = dx * dx + dy * dy;
                        const brite = Math.exp(-d2 / (nd.r * nd.r * 0.30))
                                    * ch.intensity * pulse;
                        R += ch.cr * brite;
                        G += ch.cg * brite;
                        B += ch.cb * brite;
                    }
                }

                // ── Mass bioluminescent event ─────────────────────────────────
                if (this._bigEvent) {
                    const be  = this._bigEvent;
                    const dx  = px - be.x, dy = py - be.y;
                    const d2  = dx * dx + dy * dy;
                    // Organic blob shape for the event too
                    const ang = Math.atan2(dy, dx);
                    const angD = Math.sin(ang * 3 + t * 0.5) * 0.15;
                    const eDist2 = Math.sqrt(d2) * (1 + angD);
                    const brite = Math.exp(-eDist2 * eDist2 / (be.r * be.r)) * be.intensity;
                    R += be.cr * brite;
                    G += be.cg * brite;
                    B += be.cb * brite;
                }

                // Gamma: biological glow has soft luminous quality (gamma < 1)
                R = Math.min(255, Math.pow(Math.min(1, R / 255), 0.74) * 255) | 0;
                G = Math.min(255, Math.pow(Math.min(1, G / 255), 0.72) * 255) | 0;
                B = Math.min(255, Math.pow(Math.min(1, B / 255), 0.68) * 255) | 0;

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

        // ── Marine snow: canvas overlay ───────────────────────────────────────
        // Particles rendered directly on main canvas (fast, no pixel loop needed)
        for (const s of this._snow) {
            s.y += s.vy;
            s.x += s.vx + Math.sin(t * s.wobble + s.phase) * 0.14;
            if (s.y > H + 2)  s.y = -2;
            if (s.x < -2)     s.x = W + 2;
            if (s.x > W + 2)  s.x = -2;

            const a = s.bright * (0.8 + 0.2 * Math.sin(t * 0.8 + s.phase));
            ctx.fillStyle = `rgba(175, 200, 255, ${a})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
