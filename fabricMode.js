// Fabric Mode — a sheet of silk hanging in slow wind.
// Spring-mass cloth simulation. The fabric is backlit: translucent threads catch the light.
// Warp threads run vertically (warm gold), weft threads horizontally (cool silver-blue).
// Blink: a sudden gust. Face tilt changes wind direction.
// The pattern of light through silk changes with every fold.
class FabricMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this.COLS   = 32;
        this.ROWS   = 24;
        this._nodes = [];   // {x, y, px, py, pinned}
        this._gust  = 0;    // 0→1, from blink
        this._windAngle = 0; // drifts slowly
        this._faceX = 0.5;
        this._faceY = 0.5;
    }

    startScene() {
        this.t          = 0;
        this._gust      = 0;
        this._windAngle = 0;
        this._faceX     = 0.5;
        this._faceY     = 0.5;
        this._build();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() {
        this._gust = 1.0;
    }

    onFaceMove(normX, normY) {
        this._faceX += (normX - this._faceX) * 0.05;
        this._faceY += (normY - this._faceY) * 0.05;
    }

    _build() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const COLS = this.COLS, ROWS = this.ROWS;

        // Fabric hangs from top, slightly inset from edges
        const startX = W * 0.08;
        const endX   = W * 0.92;
        const startY = H * 0.05;
        const height = H * 0.82;

        const spacingX = (endX - startX) / (COLS - 1);
        const spacingY = height / (ROWS - 1);

        this._nodes = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = startX + c * spacingX;
                const y = startY + r * spacingY;
                this._nodes.push({
                    x, y,
                    px: x + (Math.random() - 0.5) * 2,  // slight initial jitter
                    py: y + (Math.random() - 0.5) * 2,
                    pinned: r === 0,  // top row is fixed
                });
            }
        }

        this._spacingX = spacingX;
        this._spacingY = spacingY;
        this._restLen  = Math.sqrt(spacingX * spacingX + spacingY * spacingY) * 0.98;
    }

    _node(r, c) {
        return this._nodes[r * this.COLS + c];
    }

    draw(time) {
        this.t += 0.016;
        this._gust    = Math.max(0, this._gust - 0.016 * 0.7);
        this._windAngle += (this._faceX - 0.5) * 0.008 + Math.sin(this.t * 0.12) * 0.005;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const COLS = this.COLS, ROWS = this.ROWS;

        // Dark background with warm central light source (behind the fabric)
        ctx.fillStyle = 'rgb(2, 2, 6)';
        ctx.fillRect(0, 0, W, H);

        // Backlight glow — diffuse light source behind centre of fabric
        const lightX = W * 0.5 + (this._faceX - 0.5) * W * 0.2;
        const lightY = H * 0.45;
        const lg = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, H * 0.55);
        lg.addColorStop(0,   `rgba(255, 240, 210, 0.12)`);
        lg.addColorStop(0.4, `rgba(220, 200, 170, 0.05)`);
        lg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, W, H);

        // ── Physics: Verlet integration ───────────────────────────────────────────
        const GRAVITY   = 0.22;
        const WIND_BASE = 0.035 + this._gust * 0.32;
        const DAMP      = 0.993;
        const STIFF     = 0.45;

        // Indexed loop — avoids O(N²) indexOf() calls
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const n = this._node(r, c);
                if (n.pinned) continue;

                const vx = (n.x - n.px) * DAMP;
                const vy = (n.y - n.py) * DAMP;
                n.px = n.x;
                n.py = n.y;

                const col   = c / COLS;
                const row   = r / ROWS;
                const phase = col * 1.8 + this.t * 0.9 + row * 0.4;
                const wStr  = WIND_BASE * (0.6 + 0.4 * Math.sin(phase));
                const windX = Math.cos(this._windAngle) * wStr;
                const windY = Math.sin(this._windAngle) * wStr * 0.35;

                n.x  += vx + windX;
                n.y  += vy + windY + GRAVITY * 0.016;
            }
        }

        // Constraint relaxation — enforce link lengths (3 iterations)
        for (let iter = 0; iter < 4; iter++) {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const n = this._node(r, c);
                    // Horizontal link
                    if (c < COLS - 1) {
                        const m = this._node(r, c + 1);
                        this._satisfy(n, m, this._spacingX, STIFF);
                    }
                    // Vertical link
                    if (r < ROWS - 1) {
                        const m = this._node(r + 1, c);
                        this._satisfy(n, m, this._spacingY, STIFF);
                    }
                    // Diagonal (shear) spring
                    if (c < COLS - 1 && r < ROWS - 1) {
                        const m = this._node(r + 1, c + 1);
                        this._satisfy(n, m, this._restLen, STIFF * 0.4);
                    }
                }
            }
        }

        // ── Render: warp threads (vertical) ───────────────────────────────────────
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        for (let c = 0; c < COLS; c++) {
            // Color warp threads: warm gold with variation
            const hue = 38 + c * 1.2;
            ctx.beginPath();
            for (let r = 0; r < ROWS; r++) {
                const n = this._node(r, c);
                // Shading: lighter near the light source
                const dx = n.x - lightX, dy = n.y - lightY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const shade = Math.max(0.08, Math.min(0.72, 200 / (dist + 80)));

                ctx.strokeStyle = `hsla(${hue}, 58%, ${30 + shade * 42}%, ${0.18 + shade * 0.40})`;
                ctx.lineWidth   = 1.0;
                if (r === 0) ctx.moveTo(n.x, n.y);
                else         ctx.lineTo(n.x, n.y);
                ctx.stroke();
                if (r < ROWS - 1) { ctx.beginPath(); ctx.moveTo(n.x, n.y); }
            }
        }

        // ── Render: weft threads (horizontal) ────────────────────────────────────
        for (let r = 0; r < ROWS; r++) {
            const hue = 210 + r * 1.0;
            ctx.beginPath();
            for (let c = 0; c < COLS; c++) {
                const n = this._node(r, c);
                const dx = n.x - lightX, dy = n.y - lightY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const shade = Math.max(0.08, Math.min(0.72, 200 / (dist + 80)));

                ctx.strokeStyle = `hsla(${hue}, 38%, ${28 + shade * 45}%, ${0.14 + shade * 0.32})`;
                ctx.lineWidth   = 0.75;
                if (c === 0) ctx.moveTo(n.x, n.y);
                else         ctx.lineTo(n.x, n.y);
                ctx.stroke();
                if (c < COLS - 1) { ctx.beginPath(); ctx.moveTo(n.x, n.y); }
            }
        }

        // ── Fill quads (the fabric surface, semi-transparent) ─────────────────────
        for (let r = 0; r < ROWS - 1; r++) {
            for (let c = 0; c < COLS - 1; c++) {
                const tl = this._node(r, c);
                const tr = this._node(r, c + 1);
                const bl = this._node(r + 1, c);
                const br = this._node(r + 1, c + 1);

                // Normal estimation via cross product of diagonals
                const dAx = br.x - tl.x, dAy = br.y - tl.y;
                const dBx = tr.x - bl.x, dBy = tr.y - bl.y;
                // z-component of cross product (determines "facing")
                const zN  = dAx * dBy - dAy * dBx;
                const face = Math.abs(zN) / (Math.sqrt(dAx*dAx+dAy*dAy) * Math.sqrt(dBx*dBx+dBy*dBy) + 0.001);

                // Centre of quad for light distance
                const cx = (tl.x + tr.x + bl.x + br.x) * 0.25;
                const cy = (tl.y + tr.y + bl.y + br.y) * 0.25;
                const ld = Math.sqrt((cx-lightX)**2 + (cy-lightY)**2);
                const lightFactor = Math.max(0, Math.min(1, 220 / (ld + 60)));

                const a = (0.018 + face * 0.055) * (0.5 + lightFactor * 0.8);
                if (a < 0.005) continue;

                // Warm silk colour with light-bleed tint
                const hue = 42 + face * 15;
                const lit = 55 + lightFactor * 32;
                ctx.fillStyle = `hsla(${hue}, 55%, ${lit}%, ${a})`;
                ctx.beginPath();
                ctx.moveTo(tl.x, tl.y);
                ctx.lineTo(tr.x, tr.y);
                ctx.lineTo(br.x, br.y);
                ctx.lineTo(bl.x, bl.y);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Vignette
        const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.75);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        if (this.t < 4) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(200, 185, 150, 0.18)';
            ctx.fillText('blink for a gust of wind', W / 2, H - 22);
            ctx.textAlign = 'left';
        }
    }

    _satisfy(a, b, restLen, stiffness) {
        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
        const diff = (dist - restLen) / dist * stiffness;
        const ox   = dx * diff * 0.5;
        const oy   = dy * diff * 0.5;
        if (!a.pinned) { a.x += ox; a.y += oy; }
        if (!b.pinned) { b.x -= ox; b.y -= oy; }
    }
}
