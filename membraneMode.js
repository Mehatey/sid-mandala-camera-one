// Membrane Mode — an elastic luminous grid you can press and deform.
// Spring physics: every point wants to return home but carries momentum.
// Mouse or hand pushes the surface like pressing on a soap film.
// Blink: sends an outward wave through the whole membrane.
// The grid glows where it's most displaced — like bioluminescent tension.
class MembraneMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._pts   = [];
        this._cols  = 36;
        this._rows  = 22;
        this._mx    = null;
        this._my    = null;
    }

    startScene() {
        this.t   = 0;
        this._mx = null;
        this._buildGrid();
    }

    _buildGrid() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const cols = this._cols, rows = this._rows;
        const pw   = W / (cols - 1);
        const ph   = H / (rows - 1);
        this._pw   = pw;
        this._ph   = ph;
        this._pts  = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hx = c * pw;
                const hy = r * ph;
                this._pts.push({ x: hx, y: hy, vx: 0, vy: 0, hx, hy });
            }
        }
    }

    onMouseMove(x, y)  { this._mx = x; this._my = y; }
    onHandMove(nx, ny) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this._mx = (1 - nx) * W;
        this._my = ny * H;
    }

    onBlink() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        for (const p of this._pts) {
            const dx   = p.x - cx;
            const dy   = p.y - cy;
            const dist = Math.hypot(dx, dy) || 1;
            const wave = Math.sin(dist * 0.018) * 28;
            p.vx += (dx / dist) * wave * 0.4;
            p.vy += (dy / dist) * wave * 0.4;
        }
    }

    draw(time) {
        this.t += 0.016;
        const ctx  = this.ctx;
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;
        const cols = this._cols;
        const rows = this._rows;

        // ── Background ───────────────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(2, 3, 16, 0.22)';
        ctx.fillRect(0, 0, W, H);

        const K = 0.045;        // spring stiffness
        const D = 0.86;         // velocity damping
        const MOUSE_R  = 100;   // influence radius
        const MOUSE_F  = 220;   // push force

        // ── Physics update ───────────────────────────────────────────────────────
        for (const p of this._pts) {
            // Spring to home
            p.vx += (p.hx - p.x) * K;
            p.vy += (p.hy - p.y) * K;

            // Mouse / hand repulsion
            if (this._mx !== null) {
                const mdx = p.x - this._mx;
                const mdy = p.y - this._my;
                const md  = Math.hypot(mdx, mdy);
                if (md < MOUSE_R && md > 0.5) {
                    const f = Math.pow((MOUSE_R - md) / MOUSE_R, 2);
                    p.vx += (mdx / md) * f * MOUSE_F * 0.016;
                    p.vy += (mdy / md) * f * MOUSE_F * 0.016;
                }
            }

            p.vx *= D;
            p.vy *= D;
            p.x  += p.vx;
            p.y  += p.vy;
        }

        const get = (r, c) => this._pts[r * cols + c];

        // ── Compute max displacement for color mapping ────────────────────────────
        let maxDisp = 0;
        for (const p of this._pts) {
            const d = Math.hypot(p.x - p.hx, p.y - p.hy);
            if (d > maxDisp) maxDisp = d;
        }
        const normFac = maxDisp > 1 ? 1 / maxDisp : 1;

        // ── Draw grid lines ───────────────────────────────────────────────────────
        // Horizontal
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const pa = get(r, c);
                const pb = get(r, c + 1);
                const disp = (Math.hypot(pa.x - pa.hx, pa.y - pa.hy) +
                               Math.hypot(pb.x - pb.hx, pb.y - pb.hy)) * 0.5 * normFac;
                const a    = 0.06 + disp * 0.32;
                const hue  = 200 + disp * 55;   // blue-white → warm gold when stretched
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.strokeStyle = `hsla(${hue}, 72%, 62%, ${a})`;
                ctx.lineWidth   = 0.65 + disp * 0.85;
                ctx.stroke();
            }
        }

        // Vertical
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows - 1; r++) {
                const pa = get(r, c);
                const pb = get(r + 1, c);
                const disp = (Math.hypot(pa.x - pa.hx, pa.y - pa.hy) +
                               Math.hypot(pb.x - pb.hx, pb.y - pb.hy)) * 0.5 * normFac;
                const a    = 0.06 + disp * 0.32;
                const hue  = 200 + disp * 55;
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.strokeStyle = `hsla(${hue}, 72%, 62%, ${a})`;
                ctx.lineWidth   = 0.65 + disp * 0.85;
                ctx.stroke();
            }
        }

        // ── Glowing nodes where displaced ────────────────────────────────────────
        for (const p of this._pts) {
            const disp = Math.hypot(p.x - p.hx, p.y - p.hy) * normFac;
            if (disp < 0.04) continue;
            const hue = 200 + disp * 60;
            const a   = disp * 0.7;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.0 + disp * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${a})`;
            ctx.fill();
        }

        // ── Soft hint text ────────────────────────────────────────────────────────
        if (this.t < 5) {
            ctx.font      = '9px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(140, 190, 255, 0.18)';
            ctx.fillText('move to press the membrane  ·  blink to send a wave', W / 2, H - 20);
            ctx.textAlign = 'left';
        }
    }
}
