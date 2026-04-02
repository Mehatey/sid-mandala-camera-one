// Cosmic Camera Spiral — infinite logarithmic spiral of live camera feed.
// Each blink adds more copies spiraling toward the void.
class CosmicSpiral {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.w      = canvas.width;
        this.h      = canvas.height;
        this.stars  = [];
        this.pulses = [];   // blink pulse rings
        this._seedStars();
    }

    resize() {
        this.w = this.canvas.width;
        this.h = this.canvas.height;
        this._seedStars();
    }

    onBlink() {
        // Wide ripple from center on each blink
        this.pulses.push({ r: 0, maxR: Math.min(this.w, this.h) * 0.65, alpha: 0.55 });
        this.pulses.push({ r: 0, maxR: Math.min(this.w, this.h) * 0.30, alpha: 0.35 });
    }

    // Main draw — called every frame from main.js
    // foldCount: how many "rings" of the spiral are visible (grows with each blink)
    // video: the live webcam HTMLVideoElement (may be null if camera not ready)
    draw(time, foldCount, video) {
        const ctx = this.ctx;
        const cx  = this.w / 2;
        const cy  = this.h / 2;

        // ── Deep space fade (creates trailing ghost echoes) ─────────────────────
        ctx.fillStyle = 'rgba(2, 3, 20, 0.16)';
        ctx.fillRect(0, 0, this.w, this.h);

        // ── Breathing nebula hazes ───────────────────────────────────────────────
        this._drawNebula(ctx, time);

        // ── Star field ──────────────────────────────────────────────────────────
        for (const s of this.stars) {
            const tw    = 0.5 + 0.5 * Math.sin(time * s.ts + s.tw);
            const alpha = (0.15 + tw * 0.65) * s.lum;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * (0.55 + tw * 0.45), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(210, 225, 255, ${alpha})`;
            ctx.fill();
        }

        // ── Blink pulse rings ────────────────────────────────────────────────────
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.r    += (p.maxR - p.r) * 0.042;
            p.alpha -= 0.007;
            if (p.alpha <= 0) { this.pulses.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100, 150, 255, ${p.alpha * 0.45})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
        }

        // ── Spiral requires camera feed ──────────────────────────────────────────
        const hasVideo = video && video.readyState >= 2 && video.videoWidth > 0;
        if (!hasVideo || foldCount === 0) return;

        const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ≈137.5° — sunflower spiral
        const N           = Math.min(36, 3 + foldCount * 3);
        const maxR        = Math.min(this.w, this.h) * 0.43;
        const baseSize    = maxR * 0.21;  // radius of outermost/largest copy
        const vw          = video.videoWidth;
        const vh          = video.videoHeight;

        // Draw from outermost (largest) → innermost (smallest) so small ones sit on top
        for (let i = N - 1; i >= 0; i--) {
            const t    = N > 1 ? i / (N - 1) : 0;          // 0 = outermost
            const ang  = i * goldenAngle + time * 0.007;    // slow rotation
            const r    = maxR * Math.pow(0.87, i);          // spiral radius (shrinks inward)
            const size = baseSize * Math.pow(0.87, i);      // circle radius
            if (size < 2) continue;

            const px = cx + Math.cos(ang) * r;
            const py = cy + Math.sin(ang) * r;

            // Per-copy hue shifts through cosmic palette over time
            const hue   = (i * 24 + time * 16) % 360;
            const alpha = 0.88 * (1 - t * 0.55);  // outermost more opaque

            // ── Glow halo ────────────────────────────────────────────────────────
            const haloR = size * 2.0;
            const halo  = ctx.createRadialGradient(px, py, size * 0.6, px, py, haloR);
            halo.addColorStop(0, `hsla(${hue}, 78%, 62%, 0.14)`);
            halo.addColorStop(1, `hsla(${hue}, 78%, 62%, 0)`);
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(px, py, haloR, 0, Math.PI * 2);
            ctx.fill();

            // ── Camera circle ─────────────────────────────────────────────────────
            ctx.save();
            ctx.globalAlpha = alpha;

            // Clip to circle
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.clip();

            // Position at circle center, rotate slightly to follow spiral arm
            ctx.translate(px, py);
            ctx.rotate(ang * 0.18);

            // Scale video to fill circle (mirrored — natural selfie orientation)
            const scale = (size * 2.4) / Math.min(vw, vh);
            ctx.scale(-1, 1);
            ctx.drawImage(video, -vw * scale / 2, -vh * scale / 2, vw * scale, vh * scale);

            // Cosmic colour overlay — additive screen blend
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `hsla(${hue}, 72%, 36%, 0.44)`;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();

            // Soft vignette (darkens edges smoothly to black — erases hard circle border)
            ctx.globalCompositeOperation = 'source-over';
            const vg = ctx.createRadialGradient(0, 0, size * 0.38, 0, 0, size);
            vg.addColorStop(0,    'rgba(0,0,0,0)');
            vg.addColorStop(0.60, 'rgba(0,0,0,0.08)');
            vg.addColorStop(0.85, 'rgba(0,0,0,0.55)');
            vg.addColorStop(1,    'rgba(0,0,0,0.97)');
            ctx.fillStyle = vg;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // ── Central convergence glow — the "eye of god" ──────────────────────────
        const cHue = (time * 22) % 360;
        const cg   = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.14);
        cg.addColorStop(0,   `hsla(${cHue}, 65%, 85%, 0.18)`);
        cg.addColorStop(0.5, `hsla(${cHue}, 65%, 65%, 0.06)`);
        cg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * 0.14, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Nebula clouds — slow-breathing cosmic hazes ──────────────────────────────
    _drawNebula(ctx, time) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.055);

        // Purple cloud — upper-left
        const n1 = ctx.createRadialGradient(
            this.w * 0.22, this.h * 0.28, 0,
            this.w * 0.22, this.h * 0.28, this.w * 0.38
        );
        n1.addColorStop(0, `rgba(70, 25, 130, ${0.05 * pulse})`);
        n1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = n1;
        ctx.fillRect(0, 0, this.w, this.h);

        // Teal cloud — lower-right
        const n2 = ctx.createRadialGradient(
            this.w * 0.78, this.h * 0.72, 0,
            this.w * 0.78, this.h * 0.72, this.w * 0.32
        );
        n2.addColorStop(0, `rgba(15, 70, 110, ${0.06 * (1 - pulse * 0.4)})`);
        n2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = n2;
        ctx.fillRect(0, 0, this.w, this.h);

        // Rose cloud — upper-right (slow counter-oscillation)
        const pulse2 = 0.5 + 0.5 * Math.sin(time * 0.038 + 2.1);
        const n3 = ctx.createRadialGradient(
            this.w * 0.80, this.h * 0.22, 0,
            this.w * 0.80, this.h * 0.22, this.w * 0.28
        );
        n3.addColorStop(0, `rgba(110, 20, 80, ${0.04 * pulse2})`);
        n3.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = n3;
        ctx.fillRect(0, 0, this.w, this.h);
    }

    // ── Background star field ────────────────────────────────────────────────────
    _seedStars() {
        this.stars = [];
        for (let i = 0; i < 160; i++) {
            this.stars.push({
                x:   Math.random() * this.w,
                y:   Math.random() * this.h,
                r:   0.2 + Math.random() * 1.1,
                lum: 0.3 + Math.random() * 0.7,
                tw:  Math.random() * Math.PI * 2,
                ts:  0.25 + Math.random() * 0.6,
            });
        }
    }
}
