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
        this._hueBase = 32; // drifts over time
    }

    startScene() {
        this.t       = 0;
        this._ripple = 0;
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
    }

    _fieldAngle(x, y) {
        const W = this.canvas.width || 800;
        const H = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        const nx = x / W, ny = y / H;
        const t  = this.t;

        // Slow-evolving sine turbulence
        const base = (
            Math.sin(nx * 2.8 + t * 0.22) * Math.PI +
            Math.cos(ny * 3.4 - t * 0.18) * Math.PI * 0.9 +
            Math.sin((nx - ny) * 5.2 + t * 0.14) * Math.PI * 0.55
        );

        // Attractor: face at centre slightly warps field into circular orbits
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
            hue:     this._hueBase + Math.random() * 22,
            sat:     48 + Math.random() * 30,
            size:    0.7 + Math.random() * 1.1,
        };
        this.particles.push(p);
    }

    _reset(p) {
        const W = this.canvas.width || 800;
        const H = this.canvas.height || 600;
        // Respawn from a random edge
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
        p.hue     = this._hueBase + Math.random() * 22;
    }

    draw(time) {
        this.t       += 0.016;
        this._ripple  = Math.max(0, this._ripple - 0.016 * 0.65);
        this._hueBase = (this._hueBase + 0.055) % 360; // slow hue drift

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        // Persistent trail — very slow fade so paths linger
        ctx.fillStyle = 'rgba(5, 4, 2, 0.045)';
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap = 'round';

        for (const p of this.particles) {
            p.life += 0.016;
            if (p.life > p.maxLife) { this._reset(p); continue; }

            const angle = this._fieldAngle(p.x, p.y);
            const ax    = Math.cos(angle) * p.speed;
            const ay    = Math.sin(angle) * p.speed;

            // Soft velocity follow (lag makes motion smoother)
            p.vx = p.vx * 0.82 + ax * 0.18;
            p.vy = p.vy * 0.82 + ay * 0.18;

            const lr   = p.life / p.maxLife;
            const env  = lr < 0.08 ? lr / 0.08 : lr > 0.88 ? (1 - lr) / 0.12 : 1;
            const a    = p.alpha * env;
            const spd  = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const lineLen = 2.8 + spd * 2.2;

            const nx = p.vx / (spd || 1);
            const ny = p.vy / (spd || 1);

            ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, 74%, ${a})`;
            ctx.lineWidth   = p.size;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + nx * lineLen, p.y + ny * lineLen);
            ctx.stroke();

            p.x += p.vx;
            p.y += p.vy;

            // Soft wrap: reset particle when it leaves the canvas
            if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4)
                this._reset(p);
        }
    }

    destroy() { this.particles = []; }
}
