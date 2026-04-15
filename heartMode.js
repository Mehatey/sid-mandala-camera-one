// Heart Mode — a heartbeat that gradually slows into stillness.
// Rings radiate outward from centre on each beat.
// Starts ~80 bpm, settles toward ~48 over the scene.
// Color journeys: warm red-amber while fast → deep teal as the body finds rest.
// Blink: brief acceleration — the heart notices being watched — then settles again.
class HeartMode {
    constructor(ctx, canvas) {
        this.ctx        = ctx;
        this.canvas     = canvas;
        this.t          = 0;
        this._bpm       = 80;
        this._lastBeat  = 0;
        this._rings     = [];
        this._hue       = 352;
    }

    startScene() {
        this.t         = 0;
        this._bpm      = 80;
        this._lastBeat = 0;
        this._rings    = [];
        this._hue      = 352;
    }

    onBlink() {
        this._bpm = Math.min(92, this._bpm + 14);
        this._beat(true);
    }

    _beat(strong = false) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this._rings.push({
            r:    0,
            maxR: Math.max(W, H) * 0.75,
            a:    strong ? 0.82 : 0.62,
            w:    strong ? 2.2  : 1.5,
            hue:  this._hue,
        });
        // Softer echo ring
        this._rings.push({
            r:    0,
            maxR: Math.max(W, H) * 0.48,
            a:    strong ? 0.28 : 0.20,
            w:    0.8,
            hue:  this._hue + 20,
        });
    }

    // Cardiac waveform profile for one beat cycle (p ∈ [0, 1])
    _ecgAt(p) {
        let v = 0;
        v += 0.22  * Math.exp(-Math.pow((p - 0.12) / 0.038, 2));   // P wave
        v -= 0.18  * Math.exp(-Math.pow((p - 0.32) / 0.016, 2));   // Q dip
        v += 1.00  * Math.exp(-Math.pow((p - 0.375) / 0.016, 2));  // R spike
        v -= 0.22  * Math.exp(-Math.pow((p - 0.425) / 0.015, 2));  // S dip
        v += 0.36  * Math.exp(-Math.pow((p - 0.655) / 0.062, 2));  // T wave
        return v;
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;

        // BPM eases toward resting rate
        this._bpm += (48 - this._bpm) * 0.0008;

        // Hue: 352 (warm red) at 80bpm → 185 (deep teal) at 48bpm
        const bpmFrac = Math.max(0, Math.min(1, (this._bpm - 48) / 32));
        this._hue     = 185 + bpmFrac * 167;

        // Beat trigger
        const beatInterval = 60 / this._bpm;
        if (this.t - this._lastBeat >= beatInterval) {
            this._lastBeat = this.t;
            this._beat();
        }

        // ── Background ──────────────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(3, 2, 10, 0.09)';
        ctx.fillRect(0, 0, W, H);

        // ── Beat flash ──────────────────────────────────────────────────────────
        const beatPhase = Math.min(1, (this.t - this._lastBeat) / beatInterval);
        const flash     = Math.exp(-beatPhase * 5) * 0.58;

        // Central atmospheric glow
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
        gr.addColorStop(0,   `hsla(${this._hue}, 72%, 62%, ${0.07 + flash * 0.60})`);
        gr.addColorStop(0.5, `hsla(${this._hue}, 62%, 50%, ${0.02 + flash * 0.18})`);
        gr.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(cx, cy, 200, 0, Math.PI * 2);
        ctx.fill();

        // Central point
        const dotR = 5 + flash * 11;
        ctx.beginPath();
        ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this._hue}, 82%, 72%, ${0.55 + flash * 0.45})`;
        ctx.fill();

        // ── Expand rings ────────────────────────────────────────────────────────
        const expandSpd = Math.min(W, H) * 0.0058;
        this._rings     = this._rings.filter(r => r.a > 0.008);
        for (const r of this._rings) {
            r.r += expandSpd;
            r.a *= 0.966;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${r.hue}, 68%, 62%, ${r.a})`;
            ctx.lineWidth   = r.w;
            ctx.stroke();
        }

        // ── ECG waveform trace ───────────────────────────────────────────────────
        // A single cardiac cycle drawn across most of the screen width.
        // Amplitude scales with the beat flash — nearly invisible at rest,
        // legible right after each beat.
        const wX0 = W * 0.10, wX1 = W * 0.90;
        const wW  = wX1 - wX0;
        const wY  = cy + H * 0.26;
        const wH  = Math.min(W, H) * 0.075;
        const wA  = 0.08 + flash * 0.38;

        ctx.beginPath();
        for (let i = 0; i <= 240; i++) {
            const p = i / 240;
            const v = this._ecgAt(p);
            const x = wX0 + p * wW;
            const y = wY - v * wH;
            if (i === 0) ctx.moveTo(x, y);
            else         ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${this._hue}, 55%, 65%, ${wA})`;
        ctx.lineWidth   = 0.8 + flash * 0.55;
        ctx.stroke();
    }
}
