// Spectrogram Mode — a mathematically synthesized spectrogram.
// Not an FFT of real audio — generated from a drifting harmonic drone
// with slowly sweeping formant bands, just like a singing bowl or whale song.
// Warm amber/orange on deep navy — meditative, no blink mechanic.
class SpectrogramMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this._spec    = null;
        this._specCtx = null;
        this._skip    = 0;
        this.FMIN     = 28;
        this.FMAX     = 9000;
    }

    startScene() {
        this.t     = 0;
        this._skip = 0;

        // Fundamental — slowly drifting drone (~singing bowl at A2)
        this._f0 = 110;

        // Three formant bands: slow sinusoidal sweeps at different speeds
        this._formants = [
            { baseFreq: 380,  phase: 0.00, driftSpd: 0.022, aPhase: 0.0, aSpd: 0.040, amp: 0.32 },
            { baseFreq: 1250, phase: 1.85, driftSpd: 0.014, aPhase: 2.2, aSpd: 0.026, amp: 0.20 },
            { baseFreq: 3800, phase: 3.60, driftSpd: 0.008, aPhase: 4.5, aSpd: 0.016, amp: 0.11 },
        ];

        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this._ensureBuffer(W, H, true);
    }

    onBlink() {} // purely contemplative — no interaction

    _ensureBuffer(W, H, clear) {
        if (!this._spec || this._spec.width !== W || this._spec.height !== H) {
            this._spec        = document.createElement('canvas');
            this._spec.width  = W;
            this._spec.height = H;
            this._specCtx     = this._spec.getContext('2d');
            clear = true;
        }
        if (clear) {
            this._specCtx.fillStyle = '#05060e';
            this._specCtx.fillRect(0, 0, W, H);
        }
    }

    // Energy [0,1] → [r,g,b] — the classic amber-on-navy spectrogram palette
    _rgb(e) {
        e = Math.max(0, Math.min(1, e));
        const s = [
            [0.00,   5,   6,  18],
            [0.08,  10,  18,  65],
            [0.18,  22,  48, 138],
            [0.32,  75,  28,   6],
            [0.48, 168,  72,   3],
            [0.63, 228, 138,  12],
            [0.78, 252, 198,  42],
            [0.90, 255, 245, 130],
            [1.00, 255, 255, 212],
        ];
        for (let i = 0; i < s.length - 1; i++) {
            if (e <= s[i + 1][0]) {
                const t = (e - s[i][0]) / (s[i + 1][0] - s[i][0]);
                return [
                    Math.round(s[i][1] + t * (s[i+1][1] - s[i][1])),
                    Math.round(s[i][2] + t * (s[i+1][2] - s[i][2])),
                    Math.round(s[i][3] + t * (s[i+1][3] - s[i][3])),
                ];
            }
        }
        return [255, 255, 212];
    }

    draw(t) {
        this.t += 0.016;
        const TT  = this.t;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        if (!this._specCtx) this.startScene();
        this._ensureBuffer(W, H, false);

        const sc = this._specCtx;

        // Update F0 — very slow sine drift ±10% over ~90s
        this._f0 = 110 * (1 + 0.10 * Math.sin(TT * 0.022 * Math.PI * 2));

        // Update formants — each has its own drift and amplitude breath
        for (const f of this._formants) {
            f.phase  += f.driftSpd * 0.016 * Math.PI * 2;
            f.aPhase += f.aSpd     * 0.016 * Math.PI * 2;
            f._freq   = f.baseFreq * (1 + 0.20 * Math.sin(f.phase));
            f._amp    = f.amp * (0.65 + 0.35 * Math.sin(f.aPhase));
        }

        // New column every 2 frames → ~30 px/s at 60fps → ~26s of history visible
        this._skip = (this._skip + 1) % 2;

        if (this._skip === 0) {
            // Scroll buffer left — safe per canvas spec (uses temp bitmap for self-draw)
            sc.drawImage(this._spec, -1, 0);

            // Compute and write the new rightmost column
            const col    = sc.createImageData(1, H);
            const d      = col.data;
            const logMin = Math.log(this.FMIN);
            const logMax = Math.log(this.FMAX);
            const F0     = this._f0;

            // Global amplitude breath — long slow cycle (14s)
            const breath = 0.82 + 0.18 * Math.sin(TT * 0.071 * Math.PI * 2);

            for (let py = 0; py < H; py++) {
                // Map pixel row → frequency (log scale, low freq at bottom)
                const norm = 1 - py / H;
                const freq = Math.exp(logMin + norm * (logMax - logMin));

                let e = 0;

                // Noise floor — speckled texture
                e += Math.random() * 0.028;

                // Pink noise — more energy at lower frequencies (1/f character)
                e += 0.050 * Math.pow(1 - norm, 1.6) * (0.45 + 0.55 * Math.random());

                // Harmonic comb of F0 — the beautiful ladder structure
                for (let h = 1; h <= 16; h++) {
                    const fH = F0 * h;
                    if (fH > this.FMAX * 1.05) break;

                    // Gaussian peak — narrow (matches real spectrogram peak width)
                    const sigma = Math.max(fH * 0.007, 4);
                    const gauss = Math.exp(-0.5 * ((freq - fH) / sigma) ** 2);
                    if (gauss < 0.001) continue;

                    // Per-harmonic slow breath — makes harmonics pulse independently
                    const hBreathe = 0.60 + 0.40 * Math.sin(TT * 0.080 * Math.PI + h * 0.95);
                    const amp      = (0.88 / (1 + h * 0.46)) * breath * hBreathe;
                    e += gauss * amp;
                }

                // Formant bands — broad resonances that sweep slowly
                for (const f of this._formants) {
                    const sigma = f._freq * 0.22;
                    const gauss = Math.exp(-0.5 * ((freq - f._freq) / sigma) ** 2);
                    if (gauss < 0.001) continue;
                    e += gauss * f._amp;
                }

                const [r, g, b] = this._rgb(Math.min(1, e));
                const idx = py * 4;
                d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = 255;
            }

            sc.putImageData(col, W - 1, 0);
        }

        // ── Render to main canvas ────────────────────────────────────────────────
        ctx.drawImage(this._spec, 0, 0, W, H);

        // "Now" playhead glow at right edge — warm amber light bleeding left
        const ng = ctx.createLinearGradient(W - 50, 0, W, 0);
        ng.addColorStop(0,   'rgba(255, 175, 45, 0)');
        ng.addColorStop(0.6, 'rgba(255, 175, 45, 0.05)');
        ng.addColorStop(1,   'rgba(255, 175, 45, 0.22)');
        ctx.fillStyle = ng;
        ctx.fillRect(W - 50, 0, 50, H);

        // Subtle frequency gridlines at musically meaningful Hz
        const logMin = Math.log(this.FMIN);
        const logMax = Math.log(this.FMAX);
        ctx.strokeStyle = 'rgba(255, 210, 90, 0.055)';
        ctx.lineWidth   = 1.0;
        ctx.setLineDash([3, 9]);
        for (const f of [55, 110, 220, 440, 880, 1760, 3520]) {
            const norm = (Math.log(f) - logMin) / (logMax - logMin);
            const py   = H * (1 - norm);
            ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W - 2, py); ctx.stroke();
        }
        ctx.setLineDash([]);

        // Edge vignette — draws the eye inward, darkens corners
        const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.26, W / 2, H / 2, H * 0.90);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,12,0.62)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
    }
}
