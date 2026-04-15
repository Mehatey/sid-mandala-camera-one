// Meridian Mode — a seated figure surrounded by the anatomy of stillness.
// Fine white lines describe the body, its aura, its energy channels.
// Concentric oval rings breathe with a slow inhale/exhale rhythm.
// Vertical channels carry particles upward — the classic subtle body diagram.
// Seven points along the central axis pulse at their own cadence.
// The whole illustration is drawn with the precision of a medical engraving.
// Blink: all seven points flash simultaneously. The rings surge outward.
class MeridianMode {
    constructor(ctx, canvas) {
        this.ctx   = ctx;
        this.canvas = canvas;
        this.t     = 0;
        this._particles = [];
        this._ringFlash  = 0;
    }

    startScene() {
        this.t         = 0;
        this._ringFlash = 0;
        this._particles = [];
    }

    onBlink() {
        this._ringFlash = 1.0;
    }

    draw(time) {
        this.t += 0.016;
        this._ringFlash *= 0.935;
        const ctx  = this.ctx;
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;
        const cx   = W / 2, cy = H / 2;
        const unit = Math.min(W, H) * 0.01;  // 1% of smallest dimension

        // Background
        ctx.fillStyle = 'rgba(0, 0, 2, 0.16)';
        ctx.fillRect(0, 0, W, H);

        // ── Breathing rhythm ──────────────────────────────────────────────────────
        const INHALE = 4.5, EXHALE = 5.5, HOLD = 0.9;
        const cycle  = INHALE + HOLD + EXHALE + HOLD;
        const phase  = this.t % cycle;
        let breath;
        if      (phase < INHALE)                   breath = phase / INHALE;
        else if (phase < INHALE + HOLD)            breath = 1;
        else if (phase < INHALE + HOLD + EXHALE)   breath = 1 - (phase - INHALE - HOLD) / EXHALE;
        else                                        breath = 0;
        const e = breath < 0.5 ? 2*breath*breath : 1 - Math.pow(-2*breath+2,2)/2;

        // ── Figure dimensions (all in canvas units) ───────────────────────────────
        const figH     = unit * 28;     // figure height
        const figTop   = cy - figH * 0.55;
        const headR    = unit * 3.2;
        const headCY   = figTop + headR;
        const shoulderY = headCY + headR + unit * 1.2;
        const hipY     = figTop + figH * 0.55;
        const baseY    = figTop + figH;
        const shoulderW = unit * 8;

        // ── Aura rings (oval, breathing) ─────────────────────────────────────────
        const auraCount = 6;
        const auraBaseRx = unit * 14;
        const auraBaseRy = unit * 20;
        const flash = this._ringFlash;

        for (let i = auraCount; i >= 1; i--) {
            const f     = i / auraCount;
            const breathScale = 1 + e * 0.055 * (1 - f * 0.5);
            const rx    = auraBaseRx * f * breathScale + flash * unit * 2 * (1 - f);
            const ry    = auraBaseRy * f * breathScale + flash * unit * 3 * (1 - f);
            const a     = (0.06 + 0.04 * (1 - f)) + flash * 0.12 * (1 - f);

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(215, 225, 255, ${a})`;
            ctx.lineWidth   = 0.55;
            ctx.stroke();
        }

        // ── Central axis line ─────────────────────────────────────────────────────
        ctx.beginPath();
        ctx.moveTo(cx, headCY - headR * 1.4);
        ctx.lineTo(cx, baseY + unit * 1.5);
        ctx.strokeStyle = 'rgba(200, 215, 255, 0.10)';
        ctx.lineWidth   = 0.5;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── Seated figure ─────────────────────────────────────────────────────────
        const figA = 0.38;

        // Head
        ctx.beginPath();
        ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(228, 235, 255, ${figA})`;
        ctx.lineWidth   = 0.75;
        ctx.stroke();

        // Neck
        ctx.beginPath();
        ctx.moveTo(cx, headCY + headR);
        ctx.lineTo(cx, shoulderY - unit * 0.5);
        ctx.strokeStyle = `rgba(215, 225, 255, ${figA * 0.8})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();

        // Shoulders arc
        ctx.beginPath();
        ctx.moveTo(cx - shoulderW, shoulderY + unit);
        ctx.bezierCurveTo(
            cx - shoulderW * 0.6, shoulderY - unit * 0.5,
            cx + shoulderW * 0.6, shoulderY - unit * 0.5,
            cx + shoulderW, shoulderY + unit
        );
        ctx.strokeStyle = `rgba(215, 225, 255, ${figA})`;
        ctx.lineWidth   = 0.75;
        ctx.stroke();

        // Torso (tapered outline)
        ctx.beginPath();
        ctx.moveTo(cx - shoulderW, shoulderY + unit);
        ctx.bezierCurveTo(cx - shoulderW * 0.8, hipY - unit, cx - unit * 4.5, hipY, cx - unit * 4.5, hipY);
        ctx.strokeStyle = `rgba(200, 215, 255, ${figA * 0.7})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + shoulderW, shoulderY + unit);
        ctx.bezierCurveTo(cx + shoulderW * 0.8, hipY - unit, cx + unit * 4.5, hipY, cx + unit * 4.5, hipY);
        ctx.strokeStyle = `rgba(200, 215, 255, ${figA * 0.7})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();

        // Left leg (lotus): from left hip to right knee area
        ctx.beginPath();
        ctx.moveTo(cx - unit * 4.5, hipY);
        ctx.bezierCurveTo(cx - unit * 7, hipY + unit * 3, cx - unit * 5, baseY, cx + unit * 2, baseY);
        ctx.strokeStyle = `rgba(200, 215, 255, ${figA})`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();

        // Right leg (lotus): from right hip to left knee area
        ctx.beginPath();
        ctx.moveTo(cx + unit * 4.5, hipY);
        ctx.bezierCurveTo(cx + unit * 7, hipY + unit * 3, cx + unit * 5, baseY, cx - unit * 2, baseY);
        ctx.strokeStyle = `rgba(200, 215, 255, ${figA})`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();

        // Left arm
        ctx.beginPath();
        ctx.moveTo(cx - shoulderW, shoulderY + unit);
        ctx.bezierCurveTo(cx - shoulderW * 1.2, hipY - unit * 2, cx - unit * 6, hipY + unit * 2, cx - unit * 3.5, hipY + unit * 4);
        ctx.strokeStyle = `rgba(200, 215, 255, ${figA * 0.8})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();

        // Right arm
        ctx.beginPath();
        ctx.moveTo(cx + shoulderW, shoulderY + unit);
        ctx.bezierCurveTo(cx + shoulderW * 1.2, hipY - unit * 2, cx + unit * 6, hipY + unit * 2, cx + unit * 3.5, hipY + unit * 4);
        ctx.strokeStyle = `rgba(200, 215, 255, ${figA * 0.8})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();

        // ── Seven energy points along central axis ────────────────────────────────
        // Classic chakra hues: root=0°(red) → sacral=30°(orange) → solar=55°(yellow)
        // → heart=130°(green) → throat=200°(blue) → third eye=260°(indigo) → crown=290°(violet)
        const pointsY = [
            baseY,                          // 1 root
            hipY + unit * 1.0,              // 2 sacral
            hipY - unit * 1.5,              // 3 solar
            cy - unit * 0.5,                // 4 heart
            cy - unit * 5.0,                // 5 throat
            headCY - headR * 0.2,           // 6 third eye
            headCY - headR * 1.1,           // 7 crown
        ];
        const chakraHue = [0, 30, 55, 130, 200, 260, 290];

        for (let pi = 0; pi < pointsY.length; pi++) {
            const py    = pointsY[pi];
            const pulse = 0.7 + 0.3 * Math.sin(this.t * (0.6 + pi * 0.15) + pi * 0.9);
            const r     = unit * (0.55 + pulse * 0.45) + flash * unit * 1.5 * (1 - pi / 7);
            const a     = 0.32 + pulse * 0.38 + flash * 0.3;
            const hue   = chakraHue[pi];

            // Horizontal whisker lines at each point
            const whiskerLen = unit * (1.8 - pi * 0.15);
            ctx.beginPath();
            ctx.moveTo(cx - whiskerLen, py);
            ctx.lineTo(cx + whiskerLen, py);
            ctx.strokeStyle = `hsla(${hue}, 55%, 72%, ${0.09 + pulse * 0.07})`;
            ctx.lineWidth   = 0.4;
            ctx.stroke();

            // Point glow halo
            const pg = ctx.createRadialGradient(cx, py, 0, cx, py, r * 4.5);
            pg.addColorStop(0,   `hsla(${hue}, 75%, 75%, ${a * 0.85})`);
            pg.addColorStop(0.4, `hsla(${hue}, 60%, 58%, ${a * 0.20})`);
            pg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(cx, py, r * 4.5, 0, Math.PI * 2); ctx.fill();

            // Bright core dot
            ctx.beginPath(); ctx.arc(cx, py, r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 80%, 82%, ${a})`; ctx.fill();
        }

        // ── Rising energy particles along vertical channels ───────────────────────
        // Spawn particles at base
        if (Math.random() < 0.35) {
            const laneX = cx + (Math.random() - 0.5) * unit * 3;
            this._particles.push({
                x:    laneX,
                y:    baseY + unit * 1,
                vy:   -(0.55 + Math.random() * 0.55),
                life: 1.0,
                a:    0.12 + Math.random() * 0.12,
            });
        }
        this._particles = this._particles.filter(p => p.life > 0 && p.y > headCY - headR * 2);
        for (const p of this._particles) {
            p.y    += p.vy;
            p.life -= 0.006;
            const a = p.a * p.life * 1.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(210, 228, 255, ${a})`;
            ctx.fill();
        }
    }
}
