// Stardust Mode — paint the cosmos with your hands.
// Movement releases streams of luminous particles that drift, scatter, and slowly fade.
// Speed determines colour temperature: slow = warm amber/red nebula · fast = electric blue/white
// Circular gestures build spiral galaxies. Arcs leave contrails of light.
// Blink: palette shift + a cloud of particles blooms where you are.
// Pinch: supernova — an explosion of 600 particles radiates outward.
class StardustMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        // Cursor state
        this._mx  = null; this._my  = null;
        this._pmx = null; this._pmy = null;
        this._dvx = 0;    this._dvy = 0;
        this._speed = 0;

        // Particle pool — struct of arrays for performance
        const MAX = 22000;
        this._MAX   = MAX;
        this._posX  = new Float32Array(MAX);
        this._posY  = new Float32Array(MAX);
        this._velX  = new Float32Array(MAX);
        this._velY  = new Float32Array(MAX);
        this._life  = new Float32Array(MAX);   // countdown frames
        this._maxL  = new Float32Array(MAX);   // initial life (for alpha curve)
        this._hue   = new Float32Array(MAX);
        this._size  = new Float32Array(MAX);
        this._head  = 0;   // ring-buffer write head

        this._paletteShift = 0;
        this._off    = null;
        this._offCtx = null;
    }

    // ── Scene lifecycle ──────────────────────────────────────────────────────────
    startScene() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width  = W;
            this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }

        // Deep space background
        this._offCtx.fillStyle = '#010108';
        this._offCtx.fillRect(0, 0, W, H);

        // Seed a field of background stars
        for (let i = 0; i < 340; i++) {
            const sx = Math.random() * W;
            const sy = Math.random() * H;
            const ss = Math.random() < 0.08 ? 1.4 : 0.5 + Math.random() * 0.8;
            const sa = 0.04 + Math.random() * 0.18;
            this._offCtx.beginPath();
            this._offCtx.arc(sx, sy, ss, 0, Math.PI * 2);
            this._offCtx.fillStyle = `rgba(240, 246, 255, ${sa})`;
            this._offCtx.fill();
        }

        // Kill all particles
        this._life.fill(0);
        this._head = 0;

        this._paletteShift = 0;
        this._mx  = null; this._pmx = null;
        this._dvx = 0;    this._dvy = 0;
        this.t    = 0;
    }

    // ── Input ────────────────────────────────────────────────────────────────────
    _move(x, y) {
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx  = x;
        this._my  = y;
        if (this._pmx !== null) {
            this._dvx   = x - this._pmx;
            this._dvy   = y - this._pmy;
            this._speed = Math.hypot(this._dvx, this._dvy);
        }
    }

    onMouseMove(x, y) { this._move(x, y); }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this._move((1 - normX) * W, normY * H);
    }

    onBlink() {
        this._paletteShift = (this._paletteShift + 85 + Math.random() * 95) % 360;
        // Bloom: spray a cloud of particles at current position
        if (this._mx !== null) {
            const W = this.canvas.width  || 800;
            const H = this.canvas.height || 600;
            const spread = Math.min(W, H) * 0.20;
            for (let i = 0; i < 350; i++) {
                const ang = Math.random() * Math.PI * 2;
                const d   = Math.pow(Math.random(), 0.6) * spread;
                const hue = (this._paletteShift + Math.random() * 120) % 360;
                this._emit(
                    this._mx + Math.cos(ang) * d,
                    this._my + Math.sin(ang) * d,
                    (Math.random() - 0.5) * 0.9,
                    (Math.random() - 0.5) * 0.9,
                    45 + Math.random() * 75, hue
                );
            }
        }
    }

    onPinch() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const x = this._mx ?? W * 0.5;
        const y = this._my ?? H * 0.5;
        // Supernova: 600 particles burst radially
        for (let i = 0; i < 600; i++) {
            const ang  = Math.random() * Math.PI * 2;
            const spd  = 1.8 + Math.random() * 5.0;
            const life = 50 + Math.random() * 90;
            const hue  = (this._paletteShift + ang * (180 / Math.PI) * 0.38) % 360;
            this._emit(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, life, hue);
        }
    }

    // ── Particle emission ────────────────────────────────────────────────────────
    _emit(x, y, vx, vy, life, hue) {
        const i = this._head % this._MAX;
        this._posX[i] = x;
        this._posY[i] = y;
        this._velX[i] = vx;
        this._velY[i] = vy;
        this._life[i] = life;
        this._maxL[i] = life;
        this._hue[i]  = hue;
        this._size[i] = 0.6 + Math.random() * 1.6;
        this._head++;
    }

    // ── Draw ─────────────────────────────────────────────────────────────────────
    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const oc  = this._offCtx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Emit particles along movement path
        if (this._mx !== null && this._pmx !== null && this._speed > 0.5) {
            const emitN = Math.min(28, Math.ceil(this._speed * 0.85));
            const speed = this._speed;

            // Colour temperature: slow = warm (amber/orange), fast = cool (blue/white)
            const tempFrac = Math.min(1, speed / 20);
            // Warm pole: ~35°, Cool pole: ~215°
            const baseHue  = ((1 - tempFrac) * 35 + tempFrac * 215 + this._paletteShift) % 360;

            const normDx = (this._dvx + 0.001) / (speed + 0.001);
            const normDy = (this._dvy + 0.001) / (speed + 0.001);

            for (let k = 0; k < emitN; k++) {
                const f  = k / emitN;
                const ex = this._pmx + this._dvx * f;
                const ey = this._pmy + this._dvy * f;

                // Velocity: cursor direction + perpendicular scatter + random noise
                const perp    = (Math.random() - 0.5) * 1.0;
                const scatter = (Math.random() - 0.5) * 1.6;
                const evx = normDx * 0.5 + (-normDy) * perp + scatter * 0.5;
                const evy = normDy * 0.5 + ( normDx) * perp + scatter * 0.5;
                const hue = (baseHue + (Math.random() - 0.5) * 35) % 360;

                this._emit(ex, ey, evx, evy, 90 + Math.random() * 130, hue);
            }
        }

        // Very slow fade on offscreen — accumulation lingers for a long time
        oc.fillStyle = 'rgba(1, 1, 8, 0.014)';
        oc.fillRect(0, 0, W, H);

        // Update + draw all live particles
        const n = Math.min(this._head, this._MAX);
        for (let i = 0; i < n; i++) {
            if (this._life[i] <= 0) continue;
            this._life[i] -= 1;

            // Gentle gravity + atmospheric drag
            this._velY[i] += 0.0035;
            this._velX[i] *= 0.9982;
            this._velY[i] *= 0.9982;

            this._posX[i] += this._velX[i];
            this._posY[i] += this._velY[i];

            // Alpha: rises fast, falls slow → comet-tail feel
            const lifeNorm = this._life[i] / this._maxL[i];
            const a = Math.pow(lifeNorm, 0.75) * 0.88;
            if (a < 0.01) continue;

            const sz  = this._size[i] * (0.4 + lifeNorm * 0.6);
            const lit = 50 + lifeNorm * 40;

            oc.beginPath();
            oc.arc(this._posX[i], this._posY[i], sz, 0, Math.PI * 2);
            oc.fillStyle = `hsla(${this._hue[i]}, 82%, ${lit}%, ${a})`;
            oc.fill();

            // Occasional bright sparkle on fresh particles
            if (lifeNorm > 0.85 && this._size[i] > 1.4) {
                oc.beginPath();
                oc.arc(this._posX[i], this._posY[i], sz * 0.35, 0, Math.PI * 2);
                oc.fillStyle = `rgba(255, 252, 245, ${a * 0.65})`;
                oc.fill();
            }
        }

        // Composite to screen
        ctx.drawImage(this._off, 0, 0);

        if (this.t < 6) {
            ctx.font = '9px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180, 210, 255, 0.18)';
            ctx.fillText('move to scatter stardust  ·  slow = warm  ·  fast = cool  ·  blink blooms  ·  pinch for supernova', W / 2, H - 20);
            ctx.textAlign = 'left';
        }
    }
}
