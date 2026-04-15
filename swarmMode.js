// Swarm Mode — a murmuration of starlings in three-dimensional space.
// 600 birds follow the three laws: stay apart, align with neighbours, fly together.
// One predator drifts at the edge. The flock deforms and flows away from it.
// Blink: the predator strikes — the murmuration shatters and reforms.
// Two sub-flocks with subtly different colours merge and separate organically.
class SwarmMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._boids     = [];
        this._predator  = null;
        this._strike    = 0;    // 0→1 strike intensity
        this._N         = 600;

        // Camera slow drift for 3D parallax effect
        this._camAngleX = 0.15;
        this._camAngleY = 0;
    }

    startScene() {
        this.t          = 0;
        this._strike    = 0;
        this._camAngleX = 0.15;
        this._camAngleY = 0;
        this._build();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() {
        // Predator strikes — dives toward centre of flock
        this._strike = 1.0;
        const cx = this._boids.reduce((s, b) => s + b.x, 0) / this._boids.length;
        const cy = this._boids.reduce((s, b) => s + b.y, 0) / this._boids.length;
        const cz = this._boids.reduce((s, b) => s + b.z, 0) / this._boids.length;
        this._predator.vx = (cx - this._predator.x) * 0.25;
        this._predator.vy = (cy - this._predator.y) * 0.25;
        this._predator.vz = (cz - this._predator.z) * 0.25;
    }

    _build() {
        this._boids = [];
        // Two flocks: flock A (golden) starts left, flock B (teal) starts right
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;

        for (let i = 0; i < this._N; i++) {
            const flock = i < this._N * 0.55 ? 0 : 1;
            const ox    = flock === 0 ? -80 : 80;
            this._boids.push({
                x:  (Math.random() - 0.5) * 180 + ox,
                y:  (Math.random() - 0.5) * 120,
                z:  (Math.random() - 0.5) * 120,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                vz: (Math.random() - 0.5) * 1.5,
                flock,
            });
        }

        // Predator — larger, faster, stays to the outside
        this._predator = {
            x: 260, y: 0, z: 0,
            vx: -0.4, vy: 0.2, vz: 0.1,
        };
    }

    // Project 3D world coords to 2D screen
    _project(x, y, z) {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;

        // Rotate around Y axis (slow camera yaw)
        const cosY = Math.cos(this._camAngleY);
        const sinY = Math.sin(this._camAngleY);
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;

        // Rotate around X axis (slight pitch)
        const cosX = Math.cos(this._camAngleX);
        const sinX = Math.sin(this._camAngleX);
        const ry = y * cosX - rz * sinX;
        const finalZ = y * sinX + rz * cosX;

        const depth = finalZ + 700;
        if (depth < 1) return null;

        const scale = 600 / depth;
        return {
            sx:    cx + rx * scale,
            sy:    cy + ry * scale,
            scale,
            depth: finalZ,
        };
    }

    draw(time) {
        this.t    += 0.016;
        this._strike = Math.max(0, this._strike - 0.016 * 0.5);

        // Very slow camera rotation — gives the murmuration a 3D feel
        this._camAngleY += 0.0015;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Dark sky fade — motion blur
        ctx.fillStyle = 'rgba(0, 1, 4, 0.25)';
        ctx.fillRect(0, 0, W, H);

        // ── Flocking physics ───────────────────────────────────────────────────────
        const SEP_R  = 18,   SEP_F  = 1.8;
        const ALI_R  = 55,   ALI_F  = 0.14;
        const COH_R  = 90,   COH_F  = 0.004;
        const PRED_R = 140,  PRED_F = 3.5;
        const MAX_V  = 3.2;
        const WORLD  = 280;  // bounding box half-size

        // Update predator — orbit slowly, pulled toward flock centre
        const pcx = this._boids.reduce((s, b) => s + b.x, 0) / this._boids.length;
        const pcy = this._boids.reduce((s, b) => s + b.y, 0) / this._boids.length;
        const pcz = this._boids.reduce((s, b) => s + b.z, 0) / this._boids.length;

        if (this._strike < 0.1) {
            // Lazy orbital drift when not striking
            this._predator.vx += (pcx + WORLD * 0.8 * Math.sin(this.t * 0.08) - this._predator.x) * 0.0002;
            this._predator.vy += (pcy - this._predator.y) * 0.0003;
            this._predator.vz += (pcz + WORLD * 0.8 * Math.cos(this.t * 0.065) - this._predator.z) * 0.0002;
        }
        this._predator.x += this._predator.vx;
        this._predator.y += this._predator.vy;
        this._predator.z += this._predator.vz;
        this._predator.vx *= 0.98;
        this._predator.vy *= 0.98;
        this._predator.vz *= 0.98;

        // Boid update — O(N²) but fast with N=600 since we skip distant pairs
        for (const b of this._boids) {
            let sepX = 0, sepY = 0, sepZ = 0;
            let aliVX = 0, aliVY = 0, aliVZ = 0, aliN = 0;
            let cohX  = 0, cohY  = 0, cohZ  = 0, cohN = 0;

            for (const other of this._boids) {
                if (other === b) continue;
                const dx = b.x - other.x, dy = b.y - other.y, dz = b.z - other.z;
                const d2 = dx*dx + dy*dy + dz*dz;

                if (d2 < SEP_R * SEP_R) {
                    const d = Math.sqrt(d2) + 0.001;
                    const w = (1 - d / SEP_R);
                    sepX += (dx / d) * w;
                    sepY += (dy / d) * w;
                    sepZ += (dz / d) * w;
                }
                if (d2 < ALI_R * ALI_R) {
                    aliVX += other.vx; aliVY += other.vy; aliVZ += other.vz; aliN++;
                }
                if (d2 < COH_R * COH_R) {
                    cohX += other.x; cohY += other.y; cohZ += other.z; cohN++;
                }
            }

            // Predator avoidance
            const pdx = b.x - this._predator.x;
            const pdy = b.y - this._predator.y;
            const pdz = b.z - this._predator.z;
            const pd2 = pdx*pdx + pdy*pdy + pdz*pdz;
            if (pd2 < PRED_R * PRED_R) {
                const pd = Math.sqrt(pd2) + 0.001;
                const w  = (1 - pd / PRED_R) * PRED_F * (1 + this._strike * 3);
                b.vx += (pdx / pd) * w;
                b.vy += (pdy / pd) * w;
                b.vz += (pdz / pd) * w;
            }

            b.vx += sepX * SEP_F;
            b.vy += sepY * SEP_F;
            b.vz += sepZ * SEP_F;

            if (aliN > 0) {
                b.vx += ((aliVX / aliN) - b.vx) * ALI_F;
                b.vy += ((aliVY / aliN) - b.vy) * ALI_F;
                b.vz += ((aliVZ / aliN) - b.vz) * ALI_F;
            }

            if (cohN > 0) {
                b.vx += ((cohX / cohN) - b.x) * COH_F;
                b.vy += ((cohY / cohN) - b.y) * COH_F;
                b.vz += ((cohZ / cohN) - b.z) * COH_F;
            }

            // Speed limit
            const spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy + b.vz*b.vz);
            if (spd > MAX_V) {
                const f = MAX_V / spd;
                b.vx *= f; b.vy *= f; b.vz *= f;
            }

            // Soft world boundary — gentle push back
            const bnd = 0.04;
            if (b.x >  WORLD) b.vx -= bnd * (b.x - WORLD);
            if (b.x < -WORLD) b.vx += bnd * (-WORLD - b.x);
            if (b.y >  WORLD) b.vy -= bnd * (b.y - WORLD);
            if (b.y < -WORLD) b.vy += bnd * (-WORLD - b.y);
            if (b.z >  WORLD) b.vz -= bnd * (b.z - WORLD);
            if (b.z < -WORLD) b.vz += bnd * (-WORLD - b.z);

            b.x += b.vx;
            b.y += b.vy;
            b.z += b.vz;
        }

        // ── Draw boids (sorted by depth — far ones first) ─────────────────────────
        const projected = [];
        for (const b of this._boids) {
            const p = this._project(b.x, b.y, b.z);
            if (p) projected.push({ b, p });
        }
        projected.sort((a, b) => b.p.depth - a.p.depth);

        ctx.lineCap = 'round';
        for (const { b, p } of projected) {
            // Project velocity to screen to draw orientation streak
            const spd  = Math.sqrt(b.vx*b.vx + b.vy*b.vy + b.vz*b.vz) + 0.001;
            const nVX  = b.vx / spd, nVY = b.vy / spd, nVZ = b.vz / spd;
            const p2   = this._project(b.x - nVX * 6, b.y - nVY * 6, b.z - nVZ * 6);

            const depth = Math.max(0, Math.min(1, (p.depth + 200) / 400));
            const sz    = Math.max(0.8, p.scale * 3.5);
            const a     = Math.max(0.05, Math.min(0.75, p.scale * 0.8));

            // Flock A: golden-amber, Flock B: cool teal
            const hue = b.flock === 0
                ? 38  + depth * 15    // warm gold
                : 188 + depth * 20;   // cool teal
            const sat = 65 + depth * 20;
            const lit = 55 + depth * 25;

            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${a})`;
            ctx.lineWidth   = sz * 0.55;

            if (p2 && Math.hypot(p.sx - p2.sx, p.sy - p2.sy) > 0.5) {
                ctx.beginPath();
                ctx.moveTo(p.sx, p.sy);
                ctx.lineTo(p2.sx, p2.sy);
                ctx.stroke();
            } else {
                ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${a})`;
                ctx.beginPath();
                ctx.arc(p.sx, p.sy, Math.max(0.3, sz * 0.4), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Draw predator ─────────────────────────────────────────────────────────
        const pp = this._project(this._predator.x, this._predator.y, this._predator.z);
        if (pp) {
            const pr = Math.max(1, pp.scale * 4);
            const pa = 0.35 + this._strike * 0.5;
            const pg = ctx.createRadialGradient(pp.sx, pp.sy, 0, pp.sx, pp.sy, pr * 3);
            pg.addColorStop(0,   `rgba(255, 80, 60, ${pa})`);
            pg.addColorStop(0.4, `rgba(200, 40, 20, ${pa * 0.25})`);
            pg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.arc(pp.sx, pp.sy, pr * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Hint ─────────────────────────────────────────────────────────────────
        if (this.t < 4) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(200, 190, 160, 0.18)';
            ctx.fillText('blink to trigger predator strike', W / 2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
