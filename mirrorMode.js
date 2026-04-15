// Mirror Mode — 8-fold kaleidoscope of flowing light ribbons.
// Each layer is a set of undulating bezier curves reflected 8 times.
// Hue drifts slowly — the colours "swap" between blue, violet, gold, teal.
// Blinks add a new ribbon layer. Old layers gracefully fade and expire.
class MirrorMode {
    constructor(ctx, canvas) {
        this.ctx       = ctx;
        this.canvas    = canvas;
        this.layers    = [];
        this.t         = 0;
        this.FOLDS     = 8;
        this._hueShift = 0;
        this.MAX_LAYERS = 7;
    }

    startScene() {
        this.layers    = [];
        this.t         = 0;
        this._hueShift = 0;
        this._addLayer(true);
        this._addLayer(true);
        this._addLayer(true);
    }

    onBlink() { this._addLayer(false); }

    _addLayer(base) {
        // If at cap, begin fading out the oldest layer
        if (this.layers.length >= this.MAX_LAYERS) {
            const oldest = this.layers[0];
            oldest.targetA = 0;    // signal it to fade out
            oldest.dying   = true;
        }

        const hue = base
            ? 200 + Math.random() * 40
            : 150 + Math.random() * 150;
        this.layers.push({
            alpha:   base ? 0.42 : 0,
            targetA: base ? 0.60 : 0.52,
            hue,
            rotRate: (Math.random() < 0.5 ? 1 : -1) * (0.005 + Math.random() * 0.008),
            rot:     Math.random() * Math.PI * 2,
            rMin:    0.10 + Math.random() * 0.08,
            rMax:    0.50 + Math.random() * 0.24,
            curves:  2 + Math.floor(Math.random() * 3),
            wAmp:    0.06 + Math.random() * 0.10,
            wFreq:   1.8 + Math.random() * 2.0,
            wPhase:  Math.random() * Math.PI * 2,
            wSpd:    0.18 + Math.random() * 0.22,
            dying:   false,
        });
    }

    draw(time) {
        this.t        += 0.016;
        this._hueShift += 0.055;

        const ctx  = this.ctx;
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;
        const cx   = W / 2, cy = H / 2;
        const maxR = Math.min(W, H) * 0.47;

        ctx.fillStyle = 'rgba(3, 2, 14, 0.08)';
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        // Remove fully faded dead layers
        this.layers = this.layers.filter(L => !(L.dying && L.alpha < 0.005));

        for (const L of this.layers) {
            L.alpha  = L.dying
                ? Math.max(0, L.alpha - 0.016 * 0.5)
                : Math.min(L.targetA, L.alpha + 0.016 * 1.4);
            L.rot   += L.rotRate;
            L.wPhase += L.wSpd * 0.016;

            const r0 = maxR * L.rMin;
            const r1 = maxR * L.rMax;

            for (let fold = 0; fold < this.FOLDS; fold++) {
                const baseAngle = (fold / this.FOLDS) * Math.PI * 2 + L.rot;
                const mirror    = (fold % 2 === 1);

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(baseAngle);
                if (mirror) ctx.scale(1, -1);

                for (let c = 0; c < L.curves; c++) {
                    const cOffset = (c / L.curves) * Math.PI * 2;
                    const hue     = (L.hue + c * 22 + this._hueShift) % 360;
                    const a       = L.alpha * (1 - c * 0.18);
                    if (a < 0.02) continue;

                    const SEGS = 22;
                    const amp  = maxR * L.wAmp;

                    ctx.strokeStyle = `hsla(${hue}, 70%, 80%, ${a})`;
                    ctx.lineWidth   = 1.1;
                    ctx.beginPath();

                    for (let s = 0; s <= SEGS; s++) {
                        const frac  = s / SEGS;
                        const rx    = r0 + frac * (r1 - r0);
                        const phase = L.wPhase + cOffset + frac * L.wFreq * Math.PI * 2;
                        const ry    = Math.sin(phase) * amp * Math.sin(Math.PI * frac);

                        if (s === 0) ctx.moveTo(rx, ry);
                        else         ctx.lineTo(rx, ry);
                    }

                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        // Centre convergence glow
        const gR       = 38 + 8 * Math.sin(this.t * 1.3);
        const centreHue = (this._hueShift * 1.8 + 200) % 360;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
        glow.addColorStop(0,   `hsla(${centreHue}, 88%, 90%, ${0.30 + 0.10 * Math.sin(this.t * 1.3)})`);
        glow.addColorStop(0.45,`hsla(${centreHue}, 70%, 65%, 0.08)`);
        glow.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, gR, 0, Math.PI * 2); ctx.fill();
    }

    destroy() { this.layers = []; }
}
