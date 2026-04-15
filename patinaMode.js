// Patina Mode — oxidised copper seen under a raking light.
// Bare copper is warm red-orange metal: polished, reflective, heavy.
// Where moisture and air reach it, copper carbonate crystallises as verdigris —
// that distinctive blue-green powdery bloom you find on old bells, statues, roofs.
// The transition zone between metal and oxide is where the visual complexity lives:
// brown-orange tarnish, blue-green tendrils, powdery crystalline surface texture.
// Corrosion nucleates at micro-flaw centres and spreads outward unevenly.
// Blink: new corrosion event — fresh heat flash (copper glows orange-hot) then
// a wave of new oxidation spreads from the impact point.
// Mouse / hand: finger warmth slows local oxidation, polishes the copper back.
class PatinaMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this._centres = [];
        this._flash   = 0;
        this._mx      = null;
        this._my      = null;
        this._off     = null;
        this._offCtx  = null;
    }

    startScene() {
        this.t      = 0;
        this._flash = 0;
        this._mx    = null;

        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 160, OH = Math.round(160 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }

        const OC = Math.min(OW, OH);
        // Seed 6-9 corrosion nucleation sites at random positions
        const N = 6 + Math.floor(Math.random() * 4);
        this._centres = [];
        for (let i = 0; i < N; i++) {
            this._centres.push({
                x:    Math.random() * OW,
                y:    Math.random() * OH,
                r0:   OC * (0.04 + Math.random() * 0.06),   // starting radius
                rate: OC * (0.0008 + Math.random() * 0.0010), // spread rate
                age:  -(Math.random() * 80),   // stagger birth times
                // Unique oxidation colour tint per centre (copper oxide variants)
                tintV: Math.random(),   // 0 = blue-green verdigris, 1 = teal
            });
        }
    }

    onMouseMove(x, y) { this._mx = x; this._my = y; }
    onHandMove(nx, ny) {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._mx = (1 - nx) * W; this._my = ny * H;
    }

    onBlink() {
        this._flash = 1.0;
        const OW = this._off ? this._off.width  : 160;
        const OH = this._off ? this._off.height : 90;
        const OC = Math.min(OW, OH);
        // New corrosion event at a random point
        this._centres.push({
            x:    OW * (0.15 + Math.random() * 0.70),
            y:    OH * (0.15 + Math.random() * 0.70),
            r0:   OC * 0.03,
            rate: OC * (0.0014 + Math.random() * 0.0014),
            age:  0,
            tintV: Math.random(),
        });
        if (this._centres.length > 14) this._centres.shift();
    }

    // Blends two RGB triples
    _lerp3(a, b, u) {
        return [
            a[0] + (b[0] - a[0]) * u,
            a[1] + (b[1] - a[1]) * u,
            a[2] + (b[2] - a[2]) * u,
        ];
    }

    draw(time) {
        this.t      += 0.016;
        this._flash *= 0.92;

        const OW = this._off.width;
        const OH = this._off.height;
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;

        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const t   = this.t;
        const fl  = this._flash;

        // Mouse in buffer space
        let mBX = null, mBY = null;
        if (this._mx !== null) {
            mBX = (this._mx / W) * OW;
            mBY = (this._my / H) * OH;
        }

        for (const c of this._centres) { c.age += 0.016; }

        // Material color palette
        // Base: polished copper
        const copper      = [178, 102,  40];
        // Tarnished copper (first oxidation stage)
        const tarnish     = [148,  80,  28];
        // Brown-orange oxidation (cuprite)
        const cuprite     = [138,  58,  22];
        // Verdigris (copper carbonate — blue-green, classic patina)
        const verdigris   = [ 62, 148, 128];
        // Deep verdigris (mature, heavier deposit)
        const verdigrisD  = [ 42, 112,  95];
        // Powdery pale bloom on top of old verdigris
        const bloom       = [155, 210, 195];

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                const nx = px / OW, ny = py / OH;

                // ── Surface texture: crystalline grain of copper oxide ─────────
                // High-frequency layered sines simulate the powdery/crystalline
                // micro-texture of verdigris and the metallic grain of copper
                const grain =
                    Math.sin(px * 8.8  + py * 6.2  + t * 0.012) * 0.40 +
                    Math.cos(px * 14.5 - py * 11.8 + t * 0.008) * 0.28 +
                    Math.sin(px * 22.4 + py * 19.3 - t * 0.005) * 0.18 +
                    Math.cos(px * 38.2 - py * 29.7 + t * 0.003) * 0.10 +
                    Math.sin(px * 55.6 + py * 44.1 + t * 0.002) * 0.04;
                // grain in [-1, +1]

                // ── Oxidation level at this pixel ─────────────────────────────
                // Max over all corrosion centres (spreading radial fronts)
                let oxidation = 0;
                let weightedTintV = 0;
                let totalTintW    = 0;

                for (const c of this._centres) {
                    if (c.age < 0) continue;
                    const radius = c.r0 + c.rate * c.age * 60;   // grows over time
                    const dx = px - c.x, dy = py - c.y;
                    const dist  = Math.sqrt(dx * dx + dy * dy);

                    // Smooth oxidation front (sigmoid in distance)
                    const transWidth = radius * 0.25 + 2.0;
                    const ox = 1 / (1 + Math.exp((dist - radius) / transWidth));

                    if (ox > 0.02) {
                        weightedTintV += c.tintV * ox;
                        totalTintW    += ox;
                    }
                    oxidation = Math.max(oxidation, ox);
                }

                const tintV = totalTintW > 0 ? weightedTintV / totalTintW : 0;

                // Add crystalline texture noise to oxidation boundary
                // Pushes the transition zone into organic tendrils
                const noiseMod = grain * 0.14;
                const oxNoisy  = Math.max(0, Math.min(1, oxidation + noiseMod));

                // Mouse warmth: polishes copper in hover zone
                let polishFactor = 0;
                if (mBX !== null) {
                    const mDist = Math.sqrt((px - mBX) * (px - mBX) + (py - mBY) * (py - mBY));
                    polishFactor = Math.exp(-mDist * mDist / (OW * OW * 0.003)) * 0.70;
                }

                const ox = oxNoisy * (1 - polishFactor * 0.7);

                // ── Color blend across oxidation stages ───────────────────────
                let R, G, B;

                if (ox < 0.12) {
                    // Polished copper: metallic sheen
                    const specular = Math.max(0, grain) * 0.35 * (1 - ox / 0.12);
                    const u = ox / 0.12;
                    [R, G, B] = this._lerp3(copper, tarnish, u);
                    R = Math.min(255, R + specular * 65);
                    G = Math.min(255, G + specular * 32);
                    B = Math.min(255, B + specular * 8);

                } else if (ox < 0.35) {
                    // Tarnish → cuprite: brown-red oxidation
                    const u = (ox - 0.12) / 0.23;
                    [R, G, B] = this._lerp3(tarnish, cuprite, u);
                    // Texture pitting: random dark spots of heavier corrosion
                    const pit = Math.max(0, -grain) * 0.40;
                    R = R * (1 - pit * 0.55);
                    G = G * (1 - pit * 0.40);
                    B = B * (1 - pit * 0.25);

                } else if (ox < 0.62) {
                    // Cuprite → verdigris transition: most complex zone
                    const u = (ox - 0.35) / 0.27;
                    // Mix between two verdigris tints based on per-centre tintV
                    const vg = this._lerp3(verdigris, [55, 138, 115], tintV);
                    [R, G, B] = this._lerp3(cuprite, vg, Math.pow(u, 0.7));
                    // Crystalline cracking texture in transition
                    const crack = Math.max(0, grain - 0.4) * 2.0;
                    R = R * (1 - crack * 0.30);
                    G = G * (1 - crack * 0.15);
                    B = B * (1 - crack * 0.12);

                } else if (ox < 0.85) {
                    // Mature verdigris
                    const u = (ox - 0.62) / 0.23;
                    const vg = this._lerp3(verdigris, verdigrisD, tintV * 0.5);
                    [R, G, B] = this._lerp3(vg, verdigrisD, u);
                    // Powdery surface texture: grain modulates lightness
                    const powder = grain * 0.22;
                    R = Math.max(0, R + powder * 18);
                    G = Math.max(0, G + powder * 22);
                    B = Math.max(0, B + powder * 20);

                } else {
                    // Heavy old patina: pale powdery bloom on top
                    const u = (ox - 0.85) / 0.15;
                    [R, G, B] = this._lerp3(verdigrisD, bloom, u);
                    // Powdery bloom texture: very pronounced grain
                    const powder = grain * 0.30;
                    R = Math.max(0, Math.min(255, R + powder * 28));
                    G = Math.max(0, Math.min(255, G + powder * 32));
                    B = Math.max(0, Math.min(255, B + powder * 30));
                }

                // Blink heat flash: copper glows orange-white at impact
                R = Math.min(255, R * (1 + fl * 0.62));
                G = Math.min(255, G * (1 + fl * 0.35));
                B = Math.min(255, B * (1 + fl * 0.10));

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

        // Flash: hot copper bloom (screen blend, warm orange)
        if (fl > 0.04) {
            const prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(220, 90, 20, ${fl * 0.24})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = prev;
        }
    }
}
