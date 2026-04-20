// Portal Mode — a nested telescope into your own face.
// The camera is refracted through up to 8 concentric spinning rings.
// Each ring: different zoom, opposite rotation, and its own chromatic hue tint.
// Rings crystallise outward over time — a mandala that grows while you watch.
// Blink: a radial shockwave throws the rings apart, then they settle.
// Gesture: hand X drifts global spin · hand Y warps zoom depth.
//          Pinch: flip all ring directions simultaneously.
class PortalMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._video  = null;
        this._rings  = [];
        this._shock  = 0;
        this._gRot   = 0;     // accumulated global rotation
        this._gSpeed = 0;     // damped hand-driven speed
        this._hue0   = 210;
        this._zoomBias = 0;   // hand Y adjusts overall zoom feel
        this._nextR  = 0;
        this._hasFilter = false;
    }

    setVideo(v) { this._video = v; }

    startScene() {
        this.t       = 0;
        this._rings  = [];
        this._shock  = 0;
        this._gRot   = 0;
        this._gSpeed = 0;
        this._hue0   = 170 + Math.random() * 80;
        this._zoomBias = 0;
        this._nextR  = 2.5;
        this._hasFilter = (typeof this.ctx.filter !== 'undefined');

        // Seed first 3 rings immediately so there's something to see
        for (let i = 0; i < 3; i++) this._addRing(i);

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() {
        this._shock = 1.0;
        this._hue0  = (this._hue0 + 45 + Math.random() * 40) % 360;
    }

    onHandMove(nx, ny) {
        // X: push global spin
        this._gSpeed += (nx - 0.5) * 0.008;
        // Y: shift zoom bias
        this._zoomBias = (ny - 0.5) * 0.6;
    }

    onPinch() {
        for (const r of this._rings) r.speed *= -1;
    }

    _addRing(i) {
        if (this._rings.length >= 8) return;
        const gap = 54;
        this._rings.push({
            index:  i,
            inner:  24  + i * gap,
            outer:  24  + i * gap + gap - 4,
            speed:  (i % 2 === 0 ? 1 : -1) * (0.007 + i * 0.0028),
            rot:    Math.random() * Math.PI * 2,
            segs:   6 + i * 2,                    // more segments in outer rings
            hue:    (this._hue0 + i * 38) % 360,
            zoom:   0.48 + i * 0.10,
            birth:  this.t,
            alpha:  0,
        });
    }

    draw(time) {
        this.t      += 0.016;
        this._shock  = Math.max(0, this._shock - 0.016 * 1.3);
        this._gSpeed *= 0.97;
        this._gRot  += this._gSpeed;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;

        // Spawn new ring
        if (this.t >= this._nextR && this._rings.length < 8) {
            this._addRing(this._rings.length);
            this._nextR = this.t + 4.2 + Math.random() * 2.5;
        }

        // Trailing fade so rings leave light streaks when spinning
        ctx.fillStyle = 'rgba(0,0,3,0.78)';
        ctx.fillRect(0, 0, W, H);

        if (!this._video || this._video.readyState < 2) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,175,215,0.25)';
            ctx.fillText('enable camera — open the portal', cx, cy);
            ctx.textAlign = 'left';
            return;
        }

        const vW = this._video.videoWidth  || 320;
        const vH = this._video.videoHeight || 240;

        ctx.save();
        ctx.translate(cx, cy);

        for (const rng of this._rings) {
            rng.alpha  = Math.min(1, (this.t - rng.birth) / 1.6);
            rng.rot   += rng.speed + this._gRot * 0.08;

            // Shockwave pushes rings outward, then they spring back
            const push     = this._shock * (rng.index + 1) * 12;
            const innerR   = rng.inner + push;
            const outerR   = rng.outer + push;
            const segAngle = (Math.PI * 2) / rng.segs;

            for (let s = 0; s < rng.segs; s++) {
                const a0   = s       * segAngle + rng.rot;
                const a1   = (s + 1) * segAngle + rng.rot;
                const amid = (a0 + a1) * 0.5;

                ctx.save();

                // Annular sector clip
                ctx.beginPath();
                ctx.arc(0, 0, outerR, a0, a1);
                ctx.arc(0, 0, innerR, a1, a0, true);
                ctx.closePath();
                ctx.clip();

                // Rotate drawing frame to sector midpoint for symmetric sampling
                ctx.rotate(amid);

                // Video scale: outer rings zoom further in (or out with zoomBias)
                const zBase = rng.zoom + this._zoomBias;
                const sc    = Math.max(0.1, outerR * 2 * zBase) / Math.min(vW, vH);
                const dvW   = vW * sc, dvH = vH * sc;

                ctx.globalAlpha = rng.alpha * 0.88;
                if (this._hasFilter) {
                    ctx.filter = `saturate(160%) hue-rotate(${(rng.hue + s * 4).toFixed(0)}deg)`;
                }
                ctx.scale(-1, 1); // selfie
                ctx.drawImage(this._video, -dvW / 2, -dvH / 2, dvW, dvH);
                if (this._hasFilter) ctx.filter = 'none';
                ctx.globalAlpha = 1;

                ctx.restore();
            }

            // Thin glowing ring border
            ctx.globalAlpha = rng.alpha * 0.22;
            ctx.strokeStyle = `hsla(${rng.hue}, 70%, 72%, 1)`;
            ctx.lineWidth   = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, outerR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Centre: raw face, full resolution
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, 23, 0, Math.PI * 2);
        ctx.clip();
        ctx.scale(-1, 1);
        ctx.drawImage(this._video, -23, -23, 46, 46);
        ctx.restore();

        // Centre iris glow
        const ig = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
        ig.addColorStop(0, `hsla(${this._hue0 % 360}, 80%, 88%, 0.28)`);
        ig.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ig;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();

        // Shockwave ring pulse
        if (this._shock > 0) {
            const shockR = (1 - this._shock) * Math.sqrt(cx * cx + cy * cy) * 1.2;
            ctx.globalAlpha = this._shock * 0.5;
            ctx.strokeStyle = `hsla(${this._hue0 % 360}, 80%, 80%, 1)`;
            ctx.lineWidth   = 2;
            ctx.beginPath();
            ctx.arc(0, 0, shockR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        if (this.t < 5) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,175,215,0.18)';
            ctx.fillText('blink for shockwave · hand X spins · hand Y zooms · pinch flips', W / 2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
