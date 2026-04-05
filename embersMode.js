// Embers Mode — glowing particles drift upward around the face. Blinks burst new embers from centre.
class EmbersMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.particles = [];
        this.MAX_P  = 320;
        this.t      = 0;
        this._burst = 0;
    }

    startScene() {
        this.particles = [];
        this.t      = 0;
        this._burst = 0;
        for (let i = 0; i < 90; i++) this._spawn(true);
    }

    onBlink() {
        const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
        for (let i = 0; i < 22; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = Math.random() * 70;
            this._spawnAt(
                cx + Math.cos(angle) * dist,
                cy + Math.sin(angle) * dist,
                (Math.random() - 0.5) * 2.2,
                -(0.6 + Math.random() * 1.4)
            );
        }
        this._burst = 1.0;
    }

    _spawn(initial = false) {
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const angle = Math.random() * Math.PI * 2;
        const dist  = 55 + Math.random() * Math.min(W, H) * 0.34;
        const x     = cx + Math.cos(angle) * dist;
        const y     = initial ? cy + Math.sin(angle) * dist : cy + dist * 0.4 + 30;
        this._spawnAt(
            x, y,
            (Math.random() - 0.5) * 0.55,
            -(0.14 + Math.random() * 0.48),
            initial ? Math.random() * 5 : 0
        );
    }

    _spawnAt(x, y, vx, vy, lifeOffset = 0) {
        const hue = 4 + Math.random() * 46;
        this.particles.push({
            x, y, vx, vy,
            hue,
            size:    1.1 + Math.random() * 2.2,
            alpha:   0.55 + Math.random() * 0.40,
            life:    lifeOffset,
            maxLife: 3.5 + Math.random() * 5.0,
            wobble:  Math.random() * Math.PI * 2,
            wSpd:    0.6 + Math.random() * 1.8,
        });
    }

    draw(time) {
        this.t += 0.016;
        this._burst = Math.max(0, this._burst - 0.016 * 1.8);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;

        // Background — slow dark-red fade accumulates
        ctx.fillStyle = 'rgba(7, 2, 1, 0.10)';
        ctx.fillRect(0, 0, W, H);

        // Warm heat-glow from centre
        const hR = 130 + 18 * Math.sin(this.t * 0.7);
        const heat = ctx.createRadialGradient(cx, cy, 0, cx, cy, hR);
        heat.addColorStop(0, `rgba(200, 55, 8, ${0.055 + 0.022 * Math.sin(this.t * 1.1)})`);
        heat.addColorStop(0.5, `rgba(140, 28, 4, 0.022)`);
        heat.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = heat;
        ctx.beginPath(); ctx.arc(cx, cy, hR, 0, Math.PI * 2); ctx.fill();

        // Spawn ambient trickle
        if (this.particles.length < this.MAX_P && Math.random() < 0.5)
            this._spawn(false);

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += 0.016;
            if (p.life > p.maxLife) { this.particles.splice(i, 1); continue; }

            const lr  = p.life / p.maxLife;
            const env = lr < 0.12 ? lr / 0.12 : 1 - Math.pow((lr - 0.12) / 0.88, 0.65);

            p.wobble += p.wSpd * 0.016;
            p.x += p.vx + Math.sin(p.wobble) * 0.32;
            p.y += p.vy;
            p.vx *= 0.998;
            p.vy *= 0.997;

            const a  = p.alpha * env;
            const sz = p.size * (1 - lr * 0.35);
            const lum = 55 + 32 * (1 - lr);

            ctx.save();
            ctx.shadowBlur  = 7 + sz * 3.5;
            ctx.shadowColor = `hsla(${p.hue}, 92%, 60%, ${a * 0.8})`;
            ctx.fillStyle   = `hsla(${p.hue + 22 * (1 - lr)}, 96%, ${lum}%, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.3, sz), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Blink burst flash
        if (this._burst > 0.01) {
            const br = 90 * this._burst;
            const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, br);
            flash.addColorStop(0, `rgba(255, 195, 80, ${this._burst * 0.32})`);
            flash.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = flash;
            ctx.beginPath(); ctx.arc(cx, cy, br, 0, Math.PI * 2); ctx.fill();
        }
    }

    destroy() { this.particles = []; }
}
