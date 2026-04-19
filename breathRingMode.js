// Breath Ring Mode — stillness/movement drives concentric breathing rings.
// When gaze is still → rings slowly contract inward (inhale).
// When gaze moves → rings expand outward (exhale).
// Blink: full breath reset — all rings pulse outward then slowly return.
class BreathRingMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._gazeX     = null;
        this._gazeY     = null;
        this._lastGazeX = null;
        this._lastGazeY = null;
        this._movement  = 0;   // 0 = still, 1 = moving
        this._breathPhase = 0; // 0..1, drives ring radius
        this._breathDir   = 1; // +1 expand, -1 contract
        this._blinkPulse  = 0;
        this._RINGS = 8;
    }

    startScene() {
        this.t            = 0;
        this._movement    = 0;
        this._breathPhase = 0.5;
        this._breathDir   = -1;
        this._blinkPulse  = 0;
        this._gazeX = this._gazeY = null;
        this._lastGazeX = this._lastGazeY = null;
    }

    onGaze(nx, ny) {
        const W = this.canvas.width, H = this.canvas.height;
        this._gazeX = nx * W;
        this._gazeY = ny * H;
        if (this._lastGazeX !== null) {
            const dx = this._gazeX - this._lastGazeX;
            const dy = this._gazeY - this._lastGazeY;
            const speed = Math.sqrt(dx * dx + dy * dy);
            // Smooth movement signal
            this._movement = Math.min(1, this._movement * 0.85 + speed * 0.015);
        }
        this._lastGazeX = this._gazeX;
        this._lastGazeY = this._gazeY;
    }

    onBlink() {
        this._blinkPulse = 1.0;
        this._breathPhase = 0.98;
        this._breathDir   = -1;
    }

    draw(time) {
        this.t += 0.016;
        this._blinkPulse = Math.max(0, this._blinkPulse - 0.016 * 1.2);
        this._movement   = Math.max(0, this._movement - 0.016 * 0.8);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const bp = this._blinkPulse;

        // Breath phase update
        const moveInfluence = this._movement;
        const breathSpeed = 0.012 + moveInfluence * 0.028;
        this._breathPhase += breathSpeed * this._breathDir;
        if (this._breathPhase >= 1.0) { this._breathPhase = 1.0; this._breathDir = -1; }
        if (this._breathPhase <= 0.0) { this._breathPhase = 0.0; this._breathDir =  1; }

        const phase = this._breathPhase; // 0=contracted, 1=expanded
        const R     = Math.min(W, H) * 0.44;

        // Dark background
        ctx.fillStyle = 'rgba(0, 1, 4, 0.09)';
        ctx.fillRect(0, 0, W, H);

        // ── Concentric breath rings ────────────────────────────────────
        for (let ri = 0; ri < this._RINGS; ri++) {
            const frac  = (ri + 1) / this._RINGS;
            // Base radius scaled by breath phase
            const minR  = R * frac * 0.40;
            const maxR  = R * frac;
            const rr    = minR + (maxR - minR) * phase;

            // Micro-wobble
            const wobble = 1 + 0.018 * Math.sin(t * 1.2 + ri * 0.7 + phase * Math.PI);

            // Colour: cooler when contracted, warmer when expanded
            const hue    = 200 - phase * 80 + ri * 6;
            const lum    = 40 + phase * 30 + ri * 4;
            const alpha  = (0.12 + (1 - frac) * 0.18 + bp * 0.20) * (0.6 + phase * 0.4);

            ctx.beginPath();
            ctx.arc(cx, cy, rr * wobble, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 80%, ${lum}%, ${alpha})`;
            ctx.lineWidth   = 1.2 - ri * 0.08 + phase * 0.6;
            ctx.stroke();

            // Dot nodes on ring
            const dots = 4 + ri * 2;
            for (let di = 0; di < dots; di++) {
                const dAngle = (di / dots) * Math.PI * 2 + t * (0.018 + ri * 0.004);
                const px = cx + Math.cos(dAngle) * rr * wobble;
                const py = cy + Math.sin(dAngle) * rr * wobble;
                ctx.beginPath();
                ctx.arc(px, py, 1.2, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue + 20}, 90%, 75%, ${alpha * 1.4})`;
                ctx.fill();
            }
        }

        // ── Gaze indicator ─────────────────────────────────────────────
        if (this._gazeX !== null) {
            const gx = this._gazeX, gy = this._gazeY;
            const g  = ctx.createRadialGradient(gx, gy, 0, gx, gy, 18);
            g.addColorStop(0,   `hsla(${200 - phase * 80}, 90%, 85%, ${0.30 + moveInfluence * 0.30})`);
            g.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(gx, gy, 18, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Centre nucleus ─────────────────────────────────────────────
        const nucR = R * (0.055 + phase * 0.035 + bp * 0.025);
        const ng   = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucR);
        const nucH = 200 - phase * 80;
        ng.addColorStop(0,   `hsla(${nucH}, 80%, 95%, ${0.80 + bp * 0.15})`);
        ng.addColorStop(0.5, `hsla(${nucH}, 75%, 65%, ${0.40 + phase * 0.20})`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, nucR, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // ── Breath label text (subtle) ─────────────────────────────────
        const breathWord = this._breathDir === -1 ? 'breathe in' : 'breathe out';
        const wordAlpha  = 0.08 + moveInfluence * 0.04;
        ctx.save();
        ctx.font        = `${Math.round(W * 0.018)}px sans-serif`;
        ctx.fillStyle   = `rgba(180, 210, 255, ${wordAlpha})`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(breathWord, cx, cy + R * 0.62);
        ctx.restore();

        // ── Blink pulse outward ring ───────────────────────────────────
        if (bp > 0.02) {
            ctx.beginPath();
            ctx.arc(cx, cy, R * (0.85 + (1 - bp) * 0.15), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 230, 255, ${bp * 0.30})`;
            ctx.lineWidth   = 3.0;
            ctx.stroke();
        }
    }
}
