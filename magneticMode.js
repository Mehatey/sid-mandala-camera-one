// Magnetic Mode — iron filings in an invisible field.
// Click to drop a magnetic pole. Opposite charges alternate with each click.
// Poles drift and orbit under their own mutual forces.
// The iron filings — 3000 tiny rod segments — continuously align to the live field.
// Right-click or double-click to remove the nearest pole.
// Up to 6 poles. Start with 2.
// The interaction is placement: each pole reshapes the entire field instantly.
class MagneticMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._poles   = [];    // {x, y, vx, vy, charge, age}
        this._filings = [];    // {x, y, angle}
        this._nextCharge = 1;
        this._lastClickT = -999;
        this._lastClickX = -999;
        this._lastClickY = -999;
    }

    startScene() {
        this.t           = 0;
        this._nextCharge = 1;
        this._filings    = [];
        this._poles      = [];
        this._lastClickT = -999;

        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);

        this._initFilings();
        this._seedPoles();
    }

    _initFilings() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const SPACING = 17;
        this._filings = [];
        for (let gy = SPACING / 2; gy < H; gy += SPACING) {
            for (let gx = SPACING / 2; gx < W; gx += SPACING) {
                this._filings.push({
                    x:     gx + (Math.random() - 0.5) * 3,
                    y:     gy + (Math.random() - 0.5) * 3,
                    angle: Math.random() * Math.PI * 2,
                });
            }
        }
    }

    _seedPoles() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        // Start with one dipole pair
        const cx = W / 2, cy = H / 2;
        const off = Math.min(W, H) * 0.22;
        const ang = Math.random() * Math.PI * 2;
        this._poles.push({ x: cx + Math.cos(ang) * off, y: cy + Math.sin(ang) * off,
                           vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3,
                           charge: +1, age: 0 });
        this._poles.push({ x: cx - Math.cos(ang) * off, y: cy - Math.sin(ang) * off,
                           vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3,
                           charge: -1, age: 0 });
        this._nextCharge = 1;
    }

    _fieldAt(px, py) {
        let Bx = 0, By = 0;
        for (const pole of this._poles) {
            const dx = px - pole.x;
            const dy = py - pole.y;
            const r2 = dx*dx + dy*dy + 800;
            const r  = Math.sqrt(r2);
            const f  = pole.charge / (r2 * r) * 12000;
            Bx += f * dx;
            By += f * dy;
        }
        return { Bx, By };
    }

    onPolePlace(x, y) {
        if (this._poles.length >= 6) return;
        const now = performance.now() / 1000;

        // Double-click detection (< 0.35s, same location) = remove instead
        const dClick = now - this._lastClickT;
        const dDist  = Math.hypot(x - this._lastClickX, y - this._lastClickY);
        if (dClick < 0.35 && dDist < 30) {
            this._lastClickT = -999;
            this.onPoleRemove(x, y);
            return;
        }
        this._lastClickT = now;
        this._lastClickX = x;
        this._lastClickY = y;

        this._poles.push({ x, y, vx: 0, vy: 0, charge: this._nextCharge, age: 0 });
        this._nextCharge *= -1;
    }

    onPoleRemove(x, y) {
        if (!this._poles.length) return;
        let nearest = 0, nearestD = Infinity;
        for (let i = 0; i < this._poles.length; i++) {
            const d = Math.hypot(this._poles[i].x - x, this._poles[i].y - y);
            if (d < nearestD) { nearestD = d; nearest = i; }
        }
        this._poles.splice(nearest, 1);
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Fill solid dark each frame (no persistence — field lines are redrawn fresh)
        ctx.fillStyle = 'rgba(0, 1, 4, 0.92)';
        ctx.fillRect(0, 0, W, H);

        if (!this._poles.length) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180,175,220,0.22)';
            ctx.fillText('click to place a magnetic pole', W/2, H/2 + 16);
            ctx.textAlign = 'left';
            return;
        }

        // ── Update pole physics ─────────────────────────────────────────────────
        for (const p of this._poles) p.age += 0.016;

        for (const p1 of this._poles) {
            let fx = 0, fy = 0;
            for (const p2 of this._poles) {
                if (p1 === p2) continue;
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const r2 = dx*dx + dy*dy + 600;
                const r  = Math.sqrt(r2);
                // Like charges repel, opposite attract — Coulomb
                const f  = p1.charge * p2.charge / (r * r2) * 14000;
                fx += f * dx; fy += f * dy;
            }
            p1.vx = (p1.vx + fx * 0.016) * 0.97;
            p1.vy = (p1.vy + fy * 0.016) * 0.97;
            p1.x += p1.vx;
            p1.y += p1.vy;
            // Soft bounce off edges
            if (p1.x < 60)     { p1.vx =  Math.abs(p1.vx) * 0.6; p1.x = 60; }
            if (p1.x > W - 60) { p1.vx = -Math.abs(p1.vx) * 0.6; p1.x = W - 60; }
            if (p1.y < 60)     { p1.vy =  Math.abs(p1.vy) * 0.6; p1.y = 60; }
            if (p1.y > H - 60) { p1.vy = -Math.abs(p1.vy) * 0.6; p1.y = H - 60; }
        }

        // ── Update and draw iron filings ────────────────────────────────────────
        const FILING_LEN = 7;
        ctx.lineCap = 'round';

        for (const f of this._filings) {
            const { Bx, By } = this._fieldAt(f.x, f.y);
            const strength   = Math.sqrt(Bx*Bx + By*By);

            // Target angle from field direction
            let target = Math.atan2(By, Bx);

            // Smooth rotation toward target (handle angle wraparound)
            let diff = target - f.angle;
            while (diff >  Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            f.angle += diff * 0.09;

            // Brightness from field strength — closer to poles = brighter
            const norm = Math.min(1, strength * 0.018);
            const a    = 0.12 + norm * 0.62;
            const l    = 42  + norm * 38;

            const cosA = Math.cos(f.angle) * FILING_LEN / 2;
            const sinA = Math.sin(f.angle) * FILING_LEN / 2;

            ctx.beginPath();
            ctx.moveTo(f.x - cosA, f.y - sinA);
            ctx.lineTo(f.x + cosA, f.y + sinA);
            ctx.strokeStyle = `rgba(${160 + norm*90|0}, ${175 + norm*75|0}, ${210 + norm*40|0}, ${a})`;
            ctx.lineWidth   = 0.9 + norm * 0.9;
            ctx.stroke();
        }

        // ── Draw poles ─────────────────────────────────────────────────────────
        for (const pole of this._poles) {
            const hue  = pole.charge > 0 ? 32 : 220;
            const sat  = 90, lit = 70;
            const entryA = Math.min(1, pole.age * 3);

            // Inner bright dot
            ctx.beginPath();
            ctx.arc(pole.x, pole.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${entryA * 0.9})`;
            ctx.fill();

            // Outer glow
            const pg = ctx.createRadialGradient(pole.x, pole.y, 0, pole.x, pole.y, 55);
            pg.addColorStop(0,   `hsla(${hue}, ${sat}%, ${lit}%, ${entryA * 0.30})`);
            pg.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${lit}%, ${entryA * 0.08})`);
            pg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.arc(pole.x, pole.y, 55, 0, Math.PI * 2);
            ctx.fill();

            // + / − label
            ctx.font = '11px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = `hsla(${hue}, 60%, 85%, ${entryA * 0.55})`;
            ctx.fillText(pole.charge > 0 ? '+' : '−', pole.x, pole.y - 10);
            ctx.textAlign = 'left';
        }

        // Hint
        if (this._poles.length < 4) {
            ctx.font = '9px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,170,210,0.14)';
            ctx.fillText('click · add pole    right-click · remove', W/2, H - 20);
            ctx.textAlign = 'left';
        }
    }
}
