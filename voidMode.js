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
    }

    startScene() {
        this.t           = 0;
        this.rings       = [];
        this.corePhase   = 0;
        this._blinkFlash = 0;
        this.nextAuto    = 8 + Math.random() * 6;
    }

    onBlink() {
        this._spawnRing(1.5);
        this._blinkFlash = 1.0;
    }

    _spawnRing(mult) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.rings.push({
            r:     1.5,
            speed: 0.26 + Math.random() * 0.16,
            maxR:  Math.max(W, H) * 0.70,
            alpha: 0.32 * (mult || 1),
            width: 0.5 + Math.random() * 0.6,
        });
    }

    draw(t) {
        this.t         += 0.016;
        this.corePhase += 0.016 * 0.58;
        this._blinkFlash = Math.max(0, this._blinkFlash - 0.016 * 2.2);

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;

        // Hard black — void needs crisp edges
        ctx.fillStyle = 'rgb(0, 0, 2)';
        ctx.fillRect(0, 0, W, H);

        // Auto-spawn ambient rings
        if (this.t >= this.nextAuto) {
            this._spawnRing(1.0);
            this.nextAuto = this.t + 10 + Math.random() * 9;
        }

        // Draw + advance rings
        this.rings = this.rings.filter(ring => ring.r < ring.maxR);
        for (const ring of this.rings) {
            ring.r += ring.speed;
            const progress = ring.r / ring.maxR;
            // Fade in near centre, fade out near edge
            const fade = progress < 0.08
                ? progress / 0.08
                : progress > 0.60
                    ? 1 - (progress - 0.60) / 0.40
                    : 1;
            const a = ring.alpha * fade;
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(185, 205, 255, ${a})`;
            ctx.lineWidth   = ring.width;
            ctx.stroke();
        }

        // Central core — slow breath
        const pulse  = 0.5 + 0.5 * Math.sin(this.corePhase);
        const flash  = this._blinkFlash;
        const coreR  = 1.8 + pulse * 3.0 + flash * 7;

        // Wide soft halo
        const haloR  = coreR * 14 + flash * 35;
        const haloG  = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
        haloG.addColorStop(0,    `rgba(195, 218, 255, ${0.11 + pulse * 0.06 + flash * 0.20})`);
        haloG.addColorStop(0.30, `rgba(155, 185, 255, ${0.03 + pulse * 0.02})`);
        haloG.addColorStop(1,    'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloG;
        ctx.beginPath();
        ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Core point
        const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreG.addColorStop(0,   `rgba(255, 255, 255, ${0.90 + pulse * 0.10 + flash * 0.08})`);
        coreG.addColorStop(0.4, `rgba(215, 230, 255, ${0.50 + pulse * 0.22})`);
        coreG.addColorStop(1,   'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreG;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
    }
}
