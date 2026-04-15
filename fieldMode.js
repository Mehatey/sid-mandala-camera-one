// Field Mode — the invisible made visible.
// Two charges orbit the centre. Magnetic/electric field lines are traced
// between them by integrating the dipole field equation — exactly as
// a physicist would draw them, but alive and moving.
// As the charges orbit, the streamlines gracefully rearrange:
// attractive (opposite) or repulsive (like), switchable on blink.
// The result is the most mathematically honest illustration in this set.
// Blink: flip polarity — the field topology inverts.
class FieldMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this._polarity = 1;   // +1 = dipole (attractive), -1 = repulsive
        this._flash    = 0;
        this._lines    = [];  // pre-integrated streamlines
        this._dirty    = true;
    }

    startScene() {
        this.t       = 0;
        this._polarity = 1;
        this._flash  = 0;
        this._dirty  = true;
    }

    onBlink() {
        this._polarity *= -1;
        this._flash     = 1.0;
        this._dirty     = true;
    }

    // ── Field at (x, y) from charge at (cx, cy) with sign q ──────────────────
    _fieldAt(x, y, charges) {
        let fx = 0, fy = 0;
        for (const c of charges) {
            const dx  = x - c.x;
            const dy  = y - c.y;
            const r2  = dx * dx + dy * dy;
            if (r2 < 0.001) continue;
            const r3  = Math.pow(r2, 1.5);
            fx += c.q * dx / r3;
            fy += c.q * dy / r3;
        }
        return { fx, fy };
    }

    // ── Integrate a single field line starting at (sx, sy) ───────────────────
    _integrate(sx, sy, charges, W, H, maxSteps = 380) {
        const pts   = [{ x: sx, y: sy }];
        const step  = 3.5;
        let x = sx, y = sy;

        for (let i = 0; i < maxSteps; i++) {
            const { fx, fy } = this._fieldAt(x, y, charges);
            const mag = Math.sqrt(fx * fx + fy * fy);
            if (mag < 1e-8) break;
            const nx = x + (fx / mag) * step;
            const ny = y + (fy / mag) * step;

            // Stop if outside canvas
            if (nx < -20 || nx > W + 20 || ny < -20 || ny > H + 20) break;

            // Stop if very close to a charge (field diverges)
            let nearCharge = false;
            for (const c of charges) {
                if (Math.hypot(nx - c.x, ny - c.y) < 8) { nearCharge = true; break; }
            }
            if (nearCharge) break;

            pts.push({ x: nx, y: ny });
            x = nx; y = ny;
        }
        return pts;
    }

    _buildLines(W, H) {
        const cx = W / 2, cy = H / 2;
        const d  = Math.min(W, H) * 0.22;   // charge separation
        // Charges on their orbit
        const ang = this._chargeAngle || 0;
        const charges = [
            { x: cx + Math.cos(ang)           * d, y: cy + Math.sin(ang)           * d * 0.62, q:  1 },
            { x: cx + Math.cos(ang + Math.PI) * d, y: cy + Math.sin(ang + Math.PI) * d * 0.62, q: this._polarity },
        ];

        this._charges = charges;
        const lines   = [];

        // Seed lines: ring of N points around each charge
        const N = 22;
        const seedR = 14;
        for (const c of charges) {
            for (let i = 0; i < N; i++) {
                const a  = (i / N) * Math.PI * 2;
                const sx = c.x + Math.cos(a) * seedR;
                const sy = c.y + Math.sin(a) * seedR;
                if (c.q > 0) {
                    lines.push(this._integrate(sx, sy, charges, W, H));
                } else {
                    // For negative charge: integrate backwards
                    const rev = this._integrate(sx, sy,
                        charges.map(cc => ({ ...cc, q: -cc.q })), W, H);
                    lines.push(rev);
                }
            }
        }

        this._lines = lines;
    }

    draw(time) {
        this.t += 0.016;
        this._flash *= 0.94;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 2, 0.16)';
        ctx.fillRect(0, 0, W, H);

        // Update charge orbital angle — very slow rotation
        this._chargeAngle = (this._chargeAngle || 0) + 0.0015;

        // Rebuild field lines every 45 frames (they don't need per-frame precision)
        if (this._dirty || Math.round(this.t * 60) % 45 === 0) {
            this._buildLines(W, H);
            this._dirty = false;
        }

        const charges = this._charges;
        const flash   = this._flash;

        // ── Draw field lines ──────────────────────────────────────────────────────
        for (const line of this._lines) {
            if (line.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(line[0].x, line[0].y);
            for (let i = 1; i < line.length; i++) {
                ctx.lineTo(line[i].x, line[i].y);
            }
            ctx.strokeStyle = `rgba(210, 222, 255, ${0.18 + flash * 0.14})`;
            ctx.lineWidth   = 0.70;
            ctx.stroke();

            // Arrow tick at midpoint — direction indicator
            const mid  = Math.floor(line.length * 0.5);
            if (mid > 0 && mid < line.length - 1) {
                const dx  = line[mid + 1].x - line[mid - 1].x;
                const dy  = line[mid + 1].y - line[mid - 1].y;
                const ang = Math.atan2(dy, dx);
                const ax  = line[mid].x, ay = line[mid].y;
                const s   = 4.5;
                ctx.beginPath();
                ctx.moveTo(ax + Math.cos(ang - 2.6) * s, ay + Math.sin(ang - 2.6) * s);
                ctx.lineTo(ax, ay);
                ctx.lineTo(ax + Math.cos(ang + 2.6) * s, ay + Math.sin(ang + 2.6) * s);
                ctx.strokeStyle = `rgba(195, 215, 255, ${0.24 + flash * 0.16})`;
                ctx.lineWidth   = 0.60;
                ctx.stroke();
            }
        }

        // ── Draw charges ──────────────────────────────────────────────────────────
        for (const c of charges) {
            const isPos = c.q > 0;
            const hue   = isPos ? 215 : 190;

            // Glow
            const cg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 32);
            cg.addColorStop(0,   `hsla(${hue}, 60%, 72%, ${0.18 + flash * 0.20})`);
            cg.addColorStop(0.5, `hsla(${hue}, 50%, 62%, 0.05)`);
            cg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(c.x, c.y, 32, 0, Math.PI * 2); ctx.fill();

            // Charge dot
            ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 55%, 78%, 0.92)`; ctx.fill();

            // + or − symbol
            ctx.font      = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(200, 220, 255, 0.45)`;
            ctx.fillText(isPos ? '+' : (this._polarity > 0 ? '−' : '+'), c.x, c.y - 14);
        }

        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';

        // ── Faint equipotential circles ───────────────────────────────────────────
        if (charges.length === 2) {
            const mc = { x: (charges[0].x + charges[1].x) / 2, y: (charges[0].y + charges[1].y) / 2 };
            for (let r = 0.5; r <= 2.5; r += 0.5) {
                const eq = Math.min(W, H) * 0.12 * r;
                ctx.beginPath();
                ctx.arc(mc.x, mc.y, eq, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(180, 205, 255, 0.035)`;
                ctx.lineWidth   = 0.4;
                ctx.setLineDash([1.5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
}
