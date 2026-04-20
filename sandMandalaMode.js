// Sand Mandala Mode — grains of coloured sand slowly build a 12-fold mandala.
// Each grain flies from off-screen and settles into its destined position.
// Blink: a slow breath sweeps every grain away. The mandala begins again.
class SandMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._grains    = [];   // in-flight grains
        this._settled   = null; // off-canvas: settled grain layer
        this._settledCtx= null;
        this._targets   = [];   // target positions forming the mandala
        this._nextTarget = 0;
        this._sweep     = 0;    // blink sweep energy
        this._blown     = [];   // blown-away particles
    }

    startScene() {
        this.t         = 0;
        this._grains   = [];
        this._blown    = [];
        this._sweep    = 0;
        this._nextTarget = 0;
        this._initSettled();
        this._buildTargets();
    }

    _initSettled() {
        const W = this.canvas.width, H = this.canvas.height;
        if (!this._settled) this._settled = document.createElement('canvas');
        this._settled.width  = W;
        this._settled.height = H;
        this._settledCtx = this._settled.getContext('2d');
        this._settledCtx.clearRect(0, 0, W, H);
    }

    _buildTargets() {
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const R  = Math.min(W, H) * 0.40;
        const FOLDS = 12;
        this._targets = [];

        // Build concentric rings of target positions
        const layers = [
            { r: 0.08, n: 1,          hue: 48  },  // gold centre dot
            { r: 0.14, n: FOLDS,      hue: 30  },  // inner ring
            { r: 0.22, n: FOLDS * 2,  hue: 0   },  // red ring
            { r: 0.30, n: FOLDS * 3,  hue: 340 },  // magenta
            { r: 0.38, n: FOLDS * 4,  hue: 270 },  // purple
            { r: 0.46, n: FOLDS * 5,  hue: 200 },  // blue
            { r: 0.54, n: FOLDS * 6,  hue: 160 },  // teal
            { r: 0.62, n: FOLDS * 7,  hue: 120 },  // green
            { r: 0.72, n: FOLDS * 8,  hue: 55  },  // yellow
            { r: 0.82, n: FOLDS * 9,  hue: 22  },  // orange
        ];

        for (const layer of layers) {
            const rr = R * layer.r;
            const n  = Math.round(layer.n);
            for (let i = 0; i < n; i++) {
                const angle = (i / n) * Math.PI * 2;
                const hueVar = layer.hue + (Math.random() - 0.5) * 18;
                this._targets.push({
                    x:   cx + Math.cos(angle) * rr + (Math.random() - 0.5) * 3,
                    y:   cy + Math.sin(angle) * rr + (Math.random() - 0.5) * 3,
                    hue: hueVar,
                    sat: 70 + Math.random() * 28,
                    lum: 55 + Math.random() * 20,
                    r:   1.2 + Math.random() * 1.0,
                });
            }
        }

        // Shuffle so grains arrive in random order rather than ring-by-ring
        for (let i = this._targets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._targets[i], this._targets[j]] = [this._targets[j], this._targets[i]];
        }
    }

    onBlink() {
        // Scatter all settled grains
        this._sweep = 1.0;
        const ctx2  = this._settledCtx;
        const W     = this.canvas.width, H = this.canvas.height;
        // Spawn blown particles from current settled image pixels (sample)
        const cx = W / 2, cy = H / 2;
        for (const tgt of this._targets.slice(0, this._nextTarget)) {
            const dx   = tgt.x - cx, dy = tgt.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            const spd  = 1.5 + Math.random() * 3.5;
            this._blown.push({
                x: tgt.x, y: tgt.y,
                vx: (dx / dist) * spd * (0.5 + Math.random()),
                vy: (dy / dist) * spd * (0.5 + Math.random()) - 0.8,
                hue: tgt.hue, sat: tgt.sat, lum: tgt.lum,
                r: tgt.r,
                life: 0, maxLife: 1.8 + Math.random() * 1.4,
            });
        }
        // Clear settled layer and restart
        ctx2.clearRect(0, 0, W, H);
        this._nextTarget = 0;
        this._grains     = [];
    }

    draw(time) {
        this.t += 0.016;
        this._sweep = Math.max(0, this._sweep - 0.016 * 1.2);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        // Warm stone background
        ctx.fillStyle = 'rgba(18, 14, 10, 0.12)';
        ctx.fillRect(0, 0, W, H);

        // ── Spawn new in-flight grains (8 per frame) ──────────────
        const SPAWN_PER_FRAME = 8;
        for (let s = 0; s < SPAWN_PER_FRAME && this._nextTarget < this._targets.length; s++) {
            const tgt  = this._targets[this._nextTarget++];
            // Grain starts from a random edge
            const edge = Math.floor(Math.random() * 4);
            let sx, sy;
            if (edge === 0) { sx = Math.random() * W; sy = -10; }
            else if (edge === 1) { sx = W + 10; sy = Math.random() * H; }
            else if (edge === 2) { sx = Math.random() * W; sy = H + 10; }
            else { sx = -10; sy = Math.random() * H; }

            this._grains.push({
                x: sx, y: sy,
                tx: tgt.x, ty: tgt.y,
                hue: tgt.hue, sat: tgt.sat, lum: tgt.lum,
                r: tgt.r,
                speed: 3.0 + Math.random() * 4.0,
                settled: false,
            });
        }

        // ── Update in-flight grains ────────────────────────────────
        const ctx2 = this._settledCtx;
        const toRemove = [];
        for (let i = 0; i < this._grains.length; i++) {
            const g = this._grains[i];
            const dx = g.tx - g.x, dy = g.ty - g.y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < g.speed * 1.2) {
                // Settle — paint onto the settled canvas
                ctx2.beginPath();
                ctx2.arc(g.tx, g.ty, g.r, 0, Math.PI * 2);
                ctx2.fillStyle = `hsla(${g.hue}, ${g.sat}%, ${g.lum}%, 0.90)`;
                ctx2.fill();
                toRemove.push(i);
            } else {
                g.x += (dx / d) * g.speed;
                g.y += (dy / d) * g.speed;
                g.x += (Math.random() - 0.5) * 1.2;
                g.y += (Math.random() - 0.5) * 1.2;
            }
        }
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this._grains.splice(toRemove[i], 1);
        }

        // ── Draw settled layer ─────────────────────────────────────
        ctx.drawImage(this._settled, 0, 0);

        // ── Draw in-flight grains ──────────────────────────────────
        for (const g of this._grains) {
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.r * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${g.hue}, ${g.sat}%, ${g.lum + 10}%, 0.55)`;
            ctx.fill();
        }

        // ── Blown grains ──────────────────────────────────────────
        for (let bi = this._blown.length - 1; bi >= 0; bi--) {
            const b = this._blown[bi];
            b.life += 0.016;
            if (b.life > b.maxLife) { this._blown.splice(bi, 1); continue; }
            b.x  += b.vx; b.y += b.vy;
            b.vy += 0.04;  // gravity
            b.vx *= 0.99;
            const env = Math.max(0, 1 - b.life / b.maxLife);
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${b.hue}, ${b.sat}%, ${b.lum}%, ${env * 0.80})`;
            ctx.fill();
        }

        // ── Vignette ──────────────────────────────────────────────
        const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.30,W/2,H/2,Math.max(W,H)*0.68);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.52)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
