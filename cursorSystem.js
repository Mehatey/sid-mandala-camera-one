// Eye Cursor — thin stroke eye outline; no trail, no glow.
// Transitions to the flame cursor (handled by SessionManager.drawFlameCursor).
class CursorSystem {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.x      = -2000;
        this.y      = -2000;
        this.time   = 0;

        document.querySelectorAll('img[src="coin.gif"]').forEach(el => el.remove());
    }

    resize() {}
    setAlpha(a) { this._alpha = Math.max(0, Math.min(1, a)); }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    draw() {
        this.time += 0.016;
        const ctx = this.ctx;
        if (this.x < -100) return;
        const ga = this._alpha !== undefined ? this._alpha : 1.0;
        if (ga <= 0.01) return;

        const x = this.x, y = this.y;
        const W = 13;   // half-width of eye
        const H = 5.5;  // half-height

        ctx.save();
        ctx.globalAlpha = ga * 0.55;
        ctx.strokeStyle = 'rgba(200, 208, 248, 1)';
        ctx.lineWidth   = 0.85;
        ctx.lineCap     = 'round';

        // Upper lid arc
        ctx.beginPath();
        ctx.moveTo(x - W, y);
        ctx.bezierCurveTo(
            x - W * 0.35, y - H * 1.8,
            x + W * 0.35, y - H * 1.8,
            x + W, y
        );
        // Lower lid arc (slightly flatter)
        ctx.bezierCurveTo(
            x + W * 0.35, y + H * 1.1,
            x - W * 0.35, y + H * 1.1,
            x - W, y
        );
        ctx.closePath();
        ctx.stroke();

        // Iris circle
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.stroke();

        // Pupil dot
        ctx.fillStyle = 'rgba(200, 208, 248, 0.7)';
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
