// Frost Mode — ice crystals growing across a cold dark surface.
// Each crystal begins as a single point and branches outward: main arms first,
// then secondary branches, then fine tertiary needles. Hexagonal for ice,
// but also 4-fold and 3-fold variants — the geometry of slow cooling.
// Multiple seed points appear staggered. Screen blend mode makes crystals glow.
// Blink: a new seed nucleates, sparkle burst from all existing crystal tips.
class FrostMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this._crystals  = [];
        this._sparkles  = [];
        this._off       = null; this._offCtx = null;
        this._nextSeed  = 1.5;
        this._generation = 0;
        this._blinkBurst = 0;
    }

    startScene() {
        this.t            = 0;
        this._crystals    = [];
        this._sparkles    = [];
        this._generation  = 0;
        this._blinkBurst  = 0;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width  = W; this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }
        this._offCtx.fillStyle = '#01020c';
        this._offCtx.fillRect(0, 0, W, H);
        this._seed(W / 2, H / 2);
        this._nextSeed = Infinity;   // no auto-seeding — only blink adds new crystals
    }

    onBlink() {
        // Cap at 3 crystals — start fading the oldest before adding new
        if (this._crystals.length >= 3) this._crystals[0].phase = 'fading';
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const x = W * (0.15 + Math.random() * 0.70);
        const y = H * (0.15 + Math.random() * 0.70);
        this._seed(x, y);
        this._blinkBurst = 1.0;
        // Trim sparkle pool so burst never causes a perf spike
        if (this._sparkles.length > 60) this._sparkles.length = 60;
    }

    _seed(x, y) {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const syms = [6, 6, 6, 6, 4, 3];   // mostly hexagonal
        const sym  = syms[Math.floor(Math.random() * syms.length)];
        const maxR = Math.min(W, H) * (0.22 + Math.random() * 0.24);

        this._crystals.push({
            x, y, sym, maxR,
            a:      0,
            phase:  'growing',
            fullAt: 0,
            arms:   this._buildArms(sym, maxR),
            growth: 0,
            hue:    182 + Math.random() * 40,   // cool blue-teal range
        });
    }

    _buildArms(sym, maxR) {
        const arms = [];
        const angleStep = (Math.PI * 2) / sym;
        for (let ai = 0; ai < sym; ai++) {
            const baseAngle = ai * angleStep + (Math.random() - 0.5) * 0.10;
            arms.push(this._buildBranch(0, 0, baseAngle, maxR, 0));
        }
        return arms;
    }

    _buildBranch(x, y, angle, maxLen, depth) {
        if (depth > 4 || maxLen < 2) return null;
        const len = maxLen;
        const x1  = x + Math.cos(angle) * len;
        const y1  = y + Math.sin(angle) * len;
        const subs = [];
        const nSub = depth === 0 ? (5 + Math.floor(Math.random() * 3)) : (2 + Math.floor(Math.random() * 2));
        for (let si = 0; si < nSub; si++) {
            const frac   = 0.18 + (si / (nSub - 1 || 1)) * 0.78;
            const bx     = x + Math.cos(angle) * len * frac;
            const by     = y + Math.sin(angle) * len * frac;
            const subLen = len * (0.28 + Math.random() * 0.24);
            const dAng   = (Math.PI / 3) * (Math.random() < 0.5 ? 1 : -1) + (Math.random() - 0.5) * 0.14;
            const sub    = this._buildBranch(bx, by, angle + dAng, subLen, depth + 1);
            if (sub) { sub.growStart = frac * 0.82; subs.push(sub); }
        }
        return { x0: x, y0: y, x1, y1, subs, depth, growStart: 0 };
    }

    _findTip(branch) {
        if (!branch) return null;
        let deepest = branch;
        const visit = (b) => {
            if (b.depth >= deepest.depth) deepest = b;
            for (const s of b.subs) visit(s);
        };
        visit(branch);
        return { x: deepest.x1, y: deepest.y1 };
    }

    _drawBranch(oc, branch, g, cx, cy, hue, a) {
        if (!branch || g <= branch.growStart) return;
        const localSpan = 1 - branch.growStart;
        const localG    = Math.min(1, (g - branch.growStart) / (localSpan * 0.55 || 0.01));
        const bx1 = branch.x0 + (branch.x1 - branch.x0) * localG;
        const by1 = branch.y0 + (branch.y1 - branch.y0) * localG;

        const lw     = Math.max(0.4, 2.2 - branch.depth * 0.42);
        const bright = 58 + branch.depth * 9;
        const aa     = a * (0.60 + 0.40 * (1 - branch.depth / 5));

        oc.beginPath();
        oc.moveTo(cx + branch.x0, cy + branch.y0);
        oc.lineTo(cx + bx1, cy + by1);
        oc.strokeStyle = `hsla(${hue}, 68%, ${bright}%, ${aa})`;
        oc.lineWidth   = lw;
        oc.stroke();

        // Glowing growth front
        if (localG > 0.85 && localG < 1.0 && lw > 0.7) {
            oc.beginPath();
            oc.arc(cx + bx1, cy + by1, lw * 1.8, 0, Math.PI * 2);
            oc.fillStyle = `hsla(${hue + 20}, 65%, 90%, ${aa * 0.75})`;
            oc.fill();
        }

        for (const sub of branch.subs) this._drawBranch(oc, sub, g, cx, cy, hue, a);
    }

    draw(time) {
        this.t += 0.016;
        this._blinkBurst = Math.max(0, this._blinkBurst - 0.016 * 1.2);
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const oc  = this._offCtx;

        // No auto-seeding — crystals only appear on blink

        oc.fillStyle = 'rgba(1, 2, 12, 0.007)';
        oc.fillRect(0, 0, W, H);

        for (let ci = this._crystals.length - 1; ci >= 0; ci--) {
            const c = this._crystals[ci];

            if (c.phase === 'growing') {
                c.growth += 0.0016 + (1 - c.growth) * 0.003;   // slow, meditative growth
                c.a      += (0.92 - c.a) * 0.035;
                if (c.growth >= 0.998) {
                    c.growth = 1;
                    c.phase  = 'full';
                    c.fullAt = this.t;
                }
            } else if (c.phase === 'full') {
                c.a += (0.92 - c.a) * 0.02;
                if (this.t - c.fullAt > 10) c.phase = 'fading';
            } else {
                c.a *= 0.9938;
                if (c.a < 0.008) {
                    this._crystals.splice(ci, 1);
                    this._nextSeed = Math.min(this._nextSeed, this.t + 0.4);
                    continue;
                }
            }

            for (const arm of c.arms) this._drawBranch(oc, arm, c.growth, c.x, c.y, c.hue, c.a);

            // Sparkle emission — faster rate
            if (c.phase !== 'fading' && c.growth >= 0.90 && Math.random() < 0.12) {
                const arm = c.arms[Math.floor(Math.random() * c.arms.length)];
                const tip = arm ? this._findTip(arm) : null;
                if (tip) {
                    this._sparkles.push({
                        x:    c.x + tip.x,
                        y:    c.y + tip.y,
                        vx:   (Math.random() - 0.5) * 0.42,
                        vy:   -(0.08 + Math.random() * 0.36),
                        life: 1.0,
                        hue:  c.hue,
                        r:    0.6 + Math.random() * 1.0,
                    });
                }
            }

            // Blink burst — flood all tips with sparkles
            if (this._blinkBurst > 0.5 && c.growth >= 0.80) {
                for (const arm of c.arms) {
                    const tip = arm ? this._findTip(arm) : null;
                    if (tip && Math.random() < 0.6) {
                        for (let b = 0; b < 3; b++) {
                            this._sparkles.push({
                                x:    c.x + tip.x + (Math.random() - 0.5) * 4,
                                y:    c.y + tip.y + (Math.random() - 0.5) * 4,
                                vx:   (Math.random() - 0.5) * 1.2,
                                vy:   -(0.2 + Math.random() * 0.8),
                                life: 1.0,
                                hue:  c.hue,
                                r:    0.8 + Math.random() * 1.4,
                            });
                        }
                    }
                }
            }

            // Central seed glow — larger and brighter
            const cg = oc.createRadialGradient(c.x, c.y, 0, c.x, c.y, 10);
            cg.addColorStop(0, `hsla(${c.hue + 15}, 65%, 90%, ${c.a * 0.65})`);
            cg.addColorStop(1, 'rgba(0,0,0,0)');
            oc.fillStyle = cg;
            oc.beginPath(); oc.arc(c.x, c.y, 10, 0, Math.PI * 2); oc.fill();
        }

        // Sparkle particles
        this._sparkles = this._sparkles.filter(s => s.life > 0).slice(-120);   // hard cap — no memory leak
        for (const s of this._sparkles) {
            s.x    += s.vx;
            s.y    += s.vy;
            s.vy   -= 0.005;   // slight float-upward
            s.life -= 0.013;
            const a = Math.pow(s.life, 0.50) * 0.88;
            oc.beginPath();
            oc.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            oc.fillStyle = `hsla(${s.hue}, 55%, 94%, ${a})`;
            oc.fill();
            const sg = oc.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5.5);
            sg.addColorStop(0, `hsla(${s.hue}, 55%, 85%, ${a * 0.38})`);
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            oc.fillStyle = sg;
            oc.beginPath(); oc.arc(s.x, s.y, s.r * 5.5, 0, Math.PI * 2); oc.fill();
        }

        ctx.drawImage(this._off, 0, 0);
    }
}
