// Eye Trail Mode — gaze leaves luminous calligraphic trails.
// The path of your gaze is drawn as a glowing ink ribbon that slowly fades.
// Blink: current trail crystallises into a frozen streak and a new trail begins.
class EyeTrailMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._trails   = [];   // completed / crystallised trails
        this._current  = [];   // current gaze path points
        this._gazeX    = null;
        this._gazeY    = null;
        this._hue      = 160;
    }

    startScene() {
        this.t       = 0;
        this._trails = [];
        this._current = [];
        this._gazeX  = null;
        this._gazeY  = null;
        this._hue    = 160 + Math.random() * 160;
    }

    onGaze(nx, ny) {
        this._gazeX = nx * this.canvas.width;
        this._gazeY = ny * this.canvas.height;
        this._current.push({
            x:    this._gazeX,
            y:    this._gazeY,
            time: this.t,
        });
        // Limit trail point history
        if (this._current.length > 320) this._current.shift();
    }

    onBlink() {
        if (this._current.length > 2) {
            // Crystallise current trail
            this._trails.push({
                points: this._current.slice(),
                hue:    this._hue,
                born:   this.t,
                life:   0,
                maxLife: 6.0 + Math.random() * 5.0,
            });
        }
        this._current = [];
        this._hue = (this._hue + 60 + Math.random() * 100) % 360;
    }

    _drawTrailPath(points, hue, alpha, lineWidthBase) {
        if (points.length < 2) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        // Glow pass (wide, faint)
        ctx.lineWidth   = lineWidthBase * 5;
        ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${alpha * 0.08})`;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Core pass — tapered opacity along path
        for (let i = 1; i < points.length; i++) {
            const prog = i / points.length;
            const a    = alpha * prog * (i === points.length - 1 ? 0.5 : 0.80);
            const lw   = lineWidthBase * (0.5 + prog * 0.5);
            ctx.lineWidth   = lw;
            ctx.strokeStyle = `hsla(${hue + prog * 40}, 95%, 80%, ${a})`;
            ctx.beginPath();
            ctx.moveTo(points[i - 1].x, points[i - 1].y);
            ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();
        }

        ctx.restore();
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        // Slow fade
        ctx.fillStyle = 'rgba(1, 0, 3, 0.07)';
        ctx.fillRect(0, 0, W, H);

        // Draw crystallised / fading trails
        for (let ti = this._trails.length - 1; ti >= 0; ti--) {
            const tr = this._trails[ti];
            tr.life += 0.016;
            if (tr.life > tr.maxLife) { this._trails.splice(ti, 1); continue; }
            const lr  = tr.life / tr.maxLife;
            const env = lr < 0.08 ? lr / 0.08 : Math.max(0, 1 - Math.pow((lr - 0.08) / 0.92, 0.5));
            this._drawTrailPath(tr.points, tr.hue, env * 0.55, 2.5);
        }

        // Draw live current trail
        if (this._current.length > 1) {
            this._drawTrailPath(this._current, this._hue, 0.85, 3.0);

            // Bright lead dot
            const last = this._current[this._current.length - 1];
            const lG   = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 14);
            lG.addColorStop(0,   `hsla(${this._hue}, 100%, 95%, 0.80)`);
            lG.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = lG;
            ctx.beginPath();
            ctx.arc(last.x, last.y, 14, 0, Math.PI * 2);
            ctx.fill();
        } else if (this._gazeX !== null) {
            // Just a cursor dot
            const g = ctx.createRadialGradient(this._gazeX, this._gazeY, 0, this._gazeX, this._gazeY, 10);
            g.addColorStop(0,   `hsla(${this._hue}, 100%, 90%, 0.45)`);
            g.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(this._gazeX, this._gazeY, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
