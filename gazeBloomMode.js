// Gaze Bloom Mode — wherever you look, a mandala bloom grows.
// Each gaze point spawns a small radial flower that slowly expands and fades.
// Blinking seeds a large central bloom.
class GazeBloomMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._blooms = [];
        this._lastSpawnT = -999;
        this._gazeX = null;
        this._gazeY = null;
    }

    startScene() {
        this.t = 0;
        this._blooms = [];
        this._lastSpawnT = -999;
        this._gazeX = null;
        this._gazeY = null;
        // Seed a central bloom
        const W = this.canvas.width, H = this.canvas.height;
        this._addBloom(W / 2, H / 2, 1.0);
    }

    onGaze(nx, ny) {
        this._gazeX = nx * this.canvas.width;
        this._gazeY = ny * this.canvas.height;
        // Throttle bloom spawning to every 0.55s
        if (this.t - this._lastSpawnT > 0.55) {
            this._addBloom(this._gazeX, this._gazeY, 0.6 + Math.random() * 0.3);
            this._lastSpawnT = this.t;
        }
    }

    onBlink() {
        const W = this.canvas.width, H = this.canvas.height;
        this._addBloom(W / 2, H / 2, 1.0);
        if (this._gazeX !== null) {
            this._addBloom(this._gazeX, this._gazeY, 0.90);
        }
    }

    _addBloom(x, y, scale) {
        const folds = 4 + Math.floor(Math.random() * 5); // 4–8 folds
        const hue   = Math.random() * 360;
        this._blooms.push({
            x, y, scale,
            folds,
            hue,
            r:      0,
            maxR:   Math.min(this.canvas.width, this.canvas.height) * (0.08 + scale * 0.14),
            rot:    Math.random() * Math.PI * 2,
            rotSpd: (Math.random() - 0.5) * 0.02,
            life:   0,
            maxLife: 4.0 + Math.random() * 4.0,
            growing: true,
        });
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        // Slow dark fade
        ctx.fillStyle = 'rgba(1, 0, 3, 0.08)';
        ctx.fillRect(0, 0, W, H);

        for (let bi = this._blooms.length - 1; bi >= 0; bi--) {
            const b = this._blooms[bi];
            b.life += 0.016;
            if (b.life > b.maxLife) { this._blooms.splice(bi, 1); continue; }

            const lr  = b.life / b.maxLife;
            const env = lr < 0.18 ? lr / 0.18 : 1 - Math.pow((lr - 0.18) / 0.82, 0.60);

            b.rot += b.rotSpd;
            if (b.r < b.maxR) b.r += (b.maxR - b.r) * 0.04 + 0.4;

            const R    = b.r;
            const FOLD = b.folds;
            const hue  = b.hue;

            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.rot);

            // Outer petals
            for (let i = 0; i < FOLD; i++) {
                const angle = (i / FOLD) * Math.PI * 2;
                const ph    = hue + i * (360 / FOLD) * 0.25;
                ctx.save();
                ctx.rotate(angle);

                const pL = R * 0.90;
                const pW = R * 0.28;

                ctx.beginPath();
                ctx.moveTo(R * 0.10, 0);
                ctx.bezierCurveTo(pL * 0.35, pW, pL * 0.65, pW * 0.7, pL, 0);
                ctx.bezierCurveTo(pL * 0.65, -pW * 0.7, pL * 0.35, -pW, R * 0.10, 0);
                ctx.closePath();

                const a  = env * b.scale * 0.55;
                const pg = ctx.createLinearGradient(R * 0.10, 0, pL, 0);
                pg.addColorStop(0,   `hsla(${ph},     90%, 80%, ${a})`);
                pg.addColorStop(0.5, `hsla(${ph + 30}, 85%, 65%, ${a * 0.65})`);
                pg.addColorStop(1,   `hsla(${ph + 60}, 80%, 50%, 0)`);
                ctx.fillStyle = pg;
                ctx.fill();

                ctx.restore();
            }

            // Inner ring
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.22, 0, Math.PI * 2);
            const ig = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.22);
            ig.addColorStop(0,   `hsla(${hue + 40}, 100%, 92%, ${env * 0.80})`);
            ig.addColorStop(0.5, `hsla(${hue},      90%, 70%, ${env * 0.40})`);
            ig.addColorStop(1,   `hsla(${hue},      80%, 50%, 0)`);
            ctx.fillStyle = ig;
            ctx.fill();

            // Spoke dots
            for (let i = 0; i < FOLD * 2; i++) {
                const angle = (i / (FOLD * 2)) * Math.PI * 2 + b.rot * 2;
                const dr    = R * 0.68;
                ctx.beginPath();
                ctx.arc(Math.cos(angle) * dr, Math.sin(angle) * dr, 1.2, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue + i * 15}, 95%, 80%, ${env * 0.45})`;
                ctx.fill();
            }

            ctx.restore();
        }

        // Gaze indicator — soft glow dot
        if (this._gazeX !== null) {
            const gx = this._gazeX, gy = this._gazeY;
            const g  = ctx.createRadialGradient(gx, gy, 0, gx, gy, 20);
            g.addColorStop(0,   'rgba(255, 240, 200, 0.20)');
            g.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(gx, gy, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
