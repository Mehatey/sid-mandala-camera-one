// Flow Mode — thousands of particles follow a sine-based vector field.
// The face acts as an attractor: field curves gently around it.
// Blinks send a ripple wave through the field, scattering particles.
class FlowMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.particles = [];
        this.MAX_P   = 520;
        this.t       = 0;
        this._ripple = 0;
        this._hueBase = 198;
        this._hueDir  = 1;   // drift direction
        this._hueTarget = 198;
    }

    startScene() {
        this.t        = 0;
        this._ripple  = 0;
        this._hueBase = 198;
        this._hueDir  = 1;
        this._hueTarget = 198;
        this.particles = [];
        for (let i = 0; i < this.MAX_P; i++) this._spawn(true);
    }

    onBlink() {
        this._ripple = 1.0;
        // Scatter a random subset
        for (let i = 0; i < 80; i++) {
            const p = this.particles[Math.floor(Math.random() * this.particles.length)];
            if (p) {
                p.vx += (Math.random() - 0.5) * 2.8;
                p.vy += (Math.random() - 0.5) * 2.8;
            }
        }
        // Jump hue to a new region on blink — gives a visual "season change"
        const regions = [198, 265, 320, 42, 155];
        this._hueTarget = regions[Math.floor(Math.random() * regions.length)];
    }

    _fieldAngle(x, y) {
        const W = this.canvas.width || 800;
        const H = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        const nx = x / W, ny = y / H;
        const t  = this.t;

        // Slow-evolving sine turbulence — richer than before with extra octave
        const base = (
            Math.sin(nx * 2.8 + t * 0.22) * Math.PI +
            Math.cos(ny * 3.4 - t * 0.18) * Math.PI * 0.9 +
            Math.sin((nx - ny) * 5.2 + t * 0.14) * Math.PI * 0.55 +
            Math.cos(nx * 1.3 + ny * 2.1 + t * 0.09) * Math.PI * 0.35
        );

        // Attractor at centre: field curves into circular orbits
        const dx  = x - cx, dy = y - cy;
        const dst = Math.sqrt(dx * dx + dy * dy) + 1;
        const faceInfluence = Math.max(0, 1 - dst / (Math.min(W, H) * 0.38));
        const orbit = Math.atan2(dy, dx) + Math.PI / 2;

        // Ripple disturbance
        const rip = this._ripple > 0 ? Math.sin(this._ripple * Math.PI) * 2.2 : 0;

        return base * (1 - faceInfluence * 0.6) + orbit * faceInfluence * 0.6 + rip;
    }

    _spawn(initial = false) {
        const W = this.canvas.width || 800;
        const H = this.canvas.height || 600;
        const p = {
            x:       Math.random() * W,
            y:       Math.random() * H,
            vx:      0,
            vy:      0,
            life:    initial ? Math.random() * 6.0 : 0,
            maxLife: 5.5 + Math.random() * 7.0,
            speed:   0.55 + Math.random() * 0.85,
            alpha:   0.18 + Math.random() * 0.28,
            hue:     this._hueBase + (Math.random() - 0.5) * 40,
            sat:     48 + Math.random() * 30,
            size:    0.7 + Math.random() * 1.1,
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
        p.maxLife = 5.5 + Math.random() * 7.0;
        p.speed   = 0.55 + Math.random() * 0.85;
        p.alpha   = 0.18 + Math.random() * 0.28;
        // Newly spawned particles pick up current hue — creates colour wave as hue shifts
        p.hue     = this._hueBase + (Math.random() - 0.5) * 40;
    }

    draw(time) {
        this.t       += 0.016;
        this._ripple  = Math.max(0, this._ripple - 0.016 * 0.65);

        // Smooth hue toward target — creates gentle colour transitions
        const hueDiff = ((this._hueTarget - this._hueBase + 540) % 360) - 180;
        this._hueBase += hueDiff * 0.006;
        this._hueBase  = (this._hueBase + 360) % 360;

        // Slow autonomous hue wander when settled
        if (Math.abs(hueDiff) < 5) {
            this._hueBase += Math.sin(this.t * 0.025) * 0.05;
        }

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        ctx.fillStyle = 'rgba(2, 3, 14, 0.042)';
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap = 'round';

        for (const p of this.particles) {
            p.life += 0.016;
            if (p.life > p.maxLife) { this._reset(p); continue; }

            const angle = this._fieldAngle(p.x, p.y);
            const ax    = Math.cos(angle) * p.speed;
            const ay    = Math.sin(angle) * p.speed;

            p.vx = p.vx * 0.82 + ax * 0.18;
            p.vy = p.vy * 0.82 + ay * 0.18;

            const lr   = p.life / p.maxLife;
            const env  = lr < 0.08 ? lr / 0.08 : lr > 0.88 ? (1 - lr) / 0.12 : 1;
            const a    = p.alpha * env;
            const spd  = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const lineLen = 3.8 + spd * 2.8;

            const nx = p.vx / (spd || 1);
            const ny = p.vy / (spd || 1);

            // Pass 1: wide soft glow halo
            ctx.strokeStyle = `hsla(${p.hue}, ${p.sat + 12}%, 88%, ${a * 0.18})`;
            ctx.lineWidth   = p.size * 3.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + nx * lineLen, p.y + ny * lineLen);
            ctx.stroke();

            // Pass 2: bright silk-thin core
            ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, 82%, ${a})`;
            ctx.lineWidth   = p.size * 0.82;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + nx * lineLen * 0.72, p.y + ny * lineLen * 0.72);
            ctx.stroke();

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4)
                this._reset(p);
        }
    }

    destroy() { this.particles = []; }
}
