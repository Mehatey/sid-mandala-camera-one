// Watercolor Hand Tracking Mode
// Hand movement paints soft watercolor blobs.
// Pinch with left hand shifts hue warm; right hand shifts hue cool.
// Paint accumulates permanently — no background fade.
class WatercolorMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.blobs  = [];
        this.hue    = Math.random() * 360;
        this.lastPaintX = -999;
        this.lastPaintY = -999;
        this.handX  = null;
        this.handY  = null;
        this.resize();
    }

    resize() {
        this.w = this.canvas.width;
        this.h = this.canvas.height;
    }

    // normX/Y from MediaPipe Hands (0-1), flip X for mirror correction
    onHandMove(normX, normY) {
        const sx = (1 - normX) * this.w;
        const sy = normY * this.h;
        this.handX = sx;
        this.handY = sy;

        const dx = sx - this.lastPaintX;
        const dy = sy - this.lastPaintY;
        if (dx * dx + dy * dy > 400) { // ~20px threshold
            this._paintAt(sx, sy, 'trail');
            this.lastPaintX = sx;
            this.lastPaintY = sy;
        }
    }

    // label: 'Left' = warm hue shift, 'Right' = cool hue shift
    onPinch(label, normX, normY) {
        const sx = (1 - normX) * this.w;
        const sy = normY * this.h;
        this.handX = sx;
        this.handY = sy;
        const shift = label === 'Left'
            ? +(50 + Math.random() * 30)
            : -(50 + Math.random() * 30);
        this.hue = (this.hue + shift + 360) % 360;
        this._paintAt(sx, sy, 'bloom');
    }

    onBlink() {
        // Blink still creates a bloom at current hand position
        this.hue = (this.hue + 42 + Math.random() * 30) % 360;
        const cx = this.handX ?? this.w / 2;
        const cy = this.handY ?? this.h / 2;
        this._paintAt(cx, cy, 'bloom');
    }

    _paintAt(x, y, type) {
        if (type === 'bloom') {
            this.blobs.push({
                x, y,
                r: 5,
                maxR: 100 + Math.random() * 120,
                opacity: 0.45 + Math.random() * 0.25,
                hue: this.hue,
                sat: 65 + Math.random() * 35,
                lum: 42 + Math.random() * 25,
                decay: 0.0015,
                grow: 0.6 + Math.random() * 0.4
            });
            for (let i = 0; i < 7; i++) {
                const ang  = (Math.PI * 2 / 7) * i + Math.random() * 0.8;
                const dist = 30 + Math.random() * 90;
                this.blobs.push({
                    x: x + Math.cos(ang) * dist,
                    y: y + Math.sin(ang) * dist,
                    r: 5,
                    maxR: 55 + Math.random() * 65,
                    opacity: 0.28 + Math.random() * 0.22,
                    hue: (this.hue + Math.random() * 40 - 20 + 360) % 360,
                    sat: 55 + Math.random() * 45,
                    lum: 38 + Math.random() * 30,
                    decay: 0.0018 + Math.random() * 0.001,
                    grow: 0.4 + Math.random() * 0.35
                });
            }
        } else {
            // Soft trail drop
            this.blobs.push({
                x, y,
                r: 5,
                maxR: 30 + Math.random() * 40,
                opacity: 0.13 + Math.random() * 0.12,
                hue: (this.hue + Math.random() * 60 - 30 + 360) % 360,
                sat: 50 + Math.random() * 50,
                lum: 40 + Math.random() * 28,
                decay: 0.001 + Math.random() * 0.001,
                grow: 0.22 + Math.random() * 0.2
            });
        }
    }

    draw(time) {
        const ctx = this.ctx;
        // No background fade — watercolor paint accumulates permanently on canvas.
        // Canvas is initialized black by clearCanvas() in main.js.

        for (let i = this.blobs.length - 1; i >= 0; i--) {
            const b = this.blobs[i];
            b.opacity -= b.decay;
            b.r = Math.min(b.r + b.grow, b.maxR);

            if (b.opacity <= 0.005 || b.r >= b.maxR) {
                this.blobs.splice(i, 1);
                continue;
            }

            const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
            g.addColorStop(0,    `hsla(${b.hue}, ${b.sat}%, ${b.lum}%, ${b.opacity})`);
            g.addColorStop(0.55, `hsla(${b.hue}, ${Math.max(0, b.sat - 10)}%, ${b.lum + 12}%, ${b.opacity * 0.5})`);
            g.addColorStop(0.82, `hsla(${(b.hue + 18) % 360}, ${b.sat + 8}%, ${b.lum + 5}%, ${b.opacity * 0.18})`);
            g.addColorStop(1,    `hsla(${b.hue}, ${b.sat}%, ${b.lum + 20}%, 0)`);

            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }
        // Hand cursor is drawn from main.js on coinCtx so it doesn't persist on canvas.
    }
}
