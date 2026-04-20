// Smoke Mode — incense smoke rising from a single glowing source.
// Turbulence makes it curl and drift; the column widens as it rises.
// Pure meditative stillness. Blink: the ember flares and a thick burst erupts.
class SmokeMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._particles = [];
        this._ember = 0;
        this._MAX_P = 280;
    }

    startScene() {
        this.t          = 0;
        this._ember     = 0;
        this._particles = [];
        for (let i = 0; i < 80; i++) this._spawn(true);
    }

    onBlink() {
        this._ember = 1.0;
        for (let i = 0; i < 60; i++) this._spawn(false, true);
    }

    _spawn(initial = false, burst = false) {
        const W = this.canvas.width, H = this.canvas.height;
        const srcX = W / 2;
        const srcY = H * 0.82;   // incense stick tip

        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.35;
        const speed = burst ? (1.5 + Math.random() * 2.5) : (0.35 + Math.random() * 0.75);
        const life  = initial ? Math.random() * 6 : 0;

        this._particles.push({
            x:       srcX + (Math.random() - 0.5) * 6,
            y:       srcY,
            vx:      Math.cos(angle) * speed * 0.25,
            vy:      Math.sin(angle) * speed,
            wobble:  Math.random() * Math.PI * 2,
            wSpd:    0.5 + Math.random() * 1.2,
            size:    burst ? (6 + Math.random() * 12) : (3 + Math.random() * 8),
            alpha:   burst ? (0.18 + Math.random() * 0.22) : (0.10 + Math.random() * 0.16),
            life,
            maxLife: burst ? (4 + Math.random() * 4) : (7 + Math.random() * 9),
            hot:     burst,
        });
    }

    draw(time) {
        this.t += 0.016;
        this._ember = Math.max(0, this._ember - 0.016 * 0.9);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const t  = this.t;
        const srcX = W / 2, srcY = H * 0.82;

        // Very dark background — almost full black
        ctx.fillStyle = 'rgba(4, 3, 2, 0.14)';
        ctx.fillRect(0, 0, W, H);

        // Ember glow at source
        const eg = ctx.createRadialGradient(srcX, srcY, 0, srcX, srcY, 30 + this._ember * 40);
        eg.addColorStop(0,   `rgba(255, 180, 60, ${0.28 + this._ember * 0.40})`);
        eg.addColorStop(0.3, `rgba(220, 80, 10,  ${0.12 + this._ember * 0.18})`);
        eg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(srcX, srcY, 30 + this._ember * 40, 0, Math.PI * 2);
        ctx.fill();

        // Incense stick
        ctx.save();
        ctx.strokeStyle = `rgba(60, 35, 20, 0.70)`;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(srcX, srcY);
        ctx.lineTo(srcX, H * 0.98);
        ctx.stroke();
        ctx.restore();

        // Spawn trickle
        if (this._particles.length < this._MAX_P && Math.random() < 0.7) {
            this._spawn(false);
        }

        // Update & draw particles (back to front for correct alpha layering)
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life += 0.016;
            if (p.life > p.maxLife) { this._particles.splice(i, 1); continue; }

            const lr  = p.life / p.maxLife;
            // Envelope: fade in quickly, very slow fade out
            const env = lr < 0.08 ? lr / 0.08 : Math.max(0, 1 - Math.pow((lr - 0.08) / 0.92, 0.55));

            // Turbulence widens with height
            const heightFrac = Math.max(0, (srcY - p.y) / (srcY - H * 0.05));
            p.wobble += p.wSpd * 0.016;
            p.vx     += Math.sin(p.wobble * 0.9 + t * 0.2) * 0.018 * (1 + heightFrac * 2.5);
            p.vy     *= 0.9995;
            p.x      += p.vx;
            p.y      += p.vy;
            p.vx     *= 0.994;

            // Grow with height
            const sz  = p.size * (1 + heightFrac * 1.8);
            const a   = p.alpha * env;

            if (a < 0.005) continue;

            // Colour: warm amber at base → cool blue-grey at top
            const warmth  = Math.max(0, 1 - heightFrac * 1.5);
            const r       = Math.round(220 * warmth + 160 * (1 - warmth));
            const g2      = Math.round(120 * warmth + 150 * (1 - warmth));
            const b2      = Math.round(40  * warmth + 160 * (1 - warmth));

            const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz);
            pg.addColorStop(0,   `rgba(${r},${g2},${b2}, ${a})`);
            pg.addColorStop(0.5, `rgba(${r},${g2},${b2}, ${a * 0.4})`);
            pg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
            ctx.fill();
        }

        // Vignette
        const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.18,W/2,H/2,Math.max(W,H)*0.70);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.72)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
