// Breath Guide Mode — purely visual breath. No labels, no words.
// The organism expands on inhale, contracts on exhale.
// Particles radiate outward during inhale, gather inward during exhale.
// Hue slowly drifts across the spectrum — one full cycle every ~7 breaths.
class BreathMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this.INHALE   = 4.5;
        this.HOLD_IN  = 0.8;
        this.EXHALE   = 5.5;
        this.HOLD_OUT = 1.2;
        this.cycle = this.INHALE + this.HOLD_IN + this.EXHALE + this.HOLD_OUT;
        this._cycleCount = 0;
        this._hueBase    = 210;
        this._particles  = [];
        this.resize();
    }

    resize() { this.w = this.canvas.width; this.h = this.canvas.height; }

    startScene() {
        this.t           = 0;
        this._cycleCount = 0;
        this._hueBase    = 210;
        this._particles  = [];
    }

    onBlink() {
        // bloom — extra radial pulse of particles
        const cx = this.w / 2, cy = this.h / 2;
        const r = Math.min(this.w, this.h) * 0.25;
        for (let i = 0; i < 60; i++) {
            const ang   = Math.random() * Math.PI * 2;
            const sr    = r * (0.6 + Math.random() * 0.6);
            const speed = 0.8 + Math.random() * 2.0;
            this._particles.push({
                x: cx + Math.cos(ang) * sr,
                y: cy + Math.sin(ang) * sr,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                life: 1.0,
                decay: 0.008 + Math.random() * 0.006,
                hue: (this._hueBase + (Math.random() - 0.5) * 50) % 360,
                size: 1.0 + Math.random() * 2.8,
            });
        }
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const cx  = this.w / 2, cy = this.h / 2;
        const phase = this.t % this.cycle;

        // Advance hue slowly: +38° per full breath cycle
        const cycleNo = Math.floor(this.t / this.cycle);
        if (cycleNo !== this._cycleCount) {
            this._cycleCount = cycleNo;
            this._hueBase    = (this._hueBase + 38) % 360;
        }

        const hue = this._hueBase;
        const sat = 52;

        // Determine expansion and breath phase
        let expansion, isInhale;
        if (phase < this.INHALE) {
            expansion = phase / this.INHALE;
            isInhale  = true;
        } else if (phase < this.INHALE + this.HOLD_IN) {
            expansion = 1.0;
            isInhale  = null;
        } else if (phase < this.INHALE + this.HOLD_IN + this.EXHALE) {
            expansion = 1.0 - (phase - this.INHALE - this.HOLD_IN) / this.EXHALE;
            isInhale  = false;
        } else {
            expansion = 0;
            isInhale  = null;
        }

        // Ease-in-out quad
        const e = expansion < 0.5
            ? 2 * expansion * expansion
            : 1 - Math.pow(-2 * expansion + 2, 2) / 2;

        // Background — slow fade so rings linger
        ctx.fillStyle = 'rgba(2, 3, 14, 0.052)';
        ctx.fillRect(0, 0, this.w, this.h);

        const minR = 42;
        const maxR = Math.min(this.w, this.h) * 0.40;
        const r    = minR + e * (maxR - minR);

        // Outer atmospheric haze
        const atmo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.4);
        atmo.addColorStop(0,    `hsla(${hue},      ${sat}%,     66%, ${0.24 * e + 0.03})`);
        atmo.addColorStop(0.38, `hsla(${hue + 20}, ${sat - 8}%, 55%, ${0.09 * e})`);
        atmo.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = atmo;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3.4, 0, Math.PI * 2);
        ctx.fill();

        // Organic blob core
        this._drawBlob(ctx, cx, cy, r, e, hue, sat, time);

        // Concentric rings — 12 rings, fading outward
        for (let i = 1; i <= 12; i++) {
            const ri    = r * (0.14 + i * 0.11);
            const pulse = 0.97 + 0.03 * Math.sin(time * 0.85 + i * 0.75);
            const a     = (0.09 + e * 0.06) / (i * 0.62);
            ctx.beginPath();
            ctx.arc(cx, cy, ri * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${(hue + i * 8) % 360}, ${sat + 7}%, 74%, ${a})`;
            ctx.lineWidth   = 1.1;
            ctx.stroke();
        }

        // Emit particles
        const emitRate = 0.55 + e * 0.45;
        if (isInhale === true && e > 0.05 && Math.random() < emitRate) {
            // Inhale: radiate outward from blob edge
            const ang   = Math.random() * Math.PI * 2;
            const sr    = r * (0.80 + Math.random() * 0.35);
            const speed = 0.5 + Math.random() * 1.4;
            this._particles.push({
                x: cx + Math.cos(ang) * sr,
                y: cy + Math.sin(ang) * sr,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                life: 1.0,
                decay: 0.010 + Math.random() * 0.008,
                hue: (hue + (Math.random() - 0.5) * 45) % 360,
                size: 0.8 + Math.random() * 2.4,
            });
        }
        if (isInhale === false && e > 0.04 && Math.random() < emitRate) {
            // Exhale: gather inward from outer field
            const ang   = Math.random() * Math.PI * 2;
            const dist  = r * (1.7 + Math.random() * 1.4);
            const speed = 0.7 + Math.random() * 1.1;
            this._particles.push({
                x: cx + Math.cos(ang) * dist,
                y: cy + Math.sin(ang) * dist,
                vx: -Math.cos(ang) * speed,
                vy: -Math.sin(ang) * speed,
                life: 1.0,
                decay: 0.009 + Math.random() * 0.007,
                hue: (hue + (Math.random() - 0.5) * 45) % 360,
                size: 0.6 + Math.random() * 1.8,
            });
        }

        // ── Breath phase arc — a single thin arc at canvas edge that fills/empties ──
        // Traces the full breath cycle without text: inhale clockwise, exhale shrinks
        const arcR   = Math.min(this.w, this.h) * 0.46;
        const phaseF = phase / this.cycle;              // 0→1 over full cycle
        const arcEnd = -Math.PI / 2 + phaseF * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, -Math.PI / 2, arcEnd);
        ctx.strokeStyle = `hsla(${hue}, 45%, 60%, ${0.08 + e * 0.06})`;
        ctx.lineWidth   = 0.55;
        ctx.stroke();

        // Update + draw particles
        this._particles = this._particles.filter(p => p.life > 0);
        for (const p of this._particles) {
            p.x    += p.vx;
            p.y    += p.vy;
            p.vx   *= 0.985;
            p.vy   *= 0.985;
            p.life -= p.decay;
            const a = Math.pow(p.life, 0.6) * 0.72;
            if (a < 0.01) continue;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 68%, 72%, ${a})`;
            ctx.fill();
        }
    }

    _drawBlob(ctx, cx, cy, r, e, hue, sat, time) {
        ctx.save();

        const grd = ctx.createRadialGradient(cx, cy - r * 0.10, 0, cx, cy, r * 1.18);
        grd.addColorStop(0,    `hsla(${hue + 28}, ${sat + 16}%, 82%, ${0.10 + e * 0.14})`);
        grd.addColorStop(0.40, `hsla(${hue},      ${sat + 6}%,  64%, ${0.07 + e * 0.09})`);
        grd.addColorStop(0.82, `hsla(${hue - 22}, ${sat - 6}%,  48%, ${0.03 + e * 0.04})`);
        grd.addColorStop(1,    'rgba(0,0,0,0)');

        this._blobPath(ctx, cx, cy, r, time);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.strokeStyle = `hsla(${hue + 12}, ${sat + 14}%, 82%, ${0.20 + e * 0.22})`;
        ctx.lineWidth   = 1.1;
        this._blobPath(ctx, cx, cy, r, time);
        ctx.stroke();

        ctx.restore();
    }

    _blobPath(ctx, cx, cy, r, time) {
        const n   = 10;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const base = (i / n) * Math.PI * 2;
            const wr   = r * (1 + 0.09 * Math.sin(time * 1.4 + i * 2.1 + 0.6));
            pts.push({ x: cx + Math.cos(base) * wr, y: cy + Math.sin(base) * wr, a: base });
        }
        const cp = r * 0.50;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const cur  = pts[i];
            const nxt  = pts[(i + 1) % n];
            const cpx0 = cur.x + Math.cos(cur.a + Math.PI / 2) * cp;
            const cpy0 = cur.y + Math.sin(cur.a + Math.PI / 2) * cp;
            const cpx1 = nxt.x + Math.cos(nxt.a - Math.PI / 2) * cp;
            const cpy1 = nxt.y + Math.sin(nxt.a - Math.PI / 2) * cp;
            if (i === 0) ctx.moveTo(cur.x, cur.y);
            ctx.bezierCurveTo(cpx0, cpy0, cpx1, cpy1, nxt.x, nxt.y);
        }
        ctx.closePath();
    }
}
