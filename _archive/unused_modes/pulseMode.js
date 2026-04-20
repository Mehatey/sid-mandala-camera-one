// Pulse Mode — rhythm as the instrument.
// Tap spacebar or click anywhere to the beat of anything.
// A ring expands from the centre with each tap.
// Tap regularly: a ghost ring predicts the next beat — land on it and the canvas ignites.
// The visual reward is resonance: all rings arrive at the same radius at the same moment.
// Tempo colours: slow breath (40bpm) → deep indigo. Fast pulse (160bpm) → hot amber.
// No camera. No mic. Just timing.
class PulseMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._pulses      = [];       // {spawnT, hue}
        this._tapHistory  = [];       // real timestamps in seconds
        this._lastTapT    = -999;     // last tap time (real seconds)
        this._period      = null;     // detected beat period (seconds)
        this._bpm         = null;
        this._onBeat      = 0;        // flash value when tap lands on ghost
        this._centreScale = 1.0;      // centre orb contract-on-tap
        this._hue         = 220;
    }

    startScene() {
        this.t            = 0;
        this._pulses      = [];
        this._tapHistory  = [];
        this._lastTapT    = -999;
        this._period      = null;
        this._bpm         = null;
        this._onBeat      = 0;
        this._centreScale = 1.0;
        this._hue         = 220;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onTap() {
        const now = performance.now() / 1000;

        // Detect how close this tap is to the predicted beat (before pushing)
        if (this._period && this._lastTapT > 0) {
            const expected   = this._lastTapT + this._period;
            const tolerance  = this._period * 0.10;
            const offset     = Math.abs(now - expected);
            if (offset < tolerance) {
                this._onBeat = 1.0;   // on beat!
            }
        }

        this._tapHistory.push(now);
        if (this._tapHistory.length > 8) this._tapHistory.shift();
        this._lastTapT    = now;
        this._centreScale = 0.55;     // contract on tap

        this._updateBPM();
        this._pulses.push({ spawnT: now, hue: this._hue });
    }

    _updateBPM() {
        if (this._tapHistory.length < 3) return;
        const intervals = [];
        for (let i = 1; i < this._tapHistory.length; i++) {
            intervals.push(this._tapHistory[i] - this._tapHistory[i - 1]);
        }
        // Ignore implausibly long pauses (> 3s — user stopped tapping)
        const valid = intervals.filter(d => d < 3.0);
        if (!valid.length) return;
        // Median interval
        valid.sort((a, b) => a - b);
        this._period = valid[Math.floor(valid.length / 2)];
        this._bpm    = 60 / this._period;
        // Hue from tempo: 40bpm → 240 (deep blue), 160bpm → 28 (amber)
        const t = Math.max(0, Math.min(1, (this._bpm - 40) / 120));
        this._hue = 240 - t * 212;
    }

    draw(time) {
        this.t = time;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const R   = Math.min(W, H) * 0.46;

        // Slow fade
        ctx.fillStyle = 'rgba(0, 0, 3, 0.055)';
        ctx.fillRect(0, 0, W, H);

        const now  = performance.now() / 1000;
        const DURATION = 2.2;   // seconds for ring to travel from 0 → R

        // On-beat flash
        this._onBeat = Math.max(0, this._onBeat - 0.04);
        if (this._onBeat > 0.05) {
            const fa = this._onBeat * 0.18;
            const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
            fg.addColorStop(0,   `hsla(${this._hue}, 90%, 92%, ${fa})`);
            fg.addColorStop(0.5, `hsla(${this._hue}, 80%, 70%, ${fa * 0.3})`);
            fg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, W, H);
        }

        // Ghost ring — where the next beat ring will be right now
        if (this._period && this._lastTapT > 0) {
            const tSinceLastTap  = now - this._lastTapT;
            const tUntilNextBeat = this._period - tSinceLastTap;
            // The ring spawning at nextBeat will be at this radius NOW:
            // At time 0 after spawn it's at r=0; after DURATION it's at r=R
            // So at tUntilNextBeat before spawn: r = -tUntilNextBeat/DURATION * R
            // At tUntilNextBeat * 1 before spawn: it's effectively -r (not visible yet)
            // Instead: show where the PREVIOUS predicted ring WOULD BE (rolling ghost)
            const ghostAge = tSinceLastTap % this._period;
            const ghostR   = (ghostAge / DURATION) * R;
            if (ghostR > 0 && ghostR < R * 1.05) {
                const ghostFade = 1 - ghostAge / DURATION;
                ctx.beginPath();
                ctx.arc(cx, cy, ghostR, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${this._hue}, 60%, 75%, ${ghostFade * 0.18})`;
                ctx.lineWidth   = 1.2;
                ctx.setLineDash([4, 6]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Live pulse rings
        for (let i = this._pulses.length - 1; i >= 0; i--) {
            const p    = this._pulses[i];
            const age  = now - p.spawnT;
            if (age > DURATION) { this._pulses.splice(i, 1); continue; }

            const frac = age / DURATION;
            const r    = frac * R;
            // Opacity: rises fast, then fades
            const a    = frac < 0.08 ? frac / 0.08 : 1 - (frac - 0.08) / 0.92;

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${p.hue}, 75%, 78%, ${a * 0.65})`;
            ctx.lineWidth   = 1.5 + (1 - frac) * 1.5;
            ctx.stroke();

            // Glow duplicate — wider, more transparent
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${p.hue}, 80%, 85%, ${a * 0.18})`;
            ctx.lineWidth   = 6 + (1 - frac) * 6;
            ctx.stroke();
        }

        // Centre orb — contracts on tap, springs back
        this._centreScale += (1.0 - this._centreScale) * 0.12;
        const orbR = R * 0.045 * this._centreScale;
        const og   = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 5);
        const orbA = 0.12 + this._onBeat * 0.25;
        og.addColorStop(0,   `hsla(${this._hue}, 80%, 95%, ${0.7 + this._onBeat * 0.3})`);
        og.addColorStop(0.4, `hsla(${this._hue}, 70%, 70%, ${orbA})`);
        og.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(cx, cy, orbR * 5, 0, Math.PI * 2);
        ctx.fill();

        // BPM readout — very faint
        if (this._bpm) {
            ctx.font = '9px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = `hsla(${this._hue}, 55%, 70%, 0.22)`;
            ctx.fillText(`${Math.round(this._bpm)} bpm`, cx, H - 24);
            ctx.textAlign = 'left';
        } else {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180,175,220,0.18)';
            ctx.fillText('tap spacebar or click to the beat', cx, cy + 22);
            ctx.textAlign = 'left';
        }
    }
}
