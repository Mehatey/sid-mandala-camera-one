// Mandala Mode — seven styles, zero folds on start.
//
// Every interaction adds exactly 1 fold:
//   · Click / tap  — +1 fold
//   · Blink        — +1 fold (at max folds, resets and cycles style)
//   · Hum / Om     — +1 fold every 1.5s of sustained sound (styles 0 & 1)
//
// After 10s with no input, folds decay at 1 per 2s back to 0.
//
// Requires mandalaGenerator.js.
class MandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._style = 0;
        this._gen   = new MandalaGenerator(ctx);

        this._folds       = 0;
        this._targetFolds = 0;
        this._MAX_FOLDS   = 14;

        this._blinkFlash   = 0;
        this._humTimer     = 0;      // accumulated hum time
        this._lastInputMs  = 0;      // timestamp of last input
        this._GRACE_MS     = 10000;  // 10s before decay starts
        this._DECAY_RATE   = 0.5;    // folds per second after grace period
    }

    startScene() {
        this.t            = 0;
        this._folds       = 0;
        this._targetFolds = 0;
        this._blinkFlash  = 0;
        this._humTimer    = 0;
        this._lastInputMs = 0;
        this._gen.setStyle(this._style);
    }

    _touch() { this._lastInputMs = Date.now(); }

    // Called each frame by the mic analyser — rms is 0..1
    setMicLevel(rms) {
        if (this._style !== 0 && this._style !== 1) return;
        if (rms > 0.06) {
            this._touch();
            this._humTimer += 0.016;
            if (this._humTimer >= 1.5) {
                this._humTimer -= 1.5;
                this._targetFolds = Math.min(this._MAX_FOLDS, this._targetFolds + 1);
            }
        } else {
            this._humTimer = 0;
        }
    }

    onTap() {
        this._touch();
        this._targetFolds = Math.min(this._MAX_FOLDS, this._targetFolds + 1);
        this._blinkFlash  = 0.18;
    }

    onBlink() {
        this._touch();
        if (Math.round(this._folds) >= this._MAX_FOLDS - 1) {
            // At max — cycle style, reset
            this._style       = (this._style + 1) % 7;
            this._gen.setStyle(this._style);
            this._folds       = 0;
            this._targetFolds = 0;
            this._humTimer    = 0;
            this._blinkFlash  = 1.0;
        } else {
            this._targetFolds = Math.min(this._MAX_FOLDS, this._targetFolds + 1);
            this._blinkFlash  = 0.30;
        }
    }

    draw(time) {
        const dt = 0.016;
        this.t += dt;
        this._blinkFlash = Math.max(0, this._blinkFlash - dt * 1.8);

        // Only decay after grace period of no input
        const silenceMs = this._lastInputMs > 0 ? Date.now() - this._lastInputMs : 0;
        if (this._lastInputMs > 0 && silenceMs > this._GRACE_MS) {
            this._targetFolds = Math.max(0, this._targetFolds - dt * this._DECAY_RATE);
        }

        this._folds += (this._targetFolds - this._folds) * 0.05;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, W, H);

        const foldCount = Math.round(this._folds);
        if (foldCount >= 1) {
            this._gen.drawMandala(W * 0.5, H * 0.5, foldCount, this.t, this._style, null);
        }

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
