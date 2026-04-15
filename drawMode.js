// Draw Mode — you are the instrument.
// Click and drag to draw. Your line is mirrored in N-fold symmetry around the centre.
// A single gesture becomes a mandala.
// Keys 3–9 change the symmetry order while you work.
// C clears the canvas. Old strokes fade slowly — add to them or let them go.
// The algorithm does nothing. You do everything.
class DrawMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;

        this._strokes   = [];     // {pts:[], hue, spawnT, lifetime}
        this._current   = null;   // {pts:[], hue}
        this._drawing   = false;
        this._symmetry  = 8;
        this._hue       = 220;
        this._mirror    = true;   // also reflect, creating 2N fold
    }

    startScene() {
        this.t        = 0;
        this._strokes  = [];
        this._current  = null;
        this._drawing  = false;
        this._symmetry = 8;
        this._hue      = 220;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onMouseDown(x, y) {
        const cx = (this.canvas.width  || 800) / 2;
        const cy = (this.canvas.height || 600) / 2;
        this._drawing = true;
        this._current = { pts: [{ x: x - cx, y: y - cy }], hue: this._hue };
    }

    onMouseMove(x, y) {
        if (!this._drawing || !this._current) return;
        const cx = (this.canvas.width  || 800) / 2;
        const cy = (this.canvas.height || 600) / 2;
        const lp  = this._current.pts[this._current.pts.length - 1];
        const nx  = x - cx, ny = y - cy;
        // Only record if moved enough (avoids micro-jitter)
        if (Math.hypot(nx - lp.x, ny - lp.y) > 1.5) {
            this._current.pts.push({ x: nx, y: ny });
        }
    }

    onMouseUp() {
        if (this._drawing && this._current && this._current.pts.length > 2) {
            this._strokes.push({
                pts:      this._current.pts,
                hue:      this._current.hue,
                spawnT:   performance.now() / 1000,
                lifetime: 28 + Math.random() * 14,
            });
            // Shift hue for next stroke
            this._hue = (this._hue + 22 + Math.random() * 35) % 360;
        }
        this._drawing = false;
        this._current = null;
    }

    onKey(key) {
        const n = parseInt(key);
        if (n >= 3 && n <= 9) { this._symmetry = n; return; }
        if (key === 'c' || key === 'C') {
            this._strokes = [];
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
        }
    }

    // ── Draw a set of points with N-fold (+ optional mirror) symmetry ──────────
    _drawSymmetric(pts, alpha, lineWidth, hue, glow) {
        if (pts.length < 2) return;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const N   = this._symmetry;

        const variations = this._mirror ? N * 2 : N;

        for (let v = 0; v < variations; v++) {
            const angle  = (v % N) / N * Math.PI * 2;
            const mirror = this._mirror && v >= N;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            if (mirror) ctx.scale(-1, 1);

            if (glow > 0) {
                ctx.shadowColor = `hsla(${hue}, 85%, 80%, ${alpha * 0.6})`;
                ctx.shadowBlur  = glow;
            }

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                // Smooth curve through points using quadratic bezier midpoints
                const pm = { x: (pts[i-1].x + pts[i].x) / 2, y: (pts[i-1].y + pts[i].y) / 2 };
                ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, pm.x, pm.y);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);

            ctx.strokeStyle = `hsla(${hue}, 78%, 75%, ${alpha})`;
            ctx.lineWidth   = lineWidth;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const now = performance.now() / 1000;

        // Very slow fade — drawn lines linger like memory
        ctx.fillStyle = 'rgba(0, 0, 2, 0.018)';
        ctx.fillRect(0, 0, W, H);

        // ── Historical strokes (fading) ──────────────────────────────────────────
        for (let i = this._strokes.length - 1; i >= 0; i--) {
            const st  = this._strokes[i];
            const age = now - st.spawnT;
            if (age > st.lifetime) { this._strokes.splice(i, 1); continue; }

            const frac  = age / st.lifetime;
            const alpha = frac < 0.05
                ? frac / 0.05           // fade in
                : 1 - Math.pow((frac - 0.05) / 0.95, 1.5);  // fade out
            const glow  = alpha > 0.6 ? (alpha - 0.6) / 0.4 * 8 : 0;

            this._drawSymmetric(st.pts, alpha * 0.72, 1.2, st.hue, glow);
        }

        // ── In-progress stroke (bright, full glow) ───────────────────────────────
        if (this._current && this._current.pts.length > 1) {
            this._drawSymmetric(this._current.pts, 0.88, 1.6, this._current.hue, 12);

            // Tip glow at cursor position
            const tip = this._current.pts[this._current.pts.length - 1];
            for (let v = 0; v < this._symmetry; v++) {
                const angle = (v / this._symmetry) * Math.PI * 2;
                const tx = cx + Math.cos(angle) * tip.x - Math.sin(angle) * tip.y;
                const ty = cy + Math.sin(angle) * tip.x + Math.cos(angle) * tip.y;
                const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 10);
                tg.addColorStop(0,   `hsla(${this._current.hue}, 90%, 90%, 0.55)`);
                tg.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = tg;
                ctx.beginPath();
                ctx.arc(tx, ty, 10, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Symmetry guide lines — faint, always visible ─────────────────────────
        for (let v = 0; v < this._symmetry; v++) {
            const angle = (v / this._symmetry) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * Math.min(W, H) * 0.48, cy + Math.sin(angle) * Math.min(W, H) * 0.48);
            ctx.strokeStyle = `rgba(120, 130, 180, 0.055)`;
            ctx.lineWidth   = 1.0;
            ctx.setLineDash([3, 7]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // ── Hint / symmetry indicator ─────────────────────────────────────────────
        ctx.font = '9px Helvetica Neue, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(160,170,215,0.18)';
        const mirror = this._mirror ? '×2 mirror' : '';
        ctx.fillText(`${this._symmetry}-fold ${mirror}   keys 3–9 · c to clear`, cx, H - 22);
        ctx.textAlign = 'left';
    }
}
