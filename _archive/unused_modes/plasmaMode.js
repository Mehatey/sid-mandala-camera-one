// Plasma Mode — paint with living light.
// Every movement leaves a trail of glowing plasma that breathes, pulses, and slowly fades.
// The colour of each mark follows your direction of motion:
//   moving right = red · moving down = green · moving left = cyan · moving up = violet
//   circles become full rainbows. spirals become aurora.
// Blink: shift all hues 120° — instant new palette.
// Pinch: shockwave burst — expanding rings radiate from your hand.
class PlasmaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._x  = null; this._y  = null;
        this._px = null; this._py = null;
        this._speed    = 0;
        this._hueShift = 0;

        this._off    = null;
        this._offCtx = null;

        this._pulses    = [];   // { x, y, r, maxR, hue, a } — expanding rings
        this._recentPts = [];   // for auto-pulse origins
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

        this._offCtx.fillStyle = '#010308';
        this._offCtx.fillRect(0, 0, W, H);

        this._hueShift  = Math.random() * 360;
        this._pulses    = [];
        this._recentPts = [];
        this._x  = null; this._px = null;
        this.t   = 0;
    }

    // ── Input ────────────────────────────────────────────────────────────────────
    onMouseMove(x, y) {
        this._px = this._x;
        this._py = this._y;
        this._x  = x;
        this._y  = y;
        if (this._px !== null) {
            this._speed = Math.hypot(x - this._px, y - this._py);
        }
    }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.onMouseMove((1 - normX) * W, normY * H);
    }

    onBlink() {
        this._hueShift = (this._hueShift + 120 + Math.random() * 60) % 360;
    }

    onPinch() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const x = this._x ?? W * 0.5;
        const y = this._y ?? H * 0.5;
        // 9 concentric expanding rings in a chromatic burst
        for (let i = 0; i < 9; i++) {
            this._pulses.push({
                x, y,
                r:    i * 22,
                maxR: Math.max(W, H) * 0.82,
                hue:  (this._hueShift + i * 40) % 360,
                a:    0.55 - i * 0.04,
            });
        }
    }

    // ── Plasma point ─────────────────────────────────────────────────────────────
    _paintPoint(ctx, x, y, hue, speed) {
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const scl = Math.min(W, H) / 800;

        // Intensity drops at high speed — fast strokes leave thin neon trails
        const intensity = Math.max(0.28, 1 - speed * 0.028);
        const r = (14 + intensity * 34) * scl;

        // White-hot core → saturated colour → deep glow → transparent
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0,    `hsla(${hue}, 25%, 98%, ${0.40 * intensity})`);
        g.addColorStop(0.20, `hsla(${hue}, 80%, 75%, ${0.55 * intensity})`);
        g.addColorStop(0.55, `hsla(${hue}, 100%, 50%, ${0.22 * intensity})`);
        g.addColorStop(1,    `hsla(${hue}, 100%, 38%, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Secondary larger glow halo for depth
        const g2 = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.2);
        g2.addColorStop(0, `hsla(${hue}, 100%, 42%, ${0.08 * intensity})`);
        g2.addColorStop(1, `hsla(${hue}, 100%, 38%, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = g2;
        ctx.fill();
    }

    // ── Draw ─────────────────────────────────────────────────────────────────────
    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const oc  = this._offCtx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Ultra-slow fade — plasma lingers for a long time
        oc.fillStyle = 'rgba(1, 3, 8, 0.0085)';
        oc.fillRect(0, 0, W, H);

        // Paint plasma along movement path
        if (this._x !== null && this._px !== null) {
            const dx = this._x - this._px;
            const dy = this._y - this._py;

            // Hue = direction of motion mapped to full colour wheel
            const hue = (Math.atan2(dy, dx) * (180 / Math.PI) + 180 + this._hueShift) % 360;

            const dist  = Math.hypot(dx, dy);
            const steps = Math.max(1, Math.ceil(dist / 7));
            for (let s = 0; s < steps; s++) {
                const f = s / steps;
                this._paintPoint(oc, this._px + dx * f, this._py + dy * f, hue, this._speed);
            }

            // Store for auto-pulse origins
            this._recentPts.push({ x: this._x, y: this._y, hue, t: this.t });
            if (this._recentPts.length > 80) this._recentPts.shift();
        }

        // Auto-pulse: once every ~1.8s, a ring breathes outward from a recent mark
        const pulseEvery = 1.8;
        if (Math.floor(this.t / pulseEvery) > Math.floor((this.t - 0.016) / pulseEvery) &&
            this._recentPts.length > 0) {
            const pt = this._recentPts[Math.floor(Math.random() * this._recentPts.length)];
            this._pulses.push({
                x: pt.x, y: pt.y, r: 0,
                maxR: 60 + Math.random() * 110,
                hue:  pt.hue,
                a:    0.22 + Math.random() * 0.14,
            });
        }

        // Draw expanding pulse rings onto offscreen
        oc.lineCap = 'round';
        this._pulses = this._pulses.filter(p => p.r < p.maxR);
        for (const p of this._pulses) {
            p.r += 1.5;
            const prog = p.r / p.maxR;
            const a    = p.a * (1 - Math.pow(prog, 1.35));
            if (a < 0.004) continue;
            oc.beginPath();
            oc.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            oc.strokeStyle = `hsla(${p.hue}, 92%, 72%, ${a})`;
            oc.lineWidth   = 1.8;
            oc.stroke();
        }

        // Composite to screen
        ctx.drawImage(this._off, 0, 0);

        if (this.t < 5) {
            ctx.font = '9px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(100, 200, 255, 0.18)';
            ctx.fillText('move to paint living light  ·  direction = colour  ·  blink shifts hue  ·  pinch for burst', W / 2, H - 20);
            ctx.textAlign = 'left';
        }
    }
}
