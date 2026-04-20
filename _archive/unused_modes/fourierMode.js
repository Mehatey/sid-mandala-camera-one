// Fourier Mode — epicycles: decomposing shapes into infinite nested rotations.
// Any curve can be recreated as a sum of circles spinning at different speeds.
// Watch the mechanical ballet of arms trace out a perfect flower, heart, or star.
// Made famous by 3Blue1Brown — here it's live, interactive, and generative.
// Hand X controls how many epicycles are visible (complexity).
// Hand Y controls the rotation speed.
// Pinch / blink cycles through target shapes.
class FourierMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._time    = 0;      // parameter along the curve (0→2π)
        this._speed   = 0.012;  // radians per frame
        this._targetSpeed = 0.012;
        this._nTerms  = 80;     // how many epicycles to draw
        this._targetN = 80;

        this._epicycles = [];   // sorted by amplitude: [{freq, amp, phase}]
        this._trace     = [];   // [{x,y}] — the path drawn by the outermost tip
        this._maxTrace  = 2400;

        this._shapeIdx  = 0;
        this._hue       = 220;

        this.handX = null;
        this.handY = null;
        this._lastHandTime = -999;
    }

    startScene() {
        this.t     = 0;
        this._time = 0;
        this._trace = [];
        this._shapeIdx = 0;
        this._hue  = 210 + Math.random() * 60;
        this._speed = 0.012;
        this._targetSpeed = 0.012;
        this._nTerms = 80;
        this._targetN = 80;
        this.handX = null;
        this.handY = null;
        this._lastHandTime = -999;
        this._loadShape(0);

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    // ── Shape library — sampled as (x, y) at 128 points ───────────────────────
    _sampleShape(idx) {
        const N = 128;
        const pts = [];

        if (idx === 0) {
            // Trefoil knot projection (3-petal rose)
            for (let i = 0; i < N; i++) {
                const t = (i / N) * Math.PI * 2;
                pts.push({
                    x:  Math.cos(t) + 0.5 * Math.cos(2 * t),
                    y:  Math.sin(t) - 0.5 * Math.sin(2 * t),
                });
            }
        } else if (idx === 1) {
            // Heart curve
            for (let i = 0; i < N; i++) {
                const t = (i / N) * Math.PI * 2;
                pts.push({
                    x:  16 * Math.pow(Math.sin(t), 3) / 17,
                    y: -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) / 16,
                });
            }
        } else if (idx === 2) {
            // Butterfly curve (Temple H. Fay)
            const pts2 = [];
            for (let i = 0; i < N * 6; i++) {
                const t  = (i / (N * 6)) * Math.PI * 12;
                const r  = Math.exp(Math.cos(t)) - 2 * Math.cos(4*t) - Math.pow(Math.sin(t/12), 5);
                pts2.push({ x: r * Math.sin(t), y: -r * Math.cos(t) });
            }
            // Downsample to N points
            for (let i = 0; i < N; i++) {
                pts.push(pts2[Math.floor(i * pts2.length / N)]);
            }
        } else if (idx === 3) {
            // Lissajous 3:4 ratio
            for (let i = 0; i < N; i++) {
                const t = (i / N) * Math.PI * 2;
                pts.push({
                    x:  Math.sin(3 * t + Math.PI / 4),
                    y:  Math.sin(4 * t),
                });
            }
        } else if (idx === 4) {
            // Rhodonea rose: r = cos(5θ) — 5-petal rose
            for (let i = 0; i < N; i++) {
                const t = (i / N) * Math.PI * 2;
                const r = Math.cos(5 * t);
                pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
            }
        } else if (idx === 5) {
            // Epitrochoid (Spirograph) — small circle rolling on large circle
            for (let i = 0; i < N; i++) {
                const t = (i / N) * Math.PI * 2;
                const R = 1, r = 0.4, d = 0.7;
                pts.push({
                    x: (R + r) * Math.cos(t) - d * Math.cos((R + r) / r * t),
                    y: (R + r) * Math.sin(t) - d * Math.sin((R + r) / r * t),
                });
            }
        }

        // Normalize to ±1 range
        let maxR = 0;
        for (const p of pts) {
            const r = Math.sqrt(p.x * p.x + p.y * p.y);
            if (r > maxR) maxR = r;
        }
        if (maxR > 0) {
            for (const p of pts) { p.x /= maxR; p.y /= maxR; }
        }

        return pts;
    }

    _loadShape(idx) {
        const pts = this._sampleShape(idx);
        this._epicycles = _dft(pts);
        this._trace = [];
        this._time  = 0;
    }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.handX = (1 - normX) * W;
        this.handY = normY * H;
        this._lastHandTime = this.t;

        // Hand X: number of visible epicycles (3 on left, all on right)
        this._targetN = Math.max(3, Math.round(normX * (this._epicycles.length)));

        // Hand Y: speed (raised = slow, low = faster)
        this._targetSpeed = 0.004 + (1 - normY) * 0.035;
    }

    onPinch(label, normX, normY) {
        this._shapeIdx = (this._shapeIdx + 1) % 6;
        this._hue      = (this._hue + 50 + Math.random() * 60) % 360;
        this._loadShape(this._shapeIdx);
    }

    onBlink() { this.onPinch('R', 0.5, 0.5); }

    draw(time) {
        this.t += 0.016;

        if (this.handX !== null && this.t - this._lastHandTime > 0.5) {
            this.handX = null;
            this.handY = null;
            this._targetN     = 80;
            this._targetSpeed = 0.012;
        }

        this._speed  += (this._targetSpeed - this._speed)  * 0.04;
        this._nTerms += (this._targetN     - this._nTerms) * 0.06;
        this._time   += this._speed;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const sc  = Math.min(W, H) * 0.40;

        // Slow fade
        ctx.fillStyle = 'rgba(2, 1, 10, 0.045)';
        ctx.fillRect(0, 0, W, H);

        const nDraw = Math.min(Math.round(this._nTerms), this._epicycles.length);
        const t     = this._time;

        // Walk the epicycles, accumulating tip position
        let x = cx, y = cy;
        const hue = this._hue;

        for (let i = 0; i < nDraw; i++) {
            const { freq, amp, phase } = this._epicycles[i];
            const r  = amp * sc;
            const angle = freq * t + phase;
            const nx = x + r * Math.cos(angle);
            const ny = y + r * Math.sin(angle);

            // Draw the arm
            const armA = Math.max(0.04, Math.min(0.22, r / sc * 0.8));
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 55%, 65%, ${armA * 0.45})`;
            ctx.lineWidth   = 0.8;
            ctx.stroke();

            // Draw the connecting spoke
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = `hsla(${hue}, 65%, 72%, ${armA * 0.9})`;
            ctx.lineWidth   = 1.0;
            ctx.stroke();

            x = nx; y = ny;
        }

        // Record trace
        this._trace.push({ x, y });
        if (this._trace.length > this._maxTrace) this._trace.shift();

        // Draw the traced path — bright at front, fades at tail
        if (this._trace.length > 2) {
            const len = this._trace.length;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw in chunks with varying alpha
            const CHUNK = 40;
            for (let i = 1; i < len; i++) {
                const frac = i / len;
                const a    = Math.pow(frac, 1.5) * 0.85;
                ctx.beginPath();
                ctx.moveTo(this._trace[i-1].x, this._trace[i-1].y);
                ctx.lineTo(this._trace[i].x,   this._trace[i].y);
                ctx.strokeStyle = `hsla(${(hue + frac * 40) % 360}, 85%, 78%, ${a})`;
                ctx.lineWidth   = 1.2 + frac * 0.8;
                ctx.stroke();
            }
        }

        // Tip dot
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 92%, 0.9)`;
        ctx.fill();

        // Origin dot
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 60%, 70%, 0.4)`;
        ctx.fill();

        // If we've completed a full revolution, clear trace so it redraws fresh
        if (this._time > Math.PI * 2) {
            this._time -= Math.PI * 2;
            // Keep last 60 points so there's no visual pop
            if (this._trace.length > 60) {
                this._trace = this._trace.slice(this._trace.length - 60);
            }
        }
    }
}

// ── DFT: decompose N sample points into N Fourier terms ─────────────────────
// Returns array of {freq, amp, phase} sorted by amplitude descending.
function _dft(signal) {
    const N = signal.length;
    const result = [];
    for (let k = 0; k < N; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < N; n++) {
            const phi = (2 * Math.PI * k * n) / N;
            re += signal[n].x * Math.cos(phi) + signal[n].y * Math.sin(phi);
            im += signal[n].y * Math.cos(phi) - signal[n].x * Math.sin(phi);
        }
        re /= N; im /= N;
        result.push({
            freq:  k,
            amp:   Math.sqrt(re * re + im * im),
            phase: Math.atan2(im, re),
        });
    }
    return result.sort((a, b) => b.amp - a.amp);
}
