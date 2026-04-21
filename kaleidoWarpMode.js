// Kaleidoscope Warp — "Liquid Mirror"
// Camera pixels are displaced by a sine-wave warp (precomputed per row/col
// for performance) creating a liquid / melting-mirror distortion.
// The warped result is then 6-fold kaleidoscoped.
// Works at 1/4 canvas resolution, scaled up with smoothing for silky look.
// onBlink: reverses warp direction.
// onGaze: Y axis controls warp amplitude (calm ↔ extreme distortion).
class KaleidoWarpMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._video   = null;
        this._stream  = null;
        this._sceneId = 0;
        this._warpDir = 1;
        this._amp     = 18;    // px displacement at 1/4 res
        this._freq    = 0.18;  // spatial frequency (rad/px)

        this._SCALE   = 4;     // 1/4 resolution
        this._src     = null;  this._srcCtx = null;
        this._dst     = null;  this._dstCtx = null;
        this._srcData = null;
        this._dstImg  = null;
        this._sinRow  = null;
        this._cosCol  = null;
    }

    startScene() {
        this.t = 0; this._warpDir = 1; this._amp = 18;
        this._sceneId++;
        this._initBuffers();
        this._initCamera(this._sceneId);
    }

    stopScene() {
        this._sceneId++;
        if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
        if (this._video)  { this._video.srcObject = null; this._video = null; }
    }

    onBlink() { this._warpDir = -this._warpDir; }

    onGaze(nx, ny) {
        if (ny == null) return;
        this._amp += (4 + ny * 36 - this._amp) * 0.04;
    }

    async _initCamera(id) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });
            if (id !== this._sceneId) { stream.getTracks().forEach(t => t.stop()); return; }
            this._stream = stream;
            const v = document.createElement('video');
            v.srcObject = stream; v.autoplay = true; v.muted = true; v.playsInline = true;
            await v.play().catch(() => {});
            this._video = v;
        } catch (e) { console.warn('KaleidoWarp: camera unavailable', e); }
    }

    _initBuffers() {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const bw = Math.max(1, Math.floor(W / this._SCALE));
        const bh = Math.max(1, Math.floor(H / this._SCALE));

        if (!this._src) this._src = document.createElement('canvas');
        this._src.width = bw; this._src.height = bh;
        this._srcCtx = this._src.getContext('2d');

        if (!this._dst) this._dst = document.createElement('canvas');
        this._dst.width = bw; this._dst.height = bh;
        this._dstCtx = this._dst.getContext('2d');
        this._dstImg  = this._dstCtx.createImageData(bw, bh);

        this._sinRow = new Float32Array(bh);
        this._cosCol = new Float32Array(bw);
    }

    draw(dt) {
        this.t += dt;
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // Reinit buffers on resize
        if (!this._src ||
            this._src.width  !== Math.floor(W / this._SCALE) ||
            this._src.height !== Math.floor(H / this._SCALE)) {
            this._initBuffers();
        }

        if (!this._video || this._video.readyState < 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.font = `${Math.floor(H * 0.028)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('requesting camera…', cx, cy);
            return;
        }

        const bw = this._src.width, bh = this._src.height;
        const amp = this._amp, freq = this._freq;
        const t   = this.t;

        // Draw mirrored video to source buffer
        const sctx = this._srcCtx;
        sctx.save();
        sctx.translate(bw, 0); sctx.scale(-1, 1);
        sctx.drawImage(this._video, 0, 0, bw, bh);
        sctx.restore();

        // Precompute displacement per row / column
        const sinRow = this._sinRow, cosCol = this._cosCol;
        for (let y = 0; y < bh; y++) sinRow[y] = amp * Math.sin(y * freq + t * this._warpDir);
        for (let x = 0; x < bw; x++) cosCol[x] = amp * Math.cos(x * freq + t * this._warpDir * 0.7);

        // Read source pixels once
        const srcData = sctx.getImageData(0, 0, bw, bh).data;
        const dstPix  = this._dstImg.data;

        // Apply warp
        for (let y = 0; y < bh; y++) {
            for (let x = 0; x < bw; x++) {
                const sx = Math.max(0, Math.min(bw - 1, Math.round(x + sinRow[y])));
                const sy = Math.max(0, Math.min(bh - 1, Math.round(y + cosCol[x])));
                const si = (sy * bw + sx) * 4;
                const di = (y  * bw + x)  * 4;
                dstPix[di]   = srcData[si];
                dstPix[di+1] = srcData[si+1];
                dstPix[di+2] = srcData[si+2];
                dstPix[di+3] = 255;
            }
        }
        this._dstCtx.putImageData(this._dstImg, 0, 0);

        // Now 6-fold kaleidoscope the warped buffer onto the main canvas
        const N     = 6;
        const wedge = (Math.PI * 2) / N;
        const R     = Math.min(W, H) * 0.50;

        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < N; i++) {
            ctx.save();
            ctx.rotate(i * wedge + t * 0.04 * this._warpDir);
            if (i % 2 === 1) ctx.scale(1, -1);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, R, -wedge / 2, wedge / 2);
            ctx.closePath();
            ctx.clip();
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(this._dst, -W / 2, -H / 2, W, H);
            ctx.restore();
        }
        ctx.restore();

        // Vignette
        const vig = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, Math.max(W, H) * 0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.88)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
