// WaterRipple — expanding ring ripples driven by hand or body movement.
//
// Approach: pure vector rings drawn directly on the canvas.
// No pixel displacement, no downsampling — crisp rings that expand and fade.
// Multiple rings per disturbance gives the multi-wave look of a water drop.
// Continuous motion → continuous ring spawning → cumulative ripple field.

class WaterRipple {
    constructor(canvas, ctx) {
        this.canvas  = canvas;
        this.ctx     = ctx;
        this._rings  = [];
        this._active = false;
        this._prevNX = -1;
        this._prevNY = -1;
        this._MAX    = 80;
    }

    init()   { this._active = true; this._rings = []; }
    resize() {}

    // nx/ny: normalised 0–1 (hand position or body motion position)
    onHandMove(nx, ny) {
        if (!this._active) return;

        let speed = 0;
        if (this._prevNX >= 0) {
            const dvx = nx - this._prevNX;
            const dvy = ny - this._prevNY;
            speed = Math.sqrt(dvx * dvx + dvy * dvy);
        }
        this._prevNX = nx;
        this._prevNY = ny;

        if (speed < 0.0006) return;
        if (this._rings.length >= this._MAX) return;

        const W   = this.canvas.width;
        const H   = this.canvas.height;
        const amp = Math.min(1.0, speed * 10);

        // Spawn 1–3 rings, staggered outward so they look like concentric waves
        const count = 1 + Math.floor(amp * 2.5);
        for (let i = 0; i < count; i++) {
            this._rings.push({
                x:    nx * W,
                y:    ny * H,
                r:    i * 10,                          // stagger start radius
                maxR: 55 + amp * 90 + Math.random() * 20,
                a0:   (0.28 + amp * 0.40) * (1 / (i + 1)),
                spd:  1.8 + amp * 2.2 + Math.random() * 0.8,
                lw:   0.9 + amp * 0.8,
            });
        }
    }

    // Call after mode.draw() — draws all live rings onto the canvas
    apply() {
        if (!this._active || !this._rings.length) return;
        const ctx = this.ctx;

        for (let i = this._rings.length - 1; i >= 0; i--) {
            const rng = this._rings[i];
            rng.r += rng.spd;

            if (rng.r >= rng.maxR) { this._rings.splice(i, 1); continue; }

            const t   = rng.r / rng.maxR;
            // Envelope: brief fade-in from r=0, then graceful fade-out
            const env = Math.min(1, rng.r / 12) * (1 - t * t);
            const a   = rng.a0 * env;

            if (a < 0.005) { this._rings.splice(i, 1); continue; }

            ctx.save();
            ctx.beginPath();
            ctx.arc(rng.x, rng.y, rng.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(160, 210, 255, ${a})`;
            ctx.lineWidth   = rng.lw * (1 - t * 0.5);
            ctx.stroke();
            ctx.restore();
        }
    }

    stop() {
        this._active = false;
        this._rings  = [];
        this._prevNX = -1;
        this._prevNY = -1;
    }
}
