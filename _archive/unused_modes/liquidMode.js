// Liquid Mode — your camera melted into swirling glass.
// Pixel-level displacement mapping: a rotating wave field pushes every pixel.
// The warp is radially symmetric — it always looks like a mandala in motion.
// Wave complexity grows over time: starts simple, evolves toward chaos.
// A chromatic aberration layer separates RGB channels for prismatic fringes.
// Blink: massive displacement burst that ripples outward and fades.
// Gesture: hand Y = distortion intensity · hand X = wave frequency.
//          Pinch: snap to mirror symmetry for one second, then dissolve back.
class LiquidMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._video  = null;

        // Work at reduced resolution — the blur actually enhances the liquid feel
        this._OW = 240; this._OH = 180;

        this._src    = document.createElement('canvas');
        this._src.width  = this._OW;
        this._src.height = this._OH;
        this._srcCtx = this._src.getContext('2d', { willReadFrequently: true });

        this._out    = document.createElement('canvas');
        this._out.width  = this._OW;
        this._out.height = this._OH;
        this._outCtx = this._out.getContext('2d');

        this._burst   = 0;      // blink burst 0→1
        this._handX   = 0.5;
        this._handY   = 0.5;
        this._layers  = 1;      // wave complexity, grows over time
        this._nextLay = 18;     // when to add next layer
        this._mirror  = 0;      // pinch activates brief mirror mode
        this._clipR   = 0;      // clip radius grows in (growing mandala)
        this._petalA  = 0;      // petal decoration rotation
    }

    setVideo(v) { this._video = v; }

    startScene() {
        this.t       = 0;
        this._burst  = 0;
        this._layers = 1;
        this._nextLay = 18;
        this._handX  = 0.5;
        this._handY  = 0.5;
        this._mirror = 0;
        this._clipR  = 0;
        this._petalA = 0;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() { this._burst = 1.0; }

    onHandMove(nx, ny) {
        this._handX = nx;
        this._handY = ny;
    }

    onPinch() {
        this._mirror = 1.2;   // seconds of mirror symmetry
    }

    draw(time) {
        this.t     += 0.016;
        this._burst = Math.max(0, this._burst - 0.016 * 1.6);
        this._mirror = Math.max(0, this._mirror - 0.016);
        this._petalA += 0.006;

        // Grow wave layers over time
        if (this.t >= this._nextLay && this._layers < 5) {
            this._layers++;
            this._nextLay = this.t + 22;
        }

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;

        // Clip radius grows to fill canvas over ~12 seconds
        const maxClip = Math.min(W, H) * 0.47;
        this._clipR += (maxClip - this._clipR) * 0.007;

        ctx.fillStyle = '#000008';
        ctx.fillRect(0, 0, W, H);

        if (!this._video || this._video.readyState < 2) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,175,215,0.25)';
            ctx.fillText('enable camera — the liquid waits', cx, cy);
            ctx.textAlign = 'left';
            return;
        }

        const OW = this._OW, OH = this._OH;
        const ocx = OW / 2, ocy = OH / 2;

        // Draw mirrored video to source canvas (selfie mode)
        this._srcCtx.save();
        this._srcCtx.scale(-1, 1);
        this._srcCtx.drawImage(this._video, -OW, 0, OW, OH);
        this._srcCtx.restore();

        const srcImg = this._srcCtx.getImageData(0, 0, OW, OH);
        const src    = srcImg.data;
        const outImg = this._srcCtx.createImageData(OW, OH);
        const out    = outImg.data;

        const t        = this.t;
        const amp      = (7 + (1 - this._handY) * 16) * (1 + this._burst * 5);
        const freq     = 2.0 + this._handX * 4;
        const layers   = this._layers;
        const doMirror = this._mirror > 0;
        const aber     = 2.5 + this._burst * 4;  // chromatic aberration radius (pixels)

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                let qx = px, qy = py;

                // Mirror mode: fold into top half + rotate 180 for bottom
                if (doMirror) {
                    qy = qy < ocy ? qy : OH - 1 - qy;
                }

                const rx = qx - ocx;
                const ry = qy - ocy;
                const r  = Math.sqrt(rx * rx + ry * ry) + 0.001;
                const th = Math.atan2(ry, rx);

                // Layer 1: radial pulse (always on)
                let dx = 0, dy = 0;
                const w1 = Math.sin(r * 0.11 - t * 1.4) * amp;
                dx += Math.cos(th) * w1;
                dy += Math.sin(th) * w1;

                if (layers >= 2) {
                    // Angular spin vortex
                    const w2 = Math.sin(th * freq + t * 1.0) * amp * 0.55;
                    dx += -Math.sin(th) * w2;
                    dy +=  Math.cos(th) * w2;
                }
                if (layers >= 3) {
                    // Inward spiral
                    const w3 = Math.cos(r * 0.075 + th * 3 - t * 0.65) * amp * 0.38;
                    dx += Math.cos(th + 1.57) * w3;
                    dy += Math.sin(th + 1.57) * w3;
                }
                if (layers >= 4) {
                    // Fine radial ripples
                    const w4 = Math.sin(r * 0.22 - th * (freq + 2) + t * 1.1) * amp * 0.22;
                    dx += w4;
                    dy += w4 * 0.6;
                }
                if (layers >= 5) {
                    // Chaotic high-frequency shimmer
                    const w5 = Math.cos(r * 0.038 + t * 2.3) * amp * 0.3;
                    dx += Math.sin(th * 7 + t * 0.5) * w5;
                    dy += Math.cos(th * 7 + t * 0.5) * w5;
                }

                const oi = (py * OW + px) * 4;

                // Chromatic aberration: R, G, B sampled at slightly offset positions
                // R channel: displaced slightly outward
                const rMul = 1 + aber / (r + aber);
                const sxR  = Math.round(ocx + (rx + dx) * rMul) | 0;
                const syR  = Math.round(ocy + (ry + dy) * rMul) | 0;
                // G channel: base displacement
                const sxG  = Math.round(px + dx) | 0;
                const syG  = Math.round(py + dy) | 0;
                // B channel: displaced slightly inward
                const bMul = 1 - aber / (r * 2 + aber);
                const sxB  = Math.round(ocx + (rx + dx) * bMul) | 0;
                const syB  = Math.round(ocy + (ry + dy) * bMul) | 0;

                const inR = sxR >= 0 && sxR < OW && syR >= 0 && syR < OH;
                const inG = sxG >= 0 && sxG < OW && syG >= 0 && syG < OH;
                const inB = sxB >= 0 && sxB < OW && syB >= 0 && syB < OH;

                out[oi]   = inR ? src[(syR * OW + sxR) * 4]     : 0;
                out[oi+1] = inG ? src[(syG * OW + sxG) * 4 + 1] : 0;
                out[oi+2] = inB ? src[(syB * OW + sxB) * 4 + 2] : 0;
                out[oi+3] = 255;
            }
        }

        this._outCtx.putImageData(outImg, 0, 0);

        // ── Draw distorted video through growing circular clip ────────────────
        ctx.save();
        ctx.translate(cx, cy);

        const R = this._clipR;

        // Clip: circle
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.clip();

        // Draw distorted video scaled to fill the clip circle
        const ar = OH / OW;
        ctx.drawImage(this._out, -R, -R * ar, R * 2, R * 2 * ar);

        ctx.restore();

        // ── Mandala petal overlay — glowing arcs on top of the video ─────────
        ctx.save();
        ctx.translate(cx, cy);

        const petals = 8;
        const pr     = R * 0.95;

        for (let p = 0; p < petals; p++) {
            const a0 = (p / petals) * Math.PI * 2 + this._petalA;
            const a1 = ((p + 0.5) / petals) * Math.PI * 2 + this._petalA;

            // Inner petal arc
            ctx.save();
            ctx.rotate(a0 + (a1 - a0) * 0.5);
            const petalGrad = ctx.createLinearGradient(0, 0, pr, 0);
            const hBase = (this.t * 20 + p * (360 / petals)) % 360;
            petalGrad.addColorStop(0,   `hsla(${hBase}, 70%, 65%, 0)`);
            petalGrad.addColorStop(0.5, `hsla(${hBase}, 70%, 65%, 0.18)`);
            petalGrad.addColorStop(1,   `hsla(${hBase}, 70%, 65%, 0)`);
            ctx.strokeStyle = petalGrad;
            ctx.lineWidth   = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, pr, -Math.PI / petals, Math.PI / petals);
            ctx.stroke();
            ctx.restore();
        }

        // Outer ring
        ctx.strokeStyle = `rgba(160,190,255,${0.08 + this._burst * 0.25})`;
        ctx.lineWidth   = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.98, 0, Math.PI * 2);
        ctx.stroke();

        // Centre dot
        ctx.fillStyle = `rgba(220,230,255,${0.15 + this._burst * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, 0, 3 + this._burst * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Outer vignette
        ctx.save();
        ctx.translate(cx, cy);
        const vg = ctx.createRadialGradient(0, 0, R * 0.82, 0, 0, R * 1.1);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,8,1)');
        ctx.fillStyle = vg;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (this.t < 5) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,175,215,0.18)';
            ctx.fillText('blink for wave burst · hand Y = intensity · hand X = frequency', cx, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
