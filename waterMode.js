// Water Ripple Mode — deep water surface with slow concentric ring ripples.
// Rings are clear, slow (0.8–1.4 px/frame) and last 6–9 seconds.
// Three animated wave layers create a convincing water surface.
class WaterMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.ripples = [];
        this.time    = 0;
        this.gazeX   = null;
        this.gazeY   = null;
        this.resize();
    }

    resize() {
        this.w = this.canvas.width;
        this.h = this.canvas.height;
    }

    setGaze(normX, normY) {
        this.gazeX = (1 - normX) * this.w;
        this.gazeY = normY * this.h;
    }

    onBlink() {
        const cx = this.gazeX ?? this.w / 2;
        const cy = this.gazeY ?? this.h / 2;
        this.ripples.push({
            x: cx, y: cy,
            r: 1,
            maxR: 440 + Math.random() * 180,
            speed: 0.82 + Math.random() * 0.55,  // slow — lasts 6–9 s at 60 fps
            opacity: 1.0
        });
    }

    draw(time) {
        this.time = time;
        const ctx = this.ctx;

        this._drawWaterSurface(time);

        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const rip = this.ripples[i];
            rip.r += rip.speed;
            rip.opacity = Math.max(0, 1 - rip.r / rip.maxR);
            if (rip.r > rip.maxR) { this.ripples.splice(i, 1); continue; }
            this._drawRipple(rip, time);
        }
    }

    // ── Water surface shader ─────────────────────────────────────────────────
    _drawWaterSurface(t) {
        const ctx = this.ctx;

        // Base deep-water fade — slower for more persistence
        ctx.fillStyle = 'rgba(3, 11, 36, 0.14)';
        ctx.fillRect(0, 0, this.w, this.h);

        // Radial depth gradient (lighter in center, darker at edges — surface light)
        const dg = ctx.createRadialGradient(this.w / 2, this.h * 0.4, 0, this.w / 2, this.h / 2, this.w * 0.65);
        dg.addColorStop(0, 'rgba(12, 45, 110, 0.14)');
        dg.addColorStop(1, 'rgba(0,   0,   0, 0)');
        ctx.fillStyle = dg;
        ctx.fillRect(0, 0, this.w, this.h);

        // Wave layer 1 — slow, long swells
        this._waveLayer(t, 55, 0.014, 0.28, 7,  'rgba(22, 72, 155, 0.038)', 1.2);
        // Wave layer 2 — medium chop
        this._waveLayer(t, 28, 0.026, 0.5,  4,  'rgba(38, 105, 185, 0.030)', 0.9);
        // Wave layer 3 — fast surface ripple
        this._waveLayer(t, 14, 0.052, 0.95, 2.5,'rgba(75, 155, 215, 0.022)', 0.6);

        // Caustic sparkle points
        for (let i = 0; i < 20; i++) {
            const sx = (Math.sin(i * 2.17 + t * 0.14) * 0.5 + 0.5) * this.w;
            const sy = (Math.sin(i * 1.63 + t * 0.09) * 0.5 + 0.5) * this.h;
            const a  = (0.5 + 0.5 * Math.sin(t * 2.3 + i * 1.08)) * 0.075;
            const r  = 0.8 + 0.5 * Math.abs(Math.sin(t * 1.7 + i * 0.75));
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(155, 210, 255, ${a})`;
            ctx.fill();
        }
    }

    _waveLayer(t, yStep, xFreq, tFreq, ampPx, color, lw) {
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth   = lw;
        for (let y = 0; y < this.h + yStep; y += yStep) {
            const baseY = y + Math.sin(y * 0.045 + t * tFreq * 0.45) * ampPx;
            ctx.beginPath();
            ctx.moveTo(0, baseY);
            for (let x = 0; x <= this.w; x += 6) {
                const wy = baseY
                    + Math.sin(x * xFreq       + t * tFreq)         * ampPx
                    + Math.sin(x * xFreq * 1.8 - t * tFreq * 0.55) * ampPx * 0.38;
                ctx.lineTo(x, wy);
            }
            ctx.stroke();
        }
    }

    // ── Ripple rings ─────────────────────────────────────────────────────────
    _drawRipple(rip, t) {
        const ctx     = this.ctx;
        const rings   = 10;
        const spacing = 24;   // px between rings — well-defined concentric circles

        for (let j = 0; j < rings; j++) {
            const ringR = rip.r - j * spacing;
            if (ringR <= 1) continue;
            const fade = (1 - j / rings) * rip.opacity;
            if (fade < 0.006) continue;

            const lum = 115 + Math.round((1 - j / rings) * 135);
            const a   = fade * (0.32 + (1 - j / rings) * 0.38);

            ctx.beginPath();
            ctx.arc(rip.x, rip.y, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${lum}, ${lum + 28}, 255, ${a})`;
            ctx.lineWidth   = 0.7 + (1 - j / rings) * 1.1;
            ctx.stroke();

            // Soft radial glow on the 3 leading rings
            if (j < 3) {
                const inner = Math.max(ringR - 10, 1);
                const g = ctx.createRadialGradient(rip.x, rip.y, inner, rip.x, rip.y, ringR + 12);
                g.addColorStop(0,   'rgba(80,160,255,0)');
                g.addColorStop(0.5, `rgba(120,200,255,${fade * 0.055})`);
                g.addColorStop(1,   'rgba(200,235,255,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(rip.x, rip.y, ringR + 12, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Impact flash — brief bright center when ripple is born
        if (rip.r < 28 && rip.opacity > 0.85) {
            const flashA = (1 - rip.r / 28) * 0.55;
            const g = ctx.createRadialGradient(rip.x, rip.y, 0, rip.x, rip.y, 28);
            g.addColorStop(0, `rgba(210, 240, 255, ${flashA})`);
            g.addColorStop(1, 'rgba(100, 180, 255, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, 28, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
