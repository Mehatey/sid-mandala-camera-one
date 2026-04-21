// Kaleidoscope Fractal — "Infinite Depth"
// 8 nested 4-fold mirror layers, each at 68% the scale of the previous and
// rotated by an extra offset. Drawn largest-first so smaller copies appear
// as nested portals at the centre — like falling into a mirrored well.
// Each layer rotates at a slightly different speed so the tunnel spins.
// onBlink: reverses tunnel rotation direction.
// onGaze: X controls angular offset between layers (tight → loose spiral).
class KaleidoFractalMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._video   = null;
        this._stream  = null;
        this._sceneId = 0;
        this._dir     = 1;
        this._rotT    = 0;
        this._layerAngle = 0.38; // rad offset between adjacent layers
        this._off     = null;
        this._offCtx  = null;
    }

    startScene() {
        this.t = 0; this._rotT = 0; this._dir = 1; this._layerAngle = 0.38;
        this._sceneId++;
        this._initCamera(this._sceneId);
    }

    stopScene() {
        this._sceneId++;
        if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
        if (this._video)  { this._video.srcObject = null; this._video = null; }
    }

    onBlink() { this._dir = -this._dir; }

    onGaze(nx, ny) {
        if (nx == null) return;
        this._layerAngle += (0.06 + nx * 0.54 - this._layerAngle) * 0.03;
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
        } catch (e) { console.warn('KaleidoFractal: camera unavailable', e); }
    }

    _ensureOff() {
        const W = this.canvas.width, H = this.canvas.height;
        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width = W; this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }
    }

    draw(dt) {
        this.t   += dt;
        this._rotT += dt;
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;

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

        const numLayers  = 8;
        const zoomFactor = 0.68;
        const N          = 4;
        const wedge      = Math.PI / 2;
        const R          = Math.min(W, H) * 0.52;

        // Draw largest layer first (index 0), smallest last (index 7).
        // Smallest appears on top in the centre — visible as a nested portal.
        for (let layer = 0; layer < numLayers; layer++) {
            const s     = Math.pow(zoomFactor, layer);
            // Each inner layer rotates slightly faster → creates spinning tunnel
            const speed = 0.045 * (1 + layer * 0.18);
            const angle = layer * this._layerAngle * this._dir +
                          this._rotT * speed * this._dir;
            const alpha = 1.0 - layer * 0.06;  // subtle depth fade on outer layers

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.scale(s, s);
            ctx.globalAlpha = Math.max(0.35, alpha);

            for (let k = 0; k < N; k++) {
                ctx.save();
                ctx.rotate(k * wedge);
                if (k % 2 === 1) ctx.scale(1, -1);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, R, -wedge / 2, wedge / 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(oc, -W / 2, -H / 2, W, H);
                ctx.restore();
            }
            ctx.restore();
        }

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
