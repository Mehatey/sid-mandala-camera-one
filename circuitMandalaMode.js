// Circuit Mandala — neon circuit-board geometry in 10-fold symmetry.
// Right-angle traces connect concentric rings like a PCB mandala.
// Electric green/cyan on near-black. Blink: signal pulse races along every trace.
class CircuitMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._pulse = 0;
        this._rings = [];
        this._traces = [];   // static trace geometry (radial wires with right-angle bends)
    }

    startScene() {
        this.t      = 0;
        this._pulse = 0;
        this._rings = [];
        this._buildTraces();
    }

    onBlink() {
        this._pulse = 1.0;
        const S = Math.min(this.canvas.width, this.canvas.height);
        this._rings.push({ r: S * 0.02, maxR: S * 0.50, a: 0.55, hue: 120 });
        this._rings.push({ r: S * 0.05, maxR: S * 0.38, a: 0.40, hue: 180 });
    }

    _buildTraces() {
        const R    = Math.min(this.canvas.width, this.canvas.height) * 0.42;
        const FOLD = 10;
        this._traces = [];

        for (let i = 0; i < FOLD; i++) {
            const angle = (i / FOLD) * Math.PI * 2;

            // Main radial trace with right-angle jogs
            const trace = [];
            let r = R * 0.12;
            const endR = R * 0.88;
            const steps = 6;
            for (let s = 0; s <= steps; s++) {
                const frac  = s / steps;
                const nextR = R * 0.12 + (endR - R * 0.12) * frac;
                // Lateral jog at every other step
                const jog   = (s % 2 === 1) ? R * 0.06 * (s % 4 === 1 ? 1 : -1) : 0;
                trace.push({ r: nextR, lat: jog });
            }
            this._traces.push({ angle, trace, hue: 120 + (i % 3) * 40 });

            // Cross-trace: short arc segment connecting adjacent arms at mid-radius
            if (i % 2 === 0) {
                const nextAngle = ((i + 1) / FOLD) * Math.PI * 2;
                this._traces.push({
                    type: 'arc',
                    r: R * (0.38 + (i % 3) * 0.12),
                    startAngle: angle,
                    endAngle: nextAngle,
                    hue: 180,
                });
            }
        }
    }

    _tracePoint(angle, r, lat) {
        const perp = angle + Math.PI / 2;
        return {
            x: Math.cos(angle) * r + Math.cos(perp) * lat,
            y: Math.sin(angle) * r + Math.sin(perp) * lat,
        };
    }

    draw(time) {
        this.t += 0.016;
        this._pulse = Math.max(0, this._pulse - 0.016 * 0.8);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const R  = Math.min(W, H) * 0.42;
        const pu = this._pulse;

        // Near-black background
        ctx.fillStyle = 'rgba(0, 3, 1, 0.11)';
        ctx.fillRect(0, 0, W, H);

        // Very slow rotation
        const rot = t * 0.004;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        const FOLD = 10;

        // ── Concentric rings (PCB annular rings) ──────────────────────
        const ringFracs = [0.12, 0.25, 0.38, 0.52, 0.65, 0.78, 0.90];
        for (let ri = 0; ri < ringFracs.length; ri++) {
            const rr  = R * ringFracs[ri];
            const hue = ri % 2 === 0 ? 120 : 170;
            const a   = 0.14 + ri * 0.02 + pu * 0.20;
            ctx.beginPath();
            ctx.arc(0, 0, rr, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 90%, 55%, ${a})`;
            ctx.lineWidth   = 0.75;
            ctx.stroke();

            // Via pads at arm intersections
            for (let i = 0; i < FOLD; i++) {
                const a2 = (i / FOLD) * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(Math.cos(a2) * rr, Math.sin(a2) * rr, 2.8, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${0.30 + pu * 0.30})`;
                ctx.fill();
                // Via hole
                ctx.beginPath();
                ctx.arc(Math.cos(a2) * rr, Math.sin(a2) * rr, 1.0, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 3, 1, 0.90)`;
                ctx.fill();
            }
        }

        // ── Radial traces ──────────────────────────────────────────────
        for (const tr of this._traces) {
            if (tr.type === 'arc') {
                ctx.beginPath();
                ctx.arc(0, 0, tr.r, tr.startAngle, tr.endAngle);
                // Pulse: signal race along arc
                const arcAlpha = 0.30 + pu * 0.35;
                ctx.strokeStyle = `hsla(${tr.hue}, 95%, 65%, ${arcAlpha})`;
                ctx.lineWidth   = 1.0;
                ctx.stroke();

                // Bright pulse dot racing along arc
                if (pu > 0.05) {
                    const raceAngle = tr.startAngle + (tr.endAngle - tr.startAngle) * (1 - pu);
                    ctx.beginPath();
                    ctx.arc(Math.cos(raceAngle) * tr.r, Math.sin(raceAngle) * tr.r, 3, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${tr.hue}, 100%, 85%, ${pu})`;
                    ctx.fill();
                }
                continue;
            }

            // Radial trace with right-angle jogs
            const pts = tr.trace.map(p => this._tracePoint(tr.angle, p.r, p.lat));
            const baseAlpha = 0.28 + pu * 0.25;

            // Glow pass
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                // Right-angle routing: horizontal then vertical (in local frame)
                const prev = pts[i - 1], curr = pts[i];
                const midX = curr.x, midY = prev.y;
                ctx.lineTo(midX, midY);
                ctx.lineTo(curr.x, curr.y);
            }
            ctx.strokeStyle = `hsla(${tr.hue}, 90%, 65%, ${baseAlpha * 0.5})`;
            ctx.lineWidth   = 3.5;
            ctx.stroke();

            // Core pass
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1], curr = pts[i];
                const midX = curr.x, midY = prev.y;
                ctx.lineTo(midX, midY);
                ctx.lineTo(curr.x, curr.y);
            }
            ctx.strokeStyle = `hsla(${tr.hue}, 95%, 75%, ${baseAlpha + 0.12})`;
            ctx.lineWidth   = 1.0;
            ctx.stroke();

            // Signal pulse dot racing from centre outward
            if (pu > 0.05) {
                const raceIdx = Math.floor((1 - pu) * (pts.length - 1));
                const rp      = pts[Math.min(raceIdx, pts.length - 1)];
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${tr.hue}, 100%, 90%, ${pu * 0.9})`;
                ctx.fill();
            }
        }

        ctx.restore();

        // ── Central CPU core ──────────────────────────────────────────
        // Square IC package
        const coreSize = R * 0.10;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot + t * 0.012);
        ctx.strokeStyle = `rgba(0, 220, 120, ${0.55 + pu * 0.25})`;
        ctx.lineWidth   = 1.0;
        ctx.strokeRect(-coreSize, -coreSize, coreSize * 2, coreSize * 2);
        // Corner dots
        for (const [dx, dy] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
            ctx.beginPath();
            ctx.arc(dx * coreSize, dy * coreSize, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 255, 180, ${0.55 + pu * 0.30})`;
            ctx.fill();
        }
        ctx.restore();

        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.10);
        ng.addColorStop(0,   `rgba(180, 255, 200, ${0.80 + pu * 0.15})`);
        ng.addColorStop(0.5, `rgba(0,   200, 100, ${0.25 + pu * 0.15})`);
        ng.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.10, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // ── Blink pulse rings ──────────────────────────────────────────
        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.4;
            r.a *= 0.974;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${r.hue}, 90%, 65%, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 1.8;
            ctx.stroke();
        }
    }
}
