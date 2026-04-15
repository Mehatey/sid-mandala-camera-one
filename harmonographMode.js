// Harmonograph Mode — a nineteenth-century drawing machine.
// Four damped pendulums drive a pen across paper: two control X, two control Y.
// Simple ratios produce geometric precision. Irrational ratios produce infinite loops.
// The decay is the whole point — watch symmetry dissolve into stillness.
// Blink: reset with new pendulum parameters. Each run is unique and unrepeatable.
// The pen never lifts. The line accumulates — a thousand orbits in four minutes.
class HarmonographMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._pen   = { x: 0, y: 0 };
        this._time  = 0;       // internal time (separate from t for drawing speed)
        this._params = null;
        this._hue    = 0;
        this._hueSpd = 0.4;    // degrees per second of internal time
        this._off    = null;   // offscreen canvas (permanent paper)
        this._offCtx = null;
        this._lastX  = 0;
        this._lastY  = 0;
        this._fade   = 0;      // reset fade 0→1→0
        this._maxAmplitude = 0;
    }

    startScene() {
        this.t      = 0;
        this._time  = 0;
        this._fade  = 0;
        this._hue   = 220 + Math.random() * 60;

        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        // Create permanent paper canvas
        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off        = document.createElement('canvas');
            this._off.width  = W;
            this._off.height = H;
            this._offCtx     = this._off.getContext('2d');
        }
        this._offCtx.fillStyle = '#000';
        this._offCtx.fillRect(0, 0, W, H);

        this._newParams();

        // Initialise pen to actual t=0 position so first stroke doesn't streak from (0,0)
        const p0 = this._penPos(0);
        const cx0 = W / 2, cy0 = H / 2, sc0 = Math.min(W, H) * 0.48;
        this._lastX = cx0 + p0.x * sc0;
        this._lastY = cy0 + p0.y * sc0;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, W, H);
    }

    onBlink() {
        this._fade = 1.0;  // trigger reset fade
    }

    _newParams() {
        // Beautiful frequency ratios: small integer ratios give closed figures
        // Slightly off-ratio gives slowly rotating open patterns (more interesting)
        const RATIOS = [
            [1, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 5],
            [5, 6], [2, 5], [1, 3], [3, 7], [5, 8], [4, 7],
        ];
        const [r1, r2] = RATIOS[Math.floor(Math.random() * RATIOS.length)];

        // Base frequency — around 1Hz subjectively
        const f0 = 1.0 + Math.random() * 0.5;

        // Slight irrational offset for drift/rotation (makes it never fully close)
        const drift = (Math.random() - 0.5) * 0.025;

        // Decay constants — long decay = many orbits before settling
        const d1 = 0.004 + Math.random() * 0.008;
        const d2 = 0.003 + Math.random() * 0.006;
        const d3 = 0.004 + Math.random() * 0.007;
        const d4 = 0.003 + Math.random() * 0.006;

        // Two pendulums per axis: compound harmonograph
        this._params = {
            // X axis: two pendulums sum
            p1: { freq: f0 * r1 + drift, amp: 0.50 + Math.random() * 0.14, phase: Math.random() * Math.PI * 2, decay: d1 },
            p2: { freq: f0 * r1 * 0.5,  amp: 0.20 + Math.random() * 0.14, phase: Math.random() * Math.PI * 2, decay: d2 },
            // Y axis: two pendulums sum
            p3: { freq: f0 * r2 + drift * 0.7, amp: 0.50 + Math.random() * 0.14, phase: Math.random() * Math.PI * 2 + Math.PI * 0.5, decay: d3 },
            p4: { freq: f0 * r2 * 0.5,          amp: 0.18 + Math.random() * 0.12, phase: Math.random() * Math.PI * 2, decay: d4 },
        };

        this._maxAmplitude = this._params.p1.amp + this._params.p2.amp + this._params.p3.amp + this._params.p4.amp;
        this._time = 0;
        this._hue  = (this._hue + 45 + Math.random() * 90) % 360;
    }

    _penPos(time) {
        const p = this._params;
        const x = p.p1.amp * Math.exp(-p.p1.decay * time) * Math.sin(p.p1.freq * time + p.p1.phase)
                + p.p2.amp * Math.exp(-p.p2.decay * time) * Math.sin(p.p2.freq * time + p.p2.phase);
        const y = p.p3.amp * Math.exp(-p.p3.decay * time) * Math.sin(p.p3.freq * time + p.p3.phase)
                + p.p4.amp * Math.exp(-p.p4.decay * time) * Math.sin(p.p4.freq * time + p.p4.phase);
        return { x, y };
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const sc  = Math.min(W, H) * 0.48;

        // Handle reset fade (triggered by blink)
        if (this._fade > 0) {
            this._fade -= 0.016 * 1.8;
            if (this._fade <= 0) {
                this._fade = 0;
                this._offCtx.fillStyle = 'rgba(0,0,0,0.95)';
                this._offCtx.fillRect(0, 0, W, H);
                this._newParams();
            }
        }

        // ── Draw N strokes per frame onto offscreen canvas ────────────────────────
        // More strokes = faster drawing. Slow = meditative, fast = excited.
        // Drawing speed adapts: fast early (lots of curvature), slows as it settles
        const amplitude = this._params
            ? Math.max(
                this._params.p1.amp * Math.exp(-this._params.p1.decay * this._time),
                this._params.p3.amp * Math.exp(-this._params.p3.decay * this._time)
              )
            : 0;

        // Stop drawing when amplitude is negligible — wait for blink to reset
        const isDone = amplitude < 0.008;

        if (!isDone) {
            const DT      = 0.012;   // time step per stroke segment
            const strokes = 60;      // segments per frame → ~5 BPM drawing speed

            this._offCtx.lineCap  = 'round';
            this._offCtx.lineJoin = 'round';

            for (let s = 0; s < strokes; s++) {
                this._time += DT;
                const pos = this._penPos(this._time);
                const px  = cx + pos.x * sc;
                const py  = cy + pos.y * sc;

                // Pen speed → brightness of stroke
                const speed  = Math.hypot(px - this._lastX, py - this._lastY);
                const bright = Math.max(0.04, Math.min(0.55, speed * 0.085));

                // Hue slowly drifts as internal time advances
                const hue = (this._hue + this._time * this._hueSpd) % 360;

                // More saturated and bright at high amplitude (fresh), fades to muted as it decays
                const ampFrac = amplitude / this._maxAmplitude;
                const sat  = 42 + ampFrac * 40;
                const lit  = 50 + ampFrac * 30;

                this._offCtx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${bright})`;
                this._offCtx.lineWidth   = 0.85 + ampFrac * 0.90;
                this._offCtx.beginPath();
                this._offCtx.moveTo(this._lastX, this._lastY);
                this._offCtx.lineTo(px, py);
                this._offCtx.stroke();

                this._lastX = px;
                this._lastY = py;
            }
        }

        // ── Composite: very slow fade so old strokes linger ───────────────────────
        ctx.fillStyle = 'rgba(0,0,2,0.025)';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(this._off, 0, 0);

        // ── Blink-fade overlay ────────────────────────────────────────────────────
        if (this._fade > 0) {
            ctx.fillStyle = `rgba(0,0,0,${this._fade * 0.6})`;
            ctx.fillRect(0, 0, W, H);
        }

        // ── Status ────────────────────────────────────────────────────────────────
        if (isDone && this._fade <= 0) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,175,215,0.18)';
            ctx.fillText('at rest · blink to begin again', W / 2, H - 22);
            ctx.textAlign = 'left';
        } else if (this.t < 4) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,175,215,0.18)';
            ctx.fillText('blink to change the pendulums', W / 2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
