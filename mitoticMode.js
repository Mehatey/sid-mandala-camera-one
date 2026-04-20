// Mitotic Mode — a single cell divides, and divides again.
// Each daughter inherits organelles and a shifted hue. After 4 generations
// the colony slowly merges back together. Deeply biological, meditative.
// Blink: triggers the next division wave immediately.
class MitoticMode {
    constructor(ctx, canvas) {
        this.ctx   = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._cells = [];
        this._gen   = 0;
        this._divideT = 0;
        this._MAX_GEN = 4;
        this._merging = false;
        this._mergeT  = 0;
    }

    startScene() {
        this.t        = 0;
        this._gen     = 0;
        this._merging = false;
        this._mergeT  = 0;
        this._divideT = 4.0;
        const W = this.canvas.width, H = this.canvas.height;
        this._cells = [{
            x: W / 2, y: H / 2,
            tx: W / 2, ty: H / 2,
            r: Math.min(W, H) * 0.20,
            hue: 180 + Math.random() * 60,
            rot: 0,
            dividing: false,
            divProgress: 0,
            organelles: this._makeOrganelles(),
        }];
    }

    _makeOrganelles() {
        return Array.from({ length: 5 + Math.floor(Math.random() * 4) }, () => ({
            r:     Math.random(),      // 0..1 radial fraction
            angle: Math.random() * Math.PI * 2,
            size:  0.08 + Math.random() * 0.12,
            hue:   Math.random() * 360,
            type:  Math.floor(Math.random() * 3),  // 0=mito 1=vacuole 2=nucleus
        }));
    }

    onBlink() {
        if (!this._merging && this._gen < this._MAX_GEN) {
            this._divideT = 0; // trigger immediate division
        } else if (this._merging) {
            this._mergeT = 8.0; // fast-forward merge
        }
    }

    _divideCells() {
        const newCells = [];
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;

        for (const cell of this._cells) {
            if (cell.dividing) continue;
            cell.dividing    = true;
            cell.divProgress = 0;

            // Two daughter targets — split left/right
            const angle   = cell.rot + Math.PI / 2;
            const offset  = cell.r * 0.6;
            const d1x = cell.x + Math.cos(angle) * offset;
            const d1y = cell.y + Math.sin(angle) * offset;
            const d2x = cell.x - Math.cos(angle) * offset;
            const d2y = cell.y - Math.sin(angle) * offset;

            newCells.push({
                x: cell.x, y: cell.y,
                tx: d1x, ty: d1y,
                r: cell.r * 0.65,
                hue: (cell.hue + 25) % 360,
                rot: cell.rot + (Math.random() - 0.5) * 0.5,
                dividing: false,
                divProgress: 0,
                organelles: this._makeOrganelles(),
            });
            newCells.push({
                x: cell.x, y: cell.y,
                tx: d2x, ty: d2y,
                r: cell.r * 0.65,
                hue: (cell.hue - 25 + 360) % 360,
                rot: cell.rot + (Math.random() - 0.5) * 0.5,
                dividing: false,
                divProgress: 0,
                organelles: this._makeOrganelles(),
            });
        }

        this._cells = newCells;
        this._gen++;
    }

    _drawCell(ctx, cell) {
        const { x, y, r, hue } = cell;

        // Membrane glow
        const mg = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.2);
        mg.addColorStop(0, `hsla(${hue}, 60%, 50%, 0.04)`);
        mg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Cytoplasm
        const cg = ctx.createRadialGradient(x, y, 0, x, y, r);
        cg.addColorStop(0,   `hsla(${hue}, 45%, 22%, 0.55)`);
        cg.addColorStop(0.8, `hsla(${hue}, 40%, 18%, 0.40)`);
        cg.addColorStop(1,   `hsla(${hue}, 50%, 35%, 0.20)`);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Membrane ring
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 70%, 65%, 0.40)`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        // Organelles
        for (const org of cell.organelles) {
            const ox = x + Math.cos(org.angle + this.t * 0.08) * r * org.r * 0.75;
            const oy = y + Math.sin(org.angle + this.t * 0.08) * r * org.r * 0.75;
            const os = r * org.size;

            if (org.type === 2) {
                // Nucleus
                const ng = ctx.createRadialGradient(ox, oy, 0, ox, oy, os);
                ng.addColorStop(0,   `hsla(${hue + 40}, 70%, 70%, 0.55)`);
                ng.addColorStop(1,   `hsla(${hue + 40}, 50%, 40%, 0.20)`);
                ctx.fillStyle = ng;
                ctx.beginPath();
                ctx.arc(ox, oy, os, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ox, oy, os, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${hue + 40}, 60%, 70%, 0.30)`;
                ctx.lineWidth   = 0.8;
                ctx.stroke();
            } else if (org.type === 0) {
                // Mitochondria — elongated
                ctx.save();
                ctx.translate(ox, oy);
                ctx.rotate(org.angle * 2);
                ctx.beginPath();
                ctx.ellipse(0, 0, os, os * 0.45, 0, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${org.hue}, 65%, 55%, 0.30)`;
                ctx.fill();
                ctx.restore();
            } else {
                // Vacuole
                ctx.beginPath();
                ctx.arc(ox, oy, os * 0.7, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${org.hue}, 55%, 60%, 0.25)`;
                ctx.lineWidth   = 0.6;
                ctx.stroke();
            }
        }
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        ctx.fillStyle = 'rgba(2, 4, 8, 0.12)';
        ctx.fillRect(0, 0, W, H);

        // ── Division logic ─────────────────────────────────────────
        this._divideT -= 0.016;
        if (!this._merging && this._divideT <= 0 && this._gen < this._MAX_GEN) {
            this._divideCells();
            this._divideT = 5.5 - this._gen * 0.5;
        }

        // Start merge after max gen
        if (!this._merging && this._gen >= this._MAX_GEN && this._divideT <= 0) {
            this._merging = true;
            this._mergeT  = 0;
            // All cells merge toward centre
            for (const c of this._cells) {
                c.tx = W / 2; c.ty = H / 2;
            }
        }

        if (this._merging) {
            this._mergeT += 0.016;
            // Slowly attract toward targets
            for (const c of this._cells) {
                c.x += (c.tx - c.x) * 0.005;
                c.y += (c.ty - c.y) * 0.005;
                c.r += (Math.min(W, H) * 0.20 - c.r) * 0.003;
            }
            // Reset after full merge
            if (this._mergeT > 14) this.startScene();
        } else {
            // Move cells toward their target positions
            for (const c of this._cells) {
                c.x += (c.tx - c.x) * 0.022;
                c.y += (c.ty - c.y) * 0.022;
                c.rot += 0.004;
            }
        }

        // Draw all cells (back-to-front)
        for (const cell of this._cells) this._drawCell(ctx, cell);

        // Vignette
        const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.22,W/2,H/2,Math.max(W,H)*0.70);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,2,8,0.60)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
