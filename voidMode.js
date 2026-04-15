// Void Mode — radical stillness. A single pulsing point of light in absolute darkness.
// Blinks spawn gossamer rings and briefly flare the core. The mind fills the silence.
class VoidMode {
    constructor(ctx, canvas) {
        this.ctx         = ctx;
        this.canvas      = canvas;
        this.t           = 0;
        this.rings       = [];
        this.corePhase   = 0;
        this.nextAuto    = 0;
        this._blinkFlash = 0;
        this._hueBase    = 215;  // slowly drifts
    }

    startScene() {
        this.t           = 0;
        this.rings       = [];
        this.corePhase   = 0;
        this._blinkFlash = 0;
        this._hueBase    = 215 + Math.random() * 30;
        this.nextAuto    = 8 + Math.random() * 6;
        // Faint background stars — hint at infinite space beyond the void
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._stars = [];
        for (let i = 0; i < 60; i++) {
            this._stars.push({
                x:          Math.random() * W,
                y:          Math.random() * H,
                r:          0.3 + Math.random() * 0.9,
                a:          0.025 + Math.random() * 0.095,
                twinkle:    Math.random() * Math.PI * 2,
                twinkleSpd: 0.28 + Math.random() * 1.4,
                warm:       Math.random() < 0.2,
            });
        }
    }

    onBlink() {
        this._spawnRing(1.5);
        this._blinkFlash = 1.0;
        // Each blink also spawns a second ring with a hue offset — double-ring effect
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.rings.push({
            r:     4,
            speed: 0.14 + Math.random() * 0.08,
            maxR:  Math.max(W, H) * 0.75,
            alpha: 0.22,
            width: 0.5,
            hue:   (this._hueBase + 40) % 360,
        });
    }

    _spawnRing(mult) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        // Rings cycle through nearby hues for subtle colour variety
        const hue = (this._hueBase + (Math.random() - 0.5) * 50 + 360) % 360;
        this.rings.push({
            r:     1.5,
            speed: 0.22 + Math.random() * 0.14,
            maxR:  Math.max(W, H) * 0.78,
            alpha: 0.38 * (mult || 1),
            width: 0.4 + Math.random() * 0.5,
            hue,
        });
    }

    draw(t) {
        this.t         += 0.016;
        this.corePhase += 0.016 * 0.58;
        this._blinkFlash = Math.max(0, this._blinkFlash - 0.016 * 2.2);
        // Slow hue drift: cool blue → violet → teal → back
        this._hueBase   = 200 + 30 * Math.sin(this.t * 0.012);

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;

        // Hard black — void needs crisp edges
        ctx.fillStyle = 'rgb(0, 0, 2)';
        ctx.fillRect(0, 0, W, H);

        // Background stars — barely visible, just enough to feel the space
        if (this._stars) {
            for (const s of this._stars) {
                s.twinkle += s.twinkleSpd * 0.016;
                const tw = s.a * (0.55 + 0.45 * Math.sin(s.twinkle));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = s.warm
                    ? `rgba(255, 228, 185, ${tw})`
                    : `rgba(210, 225, 255, ${tw})`;
                ctx.fill();
            }
        }

        // Auto-spawn ambient rings
        if (this.t >= this.nextAuto) {
            this._spawnRing(1.0);
            // Occasionally spawn a warm accent ring for contrast
            if (Math.random() < 0.3) {
                this.rings.push({
                    r: 1.5,
                    speed: 0.18 + Math.random() * 0.10,
                    maxR: Math.max(W, H) * 0.68,
                    alpha: 0.20,
                    width: 0.35,
                    hue: 42 + Math.random() * 20,  // warm gold
                });
            }
            this.nextAuto = this.t + 6 + Math.random() * 7;
        }

        // Draw + advance rings
        this.rings = this.rings.filter(ring => ring.r < ring.maxR);
        for (const ring of this.rings) {
            ring.r += ring.speed;
            const progress = ring.r / ring.maxR;
            const fade = progress < 0.08
                ? progress / 0.08
                : progress > 0.60
                    ? 1 - (progress - 0.60) / 0.40
                    : 1;
            const a = ring.alpha * fade;
            const S = ring.hue > 100 && ring.hue < 280 ? 55 : 68;  // less saturated for blue, more for warm
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${ring.hue}, ${S}%, 80%, ${a})`;
            ctx.lineWidth   = ring.width;
            ctx.stroke();
        }

        // Central core — slow breath
        const pulse  = 0.5 + 0.5 * Math.sin(this.corePhase);
        const flash  = this._blinkFlash;
        const coreR  = 1.8 + pulse * 3.0 + flash * 7;
        const cHue   = this._hueBase;

        // Wide soft halo
        const haloR  = coreR * 14 + flash * 35;
        const haloG  = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
        haloG.addColorStop(0,    `hsla(${cHue}, 65%, 90%, ${0.11 + pulse * 0.06 + flash * 0.20})`);
        haloG.addColorStop(0.30, `hsla(${cHue}, 55%, 70%, ${0.03 + pulse * 0.02})`);
        haloG.addColorStop(1,    'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloG;
        ctx.beginPath();
        ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Core point
        const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreG.addColorStop(0,   `rgba(255, 255, 255, ${0.90 + pulse * 0.10 + flash * 0.08})`);
        coreG.addColorStop(0.4, `hsla(${cHue}, 60%, 90%, ${0.50 + pulse * 0.22})`);
        coreG.addColorStop(1,   'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreG;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
    }
}
