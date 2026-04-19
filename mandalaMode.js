// Mandala Mode — the original seven mandala styles from the study
//
// These are the foundational mandalas from the original index.html meditation study,
// now accessible in the scene browser and complete experience.
//
//   0  Geometric      — polygonal, faceted; blues / browns / crimsons
//   1  Thread Lines   — string-art, 8-fold, silver-blue, very minimal
//   2  Interwoven     — black and white ribbons crossing and weaving
//   3  Ocean Depths   — deep layered petals, navy to teal
//   4  Emerald Forest — organic twisting forms, dark to vivid green
//   5  Pixel Art      — blocky retro geometry, yellow / gold accent
//   6  Luminary       — sparse concentric rings, monochrome blue, very calm
//
// Blink: advances to the next style with a radiant flash.
// Requires mandalaGenerator.js to be loaded before this file.
class MandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._style = 0;
        this._gen   = new MandalaGenerator(ctx);
        this._folds = 1;
        this._maxFolds = 16;         // more folds = richer, deeper mandala
        this._foldTimer = 0;
        this._FOLD_INTERVAL = 1.0;   // faster reveal: 1.0s between folds (was 1.8s)
        this._blinkFlash = 0;
        this._styleAlpha = 1.0;      // for style crossfade
    }

    startScene() {
        this.t           = 0;
        this._folds      = 2;        // start with 2 folds immediately visible
        this._foldTimer  = 0;
        this._blinkFlash = 0;
        this._styleAlpha = 1.0;
        this._gen.setStyle(this._style);
    }

    onBlink() {
        this._style      = (this._style + 1) % 7;
        this._gen.setStyle(this._style);
        this._folds      = 2;
        this._foldTimer  = 0;
        this._blinkFlash = 1.0;      // radiant style-change flash
    }

    draw(time) {
        const dt = 0.016;
        this.t += dt;
        this._blinkFlash = Math.max(0, this._blinkFlash - dt * 1.8);

        if (this._folds < this._maxFolds) {
            this._foldTimer += dt;
            if (this._foldTimer >= this._FOLD_INTERVAL) {
                this._foldTimer -= this._FOLD_INTERVAL;
                this._folds = Math.min(this._folds + 1, this._maxFolds);
            }
        }

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Slower fade trail for richer petal accumulation
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, W, H);

        this._gen.drawMandala(W * 0.5, H * 0.5, this._folds, this.t, this._style, null);

        // Blink flash — radiant bloom from centre
        if (this._blinkFlash > 0.02) {
            const cx = W / 2, cy = H / 2;
            const r  = Math.min(W, H) * 0.5 * this._blinkFlash;
            const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0,   `rgba(255, 255, 255, ${this._blinkFlash * 0.55})`);
            g.addColorStop(0.3, `rgba(200, 220, 255, ${this._blinkFlash * 0.18})`);
            g.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
    }
}
