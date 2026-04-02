// Aurora Mode — deep space with flowing aurora curtains.
// Stars recede in 3D perspective; blink summons a new aurora wave.
class AuroraMode {
    constructor(ctx, canvas) {
        this.ctx       = ctx;
        this.canvas    = canvas;
        this.bands     = [];
        this.particles = [];
        this.bgStars   = [];
        this.blinkCount = 0;
        this.gazeX     = null;
        this.gazeY     = null;
        this.resize();
        this._seedBgStars();
        this._addBand(0.25, 0.12, false);
        this._addBand(0.42, 0.09, false);
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
        this.blinkCount++;
        const yPos = 0.15 + Math.random() * 0.5;
        this._addBand(yPos, 0.07 + Math.random() * 0.12, true);

        // Particle shimmer at gaze
        const cx = this.gazeX ?? this.w / 2;
        const cy = this.gazeY ?? this.h * 0.35;
        for (let i = 0; i < 22; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 0.3 + Math.random() * 1.2;
            this.particles.push({
                x: cx + (Math.random() - 0.5) * 80,
                y: cy + (Math.random() - 0.5) * 40,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 0.5,
                life: 1,
                size: 0.8 + Math.random() * 1.8,
                hue: 130 + Math.random() * 160
            });
        }
    }

    _seedBgStars() {
        this.bgStars = [];
        for (let i = 0; i < 200; i++) {
            this.bgStars.push({
                // Store in 3D: x/y in [-1,1], z depth 1-600
                wx: (Math.random() - 0.5) * 2,
                wy: (Math.random() - 0.5) * 2,
                z:  50 + Math.random() * 550,
                size: 0.3 + Math.random() * 1.0,
                lum:  0.3 + Math.random() * 0.7,
                tw:   Math.random() * Math.PI * 2,
                ts:   0.2 + Math.random() * 0.5,
                dz:   0.12 + Math.random() * 0.22  // drift speed (gentle parallax)
            });
        }
    }

    _addBand(yNorm, widthNorm, bright) {
        const palettes = [
            [138, 185],   // forest green → teal
            [175, 215],   // cyan → aqua
            [248, 285],   // indigo → violet
            [160, 195],   // teal → cyan
            [275, 305],   // purple → blue
            [120, 160],   // green → jade
        ];
        const pal  = palettes[Math.floor(Math.random() * palettes.length)];
        const maxOp = bright ? (0.55 + Math.random() * 0.3) : (0.12 + Math.random() * 0.18);
        this.bands.push({
            y:        yNorm,
            width:    widthNorm,
            hue1:     pal[0],
            hue2:     pal[1],
            phase:    Math.random() * Math.PI * 2,
            phaseSpd: 0.006 + Math.random() * 0.01,
            ampY:     0.03 + Math.random() * 0.05,
            centerX:  0.2 + Math.random() * 0.6,
            opacity:  0,
            maxOp,
            fadeIn:   true,
            decay:    0.00035 + Math.random() * 0.0003
        });
    }

