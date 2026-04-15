// Cosmic Spiral — one continuous ribbon wound from the video feed into an Archimedean spiral.
// The face sits at the centre. The image slowly liquefies outward as time passes.
// Each blink adds more turns (the spiral grows). No circles — one unbroken form.
class CosmicSpiral {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.w      = canvas.width;
        this.h      = canvas.height;
        this.stars  = [];
        this.pulses = [];
        this._seedStars();

        // Tiny offscreen canvas for reading video pixels efficiently
        this._vOff  = document.createElement('canvas');
        this._vOff.width  = 160;
        this._vOff.height = 160;
        this._vCtx  = this._vOff.getContext('2d', { willReadFrequently: true });
    }

    resize() {
        this.w = this.canvas.width;
        this.h = this.canvas.height;
        this._seedStars();
    }

    onBlink() {
        // A bright wash travels inward along the spiral on each blink
        this.pulses.push({ phase: 0, speed: 1.2 });
    }

    // ─── Main draw ───────────────────────────��────────────────────────────────────
    draw(time, foldCount, video) {
        const ctx = this.ctx;
        const W   = this.w, H = this.h;
        const cx  = W / 2, cy = H / 2;

        // Deep-space fade — ghost trails
        ctx.fillStyle = 'rgba(2, 3, 20, 0.13)';
        ctx.fillRect(0, 0, W, H);

        this._drawNebula(ctx, time);
        this._drawStars(ctx, time);

        // ── Blink wash pulses ─────────────────��──────────────────────────────────
        this.pulses = this.pulses.filter(p => p.phase < 1);
        for (const p of this.pulses) {
            p.phase += 0.016 * p.speed;
            // Ring that expands from centre
            const ring_r = Math.min(W, H) * 0.45 * p.phase;
            const a      = (1 - p.phase) * 0.22;
            ctx.beginPath();
            ctx.arc(cx, cy, ring_r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(160, 200, 255, ${a})`;
            ctx.lineWidth   = 1.0;
            ctx.stroke();
        }

        // ── Spiral video ribbon ──────────────────────────────────────────────────
        const hasVideo = video && video.readyState >= 2 && video.videoWidth > 0;

        const N_TURNS  = 2.5 + Math.min(foldCount, 9) * 0.50; // blinks add turns
        const maxR     = Math.min(W, H) * 0.48;
        const N_POINTS = 1600;

        // Liquefaction grows from 0 → 0.44 over ~30s
        const liquify  = Math.min(0.44, time * 0.0145);

        // ── Capture video pixels ─────────────────────────────────────────────────
        const VW = this._vOff.width, VH = this._vOff.height;
        let pxData = null;
        if (hasVideo) {
            this._vCtx.save();
            this._vCtx.translate(VW, 0);
            this._vCtx.scale(-1, 1);                          // mirror (selfie)
            this._vCtx.drawImage(video, 0, 0, VW, VH);
            this._vCtx.restore();
            pxData = this._vCtx.getImageData(0, 0, VW, VH).data;
        }

        // ── Draw ribbon as connected line segments ───────────────────────────────
        ctx.save();
        ctx.lineCap = 'round';

        let prevX = cx, prevY = cy;
        let prevColor = null;

        for (let i = 0; i < N_POINTS; i++) {
            const s   = i / (N_POINTS - 1);              // 0 = centre, 1 = outer edge
            const θ   = s * N_TURNS * Math.PI * 2 + time * 0.022;
            const r   = s * maxR;
            const px  = cx + r * Math.cos(θ);
            const py  = cy + r * Math.sin(θ);

            // Segment thickness: thin at centre, grows outward, extra thick when liquefying
            const lineW = 1.8 + s * 9.5 + liquify * 12.0;

            // ── UV mapping: face (video centre) → spiral centre ──────────────────
            // The spiral's polar coordinates map back into the video frame
            const drift = time * 0.016;
            let u = 0.5 + (r / maxR) * 0.50 * Math.cos(θ - drift);
            let v = 0.5 + (r / maxR) * 0.50 * Math.sin(θ - drift);

            // Liquefaction distortion (increases over time)
            u += liquify * Math.sin(v * 8.2 + θ * 1.5 + time * 0.75);
            v += liquify * Math.cos(u * 6.8 + θ * 1.8 + time * 0.58);

            // Secondary chaos at high liquefaction
            if (liquify > 0.20) {
                const extra = (liquify - 0.20) * 2.2;
                u += extra * 0.14 * Math.sin(s * 14 + time * 1.5);
                v += extra * 0.12 * Math.cos(s * 11 + time * 1.3);
            }

            u = Math.max(0, Math.min(0.999, u));
            v = Math.max(0, Math.min(0.999, v));

            // ── Sample pixel ────────────────────────────��────────────────────────
            let color, alpha;
            if (pxData) {
                const vx  = Math.floor(u * VW);
                const vy  = Math.floor(v * VH);
                const idx = (vy * VW + vx) * 4;
                const pr  = pxData[idx];
                const pg  = pxData[idx + 1];
                const pb  = pxData[idx + 2];
                // Alpha: vivid near centre, fades as video liquefies away
                alpha     = (0.78 + s * 0.20) * (1 - liquify * 0.50);
                color     = `rgb(${pr},${pg},${pb})`;
            } else {
                // No video — render as shifting colour spectrum
                const hue = (θ * 28 + time * 18) % 360;
                alpha     = 0.35 + s * 0.45;
                color     = `hsl(${hue}, 75%, 58%)`;
            }

            // ── Draw segment from previous point ─────────────────────────────────
            if (i > 0) {
                ctx.strokeStyle = color;
                ctx.lineWidth   = lineW;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(px, py);
                ctx.stroke();
            }

            prevX = px;
            prevY = py;
        }

        ctx.globalAlpha = 1;
        ctx.restore();

        // ── Convergence glow at centre ────────────────────────────────────────────
        const cHue = (time * 16) % 360;
        const pullR = maxR * 0.12 + liquify * maxR * 0.06;
        const cg    = ctx.createRadialGradient(cx, cy, 0, cx, cy, pullR);
        cg.addColorStop(0,    `hsla(${cHue}, 65%, 90%, ${0.20 + liquify * 0.12})`);
        cg.addColorStop(0.45, `hsla(${cHue}, 65%, 70%, 0.06)`);
        cg.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, pullR, 0, Math.PI * 2);
        ctx.fill();
    }

    // ─── Nebula clouds ──────────────────────────────────────────────────���─────────
    _drawNebula(ctx, time) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.055);

        const n1 = ctx.createRadialGradient(
            this.w * 0.22, this.h * 0.28, 0,
            this.w * 0.22, this.h * 0.28, this.w * 0.38
        );
        n1.addColorStop(0,   `rgba(55, 30, 100, ${0.10 + pulse * 0.05})`);
        n1.addColorStop(0.5, `rgba(30, 15,  65, ${0.05 + pulse * 0.02})`);
        n1.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = n1;
        ctx.fillRect(0, 0, this.w, this.h);

        const n2 = ctx.createRadialGradient(
            this.w * 0.74, this.h * 0.68, 0,
            this.w * 0.74, this.h * 0.68, this.w * 0.35
        );
        n2.addColorStop(0,   `rgba(18, 45, 90, ${0.08 + pulse * 0.04})`);
        n2.addColorStop(0.5, `rgba(10, 24, 55, ${0.04 + pulse * 0.02})`);
        n2.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = n2;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    // ─── Stars ────────────────────────────────────────────────────────────────────
    _drawStars(ctx, time) {
        for (const s of this.stars) {
            const tw    = 0.5 + 0.5 * Math.sin(time * s.ts + s.tw);
            const alpha = (0.12 + tw * 0.55) * s.lum;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * (0.5 + tw * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(210, 225, 255, ${alpha})`;
            ctx.fill();
        }
    }

    _seedStars() {
        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x:   Math.random() * this.w,
                y:   Math.random() * this.h,
                r:   0.3 + Math.random() * 1.1,
                lum: 0.2 + Math.random() * 0.8,
                ts:  0.3 + Math.random() * 1.5,
                tw:  Math.random() * Math.PI * 2,
            });
        }
    }
}
