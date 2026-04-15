// Orrery Mode — a mechanical model of planetary orbits.
// Six bodies in elliptical paths around a central star. Kepler's third law:
// outer planets move slower (T ∝ a^1.5). Each body leaves a fading trail.
// When two bodies reach opposition or conjunction, a fine aspect line appears.
// The whole system tilts slightly — a 3D orrery seen at an angle.
// Blink: all orbital paths briefly brighten, bodies pulse with light.
class OrreryMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this._bodies = [];
        this._flash  = 0;
    }

    startScene() {
        this.t = 0; this._flash = 0;
        // Build background star field once
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._stars = [];
        for (let i = 0; i < 200; i++) {
            this._stars.push({
                x:    Math.random() * W,
                y:    Math.random() * H,
                r:    0.25 + Math.random() * 0.80,
                a:    0.05 + Math.random() * 0.28,
                twi:  Math.random() * Math.PI * 2,
                spd:  0.20 + Math.random() * 1.0,
            });
        }

        // Six orbital bodies. a = semi-major axis (fraction of scene radius).
        // e = eccentricity. period computed from Kepler's third law.
        // θ = initial true anomaly.
        this._bodies = [
            { a: 0.115, e: 0.07, θ: 0.00,  period: 0.38,  trail: [], r: 2.2, name: 'I'    },
            { a: 0.185, e: 0.12, θ: 1.30,  period: 0.72,  trail: [], r: 2.6, name: 'II'   },
            { a: 0.265, e: 0.05, θ: 2.80,  period: 1.22,  trail: [], r: 2.4, name: 'III'  },
            { a: 0.355, e: 0.09, θ: 0.90,  period: 1.88,  trail: [], r: 1.8, name: 'IV'   },
            { a: 0.455, e: 0.14, θ: 4.20,  period: 3.10,  trail: [], r: 3.2, name: 'V'    },
            { a: 0.550, e: 0.06, θ: 1.70,  period: 4.95,  trail: [], r: 1.6, name: 'VI'   },
        ];
    }

    onBlink() {
        this._flash = 1.0;
    }

    // Eccentric anomaly from mean anomaly via Newton-Raphson
    _eccentricAnomaly(M, e) {
        let E = M;
        for (let i = 0; i < 5; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        return E;
    }

    // Cartesian position from orbital parameters
    _orbitPos(body, t, sceneR) {
        const n = (Math.PI * 2) / (body.period * 60);   // mean motion
        const M = body.θ + n * t;                         // mean anomaly
        const E = this._eccentricAnomaly(M, body.e);
        const ν = 2 * Math.atan2(
            Math.sqrt(1 + body.e) * Math.sin(E / 2),
            Math.sqrt(1 - body.e) * Math.cos(E / 2)
        );
        const r = body.a * (1 - body.e * Math.cos(E)) * sceneR;
        return { x: r * Math.cos(ν), y: r * Math.sin(ν) };
    }

    draw(time) {
        this.t += 0.016;
        this._flash *= 0.94;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const sceneR = Math.min(W, H) * 0.48;

        // Background — deep space fill
        ctx.fillStyle = 'rgba(0, 0, 2, 0.18)';
        ctx.fillRect(0, 0, W, H);

        // Background stars
        if (this._stars) {
            for (const s of this._stars) {
                s.twi += s.spd * 0.016;
                const a = s.a * (0.6 + 0.4 * Math.sin(s.twi));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(218, 228, 255, ${a})`;
                ctx.fill();
            }
        }

        // Inclination tilt: project y → y * cos(tilt) for a 3D orrery feel
        const tilt  = 0.62;   // radians — ~35°
        const cosTilt = Math.cos(tilt);

        const project = (x, y) => ({ px: cx + x, py: cy + y * cosTilt });

        // ── Orbital ellipses ─────────────────────────────────────────────────────
        const orbitA = 0.09 + this._flash * 0.08;
        for (const b of this._bodies) {
            const rA  = b.a * sceneR;
            const rB  = rA * Math.sqrt(1 - b.e * b.e);
            // Offset: focus is at center, so ellipse center shifts by a*e
            const foc = b.a * b.e * sceneR;

            ctx.beginPath();
            // Draw ellipse as a series of points (to apply tilt projection)
            for (let i = 0; i <= 80; i++) {
                const ang = (i / 80) * Math.PI * 2;
                const ex  = (Math.cos(ang) - b.e) * rA;   // wait - correct: ex = rA*cos(ang)-foc?
                // Proper ellipse with focus at origin:
                // parametric: x = a*cos(E) - ae, y = b*sin(E)
                const px  = rA * Math.cos(ang) - foc;
                const py  = rB * Math.sin(ang);
                const p   = project(px, py);
                i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(220, 228, 255, ${orbitA})`;
            ctx.lineWidth   = 0.55;
            ctx.stroke();
        }

        // ── Update + draw bodies ─────────────────────────────────────────────────
        const positions = [];
        for (const b of this._bodies) {
            const pos  = this._orbitPos(b, this.t, sceneR);
            const pp   = project(pos.x, pos.y);
            positions.push({ ...pp, angle: Math.atan2(pos.y, pos.x) });

            // Trail: store screen positions
            b.trail.push({ x: pp.px, y: pp.py });
            if (b.trail.length > 100) b.trail.shift();

            // Draw trail
            if (b.trail.length > 1) {
                for (let i = 1; i < b.trail.length; i++) {
                    const alpha = (i / b.trail.length) * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y);
                    ctx.lineTo(b.trail[i].x, b.trail[i].y);
                    ctx.strokeStyle = `rgba(200, 215, 255, ${alpha})`;
                    ctx.lineWidth   = 0.6;
                    ctx.stroke();
                }
            }

            // Body dot
            const bodyR = b.r * (1 + this._flash * 0.5);
            const bg    = ctx.createRadialGradient(pp.px, pp.py, 0, pp.px, pp.py, bodyR * 3.5);
            bg.addColorStop(0,   `rgba(235, 242, 255, ${0.55 + this._flash * 0.3})`);
            bg.addColorStop(0.5, `rgba(190, 210, 255, 0.08)`);
            bg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(pp.px, pp.py, bodyR * 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(pp.px, pp.py, bodyR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(238, 244, 255, ${0.82 + this._flash * 0.18})`;
            ctx.fill();
        }

        // ── Aspect lines (when bodies near 60°/120°/180° separation) ────────────
        for (let i = 0; i < positions.length - 1; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const sep = Math.abs(positions[i].angle - positions[j].angle) % Math.PI;
                const nearAspect = [0, Math.PI / 3, Math.PI * 2 / 3, Math.PI]
                    .some(a => Math.abs(sep - a) < 0.07);
                if (nearAspect) {
                    ctx.beginPath();
                    ctx.moveTo(positions[i].px, positions[i].py);
                    ctx.lineTo(positions[j].px, positions[j].py);
                    ctx.strokeStyle = 'rgba(200, 218, 255, 0.06)';
                    ctx.lineWidth   = 0.45;
                    ctx.stroke();
                }
            }
        }

        // ── Central star ─────────────────────────────────────────────────────────
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
        sg.addColorStop(0,   `rgba(255, 252, 235, ${0.95 + this._flash * 0.05})`);
        sg.addColorStop(0.3, `rgba(255, 245, 200, 0.20)`);
        sg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 252, 240, 0.98)'; ctx.fill();

        // ── Fine tick marks on outermost orbit ───────────────────────────────────
        const outerR = this._bodies[5].a * sceneR;
        for (let i = 0; i < 36; i++) {
            const ang = (i / 36) * Math.PI * 2;
            const ox  = Math.cos(ang) * outerR;
            const oy  = Math.sin(ang) * outerR;
            const p0  = project(ox * 0.96, oy * 0.96);
            const p1  = project(ox * 1.02, oy * 1.02);
            ctx.beginPath();
            ctx.moveTo(p0.px, p0.py); ctx.lineTo(p1.px, p1.py);
            ctx.strokeStyle = `rgba(180, 200, 255, ${i % 6 === 0 ? 0.14 : 0.06})`;
            ctx.lineWidth   = 0.4;
            ctx.stroke();
        }
    }
}
