// Mirror Mode — 8-fold kaleidoscope of flowing light ribbons.
// Each layer is a set of undulating bezier curves reflected 8 times.
// Screen blend mode makes overlapping ribbons glow and interact.
// Hue drifts slowly — the colours swap between blue, violet, gold, teal.
// Blinks add a new ribbon layer with an energy burst. Old layers fade.
class MirrorMode {
    constructor(ctx, canvas) {
        this.ctx       = ctx;
        this.canvas    = canvas;
        this.layers    = [];
        this.t         = 0;
        this.FOLDS     = 8;
        this._hueShift = 0;
        this.MAX_LAYERS = 7;
        this._blinkFlash = 0;
        this._pulseT     = 0;
    }

    startScene() {
        this.layers      = [];
        this.t           = 0;
        this._hueShift   = 0;
        this._blinkFlash = 0;
        this._addLayer(true);
        this._addLayer(true);
        this._addLayer(true);
    }

    onBlink() {
        this._addLayer(false);
        this._blinkFlash = 1.0;
    }

    _addLayer(base) {
        if (this.layers.length >= this.MAX_LAYERS) {
            const oldest = this.layers[0];
            oldest.targetA = 0;
            oldest.dying   = true;
        }

        const hue = base
            ? 200 + Math.random() * 40
            : 130 + Math.random() * 200;   // wider hue range on blink
        this.layers.push({
            alpha:   base ? 0.55 : 0,
            targetA: base ? 0.75 : 0.68,   // higher target alpha for visibility
            hue,
            rotRate: (Math.random() < 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.010),
            rot:     Math.random() * Math.PI * 2,
            rMin:    0.08 + Math.random() * 0.10,
            rMax:    0.48 + Math.random() * 0.28,
            curves:  2 + Math.floor(Math.random() * 4),   // up to 5 curves per layer
            wAmp:    0.07 + Math.random() * 0.14,
            wFreq:   1.6 + Math.random() * 2.4,
            wPhase:  Math.random() * Math.PI * 2,
            wSpd:    0.20 + Math.random() * 0.28,
            dying:   false,
            lw:      1.2 + Math.random() * 1.2,            // variable line width
        });
    }

    draw(time) {
        this.t        += 0.016;
        this._hueShift += 0.065;
        this._blinkFlash = Math.max(0, this._blinkFlash - 0.016 * 2.5);

        const ctx  = this.ctx;
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;
        const cx   = W / 2, cy = H / 2;
        const maxR = Math.min(W, H) * 0.47;

        // Slightly slower fade for richer accumulation
        ctx.fillStyle = 'rgba(2, 1, 12, 0.065)';
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        this.layers = this.layers.filter(L => !(L.dying && L.alpha < 0.005));

        // Use screen blend for additive glow — overlapping ribbons bloom
        ctx.globalCompositeOperation = 'screen';

        for (const L of this.layers) {
            L.alpha  = L.dying
                ? Math.max(0, L.alpha - 0.016 * 0.45)
                : Math.min(L.targetA, L.alpha + 0.016 * 1.6);
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
                    const hue     = (L.hue + c * 28 + this._hueShift) % 360;
                    const a       = L.alpha * (1 - c * 0.14);
                    if (a < 0.018) continue;

                    const SEGS = 26;
                    const amp  = maxR * L.wAmp;

                    // Outer glow pass — wide, soft
                    ctx.strokeStyle = `hsla(${hue}, 80%, 82%, ${a * 0.22})`;
                    ctx.lineWidth   = L.lw * 4.5;
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

                    // Core ribbon — bright and thin
                    ctx.strokeStyle = `hsla(${hue}, 75%, 88%, ${a})`;
                    ctx.lineWidth   = L.lw;
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

        ctx.globalCompositeOperation = 'source-over';

        // Centre convergence bloom
        const gR       = 42 + 10 * Math.sin(this.t * 1.3) + this._blinkFlash * 80;
        const centreHue = (this._hueShift * 2.2 + 200) % 360;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
        glow.addColorStop(0,   `hsla(${centreHue}, 90%, 95%, ${0.38 + 0.14 * Math.sin(this.t * 1.3) + this._blinkFlash * 0.4})`);
        glow.addColorStop(0.4, `hsla(${centreHue}, 75%, 72%, 0.10)`);
        glow.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, gR, 0, Math.PI * 2); ctx.fill();

        // Blink energy pulse ring
        if (this._blinkFlash > 0.05) {
            const ringR = (1 - this._blinkFlash) * maxR * 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${centreHue}, 85%, 90%, ${this._blinkFlash * 0.35})`;
            ctx.lineWidth   = 2;
            ctx.stroke();
        }
    }

    destroy() { this.layers = []; }
}
