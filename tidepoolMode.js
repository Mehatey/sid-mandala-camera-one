// Tide Pool Mode — microscopic radiolarians drift and slowly rotate.
// Each organism is a living micro-mandala: intricate silica geometry.
// They occasionally divide. Blink: a nutrient burst — all organisms glow and grow.
class TidepoolMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._organisms = [];
        this._nutrient  = 0;
    }

    startScene() {
        this.t         = 0;
        this._nutrient = 0;
        this._organisms = [];
        const W = this.canvas.width, H = this.canvas.height;
        for (let i = 0; i < 9; i++) this._spawnOrganism(W, H);
    }

    onBlink() {
        this._nutrient = 1.0;
        // Grow all organisms
        for (const o of this._organisms) {
            o.targetR = Math.min(o.targetR * 1.25, Math.min(this.canvas.width, this.canvas.height) * 0.14);
        }
    }

    _spawnOrganism(W, H, x, y) {
        const cx = x !== undefined ? x : W * (0.12 + Math.random() * 0.76);
        const cy = y !== undefined ? y : H * (0.12 + Math.random() * 0.76);
        const hue = Math.random() * 360;
        const spines = 6 + Math.floor(Math.random() * 9);
        const r = Math.min(W, H) * (0.04 + Math.random() * 0.06);
        this._organisms.push({
            x: cx, y: cy,
            r,
            targetR: r,
            hue,
            spines,
            rot: Math.random() * Math.PI * 2,
            rotSpd: (Math.random() - 0.5) * 0.012,
            vx: (Math.random() - 0.5) * 0.18,
            vy: (Math.random() - 0.5) * 0.18,
            divideT: 8 + Math.random() * 14,
            age: 0,
            pulse: Math.random() * Math.PI * 2,
            pulseSpd: 0.6 + Math.random() * 1.0,
            layers: 2 + Math.floor(Math.random() * 3),
        });
    }

    _drawOrganism(ctx, o, nt) {
        const { x, y, r, hue, spines, rot, layers } = o;
        const pulse = 1 + 0.04 * Math.sin(o.pulse);
        const rr    = r * pulse;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);

        // Draw concentric layers
        for (let l = 0; l < layers; l++) {
            const lr    = rr * (0.35 + l * 0.32);
            const lhue  = hue + l * 20;
            const alpha = (0.25 - l * 0.06) + nt * 0.15;

            // Concentric ring
            ctx.beginPath();
            ctx.arc(0, 0, lr, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${lhue}, 70%, 65%, ${alpha})`;
            ctx.lineWidth   = 0.6;
            ctx.stroke();

            // Radial spines from this layer
            const spinesL = spines + l * 3;
            for (let i = 0; i < spinesL; i++) {
                const angle = (i / spinesL) * Math.PI * 2 + l * (Math.PI / spinesL);
                const innerR = l === 0 ? 0 : rr * (0.35 + (l - 1) * 0.32);
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
                ctx.lineTo(Math.cos(angle) * lr, Math.sin(angle) * lr);
                ctx.strokeStyle = `hsla(${lhue + 10}, 75%, 70%, ${alpha * 0.8})`;
                ctx.lineWidth   = 0.5;
                ctx.stroke();
            }
        }

        // Outer spine tips (extends beyond outermost ring)
        for (let i = 0; i < spines; i++) {
            const angle  = (i / spines) * Math.PI * 2;
            const tipLen = rr * (0.18 + 0.08 * Math.sin(o.pulse + i));
            const fromR  = rr;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * fromR, Math.sin(angle) * fromR);
            ctx.lineTo(Math.cos(angle) * (fromR + tipLen), Math.sin(angle) * (fromR + tipLen));
            ctx.strokeStyle = `hsla(${hue + 30}, 80%, 75%, ${0.30 + nt * 0.25})`;
            ctx.lineWidth   = 0.8;
            ctx.stroke();

            // Spine tip bead
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * (fromR + tipLen), Math.sin(angle) * (fromR + tipLen), 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue + 40}, 90%, 80%, ${0.40 + nt * 0.30})`;
            ctx.fill();
        }

        // Central nucleus
        const ng = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * 0.22);
        ng.addColorStop(0,   `hsla(${hue}, 80%, 90%, ${0.70 + nt * 0.20})`);
        ng.addColorStop(1,   `hsla(${hue}, 60%, 60%, 0)`);
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(0, 0, rr * 0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    draw(time) {
        this.t += 0.016;
        this._nutrient = Math.max(0, this._nutrient - 0.016 * 0.7);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const t  = this.t;
        const nt = this._nutrient;

        // Shallow warm water background
        ctx.fillStyle = 'rgba(2, 8, 16, 0.10)';
        ctx.fillRect(0, 0, W, H);

        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, `rgba(5, 22, 35, 0.05)`);
        bg.addColorStop(1, `rgba(2, 10, 20, 0.05)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Update and draw organisms
        const toAdd = [];
        for (let oi = this._organisms.length - 1; oi >= 0; oi--) {
            const o = this._organisms[oi];
            o.age     += 0.016;
            o.rot     += o.rotSpd;
            o.pulse   += o.pulseSpd * 0.016;
            o.x       += o.vx + Math.sin(t * 0.3 + oi) * 0.08;
            o.y       += o.vy + Math.cos(t * 0.25 + oi * 1.3) * 0.08;
            o.vx      *= 0.998;
            o.vy      *= 0.998;
            o.r       += (o.targetR - o.r) * 0.01;

            // Wrap edges
            if (o.x < -o.r) o.x = W + o.r;
            if (o.x > W + o.r) o.x = -o.r;
            if (o.y < -o.r) o.y = H + o.r;
            if (o.y > H + o.r) o.y = -o.r;

            this._drawOrganism(ctx, o, nt);

            // Division
            if (o.age > o.divideT && this._organisms.length < 16) {
                o.age = 0;
                o.divideT = 10 + Math.random() * 14;
                o.r *= 0.70;
                o.targetR = o.r;
                toAdd.push({ x: o.x + (Math.random() - 0.5) * o.r * 2, y: o.y + (Math.random() - 0.5) * o.r * 2, hue: (o.hue + 40) % 360 });
            }
        }
        for (const a of toAdd) {
            this._spawnOrganism(W, H, a.x, a.y);
        }

        // Vignette
        const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.70);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,5,15,0.60)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
