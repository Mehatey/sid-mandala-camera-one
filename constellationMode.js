// Constellation Mode — 130 stars slowly emerge from darkness.
// When the sky is full, the stars begin to find each other — fine lines
// draw themselves between nearest neighbours, forming shapes you may recognise.
// Blink: the lines dissolve and re-form in a new pattern.
// About: meaning-making from randomness. Connection as inevitability.
class ConstellationMode {
    constructor(ctx, canvas) {
        this.ctx         = ctx;
        this.canvas      = canvas;
        this.t           = 0;
        this._stars      = [];
        this._edges      = [];
        this._edgesBuilt = false;
        this._off        = null;
        this._offCtx     = null;
    }

    startScene() {
        this.t           = 0;
        this._edges      = [];
        this._edgesBuilt = false;
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width  = W;
            this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }
        this._offCtx.fillStyle = '#01010a';
        this._offCtx.fillRect(0, 0, W, H);

        // Faint nebulae — permanent paint on the canvas before stars appear
        const nebs = [
            { x: 0.25, y: 0.35, r: 0.22, hue: 215, a: 0.055 },
            { x: 0.72, y: 0.58, r: 0.18, hue: 280, a: 0.040 },
            { x: 0.50, y: 0.20, r: 0.15, hue: 175, a: 0.035 },
        ];
        for (const n of nebs) {
            const nx = n.x * W, ny = n.y * H, nr = n.r * Math.min(W, H);
            const ng = this._offCtx.createRadialGradient(nx, ny, 0, nx, ny, nr);
            ng.addColorStop(0,   `hsla(${n.hue}, 60%, 42%, ${n.a})`);
            ng.addColorStop(0.5, `hsla(${n.hue}, 50%, 32%, ${n.a * 0.4})`);
            ng.addColorStop(1,   'rgba(0,0,0,0)');
            this._offCtx.fillStyle = ng;
            this._offCtx.beginPath();
            this._offCtx.arc(nx, ny, nr, 0, Math.PI * 2);
            this._offCtx.fill();
        }

        const N = 130;
        this._stars = [];

        // Poisson-disk style — avoid clustering too tight
        const placed = [];
        const minD   = Math.min(W, H) * 0.055;
        let attempts = 0;
        while (placed.length < N && attempts < N * 40) {
            attempts++;
            const sx = 24 + Math.random() * (W - 48);
            const sy = 24 + Math.random() * (H - 48);
            const tooClose = placed.some(p => Math.hypot(p.x - sx, p.y - sy) < minD);
            if (tooClose) continue;
            placed.push({ x: sx, y: sy });
            const brightness = Math.random();
            this._stars.push({
                x:          sx, y: sy,
                r:          0.35 + brightness * 1.8,
                a:          0,
                targetA:    0.15 + brightness * 0.75,
                twinkle:    Math.random() * Math.PI * 2,
                twinkleSpd: 0.4 + Math.random() * 1.8,
                spawnT:     0.8 + (placed.length / N) * 9,
            });
        }
    }

    onBlink() {
        // Dissolve all edges — they'll rebuild on next cycle
        for (const e of this._edges) e.a = 0;
        this._edges      = [];
        this._edgesBuilt = false;
        // Flash each visible star briefly
        for (const s of this._stars) {
            if (s.a > 0.05) s.a = Math.min(1, s.a * 3.2);
        }
    }

    _buildEdges() {
        const MAX_DIST   = Math.min(this.canvas.width || 800, this.canvas.height || 600) * 0.20;
        const MAX_DEGREE = 3;
        const stars      = this._stars.filter(s => s.a > 0.08);
        const degree     = new Array(stars.length).fill(0);
        const edges      = [];

        // Connect nearest visible neighbours, max degree 3
        for (let i = 0; i < stars.length; i++) {
            if (degree[i] >= MAX_DEGREE) continue;
            const si = stars[i];

            // Sorted by distance
            const candidates = stars
                .map((sj, j) => ({ j, d: Math.hypot(si.x - sj.x, si.y - sj.y) }))
                .filter(({ j, d }) => j !== i && d < MAX_DIST && d > 0)
                .sort((a, b) => a.d - b.d);

            for (const { j } of candidates) {
                if (degree[i] >= MAX_DEGREE || degree[j] >= MAX_DEGREE) continue;
                const key = [i, j].sort().join(':');
                if (!edges.find(e => e.key === key)) {
                    edges.push({
                        key,
                        from: si, to: stars[j],
                        progress: 0,
                        a:        0,
                        targetA:  0.22 + Math.random() * 0.18,
                    });
                    degree[i]++;
                    degree[j]++;
                }
                if (degree[i] >= MAX_DEGREE) break;
            }
        }

        this._edges = edges;
    }

    draw(time) {
        this.t += 0.016;
        const ctx  = this.ctx;
        const oc   = this._offCtx;
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;

        // Background fade — keep very slow so trails linger
        oc.fillStyle = 'rgba(1, 1, 10, 0.022)';
        oc.fillRect(0, 0, W, H);

        // Reveal stars over time
        let allVisible = true;
        for (const s of this._stars) {
            if (this.t >= s.spawnT) {
                s.a += (s.targetA - s.a) * 0.035;
            } else {
                allVisible = false;
            }
        }

        // Build edges once all stars are up
        if (allVisible && !this._edgesBuilt && this.t > 10) {
            this._edgesBuilt = true;
            this._buildEdges();
        }

        // Animate edges drawing in, one line at a time
        let activeEdge = -1;
        for (let i = 0; i < this._edges.length; i++) {
            const e = this._edges[i];
            if (e.progress < 1) { activeEdge = i; break; }
        }
        if (activeEdge !== -1) {
            const e = this._edges[activeEdge];
            e.progress = Math.min(1, e.progress + 0.012);
            e.a        = e.targetA * Math.min(1, e.progress * 4);
        }

        // Draw edges
        for (const e of this._edges) {
            if (e.progress < 0.005) continue;
            const tx = e.from.x + (e.to.x - e.from.x) * e.progress;
            const ty = e.from.y + (e.to.y - e.from.y) * e.progress;
            oc.beginPath();
            oc.moveTo(e.from.x, e.from.y);
            oc.lineTo(tx, ty);
            oc.strokeStyle = `rgba(200, 225, 255, ${e.a})`;
            oc.lineWidth   = 0.85;
            oc.stroke();
        }

        // Draw stars
        for (const s of this._stars) {
            if (s.a < 0.01) continue;
            const tw  = s.a * (0.88 + 0.12 * Math.sin(this.t * s.twinkleSpd + s.twinkle));

            // Soft glow
            const g = oc.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
            g.addColorStop(0,   `rgba(220, 238, 255, ${tw * 0.65})`);
            g.addColorStop(0.5, `rgba(170, 210, 255, ${tw * 0.14})`);
            g.addColorStop(1,   'rgba(0,0,0,0)');
            oc.fillStyle = g;
            oc.beginPath();
            oc.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
            oc.fill();

            // Hard core
            oc.beginPath();
            oc.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            oc.fillStyle = `rgba(240, 250, 255, ${tw})`;
            oc.fill();
        }

        ctx.drawImage(this._off, 0, 0);
    }
}
