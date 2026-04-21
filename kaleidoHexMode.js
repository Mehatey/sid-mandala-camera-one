// Kaleidoscope Hex — "Honeycomb Mirror"
// Canvas tiled with pointy-top hexagons. Every cell shows the live camera
// at a unique rotation that slowly drifts — creating an infinite mirrored
// room where you see yourself from every angle at once.
// Hex borders glow softly. Centre cell is slightly larger for a focal point.
// onBlink: all hex rotations jump to new random angles (shatter + reform).
// onGaze: pulls all hex rotations toward a common angle, unifying the mosaic.
class KaleidoHexMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._video   = null;
        this._stream  = null;
        this._sceneId = 0;
        this._hexes   = [];
        this._HEX_R   = 60;    // hex radius (centre to vertex)
        this._gazeUnify = 0;   // 0 = independent rotations, 1 = all aligned
        this._gazeAngle = 0;
        this._off     = null;
        this._offCtx  = null;
    }

    startScene() {
        this.t = 0; this._gazeUnify = 0;
        this._sceneId++;
        this._buildGrid();
        this._initCamera(this._sceneId);
    }

    stopScene() {
        this._sceneId++;
        if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
        if (this._video)  { this._video.srcObject = null; this._video = null; }
    }

    onBlink() {
        for (const h of this._hexes) {
            h.angle = Math.random() * Math.PI * 2;
        }
    }

    onGaze(nx, ny) {
        if (nx == null) return;
        // Y: how much cells unify (gaze up = independent, gaze down = all one angle)
        this._gazeUnify += ((1 - ny) * 0.8 - this._gazeUnify) * 0.03;
        // X: the unified target angle
        this._gazeAngle += (nx * Math.PI * 2 - this._gazeAngle) * 0.03;
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
        } catch (e) { console.warn('KaleidoHex: camera unavailable', e); }
    }

    _buildGrid() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const r = this._HEX_R;
        const dx = r * Math.sqrt(3);  // column step
        const dy = r * 1.5;           // row step
        const cols = Math.ceil(W / dx) + 2;
        const rows = Math.ceil(H / dy) + 2;
        const cx = W / 2, cy = H / 2;

        this._hexes = [];
        let idx = 0;
        for (let row = -1; row <= rows; row++) {
            for (let col = -1; col <= cols; col++) {
                const x = col * dx + (row % 2 !== 0 ? dx / 2 : 0);
                const y = row * dy;
                // Skip cells too far off canvas
                if (x < -r * 2 || x > W + r * 2) continue;
                if (y < -r * 2 || y > H + r * 2) continue;

                const distFromCentre = Math.hypot(x - cx, y - cy);
                const isCentre = distFromCentre < r * 1.5;

                // Stable per-cell seed for consistent speed/direction
                const seed = row * 1000 + col;
                const rotSpd = (0.04 + ((Math.abs(seed * 7919) % 1000) / 1000) * 0.18) *
                               (seed % 2 === 0 ? 1 : -1);

                this._hexes.push({
                    x, y,
                    angle:    ((idx * 137.508) % 360) * Math.PI / 180,
                    rotSpd,
                    isCentre,
                });
                idx++;
            }
        }
    }

    _hexPath(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + i * Math.PI / 3;
            const px = x + r * Math.cos(a);
            const py = y + r * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
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
        this.t += dt;
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const r  = this._HEX_R;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // Rebuild grid on resize (cheap check: expected col count)
        const expectedCols = Math.ceil(W / (r * Math.sqrt(3))) + 3;
        const expectedRows = Math.ceil(H / (r * 1.5)) + 3;
        if (this._hexes.length === 0 ||
            this._hexes.length < expectedCols * expectedRows * 0.4) {
            this._buildGrid();
        }

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

        // Scale: fill the hex (~2.2× the hex diameter from canvas centre)
        const drawScale = (r * 2.5) / Math.min(W * 0.5, H * 0.5);

        // Update angles and draw each hex
        for (const h of this._hexes) {
            // Blend toward unified angle if gaze is pulling
            const target = this._gazeAngle;
            h.angle += h.rotSpd * dt * (1 - this._gazeUnify);
            h.angle += (target - h.angle) * this._gazeUnify * 0.02;

            const dispR = h.isCentre ? r - 0.5 : r - 1.5;

            ctx.save();
            this._hexPath(ctx, h.x, h.y, dispR);
            ctx.clip();

            // Draw camera centred on hex, rotated
            ctx.translate(h.x, h.y);
            ctx.rotate(h.angle);
            ctx.drawImage(oc, -W * drawScale / 2, -H * drawScale / 2,
                              W * drawScale,       H * drawScale);
            ctx.restore();
        }

        // Hex borders (drawn separately so they're always on top of fills)
        for (const hex of this._hexes) {
            this._hexPath(ctx, hex.x, hex.y, r - 1);
            ctx.strokeStyle = hex.isCentre ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.20)';
            ctx.lineWidth   = hex.isCentre ? 1.5 : 0.8;
            ctx.stroke();
        }

        // Central subtle bloom
        const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
        bloom.addColorStop(0, 'rgba(255,255,255,0.06)');
        bloom.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bloom;
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
