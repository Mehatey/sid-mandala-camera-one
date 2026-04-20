// Kaleid Mode — your face shattered into N-fold mandala symmetry.
// The camera feed is sliced into angular wedges, alternately mirror-reflected,
// and tiled around the screen centre. Hue shifts per-slice in a slow rainbow cycle.
// The circle iris-opens on start, pinching closed on each blink before reopening.
// Blink: fold count advances (4→6→8→10→12→16→4…). Flash of white light.
// Gesture: hand height continuously controls segment count (4–20).
//          Pinch: reverse rotation direction.
class KaleidMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._video = null;
        this._N     = 8;       // current N (smoothly lerped)
        this._tN    = 8;       // target N
        this._rot   = 0;       // rotation accumulator
        this._rotDir = 1;      // +1 or -1
        this._hue   = 0;       // slow hue drift
        this._flash = 0;       // blink flash 0→1
        this._R     = 0;       // iris radius, grows toward maxR
        this._hasFilter = false;
    }

    setVideo(v) { this._video = v; }

    startScene() {
        this.t      = 0;
        this._N     = 8;  this._tN = 8;
        this._rot   = 0;  this._rotDir = 1;
        this._hue   = 0;
        this._flash = 0;
        this._R     = 0;
        this._hasFilter = (typeof this.ctx.filter !== 'undefined');

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() {
        const seq = [4, 6, 8, 10, 12, 16];
        const cur = seq.reduce((best, n) => Math.abs(n - this._tN) < Math.abs(best - this._tN) ? n : best, seq[0]);
        const idx = seq.indexOf(cur);
        this._tN   = seq[(idx + 1) % seq.length];
        this._flash = 1.0;
        this._R    *= 0.15;   // iris snaps shut, then reopens
        this._hue  += 55 + Math.random() * 30;
    }

    onHandMove(nx, ny) {
        // Hand height → segment count: top = many, bottom = few
        this._tN = Math.round(4 + (1 - ny) * 16);
        this._tN = Math.max(4, Math.min(20, this._tN));
    }

    onPinch() {
        this._rotDir *= -1;
    }

    draw(time) {
        this.t     += 0.016;
        this._flash = Math.max(0, this._flash - 0.016 * 2.5);
        this._N    += (this._tN - this._N)   * 0.06;
        this._hue  += 0.10;
        this._rot  += (0.006 + this._flash * 0.05) * this._rotDir;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy) * 1.1;

        // Iris opens slowly
        this._R += (maxR - this._R) * 0.004;

        ctx.fillStyle = '#000008';
        ctx.fillRect(0, 0, W, H);

        if (!this._video || this._video.readyState < 2) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,175,215,0.25)';
            ctx.fillText('enable camera — the kaleidoscope waits', cx, cy);
            ctx.textAlign = 'left';
            return;
        }

        const vW  = this._video.videoWidth  || 320;
        const vH  = this._video.videoHeight || 240;
        const N   = Math.round(this._N);
        const ang = (Math.PI * 2) / N;
        const R   = this._R;

        // Scale video to more than cover the mandala circle
        const sc = (R * 2.6) / Math.min(vW, vH);
        const dW = vW * sc, dH = vH * sc;

        ctx.save();
        ctx.translate(cx, cy);

        for (let i = 0; i < N; i++) {
            ctx.save();
            ctx.rotate(ang * i + this._rot);
            if (i % 2 === 1) ctx.scale(1, -1);

            // Pie-slice clip
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, R, 0, ang);
            ctx.closePath();
            ctx.clip();

            // Per-slice hue shift: creates rainbow mandala
            const sliceHue = (this._hue + i * (360 / N) * 0.65) % 360;
            if (this._hasFilter) {
                ctx.filter = `saturate(180%) hue-rotate(${sliceHue.toFixed(0)}deg) brightness(1.08)`;
            }
            ctx.scale(-1, 1); // selfie-mirror
            ctx.drawImage(this._video, -dW / 2, -dH / 2, dW, dH);
            if (this._hasFilter) ctx.filter = 'none';

            ctx.restore();
        }

        // Soft centre glow
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.14);
        cg.addColorStop(0, `hsla(${this._hue % 360}, 90%, 90%, 0.6)`);
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.14, 0, Math.PI * 2);
        ctx.fill();

        // Outer vignette — fades to black at edge
        const og = ctx.createRadialGradient(0, 0, R * 0.78, 0, 0, R);
        og.addColorStop(0, 'rgba(0,0,0,0)');
        og.addColorStop(1, 'rgba(0,0,8,1)');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Flash overlay on blink
        if (this._flash > 0) {
            ctx.fillStyle = `rgba(235,240,255,${this._flash * 0.35})`;
            ctx.fillRect(0, 0, W, H);
        }

        if (this.t < 5) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,175,215,0.18)';
            ctx.fillText('blink shifts symmetry · hand height = fold count · pinch reverses', cx, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
