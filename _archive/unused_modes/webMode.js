// Web Mode — circle string-art mandala.
// N points on a ring. Each point i connects to point (i × m) % N.
// As m drifts slowly it morphs: m=2 → cardioid, m=3 → nephroid, m=51 → 50-petal rose.
// Hand position warps lines toward palm like a gravitational lens.
// Pinch jumps to a new beautiful multiplier value.
class WebMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this.N      = 180;          // anchor points on circle
        this._mult  = 2.5;          // connection multiplier — the key parameter
        this._hueA  = 42;           // colour gradient start
        this._hueB  = 210;          // colour gradient end
        this.handX  = null;
        this.handY  = null;
        this._lastHandTime = -999;
    }

    startScene() {
        this.t      = 0;
        this._mult  = 2 + Math.random() * 3;
        this._hueA  = 35  + Math.random() * 20;
        this._hueB  = 195 + Math.random() * 30;
        this.handX  = null;
        this.handY  = null;
        this._lastHandTime = -999;
        // Fill black
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.handX = (1 - normX) * W;
        this.handY = normY * H;
        this._lastHandTime = this.t;
    }

    onPinch(label, normX, normY) {
        // Jump to a mathematically beautiful multiplier
        const targets = [2, 3, 4, 5, 6, 7, 8, 34, 51, 68, 85, 99];
        this._mult = targets[Math.floor(Math.random() * targets.length)] + Math.random() * 0.6;
        this._hueA = (this._hueA + 40 + Math.random() * 50) % 360;
        this._hueB = (this._hueB + 40 + Math.random() * 50) % 360;
    }

    onBlink() { this.onPinch('R', 0.5, 0.5); }

    draw(time) {
        this.t     += 0.016;
        this._mult += 0.0045;   // slow continuous drift: cardioid → nephroid → roses → …
        if (this._mult > 100)   this._mult = 2;

        if (this.handX !== null && this.t - this._lastHandTime > 0.5) {
            this.handX = null;
            this.handY = null;
        }

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const R   = Math.min(W, H) * 0.43;
        const N   = this.N;

        // Very slow fade — lines linger and build up
        ctx.fillStyle = 'rgba(3, 2, 10, 0.048)';
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap = 'round';

        for (let i = 0; i < N; i++) {
            const j = Math.floor((i * this._mult) % N);
            if (j === i) continue;

            const a1 = (i / N) * Math.PI * 2 - Math.PI / 2;
            const a2 = (j / N) * Math.PI * 2 - Math.PI / 2;

            const x1 = cx + Math.cos(a1) * R;
            const y1 = cy + Math.sin(a1) * R;
            const x2 = cx + Math.cos(a2) * R;
            const y2 = cy + Math.sin(a2) * R;

            // Colour gradient from hueA (inner-ish lines) to hueB (outer-ish)
            const t    = i / N;
            const hue  = this._hueA + t * (this._hueB - this._hueA);

            ctx.strokeStyle = `hsla(${hue % 360}, 60%, 74%, 0.085)`;
            ctx.lineWidth   = 1.0;
            ctx.beginPath();

            if (this.handX !== null) {
                // Warp the midpoint toward the hand — creates a gravitational lens
                const mx   = (x1 + x2) * 0.5;
                const my   = (y1 + y2) * 0.5;
                const hdx  = this.handX - mx;
                const hdy  = this.handY - my;
                const hd   = Math.sqrt(hdx * hdx + hdy * hdy) + 1;
                const pull = Math.max(0, 1 - hd / 320) * 0.55;
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(mx + hdx * pull, my + hdy * pull, x2, y2);
            } else {
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        }

        // Faint anchor dots around the ring
        for (let i = 0; i < N; i += 4) {
            const a = (i / N) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = `hsla(${this._hueA}, 55%, 78%, 0.14)`;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0.9, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
