// Gravity Mode — a fabric of spacetime.
// A mesh of nodes deforms around massive bodies drifting through the field.
// Lines warp, stretch, and compress exactly as general relativity predicts.
// Gravitational waves ripple outward when masses pass near each other.
// Blink: a new mass appears and tears through the fabric.
// The closer two masses get, the brighter the mesh between them — tidal tension.
class GravityMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._masses  = [];
        this._waves   = [];   // {cx, cy, r, maxR, alpha}
        this._COLS    = 36;
        this._ROWS    = 27;
        // Pre-allocated buffers — reused every frame to avoid GC pressure
        this._nodes   = new Float32Array(36 * 27 * 2);
        this._tension = new Float32Array(36 * 27);
    }

    startScene() {
        this.t       = 0;
        this._waves  = [];
        this._masses = [];

        // Seed 3 masses with different "weights"
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        this._masses.push(this._newMass(W * 0.38, H * 0.45, 1.0, 0.28,  0.12));
        this._masses.push(this._newMass(W * 0.62, H * 0.55, 0.7, -0.22, -0.08));
        this._masses.push(this._newMass(W * 0.50, H * 0.30, 0.5,  0.05,  0.20));

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, W, H);
    }

    _newMass(x, y, m, vx, vy) {
        return { x, y, m, vx, vy, trail: [] };
    }

    onBlink() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const m = 0.6 + Math.random() * 0.8;
        const x = 60 + Math.random() * (W - 120);
        const y = 60 + Math.random() * (H - 120);
        const vx = (Math.random() - 0.5) * 0.6;
        const vy = (Math.random() - 0.5) * 0.5;
        this._masses.push(this._newMass(x, y, m, vx, vy));
        if (this._masses.length > 5) this._masses.shift();

        // Gravitational wave burst from new mass
        this._waves.push({ cx: x, cy: y, r: 5, maxR: Math.max(W, H) * 0.85, alpha: 0.5 });
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Very slow fade — mesh lines persist
        ctx.fillStyle = 'rgba(0, 2, 8, 0.065)';
        ctx.fillRect(0, 0, W, H);

        const COLS = this._COLS;
        const ROWS = this._ROWS;

        // ── Update masses (mutual gravity + damping + soft walls) ─────────────────
        const G = 9000;
        for (let i = 0; i < this._masses.length; i++) {
            const mi = this._masses[i];
            let ax = 0, ay = 0;
            for (let j = 0; j < this._masses.length; j++) {
                if (i === j) continue;
                const mj = this._masses[j];
                const dx = mj.x - mi.x, dy = mj.y - mi.y;
                const r2 = dx*dx + dy*dy + 2000;  // softened
                const r  = Math.sqrt(r2);
                const F  = G * mi.m * mj.m / r2;

                // When two masses are very close, emit a gravitational wave
                if (r < 80 && Math.random() < 0.02) {
                    const cx = (mi.x + mj.x) / 2;
                    const cy = (mi.y + mj.y) / 2;
                    this._waves.push({
                        cx, cy, r: 3,
                        maxR: Math.max(W, H) * 0.65,
                        alpha: 0.25 + mi.m * mj.m * 0.15,
                    });
                }

                ax += (dx / r) * F / mi.m;
                ay += (dy / r) * F / mi.m;
            }
            mi.vx += ax * 0.016 * 0.08;
            mi.vy += ay * 0.016 * 0.08;
            mi.vx *= 0.9985;
            mi.vy *= 0.9985;

            // Soft boundary
            const pad = 60;
            if (mi.x < pad)     mi.vx += (pad - mi.x) * 0.004;
            if (mi.x > W - pad) mi.vx -= (mi.x - (W - pad)) * 0.004;
            if (mi.y < pad)     mi.vy += (pad - mi.y) * 0.004;
            if (mi.y > H - pad) mi.vy -= (mi.y - (H - pad)) * 0.004;

            mi.x += mi.vx;
            mi.y += mi.vy;

            // Store trail
            mi.trail.push({ x: mi.x, y: mi.y });
            if (mi.trail.length > 80) mi.trail.shift();
        }

        // ── Draw gravitational wave rings ─────────────────────────────────────────
        this._waves = this._waves.filter(w => w.r < w.maxR);
        ctx.lineCap = 'round';
        for (const w of this._waves) {
            w.r     += 1.8;
            w.alpha *= 0.9940;
            const p  = w.r / w.maxR;
            const a  = w.alpha * (1 - Math.pow(p, 1.5));
            if (a < 0.004) continue;
            ctx.beginPath();
            ctx.arc(w.cx, w.cy, w.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(120, 180, 255, ${a})`;
            ctx.lineWidth   = 1.2;
            ctx.stroke();
        }

        // ── Compute and draw mesh ─────────────────────────────────────────────────
        // For each grid node, compute displacement from all masses
        const cellW = W / (COLS - 1);
        const cellH = H / (ROWS - 1);

        // Precompute node positions (displaced) — reuse cached buffers
        const nodes   = this._nodes;
        const tension = this._tension;

        for (let gy = 0; gy < ROWS; gy++) {
            for (let gx = 0; gx < COLS; gx++) {
                const nx = gx * cellW;
                const ny = gy * cellH;
                let dx = 0, dy = 0, t2 = 0;

                for (const m of this._masses) {
                    const rx = nx - m.x, ry = ny - m.y;
                    const r2 = rx*rx + ry*ry + 400;
                    const r  = Math.sqrt(r2);

                    // GR-inspired displacement: proportional to M/r, directed toward mass
                    const strength = m.m * 6000 / r2;
                    dx -= (rx / r) * strength;
                    dy -= (ry / r) * strength;
                    t2 += strength * 0.0004;
                }

                // Clamp displacement so grid doesn't collapse
                const maxD = Math.min(cellW, cellH) * 2.5;
                const dLen = Math.sqrt(dx*dx + dy*dy);
                if (dLen > maxD) { dx *= maxD / dLen; dy *= maxD / dLen; }

                const idx = (gy * COLS + gx) * 2;
                nodes[idx]     = nx + dx;
                nodes[idx + 1] = ny + dy;
                tension[gy * COLS + gx] = Math.min(1, t2);
            }
        }

        // Draw horizontal grid lines
        for (let gy = 0; gy < ROWS; gy++) {
            ctx.beginPath();
            for (let gx = 0; gx < COLS; gx++) {
                const idx = (gy * COLS + gx) * 2;
                const nx  = nodes[idx], ny = nodes[idx + 1];
                const t   = tension[gy * COLS + gx];
                // Color: deep blue-indigo at rest, bright cyan-white at high tension
                const hue = 220 - t * 40;
                const lit = 14 + t * 52;
                const a   = 0.18 + t * 0.55;
                if (gx === 0) ctx.moveTo(nx, ny);
                else {
                    ctx.strokeStyle = `hsla(${hue}, 75%, ${lit}%, ${a})`;
                    ctx.lineWidth   = 0.55 + t * 1.3;
                    ctx.lineTo(nx, ny);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(nx, ny);
                }
            }
        }

        // Draw vertical grid lines
        for (let gx = 0; gx < COLS; gx++) {
            ctx.beginPath();
            for (let gy = 0; gy < ROWS; gy++) {
                const idx = (gy * COLS + gx) * 2;
                const nx  = nodes[idx], ny = nodes[idx + 1];
                const t   = tension[gy * COLS + gx];
                const hue = 220 - t * 40;
                const lit = 14 + t * 52;
                const a   = 0.18 + t * 0.55;
                if (gy === 0) ctx.moveTo(nx, ny);
                else {
                    ctx.strokeStyle = `hsla(${hue}, 75%, ${lit}%, ${a})`;
                    ctx.lineWidth   = 0.55 + t * 1.3;
                    ctx.lineTo(nx, ny);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(nx, ny);
                }
            }
        }

        // ── Draw mass trails ──────────────────────────────────────────────────────
        for (const m of this._masses) {
            if (m.trail.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(m.trail[0].x, m.trail[0].y);
            for (let k = 1; k < m.trail.length; k++) {
                const a = (k / m.trail.length) * 0.12 * m.m;
                ctx.strokeStyle = `rgba(160, 210, 255, ${a})`;
                ctx.lineWidth   = 0.9;
                ctx.lineTo(m.trail[k].x, m.trail[k].y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(m.trail[k].x, m.trail[k].y);
            }
        }

        // ── Draw masses ───────────────────────────────────────────────────────────
        for (const m of this._masses) {
            const r = 9 + m.m * 14;
            // Schwarzschild-like: dark core with bright accretion glow
            const mg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 5);
            mg.addColorStop(0,    'rgba(0, 0, 0, 0.95)');
            mg.addColorStop(0.25, `rgba(80, 140, 255, ${0.35 * m.m})`);
            mg.addColorStop(0.55, `rgba(40, 80, 180, ${0.15 * m.m})`);
            mg.addColorStop(1,    'rgba(0, 0, 0, 0)');
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.arc(m.x, m.y, r * 5, 0, Math.PI * 2);
            ctx.fill();

            // Event horizon ring
            ctx.beginPath();
            ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(5, 10, 25, 1)';
            ctx.fill();
            ctx.strokeStyle = `rgba(100, 160, 255, ${0.45 * m.m})`;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }

        // ── Hint ──────────────────────────────────────────────────────────────────
        if (this.t < 4) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(100, 160, 220, 0.18)';
            ctx.fillText('blink to add a mass', W / 2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
