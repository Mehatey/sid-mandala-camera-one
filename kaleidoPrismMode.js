// Kaleidoscope Prism — "Chromatic Glass"
// 8-fold radial mirror drawn three times with hue-rotated offsets,
// creating rainbow fringing at every reflection edge — like light splitting
// through a prism. The R/B channels sit slightly offset from the green centre.
// onBlink: reverses rotation direction + cycles fold count.
// onGaze: X axis controls how wide the chromatic spread is.
class KaleidoPrismMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._video   = null;
        this._stream  = null;
        this._sceneId = 0;
        this._folds   = [8, 12, 6, 10];
        this._foldIdx = 0;
        this._rot     = 0;
        this._rotDir  = 1;
        this._rotSpd  = 0.04;
        this._spread  = 5;   // px offset for R/B copies
        this._off     = null;
        this._offCtx  = null;
    }

    startScene() {
        this.t = 0; this._rot = 0; this._rotDir = 1; this._foldIdx = 0; this._spread = 5;
        this._sceneId++;
        this._initCamera(this._sceneId);
    }

    stopScene() {
        this._sceneId++;
        if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
        if (this._video)  { this._video.srcObject = null; this._video = null; }
    }

    onBlink() {
        this._rotDir  = -this._rotDir;
        this._foldIdx = (this._foldIdx + 1) % this._folds.length;
    }

    onGaze(nx, ny) {
        if (nx == null) return;
        this._spread += (nx * 14 + 2 - this._spread) * 0.04;
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
        } catch (e) { console.warn('KaleidoPrism: camera unavailable', e); }
    }

    _ensureOff() {
        const W = this.canvas.width, H = this.canvas.height;
        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width = W; this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }
    }

    _drawKaleidoscope(ctx, src, N, cx, cy, W, H) {
        const wedge = (Math.PI * 2) / N;
        const R     = Math.min(W, H) * 0.50;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._rot);
        for (let i = 0; i < N; i++) {
            ctx.save();
            ctx.rotate(i * wedge);
            if (i % 2 === 1) ctx.scale(1, -1);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, R, -wedge / 2, wedge / 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(src, -W / 2, -H / 2, W, H);
            ctx.restore();
        }
        ctx.restore();
    }

    draw(dt) {
        this.t   += dt;
        this._rot += this._rotSpd * this._rotDir * dt;
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const N  = this._folds[this._foldIdx];
        const sp = this._spread;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        if (!this._video || this._video.readyState < 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.font = `${Math.floor(H * 0.028)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('requesting camera…', cx, cy);
            return;
        }

        this._ensureOff();
        const oc = this._off, octx = this._offCtx;
        octx.clearRect(0, 0, W, H);
        octx.save();
        octx.translate(W, 0); octx.scale(-1, 1);
        octx.drawImage(this._video, 0, 0, W, H);
        octx.restore();

        // Warm (red-orange) channel — offset upper-left
        ctx.save();
        ctx.filter      = 'hue-rotate(-28deg) saturate(1.9)';
        ctx.globalAlpha = 0.55;
        ctx.translate(-sp * 0.8, -sp * 0.45);
        this._drawKaleidoscope(ctx, oc, N, cx, cy, W, H);
        ctx.restore();

        // Normal centre channel
        ctx.save();
        this._drawKaleidoscope(ctx, oc, N, cx, cy, W, H);
        ctx.restore();

        // Cool (cyan-blue) channel — offset lower-right
        ctx.save();
        ctx.filter      = 'hue-rotate(28deg) saturate(1.9)';
        ctx.globalAlpha = 0.55;
        ctx.translate(sp * 0.8, sp * 0.45);
        this._drawKaleidoscope(ctx, oc, N, cx, cy, W, H);
        ctx.restore();

        // Vignette
        const R   = Math.min(W, H) * 0.50;
        const vig = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, Math.max(W, H) * 0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.88)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
