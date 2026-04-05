// Mirror Mode — 8-fold kaleidoscope of flowing geometric curves on deep indigo.
// Blinks add new concentric petal-arc layers that slowly rotate.
class MirrorMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.layers = [];
        this.t      = 0;
        this.FOLDS  = 8;
    }

    startScene() {
        this.layers = [];
        this.t      = 0;
        this._addLayer(true);   // seed one base layer immediately
    }

    onBlink() { this._addLayer(false); }

    _addLayer(base) {
        const hue = base ? 210 : 190 + Math.random() * 100;
        this.layers.push({
            alpha:    0,
            targetA:  base ? 0.55 : 0.48,
            hue,
            rotRate:  (Math.random() < 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.009),
            rot:      Math.random() * Math.PI * 2,
            rings:    2 + Math.floor(Math.random() * 4),
            petals:   4 + Math.floor(Math.random() * 6),
            rMin:     0.12 + Math.random() * 0.08,
            rMax:     0.55 + Math.random() * 0.22,
            curvature: 0.3 + Math.random() * 0.5,
        });
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const maxR = Math.min(W, H) * 0.48;

        // Background — very slow dark-indigo accumulation
        ctx.fillStyle = 'rgba(4, 3, 16, 0.07)';
        ctx.fillRect(0, 0, W, H);

        for (const L of this.layers) {
            // Fade in
            L.alpha = Math.min(L.targetA, L.alpha + 0.016 * 0.35);
            L.rot  += L.rotRate;

            for (let fold = 0; fold < this.FOLDS; fold++) {
                const baseAngle = (fold / this.FOLDS) * Math.PI * 2 + L.rot;
                const mirror    = (fold % 2 === 1);

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(baseAngle);
                if (mirror) ctx.scale(1, -1);

                for (let ring = 0; ring < L.rings; ring++) {
                    const t  = ring / Math.max(L.rings - 1, 1);
                    const r  = maxR * (L.rMin + t * (L.rMax - L.rMin));
                    const ringHue = (L.hue + ring * 18) % 360;
                    const a  = L.alpha * (1 - t * 0.35);

                    ctx.strokeStyle = `hsla(${ringHue}, 62%, 74%, ${a})`;
                    ctx.lineWidth   = 0.85;
                    ctx.lineCap     = 'round';

                    for (let p = 0; p < L.petals; p++) {
                        const a0 = (p / L.petals) * Math.PI * 2;
                        const a1 = a0 + (Math.PI * 2 / L.petals) * 0.5;
                        const cp = L.curvature;

                        const x0 = Math.cos(a0) * r;
                        const y0 = Math.sin(a0) * r;
                        const x1 = Math.cos(a1) * r;
                        const y1 = Math.sin(a1) * r;
                        const mid = r * (1 + cp);
                        const mx  = Math.cos((a0 + a1) / 2) * mid;
                        const my  = Math.sin((a0 + a1) / 2) * mid;

                        ctx.beginPath();
                        ctx.moveTo(x0, y0);
                        ctx.quadraticCurveTo(mx, my, x1, y1);
                        ctx.stroke();
                    }

                    // Radial spokes from ring inward
                    if (ring > 0) {
                        const rInner = maxR * (L.rMin + (t - 1 / Math.max(L.rings - 1, 1)) * (L.rMax - L.rMin));
                        ctx.strokeStyle = `hsla(${ringHue}, 50%, 65%, ${a * 0.5})`;
                        ctx.lineWidth   = 0.5;
                        for (let s = 0; s < L.petals; s++) {
                            const sa = (s / L.petals) * Math.PI * 2;
                            ctx.beginPath();
                            ctx.moveTo(Math.cos(sa) * rInner, Math.sin(sa) * rInner);
                            ctx.lineTo(Math.cos(sa) * r,      Math.sin(sa) * r);
                            ctx.stroke();
                        }
                    }
                }

                ctx.restore();
            }
        }

        // Soft convergence glow at centre
        const gR = 36 + 8 * Math.sin(this.t * 1.4);
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
        glow.addColorStop(0, `rgba(180, 210, 255, ${0.14 + 0.05 * Math.sin(this.t * 1.4)})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, gR, 0, Math.PI * 2); ctx.fill();
    }

    destroy() { this.layers = []; }
}
