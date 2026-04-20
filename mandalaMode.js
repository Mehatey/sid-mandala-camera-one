// Mandala Mode — the original seven mandala styles.
//
//   0  Geometric      — polygonal, faceted; blues / browns / crimsons
//   1  Thread Lines   — string-art, 8-fold, silver-blue, very minimal
//   2  Interwoven     — black and white ribbons crossing and weaving
//   3  Ocean Depths   — deep layered petals, navy to teal
//   4  Emerald Forest — organic twisting forms, dark to vivid green
//   5  Pixel Art      — blocky retro geometry, yellow / gold accent
//   6  Luminary       — sparse concentric rings, monochrome blue, very calm
//
// Folds start at 0 — the mandala is dark/empty until activated.
//
// Activation (all styles):
//   · Click / tap          → +3 folds
//   · Blink                → +2 folds; once at max, resets & cycles style
//   · Hum into mic         → drives folds continuously (styles 0 & 1 only)
//
// Folds decay back to 0 when input stops (rate varies by style).
//
// Requires mandalaGenerator.js to be loaded before this file.
class MandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._style = 0;
        this._gen   = new MandalaGenerator(ctx);

        this._folds       = 0;   // current (fractional) fold count
        this._targetFolds = 0;   // smooth target
        this._MAX_FOLDS   = 14;

        this._blinkFlash  = 0;
        this._humTimer    = 0;   // accumulates hum time; 1 fold per 1.5s
    }

    startScene() {
        this.t            = 0;
        this._folds       = 0;
        this._targetFolds = 0;
        this._blinkFlash  = 0;
        this._humTimer    = 0;
        this._gen.setStyle(this._style);
    }

    // Called each frame by the mic analyser — rms is 0..1 normalised hum level
    // While humming above noise floor, adds 1 fold every 1.5s
    setMicLevel(rms) {
        if (this._style !== 0 && this._style !== 1) return;
        if (rms > 0.06) {
            this._humTimer += 0.016;
            if (this._humTimer >= 1.5) {
                this._humTimer -= 1.5;
                this._targetFolds = Math.min(this._MAX_FOLDS, this._targetFolds + 1);
            }
        } else {
            this._humTimer = 0;
        }
    }

    // Click — 1 fold
    onTap() {
        this._targetFolds = Math.min(this._MAX_FOLDS, this._targetFolds + 1);
        this._blinkFlash  = 0.18;
    }

    onBlink() {
        if (Math.round(this._folds) >= this._MAX_FOLDS - 1) {
            // At max → cycle style and reset
            this._style       = (this._style + 1) % 7;
            this._gen.setStyle(this._style);
            this._folds       = 0;
            this._targetFolds = 0;
            this._humTimer    = 0;
            this._blinkFlash  = 1.0;
        } else {
            // 1 fold per blink
            this._targetFolds = Math.min(this._MAX_FOLDS, this._targetFolds + 1);
            this._blinkFlash  = 0.30;
        }
    }

    draw(time) {
        const dt = 0.016;
        this.t += dt;
        this._blinkFlash = Math.max(0, this._blinkFlash - dt * 1.8);

        const style = this._style;

        // ── Decay target folds toward 0 when input stops ──────────────────
        // All styles decay toward 0 when no input — rate differs by style
        if (style === 0 || style === 1) {
            // Mic-driven: drain when quiet (~5s from max to 0)
            this._targetFolds = Math.max(0, this._targetFolds - dt * 2.8);
        } else if (style === 2 || style === 3) {
            // Blink-driven: slower drain (~12s from max to 0)
            this._targetFolds = Math.max(0, this._targetFolds - dt * 1.2);
        } else {
            // Styles 4–6: very slow drain (~20s from max to 0)
            this._targetFolds = Math.max(0, this._targetFolds - dt * 0.7);
        }

        // Smooth lerp — organic, never jumps
        this._folds += (this._targetFolds - this._folds) * 0.05;

        // ── Draw ──────────────────────────────────────────────────────────
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, W, H);

        const foldCount = Math.round(this._folds);
        if (foldCount >= 1) {
            this._gen.drawMandala(W * 0.5, H * 0.5, foldCount, this.t, this._style, null);
        }

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
