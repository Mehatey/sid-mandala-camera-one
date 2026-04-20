// Om Mode — sacred geometry that wakes as you sustain a vocal tone.
// Speak, hum, or chant: the mandala builds layer by layer as you hold the sound.
// The longer and steadier the tone, the more of the geometry reveals itself.
// Release and it slowly retreats. Pitch shifts the colour — deep voice = warm gold,
// higher voice = cool violet. No hands. No eyes. Just your voice.
// Requires: enable mic button in sidebar.
class OmMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._chantLevel = 0;   // 0 (silent) → 1 (fully sustained)
        this._volume     = 0;   // RMS amplitude
        this._pitch      = 136; // Hz, default = Earth's year frequency
        this._hue        = 44;  // colour, driven by pitch
        this._rotation   = 0;
        this._hasAudio   = false;
    }

    startScene() {
        this.t           = 0;
        this._chantLevel = 0;
        this._volume     = 0;
        this._pitch      = 136;
        this._hue        = 44;
        this._rotation   = 0;
        this._hasAudio   = false;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    // Called every frame when mic is active
    setAudio(freqData, timeData, sampleRate) {
        this._hasAudio = true;

        // RMS volume from time-domain data
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
            const v = (timeData[i] - 128) / 128;
            sum += v * v;
        }
        this._volume = Math.sqrt(sum / timeData.length);

        // Dominant pitch in vocal range 80–400 Hz
        const fftSize = freqData.length * 2;
        const minBin  = Math.floor(80  * fftSize / sampleRate);
        const maxBin  = Math.min(freqData.length - 1, Math.floor(400 * fftSize / sampleRate));
        let maxVal = 0, peakBin = minBin;
        for (let i = minBin; i <= maxBin; i++) {
            if (freqData[i] > maxVal) { maxVal = freqData[i]; peakBin = i; }
        }

        const voiced = this._volume > 0.018 && maxVal > 35;
        if (voiced) {
            this._pitch = peakBin * sampleRate / fftSize;
            // Asymptotic rise — takes ~4 seconds to reach 1.0
            this._chantLevel = Math.min(1, this._chantLevel + 0.006 * (1 - this._chantLevel * 0.4));
        } else {
            // Decay — takes ~8 seconds from 1 to 0
            this._chantLevel = Math.max(0, this._chantLevel - 0.0025);
        }

        // Pitch → hue: 80 Hz = 35° (warm amber), 350 Hz = 265° (violet)
        const targetHue = 35 + ((this._pitch - 80) / 270) * 230;
        this._hue += (targetHue - this._hue) * 0.04;
    }

    draw(time) {
        this.t += 0.016;
        const cl  = this._chantLevel;
        this._rotation += 0.0008 + cl * 0.010;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const R   = Math.min(W, H) * 0.42;
        const hue = this._hue;
        const rot = this._rotation;
        const vol = this._volume;

        // Very slow fade — the mandala lingers
        ctx.fillStyle = 'rgba(0, 0, 2, 0.022)';
        ctx.fillRect(0, 0, W, H);

        // Prompt when mic not yet enabled
        if (!this._hasAudio) {
            ctx.font = '11px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180, 175, 220, 0.22)';
            ctx.fillText('enable mic · then speak or hum', cx, cy + 16);
            ctx.textAlign = 'left';
            return;
        }

        if (cl < 0.004 && vol < 0.005) return;

        // ── Drawing helpers ──────────────────────────────────────────────────────

        const layerA = (thresh) => Math.max(0, Math.min(1, (cl - thresh) / 0.16));

        ctx.lineCap = 'round';

        const poly = (n, r, phase, a, lw) => {
            if (a < 0.005) return;
            ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const ang = (i / n) * Math.PI * 2 + phase;
                i === 0
                    ? ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r)
                    : ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
            }
            ctx.strokeStyle = `hsla(${hue}, 72%, 74%, ${a})`;
            ctx.lineWidth = lw;
            ctx.stroke();
        };

        const ring = (r, lw, a) => {
            if (a < 0.005) return;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 62%, 70%, ${a})`;
            ctx.lineWidth = lw;
            ctx.stroke();
        };

        const dotRing = (n, r, phase, sz, a) => {
            if (a < 0.005) return;
            ctx.fillStyle = `hsla(${hue}, 78%, 82%, ${a})`;
            for (let i = 0; i < n; i++) {
                const ang = (i / n) * Math.PI * 2 + phase;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, sz, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        // ── Layer 1: centre orb (threshold 0.00) ─────────────────────────────────
        const l1 = layerA(0.00);
        if (l1 > 0.005) {
            const glowR = R * (0.055 + vol * 0.10 + cl * 0.03);
            const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR * 5);
            cg.addColorStop(0,   `hsla(${hue}, 92%, 97%, ${l1 * (0.65 + vol * 0.35)})`);
            cg.addColorStop(0.25,`hsla(${hue}, 82%, 72%, ${l1 * 0.28})`);
            cg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = cg;
            ctx.beginPath();
            ctx.arc(cx, cy, glowR * 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1.5, glowR * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 90%, 96%, ${l1})`;
            ctx.fill();
        }

        // ── Layer 2: hexagram — two triangles (threshold 0.10) ───────────────────
        const l2 = layerA(0.10);
        poly(3, R * 0.18, rot,              l2 * 0.55, 0.65);
        poly(3, R * 0.18, rot + Math.PI,    l2 * 0.55, 0.65);
        dotRing(6, R * 0.20, rot,           1.6, l2 * 0.68);

        // ── Layer 3: inner hexagon + ring (threshold 0.26) ───────────────────────
        const l3 = layerA(0.26);
        ring(R * 0.23, 0.45, l3 * 0.32);
        poly(6, R * 0.23, rot * 0.65,       l3 * 0.36, 0.50);
        dotRing(12, R * 0.245, rot * 0.5,   1.3, l3 * 0.52);

        // ── Layer 4: 12-pointed star (threshold 0.42) ────────────────────────────
        const l4 = layerA(0.42);
        poly(6, R * 0.40, rot * 0.45,                l4 * 0.40, 0.55);
        poly(6, R * 0.40, rot * 0.45 + Math.PI / 6,  l4 * 0.40, 0.55);
        ring(R * 0.41, 0.38, l4 * 0.25);
        dotRing(24, R * 0.43, rot * 0.28, 1.0, l4 * 0.48);

        // ── Layer 5: outer 8-fold star (threshold 0.58) ──────────────────────────
        const l5 = layerA(0.58);
        poly(8, R * 0.60, rot * 0.30,                l5 * 0.34, 0.50);
        poly(8, R * 0.60, rot * 0.30 + Math.PI / 8,  l5 * 0.34, 0.50);
        ring(R * 0.60, 0.38, l5 * 0.20);
        dotRing(36, R * 0.62, rot * 0.18, 0.85, l5 * 0.42);

        // ── Layer 6: triple outer rings (threshold 0.76) ─────────────────────────
        const l6 = layerA(0.76);
        ring(R * 0.76, 0.45, l6 * 0.28);
        ring(R * 0.84, 0.35, l6 * 0.20);
        ring(R * 0.92, 0.30, l6 * 0.16);
        dotRing(48, R * 0.94, rot * 0.08, 0.72, l6 * 0.36);

        // ── Layer 7: outermost 12-gon (threshold 0.90) ───────────────────────────
        const l7 = layerA(0.90);
        poly(12, R * 0.87, rot * 0.04, l7 * 0.28, 0.48);
        ring(R * 0.99, 0.45, l7 * 0.22);

        // ── Volume ripple — expands outward with each breath push ────────────────
        if (cl > 0.06 && vol > 0.015) {
            const pr = R * (0.08 + cl * 0.55 + vol * 0.35);
            ctx.beginPath();
            ctx.arc(cx, cy, pr, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 85%, 88%, ${vol * cl * 0.45})`;
            ctx.lineWidth = vol * 3.5;
            ctx.stroke();
        }
    }
}
