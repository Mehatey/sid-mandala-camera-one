// Living Mandala Mode — camera as sacred geometry source.
//
// The camera feed is captured, domain-warped, folded into n kaleidoscope sectors,
// fed back into itself with temporal decay, and colour-shifted with a slowly
// drifting hue matrix. The result is completely unrecognisable as a person.
//
// What you see is YOUR presence — the heat, movement, colour of you — transformed
// into a living mandala. You are the pattern. The pattern breathes.
//
// Pipeline per pixel:
//   1. Rotate world coordinates (slow mandala spin)
//   2. Two-level domain warp (breathing, liquid distortion)
//   3. Polar convert → kaleidoscope fold into primary sector
//   4. Sample camera at warped UV (zoom factor keeps face abstract)
//   5. Chromatic aberration: R/G/B sampled at offset radii → rainbow fringing
//   6. Saturation boost → vivid, painterly
//   7. Hue rotation matrix (slowly drifts through the colour wheel)
//   8. Radial mask: dark singularity at centre, dark at edges
//   9. Temporal feedback blend: current frame + decay × previous frame
//
// Blink: cycles sector count 4 → 6 → 8 → 10 → 12 → 4 ...
//        + brief surge that widens the warp amplitude and brightens the glow
//
// No camera: generative layered-sine noise fills the same pipeline.
// All effects remain; only the source changes.
class LivingMandalaMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        // Sector options and current index
        this._sectOpts = [4, 6, 8, 10, 12];
        this._sectIdx  = 2;   // start at 8 sectors

        this._surge     = 0;
        this._feedBuf   = null;   // Float32Array — persists between frames
        this._hm        = new Float32Array(9);   // hue rotation matrix

        this._video     = null;
        this._camCanvas = null;
        this._camCtx    = null;
        this._camReady  = false;

        this._off    = null;
        this._offCtx = null;
    }

    startScene() {
        this.t       = 0;
        this._surge  = 0;
        // Keep sector index between scenes (let it be where it was)

        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 240, OH = Math.round(240 * H / W);

        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }

        // Reset feedback when scene starts (prevents colour bleed from previous mode)
        if (!this._feedBuf || this._feedBuf.length !== OW * OH * 3) {
            this._feedBuf = new Float32Array(OW * OH * 3);
        } else {
            this._feedBuf.fill(0);
        }

        if (!this._camCanvas || this._camCanvas.width !== OW) {
            this._camCanvas        = document.createElement('canvas');
            this._camCanvas.width  = OW;
            this._camCanvas.height = OH;
            this._camCtx           = this._camCanvas.getContext('2d');
        }

        this._initCamera();
    }

    async _initCamera() {
        // Re-use existing stream if still live
        if (this._video && this._video.srcObject && !this._video.paused && this._video.readyState >= 2) {
            this._camReady = true;
            return;
        }
        try {
            if (!this._video) {
                this._video             = document.createElement('video');
                this._video.autoplay    = true;
                this._video.muted       = true;
                this._video.playsInline = true;
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
            });
            this._video.srcObject = stream;
            await this._video.play();
            this._camReady = true;
        } catch (e) {
            this._camReady = false;
        }
    }

    onBlink() {
        this._sectIdx = (this._sectIdx + 1) % this._sectOpts.length;
        this._surge   = 1.0;
    }

    // CSS/SVG standard hue-rotate matrix
    _updateHueMatrix(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const m = this._hm;
        m[0] = 0.213 + c * 0.787 - s * 0.213;
        m[1] = 0.213 - c * 0.213 + s * 0.143;
        m[2] = 0.213 - c * 0.213 - s * 0.787;
        m[3] = 0.715 - c * 0.715 - s * 0.715;
        m[4] = 0.715 + c * 0.285 + s * 0.140;
        m[5] = 0.715 - c * 0.715 + s * 0.715;
        m[6] = 0.072 - c * 0.072 + s * 0.928;
        m[7] = 0.072 - c * 0.072 - s * 0.283;
        m[8] = 0.072 + c * 0.928 + s * 0.072;
    }

    draw(time) {
        this.t      += 0.016;
        this._surge *= 0.92;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const OW  = this._off.width;
        const OH  = this._off.height;
        const t   = this.t;
        const sur = this._surge;

        // ── Capture camera frame ──────────────────────────────────────────────
        let camData = null;
        if (this._camReady && this._video && this._video.readyState >= 2) {
            try {
                this._camCtx.save();
                this._camCtx.translate(OW, 0);   // mirror selfie feed
                this._camCtx.scale(-1, 1);
                this._camCtx.drawImage(this._video, 0, 0, OW, OH);
                this._camCtx.restore();
                camData = this._camCtx.getImageData(0, 0, OW, OH).data;
            } catch (e) { camData = null; }
        }

        // ── Per-frame constants ───────────────────────────────────────────────
        const n           = this._sectOpts[this._sectIdx];
        const sectorAngle = Math.PI / n;           // half-sector width
        const fullSector  = 2 * sectorAngle;       // full sector angle = 2π/n
        const TAU         = Math.PI * 2;

        // Warp amplitude breathes gently
        const warpBase = 0.12 + 0.08 * Math.sin(t * 0.19);
        const warpAmp  = warpBase + sur * 0.10;
        const warpAmpH = warpAmp * 0.50;
        const warpAmpT = warpAmp * 0.20;           // fine warp tier 2

        // Camera zoom: how much of the camera frame to use
        // Smaller = more abstract (face barely recognisable)
        const camZoom  = 0.26 + sur * 0.03;

        // Chromatic aberration offset in normalised coords
        const chrAmt   = 0.013 + sur * 0.006;

        // Slow rotation of the whole mandala
        const rotAngle = t * 0.022;
        const cosRot   = Math.cos(rotAngle);
        const sinRot   = Math.sin(rotAngle);

        // Time-phase terms for domain warp (precomputed, used inside loop)
        const pa = t * 0.90, pb = t * 0.65;
        const pc = t * 0.75, pd = t * 0.55;
        const pe = t * 1.20, pf = t * 1.10;

        // Update hue rotation matrix (slow drift through colour wheel)
        this._updateHueMatrix(t * 0.13);
        const m  = this._hm;

        const camW = OW, camH = OH;

        // ── Pixel loop ────────────────────────────────────────────────────────
        const img     = this._offCtx.createImageData(OW, OH);
        const buf     = img.data;
        const feed    = this._feedBuf;

        const halfOW  = OW * 0.5;
        const halfOH  = OH * 0.5;
        const halfOC  = Math.min(OW, OH) * 0.5;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                // Normalised coords: shorter dimension maps to [-1, 1]
                const nx = (px - halfOW) / halfOC;
                const ny = (py - halfOH) / halfOC;

                // ── 1. Global rotation ────────────────────────────────────
                const rx = nx * cosRot - ny * sinRot;
                const ry = nx * sinRot + ny * cosRot;

                // ── 2. Domain warp — two levels ───────────────────────────
                // Level 1: broad geological folding
                const wx1 = rx + Math.sin(ry * 3.4 + pa) * warpAmp
                               + Math.cos(rx * 2.2 - pb) * warpAmpH;
                const wy1 = ry + Math.cos(rx * 2.8 - pc) * warpAmp
                               + Math.sin(ry * 1.8 + pd) * warpAmpH;
                // Level 2: fine capillary warp
                const wx  = wx1 + Math.sin(wy1 * 6.5 + pe) * warpAmpT;
                const wy  = wy1 + Math.cos(wx1 * 5.8 - pf) * warpAmpT;

                // ── 3. Polar conversion + kaleidoscope fold ───────────────
                const r   = Math.sqrt(wx * wx + wy * wy);
                let theta = Math.atan2(wy, wx);

                // Fold θ into [0, fullSector], then mirror into [0, sectorAngle]
                theta = ((theta % TAU) + TAU) % TAU;
                theta = theta % fullSector;
                if (theta > sectorAngle) theta = fullSector - theta;

                // ── 4 + 5. Camera sample with chromatic aberration ────────
                const cosT = Math.cos(theta);
                const sinT = Math.sin(theta);
                const sr   = r * camZoom;
                const u0   = 0.5 + cosT * sr;
                const v0   = 0.5 + sinT * sr;

                let R, G, B;

                if (camData) {
                    // R: sampled inward along radial direction
                    const uR  = u0 - cosT * chrAmt,  vR  = v0 - sinT * chrAmt;
                    const cxR = Math.max(0, Math.min(camW-1, uR * camW | 0));
                    const cyR = Math.max(0, Math.min(camH-1, vR * camH | 0));
                    R = camData[(cyR * camW + cxR) * 4];

                    // G: centre sample
                    const cxG = Math.max(0, Math.min(camW-1, u0 * camW | 0));
                    const cyG = Math.max(0, Math.min(camH-1, v0 * camH | 0));
                    G = camData[(cyG * camW + cxG) * 4 + 1];

                    // B: sampled outward
                    const uB  = u0 + cosT * chrAmt,  vB  = v0 + sinT * chrAmt;
                    const cxB = Math.max(0, Math.min(camW-1, uB * camW | 0));
                    const cyB = Math.max(0, Math.min(camH-1, vB * camH | 0));
                    B = camData[(cyB * camW + cxB) * 4 + 2];

                } else {
                    // ── Generative noise source (no camera) ───────────────
                    // Layered sines in the folded coordinate space
                    const nv =
                        Math.sin(cosT * sr * 9.4 + sinT * sr * 6.2 + t * 1.1) * 0.45 +
                        Math.cos(cosT * sr * 6.8 - sinT * sr * 8.5 + t * 0.8) * 0.32 +
                        Math.sin((cosT + sinT) * sr * 5.5 + r * 3.8 + t * 0.6) * 0.23;
                    const v01 = (nv + 1) * 0.5;
                    R = 30  + v01 * 200 | 0;
                    G = 15  + v01 * 150 | 0;
                    B = 80  + v01 * 175 | 0;
                }

                // ── 6. Saturation boost ───────────────────────────────────
                const grey  = 0.299 * R + 0.587 * G + 0.114 * B;
                const sat   = 1.72;
                R = grey + (R - grey) * sat;
                G = grey + (G - grey) * sat;
                B = grey + (B - grey) * sat;

                // ── 7. Hue rotation matrix ────────────────────────────────
                const hR = m[0]*R + m[1]*G + m[2]*B;
                const hG = m[3]*R + m[4]*G + m[5]*B;
                const hB = m[6]*R + m[7]*G + m[8]*B;
                R = hR < 0 ? 0 : hR > 255 ? 255 : hR;
                G = hG < 0 ? 0 : hG > 255 ? 255 : hG;
                B = hB < 0 ? 0 : hB > 255 ? 255 : hB;

                // ── 8. Radial mask ────────────────────────────────────────
                // Dark singularity at centre (r < 0.12), dark beyond r = 0.88
                const coreMask = r < 0.12 ? r / 0.12 : 1;
                const edgeFade = r > 0.82 ? Math.max(0, 1 - (r - 0.82) * 5.5) : 1;
                const mask     = coreMask * edgeFade;
                R *= mask; G *= mask; B *= mask;

                // ── 9. Temporal feedback blend ────────────────────────────
                // More feedback during surge → longer trails after blink
                const fi   = (py * OW + px) * 3;
                const fStr = 0.74 + sur * 0.07;
                R = feed[fi]     * fStr + R * (1 - fStr);
                G = feed[fi + 1] * fStr + G * (1 - fStr);
                B = feed[fi + 2] * fStr + B * (1 - fStr);

                // Store back into feedback buffer
                feed[fi]     = R;
                feed[fi + 1] = G;
                feed[fi + 2] = B;

                const idx    = (py * OW + px) * 4;
                buf[idx]     = R | 0;
                buf[idx + 1] = G | 0;
                buf[idx + 2] = B | 0;
                buf[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch (e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        // ── Decorative mandala overlay ────────────────────────────────────────
        const cx  = W / 2;
        const cy  = H / 2;
        const sc  = Math.min(W, H) * 0.5;
        const glo = 0.06 + sur * 0.06;

        // Concentric ring tracery at harmonic radii
        const rings = [0.18, 0.36, 0.55, 0.75, 0.92];
        for (const rf of rings) {
            ctx.beginPath();
            ctx.arc(cx, cy, sc * rf, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${glo})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
        }

        // Radial spokes at each sector boundary + mid-line (2n total)
        const spokeCount = n * 2;
        const spokeAngle = TAU / spokeCount;
        for (let i = 0; i < spokeCount; i++) {
            const a = i * spokeAngle + rotAngle;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * sc * 0.94, cy + Math.sin(a) * sc * 0.94);
            ctx.strokeStyle = `rgba(255, 255, 255, ${glo * 0.65})`;
            ctx.lineWidth   = 0.4;
            ctx.stroke();
        }

        // Petal dots at ring / spoke intersections (every other ring × every spoke)
        for (const rf of [0.36, 0.75]) {
            for (let i = 0; i < spokeCount; i++) {
                const a  = i * spokeAngle + rotAngle;
                const px = cx + Math.cos(a) * sc * rf;
                const py = cy + Math.sin(a) * sc * rf;
                ctx.beginPath();
                ctx.arc(px, py, 1.8, 0, TAU);
                ctx.fillStyle = `rgba(255, 255, 255, ${glo * 1.4})`;
                ctx.fill();
            }
        }

        // Centre breathing glow
        const cp  = 0.45 + 0.55 * Math.sin(t * 0.38);
        const cg  = ctx.createRadialGradient(cx, cy, 0, cx, cy, sc * 0.065);
        cg.addColorStop(0,   `rgba(255, 255, 255, ${cp * 0.72})`);
        cg.addColorStop(0.5, `rgba(210, 180, 255, ${cp * 0.22})`);
        cg.addColorStop(1,   'rgba(160, 120, 255, 0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, sc * 0.065, 0, TAU);
        ctx.fill();

        // Blink colour surge (screen blend, colour-shifts with current hue)
        if (sur > 0.05) {
            const hueAngle = (t * 0.13 % TAU) * (180 / Math.PI);
            const prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `hsla(${hueAngle}, 80%, 70%, ${sur * 0.16})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = prev;
        }
    }
}
