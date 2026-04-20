// Epicycle Mode — "epicycles"
// Fourier epicycles: 7 nested rotating arms each at a different integer multiple of a base frequency.
// The traced path of the final arm tip is stored in a circular buffer (last 800 points) and drawn
// as a glowing rainbow trail. onBlink cycles through 3 frequency presets, completely changing the shape.
// Background: very dark, slow fade. Trail blooms with screen blending.
class EpicycleMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._baseT = 0;    // internal time driving arm angles

        // Frequency presets
        this._presets = [
            [1, 2, 3, 5, 7, 11, 13],
            [1, 3, 5, 7, 9, 11, 13],
            [2, 3, 5, 7, 11, 13, 17],
        ];
        this._presetIdx = 0;

        // Trail — circular buffer of {x, y} points
        this._TRAIL = 800;
        this._trail  = [];
        this._trailHead = 0; // write index

        // Per-arm angles (computed each frame)
        this._angles = [];

        // Offscreen for bloom
        this._bloom    = null;
        this._bloomCtx = null;
    }

    startScene() {
        this.t         = 0;
        this._baseT    = 0;
        this._presetIdx = 0;
        this._trail     = new Array(this._TRAIL).fill(null);
        this._trailHead = 0;
        this._angles    = new Array(this._presets[0].length).fill(0);
        this._initBloom();
    }

    onBlink() {
        this._presetIdx = (this._presetIdx + 1) % this._presets.length;
        // Don't clear trail — the transition is beautiful as old path fades
    }

    onGaze(nx, ny) {
        // Not used
    }

    // ── Private helpers ─────────────────────────────────────────────────

    _initBloom() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        if (!this._bloom) this._bloom = document.createElement('canvas');
        this._bloom.width  = W;
        this._bloom.height = H;
        this._bloomCtx = this._bloom.getContext('2d');
    }

    _armRadii() {
        const R0  = Math.min(this.canvas.width, this.canvas.height) * 0.28;
        const n   = this._presets[this._presetIdx].length;
        const radii = [];
        let r = R0;
        for (let i = 0; i < n; i++) {
            radii.push(r);
            r *= 0.62;
        }
        return radii;
    }

    // Hue for arm level: deep blue (outer) → violet → magenta → red → orange (inner)
    _armHue(level, total) {
        const frac = level / Math.max(total - 1, 1);
        return 220 + frac * 140; // 220°(blue) → 360°/0°(red) → eventually orange
    }

    // ── Main draw ───────────────────────────────────────────────────────

    draw(ts) {
        const dt = 0.016;
        this.t      += dt;
        // Base period ~40s
        const basePeriod = 40.0;
        const baseOmega  = (Math.PI * 2) / basePeriod;
        this._baseT += dt * baseOmega;

        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;

        // Ensure bloom matches canvas
        if (!this._bloom || this._bloom.width !== W || this._bloom.height !== H) {
            this._initBloom();
        }

        // Background fade — very slow, almost imperceptible
        ctx.fillStyle = 'rgba(0, 0, 4, 0.04)';
        ctx.fillRect(0, 0, W, H);

        const cx = W / 2, cy = H / 2;
        const freqs  = this._presets[this._presetIdx];
        const radii  = this._armRadii();
        const n      = freqs.length;

        // Compute arm endpoint positions
        const joints = [{ x: cx, y: cy }];
        for (let i = 0; i < n; i++) {
            const angle = freqs[i] * this._baseT;
            this._angles[i] = angle;
            const prev  = joints[joints.length - 1];
            joints.push({
                x: prev.x + Math.cos(angle) * radii[i],
                y: prev.y + Math.sin(angle) * radii[i],
            });
        }

        // Store tip in trail buffer
        const tip = joints[joints.length - 1];
        this._trail[this._trailHead] = { x: tip.x, y: tip.y };
        this._trailHead = (this._trailHead + 1) % this._TRAIL;

        // Draw circles and connecting lines (thin, faint)
        ctx.save();
        ctx.globalAlpha = 0.18;
        for (let i = 0; i < n; i++) {
            const center = joints[i];
            const hue    = this._armHue(i, n);
            ctx.beginPath();
            ctx.arc(center.x, center.y, radii[i], 0, Math.PI * 2);
            ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
            ctx.lineWidth   = 0.6;
            ctx.stroke();
        }
        ctx.restore();

        // Draw arm lines
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth   = 1.0;
        for (let i = 0; i < n; i++) {
            const a = joints[i], b = joints[i + 1];
            const hue = this._armHue(i, n);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsl(${hue}, 85%, 65%)`;
            ctx.stroke();
        }
        ctx.restore();

        // Draw trail — collect valid points in order from oldest to newest
        // Count valid trail points
        let validCount = 0;
        for (let i = 0; i < this._TRAIL; i++) {
            if (this._trail[i] !== null) validCount++;
        }

        if (validCount > 2) {
            // Build ordered array: oldest first (trailHead is the next-write slot = oldest valid)
            const pts = [];
            for (let i = 0; i < this._TRAIL; i++) {
                const idx = (this._trailHead + i) % this._TRAIL;
                if (this._trail[idx] !== null) pts.push(this._trail[idx]);
            }

            // Draw trail bloom onto bloom canvas, then composite with 'screen'
            const bc = this._bloomCtx;
            bc.clearRect(0, 0, W, H);

            // Two passes for bloom: wide soft pass + sharp bright pass
            for (let pass = 0; pass < 2; pass++) {
                bc.beginPath();
                bc.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    bc.lineTo(pts[i].x, pts[i].y);
                }
                if (pass === 0) {
                    bc.lineWidth   = 5.0;
                    bc.globalAlpha = 0.22;
                } else {
                    bc.lineWidth   = 1.8;
                    bc.globalAlpha = 0.85;
                }

                // Rainbow gradient along path
                // Canvas strokeStyle can't be per-point inline — use hue based on trail position index
                // For performance: use a single strokeStyle with overall rainbow tint,
                // then re-draw in segments of ~40 points with different hues
                const segSize = 40;
                for (let seg = 0; seg < pts.length - 1; seg += segSize) {
                    const segEnd = Math.min(seg + segSize, pts.length - 1);
                    const frac   = seg / pts.length;
                    const hue    = (frac * 360 + this.t * 15) % 360;
                    const lum    = pass === 0 ? 55 : 70;
                    bc.beginPath();
                    bc.moveTo(pts[seg].x, pts[seg].y);
                    for (let i = seg + 1; i <= segEnd; i++) {
                        bc.lineTo(pts[i].x, pts[i].y);
                    }
                    bc.strokeStyle = `hsl(${hue}, 95%, ${lum}%)`;
                    bc.stroke();
                }
            }
            bc.globalAlpha = 1;

            // Composite bloom onto main canvas with 'screen'
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(this._bloom, 0, 0);
            ctx.restore();
        }

        // Draw the tip dot
        ctx.save();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.restore();

        // Always reset
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
