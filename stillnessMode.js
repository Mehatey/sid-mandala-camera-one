// Stillness Mode — a mandala that only forms when you stop moving.
// Your cursor is a stone in water. Move it: particles scatter like sand.
// Hold still: they find their way home, ring by ring, over time.
// The interaction is the practice. Trying too hard breaks the pattern.
// No mic. No camera. Just you and the act of not moving.
class StillnessMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._particles = [];
        this._cursorX   = null;
        this._cursorY   = null;
        this._prevX     = null;
        this._prevY     = null;
        this._cursorSpeed  = 0;    // px/frame
        this._stillFrames  = 0;   // frames without significant movement
        this._stillness    = 0;   // 0 (moving) → 1 (very still, very long)
        this._hue          = 42;
    }

    startScene() {
        this.t            = 0;
        this._cursorX     = null;
        this._cursorY     = null;
        this._prevX       = null;
        this._prevY       = null;
        this._cursorSpeed = 0;
        this._stillFrames = 0;
        this._stillness   = 0;
        this._hue         = 38 + Math.random() * 20;
        this._buildFormation();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    _buildFormation() {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const cx = W / 2, cy = H / 2;
        const sc = Math.min(W, H) / 700;

        this._particles = [];

        // Concentric rings — each ring reveals as stillness increases
        const rings = [
            { count:  1, r:   0,  ringIdx: 0 },
            { count:  8, r:  50,  ringIdx: 0 },
            { count: 14, r:  96,  ringIdx: 1 },
            { count: 20, r: 142,  ringIdx: 2 },
            { count: 28, r: 190,  ringIdx: 3 },
            { count: 36, r: 238,  ringIdx: 4 },
            { count: 44, r: 286,  ringIdx: 5 },
        ];

        for (const ring of rings) {
            const offset = Math.random() * Math.PI * 2;
            for (let i = 0; i < ring.count; i++) {
                const angle = (i / Math.max(1, ring.count)) * Math.PI * 2 + offset;
                const sr    = ring.r * sc;
                const hx    = cx + Math.cos(angle) * sr;
                const hy    = cy + Math.sin(angle) * sr;
                const jx    = hx + (Math.random() - 0.5) * 5;
                const jy    = hy + (Math.random() - 0.5) * 5;

                this._particles.push({
                    homeX: jx, homeY: jy,
                    x:     jx + (Math.random() - 0.5) * 80,
                    y:     jy + (Math.random() - 0.5) * 80,
                    vx: 0, vy: 0,
                    ringIdx:  ring.ringIdx,
                    ringFrac: ring.r === 0 ? 0 : ring.r / 286,
                    hueOff:   (Math.random() - 0.5) * 20,
                    phase:    Math.random() * Math.PI * 2,
                });
            }
        }
    }

    // Called from scenes.html mousemove listener
    onMouseMove(clientX, clientY) {
        this._cursorX = clientX;
        this._cursorY = clientY;
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;

        // Slow fade
        ctx.fillStyle = 'rgba(2, 1, 8, 0.042)';
        ctx.fillRect(0, 0, W, H);

        // Track cursor speed
        if (this._cursorX !== null) {
            if (this._prevX !== null) {
                const dx = this._cursorX - this._prevX;
                const dy = this._cursorY - this._prevY;
                this._cursorSpeed += (Math.sqrt(dx*dx + dy*dy) - this._cursorSpeed) * 0.25;
            }
            this._prevX = this._cursorX;
            this._prevY = this._cursorY;
        }

        // Stillness meter: rises slowly when cursor barely moves, falls fast when moving
        if (this._cursorSpeed < 1.2) {
            this._stillFrames++;
            this._stillness = Math.min(1, this._stillFrames / 320);
        } else {
            this._stillFrames = Math.max(0, this._stillFrames - 6);
            this._stillness   = Math.min(this._stillness, this._stillFrames / 320);
        }
        // Friction on speed so it naturally decays
        this._cursorSpeed *= 0.82;

        const s = this._stillness;

        // Ring threshold: ring i becomes active when stillness > i/6
        const RING_THRESH = [0.00, 0.12, 0.25, 0.40, 0.57, 0.74];
        const SPRING_BASE = 0.016;
        const DAMP        = 0.88;
        const REPEL_R     = 110;

        for (const p of this._particles) {
            const ringThresh = RING_THRESH[Math.min(p.ringIdx, RING_THRESH.length - 1)];
            const ringActive = Math.max(0, (s - ringThresh) / 0.12);

            // Spring toward home, strength = stillness × ring activation
            const spring = SPRING_BASE * ringActive * (0.5 + s * 0.5);
            let ax = (p.homeX - p.x) * spring;
            let ay = (p.homeY - p.y) * spring;

            // Cursor repulsion — moving cursor disturbs particles
            if (this._cursorX !== null) {
                const hdx = p.x - this._cursorX;
                const hdy = p.y - this._cursorY;
                const hd2 = hdx * hdx + hdy * hdy;
                if (hd2 < REPEL_R * REPEL_R) {
                    const hd     = Math.sqrt(hd2) + 0.5;
                    const speedF = Math.min(1, this._cursorSpeed / 8);
                    const force  = (1 - hd / REPEL_R) * (1 - hd / REPEL_R) * 5.0 * (0.2 + speedF * 0.8);
                    ax += (hdx / hd) * force;
                    ay += (hdy / hd) * force;
                }
            }

            p.vx = (p.vx + ax) * DAMP;
            p.vy = (p.vy + ay) * DAMP;
            p.x += p.vx;
            p.y += p.vy;

            // How settled?
            const distHome = Math.hypot(p.x - p.homeX, p.y - p.homeY);
            const settle   = Math.max(0, 1 - distHome / 55) * ringActive;

            // Color: unsettled = cool blue, settled = warm gold (same logic as sandMode)
            const settledHue = this._hue - p.ringFrac * 16;
            const hue = settledHue + (1 - settle) * (210 - settledHue);
            const sat = 42 + settle * 45;
            const lit = 28 + settle * 52;
            const a   = 0.18 + settle * 0.68;
            const sz  = 0.7  + settle * 1.1;

            ctx.fillStyle = `hsla(${hue + p.hueOff}, ${sat}%, ${lit}%, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Stillness meter UI — minimal, bottom centre ──────────────────────
        const meterW = 120;
        const meterH = 1.5;
        const mx     = cx - meterW / 2;
        const my     = H - 28;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(mx, my, meterW, meterH);
        ctx.fillStyle = `hsla(${this._hue}, 65%, 75%, ${0.18 + s * 0.45})`;
        ctx.fillRect(mx, my, meterW * s, meterH);

        // ── Ambient glow when fully settled ─────────────────────────────────
        if (s > 0.5) {
            const gR  = Math.min(W, H) * 0.38 * s;
            const a   = (s - 0.5) / 0.5 * 0.08;
            const aG  = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
            aG.addColorStop(0,   `rgba(255, 215, 130, ${a})`);
            aG.addColorStop(0.5, `rgba(200, 160,  80, ${a * 0.35})`);
            aG.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = aG;
            ctx.beginPath();
            ctx.arc(cx, cy, gR, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Cursor presence ring ─────────────────────────────────────────────
        if (this._cursorX !== null) {
            const cs    = Math.min(1, this._cursorSpeed / 12);
            const ringA = 0.06 + cs * 0.12;
            ctx.beginPath();
            ctx.arc(this._cursorX, this._cursorY, REPEL_R, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 200, 255, ${ringA})`;
            ctx.lineWidth   = 1.0;
            ctx.stroke();
        }

        // ── Hint text when no cursor seen yet ────────────────────────────────
        if (this._cursorX === null) {
            ctx.font = '11px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180, 175, 220, 0.22)';
            ctx.fillText('move your cursor · then hold still', cx, cy + 16);
            ctx.textAlign = 'left';
        }
    }
}
