// Frequency Mode — the shape of sound made visible.
// The live microphone waveform wraps around a circle, drawing its own mandala.
// Silence = a perfect still ring. A whisper = gentle ripples.
// Clap your hands, play music, sing — every sound has a different shape.
// Bass frequencies: deep red-warm. Treble: electric blue-cyan. Voice: gold.
// Multiple overlapping rotations create depth and interference patterns.
// Requires: enable mic button in sidebar.
class FrequencyMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._timeData  = null;
        this._freqData  = null;
        this._sampleRate = 44100;
        this._hasAudio  = false;

        this._rotation  = 0;
        this._volume    = 0;
        this._bassEnergy  = 0;
        this._midEnergy   = 0;
        this._trebEnergy  = 0;

        // Smoothed waveform buffer for this frame
        this._wave = new Float32Array(512);
    }

    startScene() {
        this.t          = 0;
        this._rotation  = 0;
        this._volume    = 0;
        this._bassEnergy = 0;
        this._midEnergy  = 0;
        this._trebEnergy = 0;
        this._hasAudio  = false;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    setAudio(freqData, timeData, sampleRate) {
        this._timeData   = timeData;
        this._freqData   = freqData;
        this._sampleRate = sampleRate;
        this._hasAudio   = true;

        // Compute band energies (normalised 0→1)
        const fftSize   = freqData.length * 2;
        const bassCut   = Math.floor(300  * fftSize / sampleRate);
        const midCut    = Math.floor(3000 * fftSize / sampleRate);
        let bassSum = 0, midSum = 0, trebSum = 0;
        let bassN = 0, midN = 0, trebN = 0;
        for (let i = 1; i < freqData.length; i++) {
            if (i <= bassCut)      { bassSum += freqData[i]; bassN++; }
            else if (i <= midCut)  { midSum  += freqData[i]; midN++;  }
            else                   { trebSum += freqData[i]; trebN++; }
        }
        const bs = bassN  ? bassSum / bassN / 255  : 0;
        const ms = midN   ? midSum  / midN  / 255  : 0;
        const ts = trebN  ? trebSum / trebN / 255   : 0;

        // Smooth energy values
        this._bassEnergy += (bs - this._bassEnergy) * 0.15;
        this._midEnergy  += (ms - this._midEnergy)  * 0.15;
        this._trebEnergy += (ts - this._trebEnergy) * 0.15;

        // RMS volume
        let rms = 0;
        for (let i = 0; i < timeData.length; i++) {
            const v = (timeData[i] - 128) / 128;
            rms += v * v;
        }
        this._volume += (Math.sqrt(rms / timeData.length) - this._volume) * 0.20;

        // Downsample timeData (2048) to _wave (512)
        const step = timeData.length / this._wave.length;
        for (let i = 0; i < this._wave.length; i++) {
            this._wave[i] = (timeData[Math.floor(i * step)] - 128) / 128;
        }
    }

    draw(time) {
        this.t += 0.016;
        // Rotation speed increases with volume
        this._rotation += 0.0008 + this._volume * 0.015;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const R   = Math.min(W, H) * 0.36;

        // Slow fade
        ctx.fillStyle = 'rgba(0, 0, 2, 0.038)';
        ctx.fillRect(0, 0, W, H);

        if (!this._hasAudio) {
            ctx.font = '11px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180, 175, 220, 0.22)';
            ctx.fillText('enable mic · any sound shapes the ring', cx, cy + 16);
            ctx.textAlign = 'left';
            return;
        }

        const N   = this._wave.length;
        const bas = this._bassEnergy;
        const mid = this._midEnergy;
        const tre = this._trebEnergy;
        const vol = this._volume;

        // Colour derived from frequency balance
        // Bass dominant → warm red-orange, treble dominant → electric cyan, balanced → gold
        const hueBase = 30 + bas * (-20) + tre * 170 + mid * 40;
        const sat     = 60 + vol * 35;
        const lit     = 55 + vol * 25;

        // ── Draw multiple radial waveform rings ────────────────────────────────
        // Each ring: slightly different radius and rotation offset → interference
        const RINGS = 4;
        for (let ring = 0; ring < RINGS; ring++) {
            const ringFrac   = ring / RINGS;
            const baseR      = R * (0.55 + ringFrac * 0.45);
            const rotOffset  = this._rotation * (1 - ringFrac * 0.4) + ringFrac * 0.7;
            const amplitude  = baseR * (0.18 + vol * 0.55) * (1 - ringFrac * 0.3);
            const ringHue    = (hueBase + ringFrac * 40) % 360;
            const ringA      = (0.055 + vol * 0.12) * (1 - ringFrac * 0.35);

            ctx.beginPath();
            for (let i = 0; i <= N; i++) {
                const j     = i % N;
                const angle = (j / N) * Math.PI * 2 + rotOffset;
                const r     = baseR + this._wave[j] * amplitude;
                const x     = cx + Math.cos(angle) * r;
                const y     = cy + Math.sin(angle) * r;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = `hsla(${ringHue}, ${sat}%, ${lit}%, ${ringA})`;
            ctx.lineWidth   = 1.0 + vol * 1.8;
            ctx.lineCap     = 'round';
            ctx.stroke();
        }

        // ── Fill-between version (inner waveform area) for the first ring ─────
        {
            const baseR    = R * 0.55;
            const amplitude = baseR * (0.18 + vol * 0.55);
            ctx.beginPath();
            for (let i = 0; i <= N; i++) {
                const j     = i % N;
                const angle = (j / N) * Math.PI * 2 + this._rotation;
                const r     = baseR + this._wave[j] * amplitude;
                const x     = cx + Math.cos(angle) * r;
                const y     = cy + Math.sin(angle) * r;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            const fillA = vol * 0.045;
            ctx.fillStyle = `hsla(${hueBase}, ${sat}%, ${lit}%, ${fillA})`;
            ctx.fill();
        }

        // ── Mirrored second waveform (reversed rotation) creates star-like forms ─
        {
            const baseR     = R * 0.58;
            const amplitude = baseR * (0.14 + vol * 0.40);
            const rotRev    = -this._rotation * 0.72;
            ctx.beginPath();
            for (let i = 0; i <= N; i++) {
                const j     = i % N;
                const angle = (j / N) * Math.PI * 2 + rotRev;
                const r     = baseR - this._wave[j] * amplitude;
                const x     = cx + Math.cos(angle) * r;
                const y     = cy + Math.sin(angle) * r;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = `hsla(${(hueBase + 140) % 360}, ${sat}%, ${lit}%, ${0.032 + vol * 0.065})`;
            ctx.lineWidth   = 1.0;
            ctx.stroke();
        }

        // ── Frequency bar ring (outer) — FFT magnitude as radial bars ─────────
        if (this._freqData) {
            const BARS     = 96;
            const barR     = R * 1.12;
            const barScale = R * 0.22;
            const barRot   = this._rotation * 0.2;
            for (let i = 0; i < BARS; i++) {
                const binIdx = Math.floor(i / BARS * Math.min(this._freqData.length, 160));
                const barH   = (this._freqData[binIdx] / 255) * barScale;
                if (barH < 0.5) continue;
                const angle  = (i / BARS) * Math.PI * 2 + barRot;
                const x1 = cx + Math.cos(angle) * barR;
                const y1 = cy + Math.sin(angle) * barR;
                const x2 = cx + Math.cos(angle) * (barR + barH);
                const y2 = cy + Math.sin(angle) * (barR + barH);
                const barHue = (hueBase + (i / BARS) * 60) % 360;
                const barA   = (this._freqData[binIdx] / 255) * 0.55;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `hsla(${barHue}, 80%, 78%, ${barA})`;
                ctx.lineWidth   = 1.8;
                ctx.stroke();
            }
        }

        // ── Centre glow — intensity from volume ──────────────────────────────
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.40);
        cg.addColorStop(0,   `hsla(${hueBase}, 80%, 90%, ${vol * 0.40})`);
        cg.addColorStop(0.5, `hsla(${hueBase}, 70%, 65%, ${vol * 0.10})`);
        cg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.40, 0, Math.PI * 2);
        ctx.fill();
    }
}
