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
// Blink: advances to the next style.
// Requires mandalaGenerator.js to be loaded before this file.
class MandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._style = 0;
        this._gen   = new MandalaGenerator(ctx);
        this._folds = 1;          // current fold count (builds up over time)
        this._maxFolds = 10;
        this._foldTimer = 0;      // time accumulator between fold reveals
        this._FOLD_INTERVAL = 1.8; // seconds between each new fold appearing
    }

    startScene() {
        this.t          = 0;
        this._folds     = 1;
        this._foldTimer = 0;
        this._gen.setStyle(this._style);
    }

    onBlink() {
        this._style = (this._style + 1) % 7;
        this._gen.setStyle(this._style);
        // Blink resets the fold build-up for the new style
        this._folds     = 1;
        this._foldTimer = 0;
    }

    draw(time) {
        const dt = 0.016;
        this.t += dt;

        // Advance fold count over time — one new fold every _FOLD_INTERVAL seconds
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

        // Slow fade trail — allows layers to accumulate
        ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
        ctx.fillRect(0, 0, W, H);

        this._gen.drawMandala(W * 0.5, H * 0.5, this._folds, this.t, this._style, null);
    }
}
