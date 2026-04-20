// Ridgeline Mode — "landscape"
// Joy Division "Unknown Pleasures" aesthetic: 36 horizontal ridge lines stacked vertically,
// displaced by a sum of 4 travelling sine waves. Animated, colourful, hypnotic.
// Bottom ridges = warm (red/orange), top ridges = cool (blue/violet).
// onGaze: creates a local spike on nearby ridgelines.
// onBlink: massive wave of displacement propagates through all ridges.
// Higher ridges mask lower ones for 3D layered depth effect.
class RidgelineMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._NRIDGES  = 36;

        // 4 travelling wave parameters: [amplitude_norm, freq_x, speed, phase]
        this._waves = [
            { A: 0.55, k: 3.2,  w: 0.8,  phi: 0.0  },
            { A: 0.30, k: 6.8,  w: 1.5,  phi: 1.1  },
            { A: 0.18, k: 13.5, w: 2.8,  phi: 2.6  },
            { A: 0.10, k: 22.0, w: 4.2,  phi: 0.85 },
        ];

        // Per-ridge spike accumulator (from gaze or blink)
        this._spikes = new Float32Array(this._NRIDGES);
        // Spike decay per frame
        this._SPIKE_DECAY = 0.94;

        // Gaze position (normalised)
        this._gazeX = 0.5;
        this._gazeY = 0.5;
        this._hasGaze = false;
    }

    startScene() {
        this.t = 0;
        this._spikes.fill(0);
        this._hasGaze = false;
    }

    onBlink() {
        // Massive spike across all ridges — propagates from centre outward
        for (let i = 0; i < this._NRIDGES; i++) {
            const frac = Math.abs(i / this._NRIDGES - 0.5) * 2; // 0 at mid, 1 at edges
            this._spikes[i] += (1.0 - frac * 0.6) * 0.9;
        }
    }

    onGaze(nx, ny) {
        if (nx == null || ny == null) {
            this._hasGaze = false;
            return;
        }
        this._gazeX   = nx;
        this._gazeY   = ny;
        this._hasGaze = true;
    }

    // ── Helper ─────────────────────────────────────────────────────────

    // Ridge hue: bottom (i=0) = warm red, top (i=N-1) = cool blue/violet
    _ridgeHue(i) {
        const frac = i / (this._NRIDGES - 1); // 0 = bottom, 1 = top
        // 0°(red) → 40°(orange) → 260°(blue) → 290°(violet)
        return frac < 0.5
            ? frac * 2 * 50            // red → orange in bottom half
            : 50 + (frac - 0.5) * 2 * 240; // orange → blue → violet in top half
    }

    // Displacement at position (xNorm, ridgeIndex) at time t
    _displacement(xNorm, ridgeIdx) {
        const ridgeFrac = ridgeIdx / (this._NRIDGES - 1);
        // Phase offset between ridges creates the "wave travelling through the stack" look
        const ridgeOffset = ridgeFrac * Math.PI * 2.5;
        let d = 0;
        for (const w of this._waves) {
            d += w.A * Math.sin(w.k * xNorm * Math.PI * 2 - w.w * this.t + w.phi + ridgeOffset);
        }
        // Add spike contribution: spike is Gaussian around gaze X or centred for blink
        const spike = this._spikes[ridgeIdx];
        if (spike > 0.001) {
            const spikeX = this._hasGaze ? this._gazeX : 0.5;
            const dx = xNorm - spikeX;
            d += spike * Math.exp(-dx * dx * 28);
        }
        return d;
    }

    // ── Main draw ───────────────────────────────────────────────────────

    draw(dt) {
        this.t += dt;

        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;

        // Pure black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // Apply gaze spike (only when gaze is present, small continuous addition)
        if (this._hasGaze) {
            const gazeRidgeIdx = Math.floor(this._gazeY * this._NRIDGES);
            const gri = Math.max(0, Math.min(this._NRIDGES - 1, gazeRidgeIdx));
            // Affect ±3 ridges around gaze Y
            for (let di = -3; di <= 3; di++) {
                const ri = gri + di;
                if (ri < 0 || ri >= this._NRIDGES) continue;
                const falloff = Math.exp(-di * di * 0.4);
                this._spikes[ri] = Math.min(0.5, this._spikes[ri] + 0.008 * falloff);
            }
        }

        // Decay spikes
        for (let i = 0; i < this._NRIDGES; i++) {
            this._spikes[i] *= this._SPIKE_DECAY;
        }

        // Layout: ridges fill a band in the middle/lower 70% of the canvas
        const topMargin    = H * 0.08;
        const bottomMargin = H * 0.12;
        const stackHeight  = H - topMargin - bottomMargin;
        const ridgeSpacing = stackHeight / (this._NRIDGES - 1);
        const ampScale     = ridgeSpacing * 2.2; // max displacement in pixels

        // Draw bottom → top so higher ridges paint over lower (depth illusion)
        const NPTS = Math.min(W, 512); // horizontal sample resolution

        for (let i = 0; i < this._NRIDGES; i++) {
            // i=0 = bottom, i=N-1 = top
            const baseY = topMargin + stackHeight - i * ridgeSpacing;
            const hue   = this._ridgeHue(i);
            const sat   = 82;
            const lum   = 52 + 20 * (i / (this._NRIDGES - 1)); // top ridges slightly brighter

            // Build the ridge path
            const pts = [];
            for (let pi = 0; pi <= NPTS; pi++) {
                const xNorm = pi / NPTS;
                const px    = xNorm * W;
                const disp  = this._displacement(xNorm, i);
                const py    = baseY - disp * ampScale;
                pts.push({ x: px, y: py });
            }

            // Fill area ABOVE the ridge line to black (masking = 3D illusion)
            // Fill from top of canvas down to the ridge line
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(W, 0);
            // trace the ridge from right to left at the top of fill
            for (let pi = NPTS; pi >= 0; pi--) {
                ctx.lineTo(pts[pi].x, pts[pi].y);
            }
            ctx.closePath();
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.restore();

            // Draw the ridge stroke
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let pi = 1; pi <= NPTS; pi++) {
                ctx.lineTo(pts[pi].x, pts[pi].y);
            }
            ctx.strokeStyle = `hsl(${hue}, ${sat}%, ${lum}%)`;
            ctx.lineWidth   = 1.5;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            // Slightly glow the top ridges
            if (i > this._NRIDGES * 0.7) {
                ctx.shadowColor = `hsl(${hue}, 90%, 70%)`;
                ctx.shadowBlur  = 4;
            }
            ctx.stroke();
            ctx.restore();
        }

        // Always reset
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