    draw(time) {
        const ctx = this.ctx;

        // Deep space fade
        ctx.fillStyle = 'rgba(1, 2, 16, 0.16)';
        ctx.fillRect(0, 0, this.w, this.h);

        // Bottom horizon glow
        const hg = ctx.createLinearGradient(0, this.h * 0.7, 0, this.h);
        hg.addColorStop(0, 'rgba(0,0,0,0)');
        hg.addColorStop(1, 'rgba(3, 10, 40, 0.2)');
        ctx.fillStyle = hg;
        ctx.fillRect(0, 0, this.w, this.h);

        // 3-D star field with gentle parallax drift
        const FOV = 380;
        const cx  = this.w / 2;
        const cy  = this.h / 2;
        for (const s of this.bgStars) {
            // Drift z
            s.z -= s.dz;
            if (s.z < 1) s.z = 600;

            const scale = FOV / s.z;
            const sx = s.wx * FOV * scale + cx;
            const sy = s.wy * FOV * scale + cy;
            if (sx < 0 || sx > this.w || sy < 0 || sy > this.h) continue;

            const tw    = 0.5 + 0.5 * Math.sin(time * s.ts + s.tw);
            const alpha = (0.25 + tw * 0.65) * s.lum * Math.min(1, s.z / 80);
            const r     = s.size * scale * (0.7 + tw * 0.35);

            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.2, r), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 232, 255, ${alpha})`;
            ctx.fill();
        }

        // Aurora bands
        for (let i = this.bands.length - 1; i >= 0; i--) {
            const b = this.bands[i];
            b.phase += b.phaseSpd;

            if (b.fadeIn) {
                b.opacity = Math.min(b.maxOp, b.opacity + 0.006);
                if (b.opacity >= b.maxOp) b.fadeIn = false;
            } else {
                b.opacity = Math.max(0, b.opacity - b.decay);
                if (b.opacity <= 0) { this.bands.splice(i, 1); continue; }
            }

            this._drawBand(b);
        }

        // Keep at least 1 band alive
        if (this.bands.length < 1) this._addBand(0.2 + Math.random() * 0.4, 0.08, false);

        // Shimmer particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vy -= 0.006;
            p.vx *= 0.985;
            p.life -= 0.009;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 70%, 78%, ${p.life * 0.55})`;
            ctx.fill();
        }
    }

    _drawBand(b) {
        const ctx = this.ctx;
        const W = this.w, H = this.h;
        const N = 90; // path resolution

        // Build wave points for center, halfH at each x
        const pts = [];
        for (let i = 0; i <= N; i++) {
            const xf = i / N;
            const cy = b.y * H
                + Math.sin(xf * Math.PI * 3.2 + b.phase)        * b.ampY * H
                + Math.sin(xf * Math.PI * 6.5 - b.phase * 0.68) * b.ampY * H * 0.38
                + Math.sin(xf * Math.PI * 1.4 + b.phase * 0.28) * b.ampY * H * 0.20;
            // Height modulation — aurora ray columns via subtle height variation
            const rayMul = 0.42 + 0.58 * Math.abs(Math.sin(xf * Math.PI * 4.8 + b.phase * 1.5));
            // Horizontal envelope — soft fade at band edges
            const env    = Math.max(0, 1 - Math.pow((xf - b.centerX) * 2.05, 2));
            pts.push({ x: xf * W, cy, halfH: b.width * H * rayMul * env });
        }

        // Bounding box for gradient
        let minY = Infinity, maxY = -Infinity;
        for (const p of pts) {
            if (p.cy - p.halfH < minY) minY = p.cy - p.halfH;
            if (p.cy + p.halfH > maxY) maxY = p.cy + p.halfH;
        }

        const h1 = b.hue1, h2 = b.hue2, hm = (h1 + h2) / 2;
        const grad = ctx.createLinearGradient(0, minY, 0, maxY);
        grad.addColorStop(0.00, `hsla(${h1}, 80%, 62%, 0)`);
        grad.addColorStop(0.15, `hsla(${h1}, 85%, 70%, ${b.opacity * 0.5})`);
        grad.addColorStop(0.50, `hsla(${hm}, 90%, 80%, ${b.opacity})`);
        grad.addColorStop(0.85, `hsla(${h2}, 85%, 70%, ${b.opacity * 0.5})`);
        grad.addColorStop(1.00, `hsla(${h2}, 80%, 62%, 0)`);

        // ── Smooth ribbon shape — top edge L→R, bottom edge R→L ──────────────
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        ctx.beginPath();

        // Top edge (smoothed with midpoint quadratic beziers)
        ctx.moveTo(pts[0].x, pts[0].cy - pts[0].halfH);
        for (let i = 1; i < pts.length; i++) {
            const p = pts[i - 1], q = pts[i];
            const mx  = (p.x  + q.x)  / 2;
            const myt = (p.cy - p.halfH + q.cy - q.halfH) / 2;
            ctx.quadraticCurveTo(p.x, p.cy - p.halfH, mx, myt);
        }
        ctx.lineTo(pts[N].x, pts[N].cy - pts[N].halfH);

        // Bottom edge R→L
        ctx.lineTo(pts[N].x, pts[N].cy + pts[N].halfH);
        for (let i = N - 1; i >= 0; i--) {
            const p = pts[i + 1], q = pts[i];
            const mx  = (p.x  + q.x)  / 2;
            const myb = (p.cy + p.halfH + q.cy + q.halfH) / 2;
            ctx.quadraticCurveTo(p.x, p.cy + p.halfH, mx, myb);
        }
        ctx.closePath();
        ctx.fill();

        // ── Subtle vertical rays — thin bright streaks within band ───────────
        const rayCount = 18;
        for (let i = 0; i < rayCount; i++) {
            // Deterministic x position that drifts slowly with phase
            const xf  = ((i / rayCount) + Math.sin(i * 3.7 + b.phase * 0.18) * 0.04 + 1) % 1;
            const idx = Math.min(N, Math.floor(xf * N));
            const { x, cy, halfH } = pts[idx];
            if (halfH < 8) continue;

            const rayLen   = halfH * (0.4 + 0.8 * Math.abs(Math.sin(i * 2.1 + b.phase)));
            const rayAlpha = b.opacity * (0.18 + 0.22 * Math.abs(Math.sin(i * 1.9 + b.phase * 0.7)));
            const rHue     = h1 + (h2 - h1) * xf;

            const rg = ctx.createLinearGradient(x, cy - halfH - rayLen, x, cy - halfH);
            rg.addColorStop(0, `hsla(${rHue}, 88%, 82%, 0)`);
            rg.addColorStop(1, `hsla(${rHue}, 88%, 82%, ${rayAlpha})`);
            ctx.strokeStyle = rg;
            ctx.lineWidth = 0.6 + Math.abs(Math.sin(i * 5.3)) * 0.8;
            ctx.beginPath();
            ctx.moveTo(x, cy - halfH);
            ctx.lineTo(x, cy - halfH - rayLen);
            ctx.stroke();
        }

        ctx.restore();
    }
}
