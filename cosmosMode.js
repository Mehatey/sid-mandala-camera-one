// Cosmos Mode — begin with darkness, build the cosmos one blink at a time.
// Each blink places permanent stars near the gaze position.
class CosmosMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.stars    = [];     // permanent stars placed by blinks
        this.sparkles = [];     // brief birth-burst particles
        this.blinkCount = 0;
        this.gazeX    = null;
        this.gazeY    = null;
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
        this.blinkCount++;
        const gx = this.gazeX ?? this.w / 2;
        const gy = this.gazeY ?? this.h / 2;

        // 1–4 permanent stars scattered near the gaze point
        const count = 1 + Math.floor(Math.random() * 4);
        const palettes = [
            { hue: 0,   sat: 0   }, // pure white
            { hue: 220, sat: 35  }, // blue-white
            { hue: 45,  sat: 60  }, // warm gold
            { hue: 195, sat: 28  }, // cool ice blue
            { hue: 280, sat: 30  }, // soft lavender
        ];
        for (let i = 0; i < count; i++) {
            const scatter = 30 + Math.random() * 70;
            const ang     = Math.random() * Math.PI * 2;
            const col     = palettes[Math.floor(Math.random() * palettes.length)];
            this.stars.push({
                x:   (gx + Math.cos(ang) * scatter) / this.w,
                y:   (gy + Math.sin(ang) * scatter) / this.h,
                size: 0.6 + Math.random() * 2.4,
                lum:  0.72 + Math.random() * 0.28,
                hue:  col.hue,
                sat:  col.sat,
                tw:   Math.random() * Math.PI * 2,
                ts:   0.22 + Math.random() * 0.75
            });
        }

        // Sparkle burst at gaze origin
        const burstCount = 28;
        for (let i = 0; i < burstCount; i++) {
            const ang = (Math.PI * 2 / burstCount) * i + Math.random() * 0.35;
            const spd = 0.4 + Math.random() * 2.8;
            this.sparkles.push({
                x: gx, y: gy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 1,
                size: 0.4 + Math.random() * 1.6,
                hue: Math.random() < 0.5 ? 210 : 50
            });
        }
    }

    draw(time) {
        const ctx = this.ctx;

        // Gentle fade: low enough to keep stars bright, fast enough to allow twinkle
        ctx.fillStyle = 'rgba(1, 1, 12, 0.04)';
        ctx.fillRect(0, 0, this.w, this.h);

        // Draw permanent stars
        for (const s of this.stars) {
            const tw    = 0.5 + 0.5 * Math.sin(time * s.ts + s.tw);
            const alpha = (0.45 + tw * 0.55) * s.lum;
            const size  = s.size * (0.65 + tw * 0.45);
            const x = s.x * this.w;
            const y = s.y * this.h;

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = s.sat > 0
                ? `hsla(${s.hue}, ${s.sat}%, 92%, ${alpha})`
                : `rgba(245, 248, 255, ${alpha})`;
            ctx.fill();

            // Cross sparkle on very bright twinkle
            if (s.lum > 0.85 && tw > 0.82) {
                const sl = size * 4;
                const sa = (tw - 0.82) * alpha * 0.9;
                ctx.strokeStyle = s.sat > 0
                    ? `hsla(${s.hue}, ${s.sat}%, 92%, ${sa})`
                    : `rgba(245, 248, 255, ${sa})`;
                ctx.lineWidth = 0.4;
                ctx.beginPath();
                ctx.moveTo(x - sl, y); ctx.lineTo(x + sl, y);
                ctx.moveTo(x, y - sl); ctx.lineTo(x, y + sl);
                ctx.stroke();
            }
        }

    }

    // Draw sparkle particles on the overlay canvas (cleared each frame — no residue)
    drawOverlay(oCtx) {
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            const p = this.sparkles[i];
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.965; p.vy *= 0.965;
            p.life -= 0.022;
            if (p.life <= 0) { this.sparkles.splice(i, 1); continue; }
            oCtx.beginPath();
            oCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            oCtx.fillStyle = `hsla(${p.hue}, 55%, 88%, ${p.life * 0.65})`;
            oCtx.fill();
        }
    }
}
