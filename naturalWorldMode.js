// Natural World Mode — first-person 3D walk through four shifting natural worlds.
// Camera glides along a winding path automatically. No controls needed.
// Each blink sends a luminescence wave through the world.
// After 5 blinks, the biome dissolves and a new one emerges.
//
// Biomes:  Bioluminescent Forest → Firefly Meadow → Jade Bamboo → Amethyst Cave
//          (loop indefinitely)

class NaturalWorldMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        // Camera state
        this.camX  = 0;
        this.camZ  = 0;
        this.camY  = 1.4;   // eye height (world-units)

        // Scene state
        this.trees      = [];
        this.particles  = [];
        this.blinkCount = 0;
        this.blinkFlash = 0;
        this.blinkWaves = [];   // luminescence rings expanding from camera
        this.transitionAlpha = 0;
        this.transitioning   = false;
        this.transitionDir   = 1;   // +1 fading to white, -1 fading back in

        // 4 Biomes
        this.biomeIndex = 0;
        this.BIOMES = [
            {
                name:      'bioluminescent forest',
                skyA:      [2,   4,  18],   // zenith
                skyB:      [6,  20,  40],   // horizon
                fogC:      [6,  18,  32],   // distance haze
                groundA:   [3,  10,  18],   // near ground
                groundB:   [6,  18,  32],   // far ground
                trunkC:    [8,  38,  28],
                canopyC:   [6,  28,  22],
                glowC:     [38, 195, 125],
                ptclC:     [60, 240, 165],
                waveC:     [25, 180, 115],
                fogDist:   30,
                treeDensity: 0.95,
                caveMode:  false,
            },
            {
                name:      'firefly meadow',
                skyA:      [5,   3,  22],
                skyB:      [20,  14,  48],
                fogC:      [12,  10,  32],
                groundA:   [6,  10,   5],
                groundB:   [10,  14,   8],
                trunkC:    [18,  32,  12],
                canopyC:   [12,  25,   8],
                glowC:     [255, 195,  45],
                ptclC:     [255, 228,  80],
                waveC:     [230, 170,  30],
                fogDist:   38,
                treeDensity: 0.60,
                caveMode:  false,
            },
            {
                name:      'jade bamboo',
                skyA:      [4,  18,  12],
                skyB:      [14,  52,  32],
                fogC:      [12,  44,  28],
                groundA:   [8,  24,  14],
                groundB:   [12,  42,  24],
                trunkC:    [22,  82,  48],
                canopyC:   [16,  68,  38],
                glowC:     [140, 255, 170],
                ptclC:     [175, 255, 195],
                waveC:     [100, 220, 145],
                fogDist:   28,
                treeDensity: 1.30,  // denser bamboo
                caveMode:  false,
            },
            {
                name:      'amethyst cave',
                skyA:      [6,   2,  22],   // cave ceiling — very dark
                skyB:      [18,   6,  48],
                fogC:      [16,   5,  38],
                groundA:   [8,   3,  22],
                groundB:   [16,   6,  40],
                trunkC:    [55,  18,  95],  // crystal columns
                canopyC:   [72,  24, 115],
                glowC:     [195,  72, 255],
                ptclC:     [220, 115, 255],
                waveC:     [155,  45, 215],
                fogDist:   22,
                treeDensity: 0.70,
                caveMode:  true,    // stalactites from ceiling
            },
        ];

        this._buildWorld();
    }

    // ─── Build world geometry ────────────────────────────────────────────────────
    _buildWorld() {
        const COLS = 9, ROWS = 14;
        const SPC  = 4.8;
        this.WORLD_DEPTH = ROWS * SPC;
        this.trees = [];

        for (let iz = 0; iz < ROWS; iz++) {
            for (let ix = 0; ix < COLS; ix++) {
                // Skip the centre column — leave a walking path
                if (ix === Math.floor(COLS / 2)) continue;
                const jx = (Math.random() - 0.5) * SPC * 0.68;
                const jz = (Math.random() - 0.5) * SPC * 0.55;
                this.trees.push({
                    gx:      (ix - (COLS - 1) / 2) * SPC + jx,   // grid X
                    gz:      iz * SPC + jz,                        // initial world Z
                    wz:      iz * SPC + jz,                        // current world Z (recycled)
                    h:       3.2 + Math.random() * 5.5,
                    trunkR:  0.10 + Math.random() * 0.16,
                    canopyR: 1.0  + Math.random() * 2.0,
                    sway:    Math.random() * Math.PI * 2,
                    swaySpd: 0.18 + Math.random() * 0.28,
                    glowPh:  Math.random() * Math.PI * 2,
                    glowSpd: 0.22 + Math.random() * 0.38,
                });
            }
        }

        // Particles — floating motes/fireflies in world space
        this.particles = [];
        for (let i = 0; i < 130; i++) this._spawnParticle(true);
    }

    _spawnParticle(initial) {
        this.particles.push({
            x:     (Math.random() - 0.5) * 22,
            y:     0.3 + Math.random() * 3.8,
            z:     initial ? this.camZ + (Math.random() - 0.1) * 24 : this.camZ + 18 + Math.random() * 8,
            vx:    (Math.random() - 0.5) * 0.18,
            vy:    (Math.random() - 0.5) * 0.06,
            ph:    Math.random() * Math.PI * 2,
            spd:   0.4 + Math.random() * 0.8,
            sz:    0.04 + Math.random() * 0.09,
        });
    }

    // ─── Mode interface ──────────────────────────────────────────────────────────
    startScene() {
        this.t           = 0;
        this.camX        = 0;
        this.camZ        = 0;
        this.biomeIndex  = 0;
        this.blinkCount  = 0;
        this.blinkFlash  = 0;
        this.blinkWaves  = [];
        this.transitioning   = false;
        this.transitionAlpha = 0;
        this._buildWorld();
    }

    onBlink() {
        this.blinkFlash = 1.0;
        this.blinkWaves.push({ r: 0, maxR: 20, alpha: 1.0 });
        this.blinkCount++;
        if (this.blinkCount >= 5 && !this.transitioning) {
            this.blinkCount  = 0;
            this.transitioning = true;
            this.transitionAlpha = 0;
            this.transitionDir   = 1;
        }
    }

    // ─── 3D projection ───────────────────────────────────────────────────────────
    _proj(wx, wy, wz) {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const HY = H * 0.43;       // horizon Y on screen
        const F  = H * 0.88;       // FOV scale

        const rx = wx - this.camX;
        const ry = wy - this.camY;
        const rz = wz - this.camZ;
        if (rz < 0.3) return null;

        return {
            x:     W / 2 + (rx / rz) * F,
            y:     HY    - (ry / rz) * F,
            sc:    F / rz,
            depth: rz,
        };
    }

    // ─── Main draw ───────────────────────────────────────────────────────────────
    draw(t) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const HY  = H * 0.43;

        const biome = this.BIOMES[this.biomeIndex];

        // ── Camera glide ─────────────────────────────────────────────────────────
        const SPEED = 1.15;
        this.camZ += SPEED * 0.016;
        const targetX = Math.sin(this.camZ * 0.052) * 2.0
                      + Math.sin(this.camZ * 0.021) * 0.8;
        this.camX += (targetX - this.camX) * 0.016;
        this.camY  = 1.4 + Math.sin(this.t * 0.72) * 0.022; // gentle head bob

        // ── Biome transition ─────────────────────────────────────────────────────
        if (this.transitioning) {
            if (this.transitionDir === 1) {
                this.transitionAlpha = Math.min(1, this.transitionAlpha + 0.016 / 0.9);
                if (this.transitionAlpha >= 1) {
                    this.biomeIndex  = (this.biomeIndex + 1) % this.BIOMES.length;
                    this.transitionDir = -1;
                }
            } else {
                this.transitionAlpha = Math.max(0, this.transitionAlpha - 0.016 / 1.1);
                if (this.transitionAlpha <= 0) this.transitioning = false;
            }
        }

        // ── Recycle trees that fell behind camera ────────────────────────────────
        for (const tree of this.trees) {
            if (tree.wz - this.camZ < -3) tree.wz += this.WORLD_DEPTH;
        }
        // Recycle particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].z < this.camZ - 4) {
                this.particles.splice(i, 1);
                this._spawnParticle(false);
            }
        }

        // ── Sky ──────────────────────────────────────────────────────────────────
        const [sar, sag, sab] = biome.skyA;
        const [sbr, sbg, sbb] = biome.skyB;
        const skyG = ctx.createLinearGradient(0, 0, 0, HY);
        skyG.addColorStop(0, `rgb(${sar},${sag},${sab})`);
        skyG.addColorStop(1, `rgb(${sbr},${sbg},${sbb})`);
        ctx.fillStyle = skyG;
        ctx.fillRect(0, 0, W, HY + 2);

        // Subtle mist at horizon
        const mistG = ctx.createLinearGradient(0, HY - H * 0.08, 0, HY);
        const [fr, fg, fb] = biome.fogC;
        mistG.addColorStop(0, `rgba(${fr},${fg},${fb},0)`);
        mistG.addColorStop(1, `rgba(${fr},${fg},${fb},0.55)`);
        ctx.fillStyle = mistG;
        ctx.fillRect(0, HY - H * 0.08, W, H * 0.08);

        // Ambient light shafts through canopy (not in cave mode)
        if (!biome.caveMode) this._drawLightShafts(ctx, biome, W, HY);

        // ── Ground ───────────────────────────────────────────────────────────────
        const [gar, gag, gab] = biome.groundA;
        const [gbr, gbg, gbb] = biome.groundB;
        const gndG = ctx.createLinearGradient(0, HY, 0, H);
        gndG.addColorStop(0,   `rgb(${fr},${fg},${fb})`);
        gndG.addColorStop(0.12,`rgb(${Math.round(gbr*0.5+fr*0.5)},${Math.round(gbg*0.5+fg*0.5)},${Math.round(gbb*0.5+fb*0.5)})`);
        gndG.addColorStop(0.55,`rgb(${gbr},${gbg},${gbb})`);
        gndG.addColorStop(1,   `rgb(${gar},${gag},${gab})`);
        ctx.fillStyle = gndG;
        ctx.fillRect(0, HY, W, H - HY);

        // Ground texture lines (perspective foreshortening)
        this._drawGroundLines(ctx, biome, W, H, HY);

        // ── Cave mode: ceiling stalactites ───────────────────────────────────────
        if (biome.caveMode) this._drawCeiling(ctx, biome, W, HY);

        // ── Sort trees by depth ───────────────────────────────────────────────────
        const visible = [];
        for (const tree of this.trees) {
            const p = this._proj(tree.gx, 0, tree.wz);
            if (!p || p.depth > biome.fogDist * 1.25) continue;
            visible.push({ tree, p });
        }
        visible.sort((a, b) => b.p.depth - a.p.depth);

        // ── Draw trees ────────────────────────────────────────────────────────────
        for (const { tree, p } of visible) {
            this._drawTree(ctx, tree, p, biome);
        }

        // ── Particles ─────────────────────────────────────────────────────────────
        const pVis = [];
        for (const part of this.particles) {
            part.ph += part.spd * 0.016;
            part.x  += part.vx * 0.016;
            part.y  += Math.sin(part.ph) * 0.008;
            part.y   = Math.max(0.15, Math.min(4.5, part.y));

            const pp = this._proj(part.x, part.y, part.z);
            if (!pp || pp.depth > biome.fogDist * 0.9) continue;
            const fog = Math.min(1, pp.depth / biome.fogDist);
            pVis.push({ part, pp, fog });
        }
        pVis.sort((a, b) => b.pp.depth - a.pp.depth);

        const [pcr, pcg, pcb] = biome.ptclC;
        for (const { part, pp, fog } of pVis) {
            const glow = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(part.ph * 2.2));
            const alpha = (1 - fog * 0.88) * glow * (1 + this.blinkFlash * 0.7);
            const r    = Math.max(1, part.sz * pp.sc * 180);

            if (fog < 0.6 && r > 1.5) {
                // Glowing firefly — radial gradient for close ones
                const gg = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, r * 3.5);
                gg.addColorStop(0,   `rgba(${pcr},${pcg},${pcb},${alpha})`);
                gg.addColorStop(0.35,`rgba(${pcr},${pcg},${pcb},${alpha * 0.40})`);
                gg.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = gg;
                ctx.beginPath();
                ctx.arc(pp.x, pp.y, r * 3.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.globalAlpha = alpha * (1 - fog * 0.5);
                ctx.fillStyle   = `rgb(${pcr},${pcg},${pcb})`;
                ctx.beginPath();
                ctx.arc(pp.x, pp.y, Math.max(0.6, r), 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // ── Blink luminescence waves ──────────────────────────────────────────────
        const [wr, wg, wb] = biome.waveC;
        this.blinkWaves = this.blinkWaves.filter(w => w.alpha > 0.01);
        for (const wave of this.blinkWaves) {
            wave.r     += 7 * 0.016;
            wave.alpha *= 0.975;
            // Project the ring as a perspective ellipse on the ground plane
            const zPos  = this.camZ + wave.r;
            const pp    = this._proj(this.camX, 0, zPos);
            if (!pp) continue;
            const ellW  = pp.sc * wave.r * 80;
            const ellH  = ellW * 0.18;
            ctx.beginPath();
            ctx.ellipse(W / 2, HY + 4, ellW, ellH, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${wr},${wg},${wb},${wave.alpha * 0.55})`;
            ctx.lineWidth   = 1.2;
            ctx.stroke();
        }

        // ── Blink flash decay ─────────────────────────────────────────────────────
        this.blinkFlash = Math.max(0, this.blinkFlash - 0.016 * 2.0);

        // ── Vignette (focuses eye to centre) ─────────────────────────────────────
        const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W,H) * 0.28, W / 2, H / 2, Math.max(W,H) * 0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.62)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // ── Transition overlay ────────────────────────────────────────────────────
        if (this.transitioning && this.transitionAlpha > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.transitionAlpha * 0.85})`;
            ctx.fillRect(0, 0, W, H);
        }
    }

    // ─── Draw a single tree ──────────────────────────────────────────────────────
    _drawTree(ctx, tree, p, biome) {
        const fog   = Math.min(1, p.depth / biome.fogDist);
        const alpha = Math.pow(1 - fog, 1.2);
        if (alpha < 0.03) return;

        const sway    = Math.sin(this.t * tree.swaySpd + tree.sway) * tree.trunkR * 12 * p.sc;
        const topProj = this._proj(tree.gx + sway * 0.3, tree.h, tree.wz);
        if (!topProj) return;

        // Fog-blended colours
        const [tr, tg, tb] = biome.trunkC;
        const [fr, fg, fb] = biome.fogC;
        const blend = fog;
        const tcR   = Math.round(tr * (1-blend) + fr * blend);
        const tcG   = Math.round(tg * (1-blend) + fg * blend);
        const tcB   = Math.round(tb * (1-blend) + fb * blend);
        const [cr, cg, cb] = biome.canopyC;
        const ccR   = Math.round(cr * (1-blend) + fr * blend);
        const ccG   = Math.round(cg * (1-blend) + fg * blend);
        const ccB   = Math.round(cb * (1-blend) + fb * blend);

        const tw = Math.max(1, tree.trunkR * p.sc * 55);

        // ── Trunk ────────────────────────────────────────────────────────────────
        ctx.fillStyle = `rgba(${tcR},${tcG},${tcB},${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p.x - tw,         p.y);
        ctx.lineTo(p.x + tw,         p.y);
        ctx.lineTo(topProj.x + sway + tw * 0.4, topProj.y);
        ctx.lineTo(topProj.x + sway - tw * 0.4, topProj.y);
        ctx.closePath();
        ctx.fill();

        // ── Canopy — three overlapping blobs ─────────────────────────────────────
        const cR  = Math.max(2, tree.canopyR * p.sc * 55);
        const cxP = topProj.x + sway;
        const cyP = topProj.y;

        ctx.fillStyle = `rgba(${ccR},${ccG},${ccB},${alpha * 0.95})`;
        for (let b = 0; b < 3; b++) {
            const bOX = (b - 1) * cR * 0.52;
            const bOY = b === 1 ? -cR * 0.28 : cR * 0.05;
            const bR  = b === 1 ? cR : cR * 0.72;
            ctx.beginPath();
            ctx.arc(cxP + bOX, cyP + bOY, bR, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Bioluminescent glow on canopy ─────────────────────────────────────────
        const glow = 0.5 + 0.5 * Math.sin(this.t * tree.glowSpd + tree.glowPh);
        const gInt = alpha * (0.06 + glow * 0.10 + this.blinkFlash * 0.14);
        if (gInt > 0.02 && p.depth < biome.fogDist * 0.7) {
            const [gr, gg2, gbio] = biome.glowC;
            const glowG = ctx.createRadialGradient(cxP, cyP - cR * 0.4, 0, cxP, cyP - cR * 0.4, cR * 1.8);
            glowG.addColorStop(0,   `rgba(${gr},${gg2},${gbio},${gInt})`);
            glowG.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = glowG;
            ctx.beginPath();
            ctx.arc(cxP, cyP - cR * 0.4, cR * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ─── Subtle god-ray light shafts ─────────────────────────────────────────────
    _drawLightShafts(ctx, biome, W, HY) {
        const [gr, gg, gb] = biome.glowC;
        const shafts = 4;
        for (let i = 0; i < shafts; i++) {
            const t  = (this.t * 0.04 + i * 0.62) % 1;
            const x0 = W * (0.1 + t * 0.8);
            const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.22 + i * 1.57);
            const alpha = 0.015 + pulse * 0.018;
            const shG   = ctx.createLinearGradient(x0, 0, x0 + W * 0.06, HY);
            shG.addColorStop(0, `rgba(${gr},${gg},${gb},${alpha})`);
            shG.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
            ctx.fillStyle = shG;
            ctx.beginPath();
            ctx.moveTo(x0, 0);
            ctx.lineTo(x0 + W * 0.055, 0);
            ctx.lineTo(W / 2 + (x0 - W/2) * 0.15, HY);
            ctx.closePath();
            ctx.fill();
        }
    }

    // ─── Ground texture lines ─────────────────────────────────────────────────────
    _drawGroundLines(ctx, biome, W, H, HY) {
        const [fr, fg, fb] = biome.fogC;
        ctx.strokeStyle = `rgba(${fr},${fg},${fb},0.12)`;
        ctx.lineWidth   = 1.0;
        const VP = W / 2; // vanishing point X
        const numLines = 7;
        for (let i = 0; i < numLines; i++) {
            const xBase = W * (i + 0.5) / numLines;
            ctx.beginPath();
            ctx.moveTo(VP, HY);
            ctx.lineTo(xBase, H);
            ctx.stroke();
        }
        // Horizontal speed lines (parallax depth)
        for (let d = 1; d <= 4; d++) {
            const frac   = d / 5;
            const yLine  = HY + (H - HY) * Math.pow(frac, 2.2);
            const phaseOff = ((this.camZ * 0.4) % 1) * (H - HY);
            const y      = HY + ((yLine - HY + phaseOff) % (H - HY));
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.strokeStyle = `rgba(${fr},${fg},${fb},0.07)`;
            ctx.stroke();
        }
    }

    // ─── Cave ceiling with hanging stalactites ────────────────────────────────────
    _drawCeiling(ctx, biome, W, HY) {
        const [cr, cg, cb] = biome.skyA;
        const [gr, gg, gb] = biome.glowC;

        // Solid ceiling band
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(0, 0, W, HY * 0.22);

        // Stalactites
        const count = 14;
        for (let i = 0; i < count; i++) {
            const phase = (i / count + (this.camZ * 0.018) % 1 + this.t * 0.0008) % 1;
            const x     = phase * W * 1.12 - W * 0.06;
            const h     = HY * (0.2 + 0.55 * Math.abs(Math.sin(i * 2.71828)));
            const w     = 8 + Math.abs(Math.sin(i * 1.41)) * 18;
            const fog   = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.9));

            const [fr, fg2, fb] = biome.fogC;
            const sR    = Math.round(cr * (1-fog) + fr * fog);
            const sG    = Math.round(cg * (1-fog) + fg2 * fog);
            const sB    = Math.round(cb * (1-fog) + fb * fog);
            ctx.fillStyle = `rgba(${sR},${sG},${sB},${0.9 - fog * 0.5})`;

            // Tapered stalactite shape
            ctx.beginPath();
            ctx.moveTo(x - w/2, 0);
            ctx.lineTo(x + w/2, 0);
            ctx.lineTo(x + 1, h);
            ctx.lineTo(x - 1, h);
            ctx.closePath();
            ctx.fill();

            // Glowing crystal tip
            const gPulse = 0.5 + 0.5 * Math.sin(this.t * 0.8 + i);
            const gA     = (0.10 + gPulse * 0.15) * (1 - fog) * (1 + this.blinkFlash * 0.5);
            const tipG   = ctx.createRadialGradient(x, h - 2, 0, x, h - 2, 14);
            tipG.addColorStop(0,   `rgba(${gr},${gg},${gb},${gA})`);
            tipG.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = tipG;
            ctx.beginPath();
            ctx.arc(x, h - 2, 14, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
