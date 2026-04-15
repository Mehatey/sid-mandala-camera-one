// Frost Mode — ice crystals growing across a cold dark surface.
// Each crystal begins as a single point and branches outward: main arms first,
// then secondary branches, then fine tertiary needles. Hexagonal for ice,
// but also 4-fold and 3-fold variants — the geometry of slow cooling.
// Multiple seed points appear staggered. When the screen is full, crystals
// slowly fade and a new generation begins.
//
// Blink: a new seed nucleates at the blink point, starts growing immediately.
// Completely still to watch. The geometry is perfect. The cold is palpable.
class FrostMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this._crystals  = [];
        this._sparkles  = [];   // ice glitter particles drifting from grown tips
        this._off       = null; this._offCtx = null;
        this._nextSeed  = 2.0;
        this._generation = 0;
    }

    startScene() {
        this.t           = 0;
        this._crystals   = [];
        this._sparkles   = [];
        this._generation = 0;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width  = W; this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }
        this._offCtx.fillStyle = '#01020c';
        this._offCtx.fillRect(0, 0, W, H);
        // Seed first crystal at centre
        this._seed(W / 2, H / 2);
        this._nextSeed = 3.5 + Math.random() * 2;
    }

    onBlink() {
        // New seed at a random position
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const x = W * (0.15 + Math.random() * 0.70);
        const y = H * (0.15 + Math.random() * 0.70);
        this._seed(x, y);
    }

    _seed(x, y) {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        // Choose symmetry: 6-fold (hexagonal) most of the time, occasionally 4 or 3
        const syms = [6, 6, 6, 4, 3];
        const sym  = syms[Math.floor(Math.random() * syms.length)];
        const maxR = Math.min(W, H) * (0.20 + Math.random() * 0.22);

        this._crystals.push({
            x, y, sym, maxR,
            // Crystal alpha: fades in then out over its lifetime
            a:      0,
            phase:  'growing',   // growing | full | fading
            fullAt: 0,           // t when growth completed

            // Arms: each arm is a list of drawn segments
            arms:   this._buildArms(sym, maxR),
            // Growth state: how far we've grown (0 – 1)
            growth: 0,
            // Colour variation: slightly warm (older ice) or cool (fresh)
            hue:    185 + Math.random() * 35,
        });
    }

    _buildArms(sym, maxR) {
        // Pre-compute the branch tree for all arms at this symmetry
        // Returns array of arms, each arm = array of branch objects
        const arms = [];
        const angleStep = (Math.PI * 2) / sym;

        for (let ai = 0; ai < sym; ai++) {
            const baseAngle = ai * angleStep + (Math.random() - 0.5) * 0.12;
            arms.push(this._buildBranch(0, 0, baseAngle, maxR, 0));
        }
        return arms;
    }

    _buildBranch(x, y, angle, maxLen, depth) {
        // Returns a segment tree: { x0, y0, x1, y1, subBranches[], growStart }
        // growStart: fraction of parent growth when this segment starts drawing
        if (depth > 4 || maxLen < 2) return null;

        const len = maxLen;
        const x1  = x + Math.cos(angle) * len;
        const y1  = y + Math.sin(angle) * len;

        const subs = [];
        // Spawn sub-branches at 3-5 points along this arm
        const nSub = depth === 0 ? (4 + Math.floor(Math.random() * 3)) : (2 + Math.floor(Math.random() * 2));
        for (let si = 0; si < nSub; si++) {
            const frac     = 0.2 + (si / (nSub - 1 || 1)) * 0.75;
            const bx       = x + Math.cos(angle) * len * frac;
            const by       = y + Math.sin(angle) * len * frac;
            const subLen   = len * (0.28 + Math.random() * 0.22);
            // Branch angle: ±60° from main arm (hexagonal), with slight variation
            const dAng     = (Math.PI / 3) * (Math.random() < 0.5 ? 1 : -1) + (Math.random() - 0.5) * 0.15;
            const sub      = this._buildBranch(bx, by, angle + dAng, subLen, depth + 1);
            if (sub) {
                sub.growStart = frac * 0.85;
                subs.push(sub);
            }
        }

        return { x0: x, y0: y, x1, y1, subs, depth, growStart: 0 };
    }

    // Return the geometric tip of the deepest sub-branch (for sparkle spawning)
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

    // Draw a branch tree up to a given overall growth fraction g (0-1)
    _drawBranch(oc, branch, g, cx, cy, hue, a) {
        if (!branch || g <= branch.growStart) return;

        // Local progress for this segment (how much of it is drawn)
        const localSpan = 1 - branch.growStart;
        const localG    = Math.min(1, (g - branch.growStart) / (localSpan * 0.55 || 0.01));

        const bx1 = branch.x0 + (branch.x1 - branch.x0) * localG;
        const by1 = branch.y0 + (branch.y1 - branch.y0) * localG;

        // Line width: main arms thick, thinner at each depth
        const lw = Math.max(0.5, 2.0 - branch.depth * 0.42);
        // Brightness: tips slightly brighter than base (ice sparkle)
        const bright = 52 + branch.depth * 8;
        const aa     = a * (0.55 + 0.45 * (1 - branch.depth / 5));

        oc.beginPath();
        oc.moveTo(cx + branch.x0, cy + branch.y0);
        oc.lineTo(cx + bx1, cy + by1);
        oc.strokeStyle = `hsla(${hue}, 72%, ${bright}%, ${aa})`;
        oc.lineWidth   = lw;
        oc.stroke();

        // Small point of light at tips (fresh growth front)
        if (localG > 0.88 && localG < 1.0 && lw > 0.8) {
            oc.beginPath();
            oc.arc(cx + bx1, cy + by1, lw * 1.4, 0, Math.PI * 2);
            oc.fillStyle = `hsla(${hue}, 60%, 82%, ${aa * 0.6})`;
            oc.fill();
        }

        // Recurse into sub-branches
        for (const sub of branch.subs) {
            this._drawBranch(oc, sub, g, cx, cy, hue, a);
        }
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const oc  = this._offCtx;

        // Auto-seed
        if (this.t > this._nextSeed && this._crystals.length < 5) {
            const x = W * (0.1 + Math.random() * 0.80);
            const y = H * (0.1 + Math.random() * 0.80);
            this._seed(x, y);
            this._nextSeed = this.t + 2.5 + Math.random() * 3.0;
        }

        // Slow background fade — lets old crystals linger before disappearing
        oc.fillStyle = 'rgba(1, 2, 12, 0.008)';
        oc.fillRect(0, 0, W, H);

        // Update + draw each crystal
        for (let ci = this._crystals.length - 1; ci >= 0; ci--) {
            const c = this._crystals[ci];

            if (c.phase === 'growing') {
                c.growth += 0.0028 + (1 - c.growth) * 0.006;   // accelerates slightly at start
                c.a      += (0.88 - c.a) * 0.03;
                if (c.growth >= 0.998) {
                    c.growth = 1;
                    c.phase  = 'full';
                    c.fullAt = this.t;
                }
            } else if (c.phase === 'full') {
                c.a += (0.88 - c.a) * 0.02;
                // Hold fully grown for ~12s then begin fading
                if (this.t - c.fullAt > 12) {
                    c.phase = 'fading';
                }
            } else {
                c.a *= 0.9940;
                if (c.a < 0.008) {
                    this._crystals.splice(ci, 1);
                    // Trigger new seed when a crystal dies
                    this._nextSeed = Math.min(this._nextSeed, this.t + 0.5);
                    continue;
                }
            }

            // Draw all arms
            for (const arm of c.arms) {
                this._drawBranch(oc, arm, c.growth, c.x, c.y, c.hue, c.a);
            }

            // Emit sparkle particles from grown crystal arm tips
            if (c.phase !== 'fading' && c.growth >= 0.92 && Math.random() < 0.07) {
                const arm = c.arms[Math.floor(Math.random() * c.arms.length)];
                const tip = arm ? this._findTip(arm) : null;
                if (tip) {
                    this._sparkles.push({
                        x:    c.x + tip.x,
                        y:    c.y + tip.y,
                        vx:   (Math.random() - 0.5) * 0.38,
                        vy:   -(0.06 + Math.random() * 0.32),
                        life: 1.0,
                        hue:  c.hue,
                        r:    0.55 + Math.random() * 0.90,
                    });
                }
            }

            // Central seed glow
            const cg = oc.createRadialGradient(c.x, c.y, 0, c.x, c.y, 6);
            cg.addColorStop(0, `hsla(${c.hue}, 60%, 78%, ${c.a * 0.5})`);
            cg.addColorStop(1, 'rgba(0,0,0,0)');
            oc.fillStyle = cg;
            oc.beginPath(); oc.arc(c.x, c.y, 6, 0, Math.PI * 2); oc.fill();
        }

        // ── Sparkle particles ─────────────────────────────────────────────────
        this._sparkles = this._sparkles.filter(s => s.life > 0);
        for (const s of this._sparkles) {
            s.x    += s.vx;
            s.y    += s.vy;
            s.life -= 0.014;
            const a = Math.pow(s.life, 0.55) * 0.80;
            // Core dot
            oc.beginPath();
            oc.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            oc.fillStyle = `hsla(${s.hue}, 58%, 90%, ${a})`;
            oc.fill();
            // Tiny glow halo
            const sg = oc.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4.5);
            sg.addColorStop(0, `hsla(${s.hue}, 55%, 82%, ${a * 0.35})`);
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            oc.fillStyle = sg;
            oc.beginPath(); oc.arc(s.x, s.y, s.r * 4.5, 0, Math.PI * 2); oc.fill();
        }

        ctx.drawImage(this._off, 0, 0);
    }
}
