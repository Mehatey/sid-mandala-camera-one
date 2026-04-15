// Prism Mode — nested rotating polygons with connecting threads.
// 40+ concentric N-gon rings, each twisted slightly from the prior.
// Hand X = rotation speed (left slow, right fast).
// Hand Y = twist amount between rings (raised = tight spiral, low = flat).
// Pinch cycles the polygon sides: 3 → 4 → 5 → 6 → 7 → 8 → 3 → ...
// Colors: electric blue-white on black, edges shift toward cyan/violet.
class PrismMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._sides      = 6;       // N-gon sides
        this._twist      = 0.07;    // radians added per ring
        this._targetTwist = 0.07;
        this._rotation   = 0;
        this._rotSpeed   = 0.006;
        this._targetRotSpeed = 0.006;

        this._hueA  = 205;  // inner hue (electric blue)
        this._hueB  = 270;  // outer hue (violet)

        this.handX = null;
        this.handY = null;
        this._lastHandTime = -999;

        this._sidesCycleDir = 1;
    }

    startScene() {
        this.t             = 0;
        this._sides        = 5 + Math.floor(Math.random() * 4);
        this._twist        = 0.04 + Math.random() * 0.08;
        this._targetTwist  = this._twist;
        this._rotation     = 0;
        this._rotSpeed     = 0.005 + Math.random() * 0.004;
        this._targetRotSpeed = this._rotSpeed;
        this._hueA         = 185 + Math.random() * 40;
        this._hueB         = this._hueA + 55 + Math.random() * 40;
        this.handX         = null;
        this.handY         = null;
        this._lastHandTime = -999;

        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.handX = (1 - normX) * W;
        this.handY = normY * H;
        this._lastHandTime = this.t;

        // Hand X = rotation speed (right = faster CW)
        this._targetRotSpeed = (normX - 0.5) * 0.022;

        // Hand Y = twist (raised hand = tighter spiral)
        this._targetTwist = (1 - normY) * 0.16;
    }

    onPinch(label, normX, normY) {
        // Cycle sides: 3 → 4 → 5 → 6 → 7 → 8 → 3 → …
        this._sides = (this._sides - 2) % 6 + 3;   // stays in [3,8]
        // Hue shift on pinch
        this._hueA = (this._hueA + 38 + Math.random() * 30) % 360;
        this._hueB = (this._hueA + 55 + Math.random() * 40) % 360;
    }

    onBlink() { this.onPinch('R', 0.5, 0.5); }

    draw(time) {
        this.t += 0.016;

        if (this.handX !== null && this.t - this._lastHandTime > 0.5) {
            this.handX = null;
            this.handY = null;
            this._targetRotSpeed = 0.006;
            this._targetTwist    = 0.07;
        }

        this._rotSpeed += (this._targetRotSpeed - this._rotSpeed) * 0.05;
        this._twist    += (this._targetTwist    - this._twist)    * 0.04;
        this._rotation += this._rotSpeed;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const sc  = Math.min(W, H) * 0.46;

        // Slow fade — rings accumulate and persist
        ctx.fillStyle = 'rgba(1, 1, 6, 0.038)';
        ctx.fillRect(0, 0, W, H);

        const RINGS    = 42;
        const N        = this._sides;

        // Pre-compute all ring vertex positions
        const rings = [];
        for (let r = 0; r < RINGS; r++) {
            const frac  = r / (RINGS - 1);           // 0 (inner) → 1 (outer)
            const rad   = sc * (0.04 + frac * 0.92);
            const angle = this._rotation + r * this._twist;
            const verts = [];
            for (let v = 0; v < N; v++) {
                const a = (v / N) * Math.PI * 2 + angle;
                verts.push({
                    x: cx + Math.cos(a) * rad,
                    y: cy + Math.sin(a) * rad,
                });
            }
            rings.push({ verts, frac, rad });
        }

        ctx.lineCap = 'round';

        // Draw each ring's polygon
        for (let r = 0; r < RINGS; r++) {
            const { verts, frac } = rings[r];
            const hue = this._hueA + frac * (this._hueB - this._hueA);
            const sat = 80 - frac * 20;
            const lit = 78 - frac * 22;
            const a   = 0.022 + (1 - frac) * 0.018;

            ctx.strokeStyle = `hsla(${hue % 360}, ${sat}%, ${lit}%, ${a})`;
            ctx.lineWidth   = 0.9 + (1 - frac) * 0.5;

            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let v = 1; v < N; v++) {
                ctx.lineTo(verts[v].x, verts[v].y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Draw connecting threads between same vertices in adjacent rings
        // This creates the "twisted corridor" look
        for (let r = 0; r < RINGS - 1; r++) {
            const inner = rings[r];
            const outer = rings[r + 1];
            const frac  = r / RINGS;
            const hue   = this._hueA + frac * (this._hueB - this._hueA);
            const a     = 0.012 + (1 - frac) * 0.012;

            ctx.strokeStyle = `hsla(${hue % 360}, 75%, 80%, ${a})`;
            ctx.lineWidth   = 0.65;

            for (let v = 0; v < N; v++) {
                ctx.beginPath();
                ctx.moveTo(inner.verts[v].x, inner.verts[v].y);
                ctx.lineTo(outer.verts[v].x, outer.verts[v].y);
                ctx.stroke();
            }
        }

        // Also draw skip-1 threads for the inner zone (tighter mesh near center)
        for (let r = 0; r < Math.floor(RINGS * 0.38); r++) {
            const inner = rings[r];
            const outer = rings[r + 2 < RINGS ? r + 2 : r + 1];
            const a     = 0.008;
            const hue   = this._hueA;

            ctx.strokeStyle = `hsla(${hue % 360}, 90%, 85%, ${a})`;
            ctx.lineWidth   = 0.55;

            for (let v = 0; v < N; v++) {
                ctx.beginPath();
                ctx.moveTo(inner.verts[v].x, inner.verts[v].y);
                ctx.lineTo(outer.verts[v].x, outer.verts[v].y);
                ctx.stroke();
            }
        }

        // Centre core glow
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sc * 0.10);
        cg.addColorStop(0,   `hsla(${this._hueA}, 100%, 95%, 0.22)`);
        cg.addColorStop(0.5, `hsla(${this._hueA}, 85%,  70%, 0.06)`);
        cg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, sc * 0.10, 0, Math.PI * 2);
        ctx.fill();

        // Hand cursor indicator (faint ring showing control zone)
        if (this.handX !== null) {
            ctx.beginPath();
            ctx.arc(this.handX, this.handY, 18, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${this._hueA}, 70%, 80%, 0.18)`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
    }
}
