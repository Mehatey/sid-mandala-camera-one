// Recursion Mode — infinite nested polygons forming a corridor tunnel.
// Each ring is slightly smaller and rotated, creating infinite-depth perspective.
// Connecting lines draw the corridor walls. Blinks reverse the rotation.
class RecursionMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this.rot    = 0;
        this.rotSpd = 0.00052;
        this.RINGS  = 50;
        this.SCALE  = 0.928;
        this.sides  = 6;
        this._boost = 0;
    }

    startScene() {
        this.t      = 0;
        this.rot    = 0;
        this.rotSpd = 0.00052;
        this._boost = 0;
        // Vary polygon type per session
        const choices = [4, 5, 6, 7, 8];
        this.sides = choices[Math.floor(Math.random() * choices.length)];
    }

    onBlink() {
        this.rotSpd  = -this.rotSpd;
        this._boost  = Math.sign(this.rotSpd) * 0.0028;
    }

    _polyPoints(cx, cy, r, sides, angle) {
        const pts = [];
        for (let i = 0; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2 + angle;
            pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
        }
        return pts;
    }

    _strokePoly(pts) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();
    }

    draw(t) {
        this.t   += 0.016;
        this._boost *= 0.970;
        this.rot += this.rotSpd + this._boost;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;

        // Very dark overlay — slight smear for depth ghost
        ctx.fillStyle = 'rgba(1, 1, 6, 0.86)';
        ctx.fillRect(0, 0, W, H);

        const startR   = Math.max(W, H) * 0.75;
        const waveSpd  = 0.50;
        const twist    = Math.PI * 2 / this.sides / 2;
        // Hue shifts slowly across the whole scene — cool blue drifts toward violet
        const sceneHue = 218 + Math.sin(this.t * 0.04) * 30;

        // Precompute ring angles & points
        const ringData = [];
        for (let i = 0; i < this.RINGS; i++) {
            const r = startR * Math.pow(this.SCALE, i);
            if (r < 1.0) break;
            const offset  = (i % 2 === 0) ? 0 : twist;
            const angle   = this.rot * (1 + i * 0.013) + offset;
            const blend   = i / (this.RINGS - 1);
            const hue     = sceneHue - blend * (sceneHue - 36); // scene hue → amber
            const sat     = 32 + blend * 30;
            // Inner rings much brighter — creates focal pull toward centre
            const litBoost = Math.pow(blend, 1.4) * 28;
            const lit      = 38 + litBoost;
            // Travelling inward wave
            const wavePos = (this.t * waveSpd) % this.RINGS;
            const wDist   = Math.abs(((i - wavePos) % this.RINGS + this.RINGS) % this.RINGS);
            const waveA   = 0.08 + 0.22 * Math.exp(-wDist * wDist * 0.028);
            const depthA  = Math.min(1, i * 0.08);
            // Inner rings have higher base alpha — depth illusion
            const innerBoost = Math.pow(blend, 0.6) * 0.14;
            const alpha   = (waveA + 0.08 + innerBoost) * depthA;
            ringData.push({ r, angle, hue, sat, lit, alpha });
        }

        // Draw from outer to inner so inner renders on top
        for (let i = 0; i < ringData.length; i++) {
            const { r, angle, hue, sat, lit, alpha } = ringData[i];
            const pts = this._polyPoints(cx, cy, r, this.sides, angle);

            // Inner rings: thicker line for more presence
            const blend = i / (ringData.length - 1);
            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${alpha})`;
            ctx.lineWidth   = 0.85 + blend * 0.8;
            this._strokePoly(pts);

            // Corridor walls
            if (i < ringData.length - 1) {
                const inner = ringData[i + 1];
                const iPts  = this._polyPoints(cx, cy, inner.r, this.sides, inner.angle);
                ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${alpha * 0.28})`;
                ctx.lineWidth   = 0.7;
                for (let v = 0; v < this.sides; v++) {
                    ctx.beginPath();
                    ctx.moveTo(pts[v].x,  pts[v].y);
                    ctx.lineTo(iPts[v].x, iPts[v].y);
                    ctx.stroke();
                }
            }
        }

        // ── Central focal pull — luminous singularity that draws the eye ──────────
        const fPulse = 0.5 + 0.5 * Math.sin(this.t * 1.1);
        const fR     = 4 + fPulse * 6;
        const fHue   = (sceneHue + 40) % 360;

        // Wide glow
        const fg1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, fR * 14);
        fg1.addColorStop(0,    `hsla(${fHue}, 80%, 88%, ${0.18 + fPulse * 0.10})`);
        fg1.addColorStop(0.30, `hsla(${fHue}, 70%, 65%, ${0.06 + fPulse * 0.04})`);
        fg1.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = fg1;
        ctx.beginPath();
        ctx.arc(cx, cy, fR * 14, 0, Math.PI * 2);
        ctx.fill();

        // Tight bright core
        const fg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, fR);
        fg2.addColorStop(0,   `rgba(255,255,255,${0.85 + fPulse * 0.15})`);
        fg2.addColorStop(0.5, `hsla(${fHue}, 90%, 80%, ${0.40 + fPulse * 0.20})`);
        fg2.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = fg2;
        ctx.beginPath();
        ctx.arc(cx, cy, fR, 0, Math.PI * 2);
        ctx.fill();
    }
}
