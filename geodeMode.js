// Geode Mode — crystal growth inside a stone cavity.
// Crystals grow inward from the wall toward the hollow centre.
// Amethyst, citrine, quartz, or obsidian — changes each scene.
// Blink: a new crystal cluster erupts and the colour shifts.
class GeodeMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this._crystals = [];
        this._palette  = 0;   // 0=amethyst 1=citrine 2=quartz 3=obsidian
        this._flash    = 0;
        this._off      = null;
        this._offCtx   = null;
    }

    startScene() {
        this.t       = 0;
        this._flash  = 0;
        this._palette = Math.floor(Math.random() * 4);
        this._initOff();
        this._crystals = [];
        this._seedCrystals(60);
    }

    onBlink() {
        this._flash   = 1.0;
        this._palette = (this._palette + 1) % 4;
        this._seedCrystals(30);
    }

    _palColor(t) {
        // t = 0 (base/dark) to 1 (tip/bright)
        switch (this._palette) {
            case 0: return `hsl(${270 + t * 30}, ${60 + t * 30}%, ${20 + t * 55}%)`;  // amethyst
            case 1: return `hsl(${40 + t * 18},  ${70 + t * 20}%, ${18 + t * 55}%)`;  // citrine
            case 2: return `hsl(${200 + t * 10}, ${20 + t * 30}%, ${22 + t * 60}%)`;  // quartz
            case 3: return `hsl(${250 + t * 15}, ${10 + t * 20}%, ${5  + t * 40}%)`;  // obsidian
        }
    }

    _initOff() {
        const W = this.canvas.width, H = this.canvas.height;
        if (!this._off) this._off = document.createElement('canvas');
        this._off.width  = W;
        this._off.height = H;
        this._offCtx = this._off.getContext('2d');
        this._offCtx.fillStyle = '#0a0608';
        this._offCtx.fillRect(0, 0, W, H);
    }

    _seedCrystals(n) {
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const innerR = Math.min(W, H) * 0.18;
        const outerR = Math.min(W, H) * 0.46;

        for (let i = 0; i < n; i++) {
            // Place seed on the geode wall (between innerR and outerR)
            const angle  = Math.random() * Math.PI * 2;
            const dist   = innerR + (outerR - innerR) * (0.7 + Math.random() * 0.3);
            const sx     = cx + Math.cos(angle) * dist;
            const sy     = cy + Math.sin(angle) * dist;

            // Crystal grows toward the centre
            const growAngle = Math.atan2(cy - sy, cx - sx) + (Math.random() - 0.5) * 0.6;
            const maxLen    = dist - innerR * (0.7 + Math.random() * 0.5);
            const w         = 2.5 + Math.random() * 5.5;

            this._crystals.push({
                x: sx, y: sy,
                angle:   growAngle,
                len:     0,
                maxLen:  Math.max(10, maxLen * (0.3 + Math.random() * 0.7)),
                width:   w,
                growth:  0.18 + Math.random() * 0.45,
                drawn:   false,
            });
        }
    }

    draw(time) {
        this.t += 0.016;
        this._flash = Math.max(0, this._flash - 0.016 * 1.2);

        const ctx  = this.ctx;
        const W    = this.canvas.width, H = this.canvas.height;
        const cx   = W / 2, cy = H / 2;
        const fl   = this._flash;

        // Grow crystals and paint finished growth onto off-canvas
        const ctx2 = this._offCtx;
        let anyGrowing = false;
        for (const c of this._crystals) {
            if (c.len >= c.maxLen) continue;
            anyGrowing = true;
            c.len = Math.min(c.maxLen, c.len + c.growth);

            // Paint the full crystal onto the off-canvas (redraw from base)
            const tx = c.x + Math.cos(c.angle) * c.len;
            const ty = c.y + Math.sin(c.angle) * c.len;

            ctx2.save();
            const sides = 4 + Math.floor(c.width / 3);   // 4–6 sided prism
            ctx2.translate(c.x, c.y);
            ctx2.rotate(c.angle);

            // Prism body
            const t_base = 0.1, t_tip = 1.0;
            const cg = ctx2.createLinearGradient(0, 0, c.len, 0);
            cg.addColorStop(0,   this._palColor(t_base));
            cg.addColorStop(0.6, this._palColor(0.6));
            cg.addColorStop(1,   this._palColor(t_tip));
            ctx2.fillStyle = cg;

            ctx2.beginPath();
            ctx2.moveTo(0, -c.width * 0.5);
            ctx2.lineTo(c.len * 0.8, -c.width * 0.25);
            ctx2.lineTo(c.len, 0);
            ctx2.lineTo(c.len * 0.8, c.width * 0.25);
            ctx2.lineTo(0, c.width * 0.5);
            ctx2.closePath();
            ctx2.fill();

            // Highlight edge
            ctx2.beginPath();
            ctx2.moveTo(0, -c.width * 0.5);
            ctx2.lineTo(c.len * 0.8, -c.width * 0.25);
            ctx2.lineTo(c.len, 0);
            ctx2.strokeStyle = this._palColor(1.0).replace('hsl', 'hsla').replace(')', ', 0.40)');
            ctx2.lineWidth   = 0.7;
            ctx2.stroke();

            ctx2.restore();
        }

        // ── Draw everything ────────────────────────────────────────
        ctx.fillStyle = 'rgba(8, 4, 6, 0.18)';
        ctx.fillRect(0, 0, W, H);

        // Stone surround (outer dark ring)
        const stoneG = ctx.createRadialGradient(cx, cy, Math.min(W,H)*0.42, cx, cy, Math.max(W,H)*0.70);
        stoneG.addColorStop(0, 'rgba(0,0,0,0)');
        stoneG.addColorStop(1, 'rgba(12, 8, 6, 0.90)');
        ctx.fillStyle = stoneG;
        ctx.fillRect(0, 0, W, H);

        // Crystal layer
        ctx.drawImage(this._off, 0, 0);

        // Inner cavity glow
        const holeG = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W,H)*0.18);
        holeG.addColorStop(0,   this._palColor(0.4).replace('hsl','hsla').replace(')',',0.12)'));
        holeG.addColorStop(0.6, 'rgba(0,0,0,0)');
        ctx.fillStyle = holeG;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(W,H)*0.20, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle at crystal tips (random twinkle)
        for (const c of this._crystals) {
            if (c.len < c.maxLen * 0.85) continue;
            const tx = c.x + Math.cos(c.angle) * c.len;
            const ty = c.y + Math.sin(c.angle) * c.len;
            const twinkle = 0.5 + 0.5 * Math.sin(this.t * 3.5 + c.len);
            if (twinkle > 0.75) {
                const sg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 6);
                sg.addColorStop(0, this._palColor(1.0).replace('hsl','hsla').replace(')',`,${twinkle * 0.70})`));
                sg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = sg;
                ctx.beginPath();
                ctx.arc(tx, ty, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Flash
        if (fl > 0.02) {
            ctx.fillStyle = this._palColor(0.8).replace('hsl','hsla').replace(')',`,${fl * 0.18})`);
            ctx.fillRect(0, 0, W, H);
        }

        // Vignette
        const vig = ctx.createRadialGradient(cx,cy,Math.min(W,H)*0.12,cx,cy,Math.max(W,H)*0.62);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.70)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
