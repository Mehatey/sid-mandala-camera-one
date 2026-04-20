// Rain Ripple Mode — raindrops fall on still water, rings interfere.
// The surface holds many overlapping circular waves; their intersection
// creates moiré-like interference that shifts with each new drop.
// Blink: a burst of drops from the centre.
class RainRippleMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._drops  = [];   // falling drops { x, y, vy }
        this._rings  = [];   // expanding surface rings { x, y, r, maxR, a, hue }
        this._nextDrop = 0;  // timer
    }

    startScene() {
        this.t        = 0;
        this._drops   = [];
        this._rings   = [];
        this._nextDrop = 0;
    }

    onBlink() {
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H * 0.55;
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = Math.random() * Math.min(W, H) * 0.25;
            this._addRing(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
        }
    }

    _addRing(x, y) {
        const S = Math.min(this.canvas.width, this.canvas.height);
        this._rings.push({
            x, y,
            r:    0,
            maxR: S * (0.12 + Math.random() * 0.28),
            a:    0.55 + Math.random() * 0.25,
            hue:  190 + (Math.random() - 0.5) * 30,
            speed: 1.2 + Math.random() * 1.4,
        });
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const t  = this.t;

        // Dark still water
        ctx.fillStyle = 'rgba(2, 6, 12, 0.22)';
        ctx.fillRect(0, 0, W, H);

        // Water colour gradient
        const wg = ctx.createLinearGradient(0, 0, 0, H);
        wg.addColorStop(0, 'rgba(4, 18, 35, 0.06)');
        wg.addColorStop(1, 'rgba(1,  5, 12, 0.10)');
        ctx.fillStyle = wg;
        ctx.fillRect(0, 0, W, H);

        // ── Spawn raindrops ────────────────────────────────────────
        this._nextDrop -= 0.016;
        if (this._nextDrop <= 0) {
            const x = W * (0.08 + Math.random() * 0.84);
            this._drops.push({
                x,
                y:  -8,
                vy: 4 + Math.random() * 5,
                len: 6 + Math.random() * 10,
            });
            this._nextDrop = 0.28 + Math.random() * 0.5;
        }

        // ── Update falling drops ───────────────────────────────────
        const waterY = H * 0.52;   // water surface level
        for (let di = this._drops.length - 1; di >= 0; di--) {
            const d = this._drops[di];
            d.y += d.vy;
            if (d.y >= waterY) {
                // Hit surface — spawn ring
                this._addRing(d.x, waterY);
                // Tiny splash dots
                for (let s = 0; s < 4; s++) {
                    const sa = Math.random() * Math.PI * 2;
                    const sv = 1.0 + Math.random() * 2.5;
                    this._drops.push({
                        x: d.x + Math.cos(sa) * 3,
                        y: waterY - 2,
                        vy: -(sv),
                        _splash: true,
                        _vx: Math.cos(sa) * sv * 0.7,
                        len: 2,
                    });
                }
                this._drops.splice(di, 1);
                continue;
            }

            // Draw raindrop streak
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + (d._vx || 0) * 2, d.y + d.len);
            ctx.strokeStyle = `rgba(160, 200, 230, ${d._splash ? 0.3 : 0.45})`;
            ctx.lineWidth   = d._splash ? 0.6 : 0.8;
            ctx.stroke();

            // Splash arcs die quickly
            if (d._splash) {
                d.x  += d._vx || 0;
                d.vy += 0.25;
                if (d.y > waterY + 5) this._drops.splice(di, 1);
            }
        }

        // ── Water surface line ─────────────────────────────────────
        ctx.beginPath();
        ctx.moveTo(0, waterY);
        for (let x = 0; x <= W; x += 6) {
            const wave = 1.2 * Math.sin(x * 0.04 + t * 1.1) + 0.6 * Math.sin(x * 0.09 - t * 0.7);
            ctx.lineTo(x, waterY + wave);
        }
        ctx.strokeStyle = 'rgba(100, 160, 200, 0.12)';
        ctx.lineWidth   = 1.0;
        ctx.stroke();

        // ── Expand and draw rings ──────────────────────────────────
        for (let ri = this._rings.length - 1; ri >= 0; ri--) {
            const r = this._rings[ri];
            r.r    += r.speed;
            r.a    *= 0.970;

            if (r.a < 0.01 || r.r > r.maxR) { this._rings.splice(ri, 1); continue; }

            const alpha = r.a * (1 - r.r / r.maxR);

            // Only draw rings that are on/below the water line
            const ringY = r.y;
            if (ringY + r.r < 0) continue;

            // Draw ellipse (rings appear circular on top, elliptical with perspective)
            ctx.save();
            ctx.translate(r.x, ringY);
            ctx.scale(1, 0.35);   // perspective squish
            ctx.beginPath();
            ctx.arc(0, 0, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${r.hue}, 70%, 70%, ${alpha})`;
            ctx.lineWidth   = 1.2 / 0.35;
            ctx.stroke();
            ctx.restore();
        }

        // ── Reflection shimmer above waterline ─────────────────────
        for (const r of this._rings) {
            const alpha = r.a * (1 - r.r / r.maxR) * 0.20;
            if (alpha < 0.01) continue;
            // Reflected ring above waterline (mirrored y)
            const reflY = waterY - (r.y - waterY);
            ctx.save();
            ctx.translate(r.x, reflY);
            ctx.scale(1, 0.18);
            ctx.beginPath();
            ctx.arc(0, 0, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${r.hue}, 60%, 80%, ${alpha})`;
            ctx.lineWidth   = 1.5 / 0.18;
            ctx.stroke();
            ctx.restore();
        }

        // Vignette
        const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.22,W/2,H/2,Math.max(W,H)*0.70);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,4,12,0.65)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
