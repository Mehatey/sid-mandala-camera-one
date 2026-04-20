// Sandpile Mode — the Abelian sandpile model.
// Drop grains of sand on the centre. When a cell holds 4 or more, it topples:
// one grain flies to each of the four neighbours. Chains of toppling create
// fractal avalanches and build a self-similar mandala of extraordinary precision.
// The pattern is pre-computed to full stability, then REVEALED outward from centre
// like a crystal forming — so you always see the full mandala, growing into view.
// Blink: pour a new avalanche. The new pattern crystallises outward again.
class SandpileMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        // Small grid so pre-computation is instant; each cell renders large on screen
        this.GW = 101;   // odd for exact centre cell
        this.GH = 77;
        const sz = this.GW * this.GH;

        this._grid   = new Int32Array(sz);
        this._stable = new Int32Array(sz);  // fully-settled copy for reveal
        this._active = new Set();

        this._palette  = 0;
        this._palettes = this._buildPalettes();

        this._revealR  = 0;     // grid-cell radius currently revealed
        this._maxRevealR = 0;   // set in startScene

        this._avalanche = 0;    // active topple count for status display
    }

    _buildPalettes() {
        // [r,g,b] × 4 levels (0,1,2,3 grains). High contrast for projection.
        return [
            [[0, 0, 6],   [32, 16, 155], [8, 140, 100], [218, 182, 10]],
            [[2, 0, 4],   [14, 42, 168], [185, 55, 40],  [232, 210, 175]],
            [[0, 0, 5],   [95, 12, 138], [18, 122, 78],  [208, 155, 14]],
            [[4, 4, 6],   [16, 72, 158], [152, 22, 82],  [222, 200, 158]],
        ];
    }

    _cx() { return Math.floor(this.GW / 2); }
    _cy() { return Math.floor(this.GH / 2); }

    _pourGrains(n, grid, active) {
        const idx = this._cy() * this.GW + this._cx();
        grid[idx] += n;
        if (grid[idx] >= 4) active.add(idx);
    }

    // Full-sweep topple: every active cell topples once. Returns new active set.
    _sweep(grid, active) {
        const GW = this.GW, GH = this.GH;
        const next = new Set();
        for (const idx of active) {
            if (grid[idx] < 4) continue;
            const t = (grid[idx] >> 2);   // floor(grid[idx] / 4)
            grid[idx] -= t << 2;          // -= t * 4
            const x = idx % GW, y = (idx / GW) | 0;
            if (x > 0)       { grid[idx-1]   += t; if (grid[idx-1]   >= 4) next.add(idx-1); }
            if (x < GW-1)    { grid[idx+1]   += t; if (grid[idx+1]   >= 4) next.add(idx+1); }
            if (y > 0)       { grid[idx-GW]  += t; if (grid[idx-GW]  >= 4) next.add(idx-GW); }
            if (y < GH-1)    { grid[idx+GW]  += t; if (grid[idx+GW]  >= 4) next.add(idx+GW); }
            if (grid[idx] >= 4) next.add(idx);
        }
        return next;
    }

    _computeStable(initialGrains) {
        const g = new Int32Array(this.GW * this.GH);
        let a   = new Set();
        this._pourGrains(initialGrains, g, a);

        // Topple until fully stable (guaranteed termination for finite grid with sink boundary)
        let guard = 500000;
        while (a.size > 0 && --guard > 0) {
            a = this._sweep(g, a);
        }
        return g;
    }

    startScene() {
        this.t         = 0;
        this._palette  = 0;
        this._revealR  = 4;   // start with centre already visible
        this._avalanche = 0;

        const GW = this.GW, GH = this.GH;
        this._maxRevealR = Math.sqrt((GW/2) * (GW/2) + (GH/2) * (GH/2)) + 2;

        // Pre-compute full stable pattern synchronously
        this._stable = this._computeStable(80000);
        // Live grid starts matching stable (no ongoing toppling at scene start)
        this._grid.set(this._stable);
        this._active.clear();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() {
        // Add grains to live grid → triggers avalanche
        this._pourGrains(60000 + Math.floor(Math.random() * 80000), this._grid, this._active);
        // Cycle palette
        this._palette = (this._palette + 1) % this._palettes.length;
        // Partially retract reveal so avalanche crystallises outward again
        this._revealR = Math.max(6, this._revealR * 0.35);
    }

    draw(time) {
        this.t += 0.016;

        const GW  = this.GW, GH  = this.GH;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const ctx = this.ctx;
        const cx  = this._cx(), cy = this._cy();

        // Grow reveal radius — slow crystallisation outward
        this._revealR = Math.min(this._maxRevealR, this._revealR + 0.12);

        // ── Run live toppling (post-blink avalanche) ───────────────────────────
        this._avalanche = this._active.size;
        if (this._active.size > 0) {
            let a = this._active;
            for (let pass = 0; pass < 6 && a.size > 0; pass++) {
                a = this._sweep(this._grid, a);
            }
            this._active = a;
        }

        // ── Render ─────────────────────────────────────────────────────────────
        const displayGrid = this._active.size > 0 ? this._grid : this._stable;
        const pal  = this._palettes[this._palette];
        const cellW = W / GW;
        const cellH = H / GH;
        // Reveal radius in screen pixels — use min(cellW,cellH) so the reveal is a circle
        const revPxR = this._revealR * Math.min(cellW, cellH);
        const scx = W / 2, scy = H / 2;

        ctx.fillStyle = '#000008';
        ctx.fillRect(0, 0, W, H);

        for (let gy = 0; gy < GH; gy++) {
            for (let gx = 0; gx < GW; gx++) {
                // Cell centre in screen pixels
                const pcx = (gx + 0.5) * cellW - scx;
                const pcy = (gy + 0.5) * cellH - scy;
                if (pcx * pcx + pcy * pcy > revPxR * revPxR) continue;

                const idx    = gy * GW + gx;
                const grains = displayGrid[idx];
                const level  = Math.min(3, grains);
                const isActive = this._active.has(idx) && grains >= 4;

                let r, g, b;
                if (isActive) { r = 255; g = 248; b = 200; }
                else          { [r, g, b] = pal[level]; }

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(gx * cellW, gy * cellH, cellW + 1, cellH + 1);
            }
        }

        // Soft circular fade at reveal boundary (smooths the hard circle edge)
        const edgeFade = ctx.createRadialGradient(scx, scy, revPxR * 0.82, scx, scy, revPxR * 1.08);
        edgeFade.addColorStop(0, 'rgba(0,0,0,0)');
        edgeFade.addColorStop(1, 'rgba(0,0,8,1)');
        ctx.fillStyle = edgeFade;
        ctx.fillRect(0, 0, W, H);

        // Edge vignette (always-on, draws attention to centre)
        const vig = ctx.createRadialGradient(scx, scy, Math.min(W,H)*0.38, scx, scy, Math.max(W,H)*0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Status
        if (this._avalanche > 80) {
            ctx.font = '9px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(210,190,140,0.22)';
            ctx.fillText(`avalanche · ${this._avalanche} toppling`, W/2, H - 22);
            ctx.textAlign = 'left';
        } else if (this.t < 5) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(175,155,80,0.22)';
            ctx.fillText('blink to pour more sand', W/2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
