// Spectrum Mode — "harmonic field"
// Audio-reactive: 7 frequency bands each mapped to a distinct shape vocabulary + colour.
// Sub-bass → concentric hexagons · Bass → ribbon spirals · Low-mid → triangle constellations
// Mid → spirograph roses · High-mid → fractal ferns · Presence → starbursts · Air → ice crystals
// Silent fallback: 40 ambient seed particles drift gently.
// onBlink cycles through 3 visual style presets. stopScene closes the mic + AudioContext.
class SpectrumMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        // Audio
        this._ac        = null;
        this._analyser  = null;
        this._micStream = null;
        this._fftSize   = 2048;
        this._fftData   = null;   // Uint8Array, assigned after init
        this._sampleRate = 44100;
        this._micReady  = false;

        // EMA-smoothed band values [0..1] for 7 bands
        this._bands = new Float32Array(7);
        this._EMA   = 0.28;

        // Visual style preset: 0=sharp/crisp, 1=smeared/bloom, 2=wireframe
        this._style = 0;

        // Ambient seed particles (fallback when silent)
        this._seeds = [];
        this._NSEED = 40;

        // Per-frame state for deterministic but animated sub-components
        this._hexPhase     = 0;
        this._ribbonPhase  = 0;
        this._triPhase     = 0;
        this._rosePhase    = 0;
        this._fernPhase    = 0;
        this._sparkPhase   = 0;
        this._crystalPhase = 0;

        // Offscreen buffer (draw at full res, composite with 'screen')
        this._buf    = null;
        this._bufCtx = null;
    }

    startScene() {
        this.t           = 0;
        this._bands.fill(0);
        this._hexPhase     = 0;
        this._ribbonPhase  = 0;
        this._triPhase     = 0;
        this._rosePhase    = 0;
        this._fernPhase    = 0;
        this._sparkPhase   = 0;
        this._crystalPhase = 0;
        this._style = 0;
        this._initSeeds();
        this._initBuffer();
        this._initMic();
    }

    stopScene() {
        if (this._micStream) {
            this._micStream.getTracks().forEach(t => t.stop());
            this._micStream = null;
        }
        if (this._ac) {
            try { this._ac.close(); } catch(e) {}
            this._ac = null;
        }
        this._analyser = null;
        this._micReady = false;
    }

    onBlink() {
        this._style = (this._style + 1) % 3;
        // Flash the seeds outward
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        for (const s of this._seeds) {
            const angle = Math.random() * Math.PI * 2;
            s.vx = Math.cos(angle) * (1.5 + Math.random() * 2.5);
            s.vy = Math.sin(angle) * (1.5 + Math.random() * 2.5);
        }
    }

    onGaze(nx, ny) {
        // Not used — audio reactive, not gaze reactive
    }

    // ── Private helpers ─────────────────────────────────────────────────

    _initSeeds() {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        this._seeds = [];
        for (let i = 0; i < this._NSEED; i++) {
            this._seeds.push({
                x:    Math.random() * W,
                y:    Math.random() * H,
                vx:   (Math.random() - 0.5) * 0.6,
                vy:   (Math.random() - 0.5) * 0.6,
                hue:  Math.random() * 360,
                size: 1.5 + Math.random() * 3,
                life: Math.random(),
            });
        }
    }

    _initBuffer() {
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        if (!this._buf) this._buf = document.createElement('canvas');
        this._buf.width  = W;
        this._buf.height = H;
        this._bufCtx = this._buf.getContext('2d');
    }

    async _initMic() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this._micStream = stream;
            this._ac = new (window.AudioContext || window.webkitAudioContext)();
            this._sampleRate = this._ac.sampleRate;

            const src = this._ac.createMediaStreamSource(stream);
            const analyser = this._ac.createAnalyser();
            analyser.fftSize = this._fftSize;
            analyser.smoothingTimeConstant = 0.0; // we do our own EMA
            src.connect(analyser);

            this._analyser = analyser;
            this._fftData  = new Uint8Array(analyser.frequencyBinCount);
            this._micReady = true;
        } catch(e) {
            // Permission denied or unavailable — ambient mode only
            this._micReady = false;
        }
    }

    // Returns average normalised power [0..1] for a frequency range [loHz, hiHz]
    _bandPower(loHz, hiHz) {
        if (!this._analyser || !this._fftData) return 0;
        const binHz = this._sampleRate / this._fftSize;
        const lo = Math.max(0, Math.floor(loHz / binHz));
        const hi = Math.min(this._fftData.length - 1, Math.ceil(hiHz / binHz));
        if (hi < lo) return 0;
        let sum = 0;
        for (let i = lo; i <= hi; i++) sum += this._fftData[i];
        return sum / ((hi - lo + 1) * 255);
    }

    _readBands() {
        if (!this._analyser || !this._fftData) return;
        this._analyser.getByteFrequencyData(this._fftData);
        const raw = [
            this._bandPower(20,   80),   // sub-bass
            this._bandPower(80,   250),  // bass
            this._bandPower(250,  500),  // low-mid
            this._bandPower(500,  2000), // mid
            this._bandPower(2000, 4000), // high-mid
            this._bandPower(4000, 8000), // presence
            this._bandPower(8000, 20000),// air
        ];
        const a = this._EMA;
        for (let i = 0; i < 7; i++) {
            this._bands[i] = a * raw[i] + (1 - a) * this._bands[i];
        }
    }

    // ── Shape drawers ───────────────────────────────────────────────────

    // Sub-bass: concentric hexagons, deep violet/indigo
    _drawHexagons(bc, energy) {
        if (energy < 0.008) return;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const maxR = Math.min(W, H) * 0.45;
        const n = this._style === 2 ? 4 : 7;
        for (let k = 0; k < n; k++) {
            const frac  = (k + 1) / n;
            const r     = frac * maxR * (0.6 + energy * 0.4);
            const rot   = this._hexPhase + k * 0.18;
            const alpha = energy * (1 - frac * 0.5) * (this._style === 1 ? 0.55 : 0.70);
            const lum   = 35 + frac * 40;
            bc.beginPath();
            for (let s = 0; s < 6; s++) {
                const a = rot + (s / 6) * Math.PI * 2;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                s === 0 ? bc.moveTo(px, py) : bc.lineTo(px, py);
            }
            bc.closePath();
            bc.strokeStyle = `hsla(${260 + k * 8}, 85%, ${lum}%, ${alpha})`;
            bc.lineWidth   = this._style === 1 ? 2.5 : 1.2;
            bc.stroke();
        }
    }

    // Bass: undulating ribbon spirals, crimson/deep red
    _drawRibbons(bc, energy) {
        if (energy < 0.008) return;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const maxR = Math.min(W, H) * 0.42;
        const nArms = this._style === 2 ? 2 : 3;
        for (let arm = 0; arm < nArms; arm++) {
            const baseAngle = (arm / nArms) * Math.PI * 2 + this._ribbonPhase;
            bc.beginPath();
            let first = true;
            const steps = this._style === 1 ? 200 : 140;
            for (let i = 0; i < steps; i++) {
                const frac = i / steps;
                const r    = frac * maxR;
                const wave = Math.sin(frac * Math.PI * 8 + this._ribbonPhase * 3) * energy * maxR * 0.18;
                const angle = baseAngle + frac * Math.PI * 4;
                const px = cx + Math.cos(angle) * (r + wave);
                const py = cy + Math.sin(angle) * (r + wave);
                first ? bc.moveTo(px, py) : bc.lineTo(px, py);
                first = false;
            }
            bc.strokeStyle = `hsla(${355 + arm * 10}, 90%, ${40 + energy * 35}%, ${energy * 0.65})`;
            bc.lineWidth = this._style === 1 ? 2.2 : 1.0;
            bc.stroke();
        }
    }

    // Low-mid: rotating triangular constellations, amber/orange
    _drawTriangles(bc, energy) {
        if (energy < 0.008) return;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const maxR = Math.min(W, H) * 0.40;
        const n = this._style === 2 ? 2 : 4;
        for (let k = 0; k < n; k++) {
            const frac = (k + 1) / n;
            const r    = frac * maxR * (0.5 + energy * 0.5);
            const rot  = this._triPhase + k * 0.44;
            const alpha= energy * 0.70 * (1 - frac * 0.3);
            bc.beginPath();
            for (let s = 0; s < 3; s++) {
                const a = rot + (s / 3) * Math.PI * 2;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                s === 0 ? bc.moveTo(px, py) : bc.lineTo(px, py);
            }
            bc.closePath();
            bc.strokeStyle = `hsla(${30 + k * 6}, 95%, ${55 + energy * 25}%, ${alpha})`;
            bc.lineWidth   = 1.0;
            bc.stroke();
            // Connect vertices to centre with faint lines
            if (this._style !== 2) {
                for (let s = 0; s < 3; s++) {
                    const a = rot + (s / 3) * Math.PI * 2;
                    bc.beginPath();
                    bc.moveTo(cx, cy);
                    bc.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                    bc.strokeStyle = `hsla(30, 90%, 65%, ${alpha * 0.25})`;
                    bc.lineWidth   = 0.5;
                    bc.stroke();
                }
            }
        }
    }

    // Mid: spirograph rose curves, gold/yellow
    _drawRoses(bc, energy) {
        if (energy < 0.008) return;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const maxR = Math.min(W, H) * 0.38;
        const k = this._style === 2 ? 3 : (this._style === 1 ? 5 : 4);
        const alpha = energy * 0.62;
        bc.beginPath();
        const steps = 360;
        for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * Math.PI * 2 * k;
            const r = maxR * energy * Math.abs(Math.cos(k * theta / 2 + this._rosePhase));
            const px = cx + Math.cos(theta + this._rosePhase) * r;
            const py = cy + Math.sin(theta + this._rosePhase) * r;
            i === 0 ? bc.moveTo(px, py) : bc.lineTo(px, py);
        }
        bc.strokeStyle = `hsla(48, 98%, ${60 + energy * 30}%, ${alpha})`;
        bc.lineWidth   = this._style === 1 ? 2.5 : 1.3;
        bc.stroke();
    }

    // High-mid: branching fractal ferns, lime/teal
    _drawFern(bc, energy) {
        if (energy < 0.012) return;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const maxLen = Math.min(W, H) * 0.30 * energy;
        const maxDepth = this._style === 2 ? 3 : 4;
        const alpha = energy * 0.55;
        const hue = 130 + this._style * 20; // lime→teal across styles

        const drawBranch = (x, y, angle, len, depth) => {
            if (depth > maxDepth || len < 5) return;
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            bc.beginPath();
            bc.moveTo(x, y);
            bc.lineTo(ex, ey);
            const lum = 55 + depth * 8;
            bc.strokeStyle = `hsla(${hue + depth * 12}, 90%, ${lum}%, ${alpha * (1 - depth / (maxDepth + 1))})`;
            bc.lineWidth = Math.max(0.4, 1.4 - depth * 0.3);
            bc.stroke();
            const spread = 0.35 + energy * 0.15;
            const wobble = Math.sin(this._fernPhase * (depth + 1)) * 0.15;
            drawBranch(ex, ey, angle - spread + wobble, len * 0.65, depth + 1);
            drawBranch(ex, ey, angle + spread + wobble, len * 0.65, depth + 1);
            if (depth < 2) drawBranch(ex, ey, angle + wobble * 0.5, len * 0.72, depth + 1);
        };

        // 3 fern roots evenly spaced
        for (let k = 0; k < 3; k++) {
            const rootAngle = this._fernPhase * 0.4 + (k / 3) * Math.PI * 2 - Math.PI / 2;
            const rx = cx + Math.cos(rootAngle) * Math.min(W, H) * 0.10;
            const ry = cy + Math.sin(rootAngle) * Math.min(W, H) * 0.10;
            drawBranch(rx, ry, rootAngle - Math.PI * 0.5 * (k % 2 === 0 ? 1 : -1), maxLen, 0);
        }
    }

    // Presence: starburst sparkles in orbit, cyan
    _drawStarbursts(bc, energy) {
        if (energy < 0.008) return;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const orbitR = Math.min(W, H) * 0.34;
        const n = this._style === 2 ? 6 : 12;
        for (let k = 0; k < n; k++) {
            const angle = this._sparkPhase + (k / n) * Math.PI * 2;
            const r     = orbitR * (0.6 + 0.4 * Math.sin(this._sparkPhase * 1.7 + k));
            const sx    = cx + Math.cos(angle) * r;
            const sy    = cy + Math.sin(angle) * r;
            const spikes = 6;
            const outerR = 3 + energy * 14;
            const innerR = outerR * 0.38;
            const alpha  = energy * 0.8;
            bc.beginPath();
            for (let s = 0; s < spikes * 2; s++) {
                const a  = (s / (spikes * 2)) * Math.PI * 2;
                const rr = s % 2 === 0 ? outerR : innerR;
                const px = sx + Math.cos(a) * rr;
                const py = sy + Math.sin(a) * rr;
                s === 0 ? bc.moveTo(px, py) : bc.lineTo(px, py);
            }
            bc.closePath();
            bc.fillStyle = `hsla(185, 95%, 70%, ${alpha})`;
            bc.fill();
        }
    }

    // Air: scattered ice crystal dots, white/pale blue
    _drawCrystals(bc, energy) {
        if (energy < 0.006) return;
        const W = this.canvas.width, H = this.canvas.height;
        const n  = Math.floor(30 + energy * 80);
        const r  = 1.2 + energy * 3.5;
        const rng = (seed) => {
            // deterministic pseudo-random from seed
            let x = Math.sin(seed * 127.1 + this._crystalPhase * 0.1) * 43758.5453;
            return x - Math.floor(x);
        };
        for (let i = 0; i < n; i++) {
            const px = rng(i * 3.1) * W;
            const py = rng(i * 3.1 + 1.7) * H;
            const sz = r * (0.5 + rng(i * 3.1 + 3.3));
            const alpha = energy * 0.65 * (0.5 + rng(i * 3.1 + 5.9) * 0.5);
            bc.beginPath();
            bc.arc(px, py, sz, 0, Math.PI * 2);
            bc.fillStyle = `hsla(205, 60%, ${88 + rng(i) * 12}%, ${alpha})`;
            bc.fill();
        }
    }

    // Ambient seed particles (silent / no mic)
    _drawSeeds() {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        for (const s of this._seeds) {
            s.x += s.vx;
            s.y += s.vy;
            s.vx += (Math.random() - 0.5) * 0.04;
            s.vy += (Math.random() - 0.5) * 0.04;
            s.vx *= 0.995;
            s.vy *= 0.995;
            if (s.x < 0) s.x += W; if (s.x > W) s.x -= W;
            if (s.y < 0) s.y += H; if (s.y > H) s.y -= H;
            s.hue = (s.hue + 0.15) % 360;
            s.life = (s.life + 0.002) % 1;
            const alpha = 0.08 + 0.12 * Math.sin(s.life * Math.PI);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue}, 60%, 65%, ${alpha})`;
            ctx.fill();
        }
    }

    // ── Main draw ───────────────────────────────────────────────────────

    draw(ts) {
        const dt   = 0.016;
        this.t    += dt;

        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;

        // Ensure buffer matches canvas
        if (!this._buf || this._buf.width !== W || this._buf.height !== H) {
            this._initBuffer();
        }

        // Read microphone data
        if (this._micReady) this._readBands();

        // Update phase clocks
        const speed = 0.6 + this._bands[0] * 1.2;
        this._hexPhase     += dt * 0.22 * speed;
        this._ribbonPhase  += dt * 0.18 * speed;
        this._triPhase     += dt * 0.28 * speed;
        this._rosePhase    += dt * 0.14 * speed;
        this._fernPhase    += dt * 0.20 * speed;
        this._sparkPhase   += dt * 0.35 * speed;
        this._crystalPhase += dt * 0.10;

        // Background fade — very dark, slowly clearing
        ctx.fillStyle = 'rgba(0, 0, 8, 0.10)';
        ctx.fillRect(0, 0, W, H);

        // Detect silence (sum of bands below threshold)
        const totalEnergy = Array.from(this._bands).reduce((a, b) => a + b, 0);
        const isSilent    = totalEnergy < 0.05;

        if (isSilent) {
            // Ambient seed particles
            this._drawSeeds();
        } else {
            // Draw all 7 bands into the offscreen buffer with 'screen' blending
            const bc = this._bufCtx;
            bc.clearRect(0, 0, W, H);

            bc.lineCap  = 'round';
            bc.lineJoin = 'round';

            this._drawHexagons(bc,    this._bands[0]);
            this._drawRibbons(bc,     this._bands[1]);
            this._drawTriangles(bc,   this._bands[2]);
            this._drawRoses(bc,       this._bands[3]);
            this._drawFern(bc,        this._bands[4]);
            this._drawStarbursts(bc,  this._bands[5]);
            this._drawCrystals(bc,    this._bands[6]);

            // Composite with screen blend onto main canvas
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(this._buf, 0, 0);
            ctx.restore();
        }

        // Always reset
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
