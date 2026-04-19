// Flow Mode — 800 particles follow a complex sine + vortex vector field.
// Two attractors — a central orbit and a slow-drift off-centre vortex —
// give the flow an organic, unpredictable feel.
// Blink: colour season change + radial scatter burst.
class FlowMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.particles = [];
        this.MAX_P   = 800;         // more particles = denser, richer field
        this.t       = 0;
        this._ripple = 0;
        this._hueBase = 198;
        this._hueDir  = 1;
        this._hueTarget = 198;
        this._vortexAng = 0;        // slow-drifting secondary vortex angle
    }

    startScene() {
        this.t          = 0;
        this._ripple    = 0;
        this._hueBase   = 198;
        this._hueTarget = 198;
        this._vortexAng = Math.random() * Math.PI * 2;
        this.particles  = [];
        for (let i = 0; i < this.MAX_P; i++) this._spawn(true);
    }

    onBlink() {
        this._ripple = 1.0;
        // Radial burst — scatter from centre outward
        const W = this.canvas.width || 800;
        const H = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        for (const p of this.particles) {
            const dx = p.x - cx, dy = p.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            const f = (1.8 + Math.random() * 1.4) / dist * 60;
            p.vx += dx * f * 0.012;
            p.vy += dy * f * 0.012;
        }
        // Jump hue to a new region
        const regions = [198, 260, 320, 42, 155, 290, 75];
        this._hueTarget = regions[Math.floor(Math.random() * regions.length)];
    }

    _fieldAngle(x, y) {
        const W = this.canvas.width || 800;
        const H = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        const nx = x / W, ny = y / H;
        const t  = this.t;

        // Richer four-octave turbulence
        const base = (
            Math.sin(nx * 2.8 + t * 0.22) * Math.PI +
            Math.cos(ny * 3.4 - t * 0.18) * Math.PI * 0.9 +
            Math.sin((nx - ny) * 5.2 + t * 0.14) * Math.PI * 0.55 +
            Math.cos(nx * 1.3 + ny * 2.1 + t * 0.09) * Math.PI * 0.35 +
            Math.sin(nx * 4.7 - ny * 3.1 + t * 0.11) * Math.PI * 0.20
        );

        // Primary attractor at centre — circular orbits
        const dx  = x - cx, dy = y - cy;
        const dst = Math.sqrt(dx * dx + dy * dy) + 1;
        const faceInfluence = Math.max(0, 1 - dst / (Math.min(W, H) * 0.38));
        const orbit = Math.atan2(dy, dx) + Math.PI / 2;

        // Secondary drifting vortex — creates asymmetric eddies
        this._vortexAng += 0.016 * 0.06;
        const vx2 = cx + Math.cos(this._vortexAng) * Math.min(W, H) * 0.22;
        const vy2 = cy + Math.sin(this._vortexAng) * Math.min(W, H) * 0.16;
        const dx2 = x - vx2, dy2 = y - vy2;
        const dst2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 1;
        const vortexInfl = Math.max(0, 1 - dst2 / (Math.min(W, H) * 0.28)) * 0.45;
        const vortexDir  = Math.atan2(dy2, dx2) - Math.PI / 2;

        // Ripple disturbance
        const rip = this._ripple > 0 ? Math.sin(this._ripple * Math.PI) * 2.8 : 0;

        return base * (1 - faceInfluence * 0.55 - vortexInfl)
             + orbit * faceInfluence * 0.55
             + vortexDir * vortexInfl
             + rip;
    }

    _spawn(initial = false) {
        const W = this.canvas.width || 800;
        const H = this.canvas.height || 600;
        const p = {
            x:       Math.random() * W,
            y:       Math.random() * H,
            vx:      0,
            vy:      0,
            life:    initial ? Math.random() * 6.5 : 0,
            maxLife: 5.5 + Math.random() * 7.5,
            speed:   0.50 + Math.random() * 0.95,
            alpha:   0.16 + Math.random() * 0.30,
            hue:     this._hueBase + (Math.random() - 0.5) * 50,
            sat:     50 + Math.random() * 32,
            size:    0.65 + Math.random() * 1.2,
        };
        this.particles.push(p);
    }

    _reset(p) {
        const W = this.canvas.width || 800;
        const H = this.canvas.height || 600;
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { p.x = Math.random() * W; p.y = 0; }
        else if (edge === 1) { p.x = W; p.y = Math.random() * H; }
        else if (edge === 2) { p.x = Math.random() * W; p.y = H; }
        else { p.x = 0; p.y = Math.random() * H; }
        p.vx = 0; p.vy = 0;
        p.life    = 0;
        p.maxLife = 5.5 + Math.random() * 7.5;
        p.speed   = 0.50 + Math.random() * 0.95;
        p.alpha   = 0.16 + Math.random() * 0.30;
        p.hue     = this._hueBase + (Math.random() - 0.5) * 50;
    }

    draw(time) {
        this.t       += 0.016;
        this._ripple  = Math.max(0, this._ripple - 0.016 * 0.55);

        const hueDiff = ((this._hueTarget - this._hueBase + 540) % 360) - 180;
        this._hueBase += hueDiff * 0.007;
        this._hueBase  = (this._hueBase + 360) % 360;
        if (Math.abs(hueDiff) < 5) this._hueBase += Math.sin(this.t * 0.025) * 0.06;

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        ctx.fillStyle = 'rgba(2, 3, 14, 0.038)';
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap = 'round';

        for (const p of this.particles) {
            p.life += 0.016;
            if (p.life > p.maxLife) { this._reset(p); continue; }

            const angle = this._fieldAngle(p.x, p.y);
            const ax    = Math.cos(angle) * p.speed;
            const ay    = Math.sin(angle) * p.speed;

            p.vx = p.vx * 0.80 + ax * 0.20;
            p.vy = p.vy * 0.80 + ay * 0.20;

            const lr   = p.life / p.maxLife;
            const env  = lr < 0.08 ? lr / 0.08 : lr > 0.88 ? (1 - lr) / 0.12 : 1;
            const a    = p.alpha * env;
            const spd  = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const lineLen = 4.2 + spd * 3.2;

            const nx = p.vx / (spd || 1);
            const ny = p.vy / (spd || 1);

            // Wide soft glow halo
            ctx.strokeStyle = `hsla(${p.hue}, ${p.sat + 15}%, 88%, ${a * 0.20})`;
            ctx.lineWidth   = p.size * 3.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + nx * lineLen, p.y + ny * lineLen);
            ctx.stroke();

            // Bright silk core
            ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, 85%, ${a})`;
            ctx.lineWidth   = p.size * 0.80;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + nx * lineLen * 0.70, p.y + ny * lineLen * 0.70);
            ctx.stroke();

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4)
                this._reset(p);
        }
    }

    destroy() { this.particles = []; }
}
