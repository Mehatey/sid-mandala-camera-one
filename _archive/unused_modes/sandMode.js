// Sand Mode — a sacred geometry mandala made of particles.
// Your hand hovers above: particles flow away from your palm like sand.
// Lift your hand and they drift back to their home positions.
// Pinch to spin a vortex that scatters and re-seeds.
// No blinks — pure hand presence.
class SandMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this.particles = [];
        this.handX  = null;
        this.handY  = null;
        this._vortex = null;    // { x, y, strength, dir }
        this._settle = 0;       // global settle meter [0,1] — how close particles are to home
        this._lastHandTime = -999;
    }

    startScene() {
        this.t            = 0;
        this.handX        = null;
        this.handY        = null;
        this._vortex      = null;
        this._settle      = 0;
        this._lastHandTime = -999;
        this._buildFormation();
    }

    _buildFormation() {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        const sc = Math.min(W, H) / 720;

        this.particles = [];

        // Concentric rings — Flower of Life radii
        const rings = [
            { count:  1,  r:   0 },
            { count:  8,  r:  48 },
            { count: 16,  r:  90 },
            { count: 24,  r: 132 },
            { count: 32,  r: 174 },
            { count: 40,  r: 216 },
            { count: 48,  r: 258 },
            { count: 60,  r: 300 },
        ];

        for (const ring of rings) {
            const offset = (Math.random() * Math.PI * 2);
            for (let i = 0; i < ring.count; i++) {
                const angle = (i / Math.max(1, ring.count)) * Math.PI * 2 + offset;
                const sr  = ring.r * sc;
                const hx  = cx + Math.cos(angle) * sr;
                const hy  = cy + Math.sin(angle) * sr;
                // Slight organic jitter on home position
                const jx  = hx + (Math.random() - 0.5) * 5 * sc;
                const jy  = hy + (Math.random() - 0.5) * 5 * sc;
                // Start from home with small scatter
                const startR = 20 + Math.random() * 40;
                const startA = Math.random() * Math.PI * 2;
                this.particles.push({
                    homeX: jx,   homeY: jy,
                    x:    jx + Math.cos(startA) * startR,
                    y:    jy + Math.sin(startA) * startR,
                    vx:   0,     vy:   0,
                    hueOff:   (Math.random() - 0.5) * 18,
                    phase:    Math.random() * Math.PI * 2,
                    ringFrac: ring.r === 0 ? 0 : ring.r / 300,  // 0 (inner) → 1 (outer)
                });
            }
        }
    }

    // normX/Y from MediaPipe (0-1); flip X for mirror correction
    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.handX = (1 - normX) * W;
        this.handY = normY * H;
        this._lastHandTime = this.t;
    }

    onPinch(label, normX, normY) {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const sx = (1 - normX) * W;
        const sy = normY * H;
        const dir = label === 'Left' ? 1 : -1;
        this._vortex = { x: sx, y: sy, strength: 1.0, dir };
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Slow fade — movement trails are visible but don't linger long
        ctx.fillStyle = 'rgba(5, 4, 10, 0.045)';
        ctx.fillRect(0, 0, W, H);

        // If hand hasn't been seen for > 0.5s, clear it (hand left frame)
        if (this.handX !== null && this.t - this._lastHandTime > 0.5) {
            this.handX = null;
            this.handY = null;
        }

        // Decay vortex
        if (this._vortex) {
            this._vortex.strength = Math.max(0, this._vortex.strength - 0.016 * 0.55);
            if (this._vortex.strength < 0.01) this._vortex = null;
        }

        const HAND_R = 130;    // hand influence radius (px)
        const SPRING = 0.020;  // home spring constant
        const DAMP   = 0.87;   // velocity damping — heavy = sand feel

        let totalSettle = 0;

        for (const p of this.particles) {
            // Spring force toward home
            let ax = (p.homeX - p.x) * SPRING;
            let ay = (p.homeY - p.y) * SPRING;

            // Hand repulsion: push particles away from palm
            if (this.handX !== null) {
                const hdx = p.x - this.handX;
                const hdy = p.y - this.handY;
                const hd2 = hdx * hdx + hdy * hdy;
                if (hd2 < HAND_R * HAND_R) {
                    const hd    = Math.sqrt(hd2) + 0.5;
                    const force = (1 - hd / HAND_R) * (1 - hd / HAND_R) * 5.5;
                    ax += (hdx / hd) * force;
                    ay += (hdy / hd) * force;
                }
            }

            // Vortex: tangential spin force
            if (this._vortex) {
                const vdx = p.x - this._vortex.x;
                const vdy = p.y - this._vortex.y;
                const vd  = Math.sqrt(vdx * vdx + vdy * vdy) + 1;
                if (vd < 220) {
                    const vForce = (1 - vd / 220) * this._vortex.strength * 7.0;
                    // Tangential: perpendicular to radius vector
                    ax += (-vdy / vd) * vForce * this._vortex.dir;
                    ay += ( vdx / vd) * vForce * this._vortex.dir;
                    // Slight outward kick on initial vortex burst
                    if (this._vortex.strength > 0.85) {
                        ax += (vdx / vd) * 2.5;
                        ay += (vdy / vd) * 2.5;
                    }
                }
            }

            p.vx = (p.vx + ax) * DAMP;
            p.vy = (p.vy + ay) * DAMP;
            p.x += p.vx;
            p.y += p.vy;

            // How settled is this particle? (0 = far from home, 1 = home)
            const distHome = Math.hypot(p.x - p.homeX, p.y - p.homeY);
            const settle   = Math.max(0, 1 - distHome / 52);
            totalSettle   += settle;

            // Color: disturbed = cool blue-violet, settled = warm gold
            // Outer ring particles get a slightly different hue when settled (rose-gold)
            const settledHue = 44 - p.ringFrac * 18;   // inner: gold, outer: copper
            const hue = settledHue + (1 - settle) * (218 - settledHue);
            const sat = 45 + settle * 42;
            const lit = 32 + settle * 48;
            const a   = 0.30 + settle * 0.60;
            const sz  = 0.8  + settle * 1.0;

            ctx.fillStyle = `hsla(${hue + p.hueOff}, ${sat}%, ${lit}%, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
            ctx.fill();
        }

        // Global settle reading — drives ambient glow
        this._settle = this.particles.length
            ? totalSettle / this.particles.length
            : 0;

        // Ambient formation glow when settled — warm gold radial bloom
        if (this._settle > 0.35) {
            const cx  = W / 2, cy = H / 2;
            const gR  = Math.min(W, H) * 0.40 * this._settle;
            const a   = (this._settle - 0.35) / 0.65 * 0.10;
            const aG  = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
            aG.addColorStop(0,   `rgba(255, 215, 130, ${a})`);
            aG.addColorStop(0.5, `rgba(200, 160,  80, ${a * 0.4})`);
            aG.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = aG;
            ctx.beginPath();
            ctx.arc(cx, cy, gR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Hand cursor: soft sand-warm halo shows the influence zone
        if (this.handX !== null) {
            const hg = ctx.createRadialGradient(this.handX, this.handY, 0, this.handX, this.handY, HAND_R);
            hg.addColorStop(0,   'rgba(255, 230, 170, 0.10)');
            hg.addColorStop(0.5, 'rgba(220, 190, 130, 0.04)');
            hg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = hg;
            ctx.beginPath();
            ctx.arc(this.handX, this.handY, HAND_R, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
