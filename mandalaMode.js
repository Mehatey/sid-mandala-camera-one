// Mandala Mode — the original seven mandala styles from the study
//
//   0  Geometric      — polygonal, faceted; blues / browns / crimsons
//   1  Thread Lines   — string-art, 8-fold, silver-blue, very minimal
//   2  Interwoven     — black and white ribbons crossing and weaving
//   3  Ocean Depths   — deep layered petals, navy to teal
//   4  Emerald Forest — organic twisting forms, dark to vivid green
//   5  Pixel Art      — blocky retro geometry, yellow / gold accent
//   6  Luminary       — sparse concentric rings, monochrome blue, very calm
//
// Fold drivers:
//   Styles 0 & 1  — mic hum: humming raises fold count, silence lowers it smoothly
//   Styles 2 & 3  — blink: each blink adds folds; decays back to min when quiet
//   Styles 4 – 6  — fixed fold count (no interaction)
//
// Blink also advances to the next style (with a radiant flash).
// Requires mandalaGenerator.js to be loaded before this file.
class MandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._style = 0;
        this._gen   = new MandalaGenerator(ctx);

        this._folds       = 2;     // current (fractional) fold count — smooth
        this._targetFolds = 2;     // where folds want to go
        this._MIN_FOLDS   = 2;
        this._MAX_FOLDS   = 14;

        this._blinkFlash  = 0;
        this._blinkFolds  = 0;     // accumulated blink-folds for styles 2+3
        this._blinkDecay  = 0;     // timer: how long since last blink
    }

    startScene() {
        this.t            = 0;
        this._folds       = 2;
        this._targetFolds = 2;
        this._blinkFlash  = 0;
        this._blinkFolds  = 0;
        this._blinkDecay  = 0;
        this._gen.setStyle(this._style);
    }

    // Called by complete.html mic analyser — rms is 0..1 normalised hum level
    setMicLevel(rms) {
        if (this._style !== 0 && this._style !== 1) return;
        // Map 0..1 mic → 2..14 folds (hum must be clearly audible to matter)
        const mapped = this._MIN_FOLDS + (this._MAX_FOLDS - this._MIN_FOLDS) * Math.min(1, rms * 3.5);
        this._targetFolds = mapped;
    }

    onBlink() {
        const style = this._style;

        if (style === 2 || style === 3) {
            // Blink adds 2 folds, capped at MAX
            this._blinkFolds  = Math.min(this._blinkFolds + 2, this._MAX_FOLDS - this._MIN_FOLDS);
            this._targetFolds = this._MIN_FOLDS + this._blinkFolds;
            this._blinkDecay  = 0;   // reset decay timer
        } else {
            // Styles 0,1,4-6: blink advances style
            this._style      = (this._style + 1) % 7;
            this._gen.setStyle(this._style);
            this._folds      = 2;
            this._targetFolds = 2;
            this._blinkFolds  = 0;
            this._blinkDecay  = 0;
            this._blinkFlash  = 1.0;
        }
    }

    draw(time) {
        const dt = 0.016;
        this.t += dt;
        this._blinkFlash = Math.max(0, this._blinkFlash - dt * 1.8);

        // ── Fold target update ─────────────────────────────────────────────
        const style = this._style;

        if (style === 0 || style === 1) {
            // Mic-driven: setMicLevel updates _targetFolds each frame.
            // If no mic data arrives, _targetFolds drifts back to min slowly.
            this._targetFolds = Math.max(this._MIN_FOLDS, this._targetFolds - dt * 0.4);
        } else if (style === 2 || style === 3) {
            // Blink-driven: decay back toward min over ~8s when no blinks
            this._blinkDecay += dt;
            if (this._blinkDecay > 1.5) {
                // After 1.5s of silence, start draining blinkFolds
                this._blinkFolds = Math.max(0, this._blinkFolds - dt * 0.55);
                this._targetFolds = this._MIN_FOLDS + this._blinkFolds;
            }
        }
        // Styles 4-6: _targetFolds stays at whatever startScene set (2)

        // Smooth lerp — feels organic, never jumps
        this._folds += (this._targetFolds - this._folds) * 0.035;

        // ── Draw ──────────────────────────────────────────────────────────
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, W, H);

        this._gen.drawMandala(W * 0.5, H * 0.5, Math.max(2, Math.round(this._folds)), this.t, this._style, null);

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
