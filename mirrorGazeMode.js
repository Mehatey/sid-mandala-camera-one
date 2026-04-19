// Mirror Gaze Mode — gaze position reflected across 6-fold radial symmetry.
// A soft luminous cursor appears simultaneously at all 6 reflections.
// Trails paint a symmetric mandala from your eye movements.
// Blink: freeze current pattern as a ghost layer and clear the canvas for a new one.
class MirrorGazeMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._points  = [];   // { x, y, hue, age }
        this._ghosts  = [];   // frozen ghost layers { imageData, alpha, born }
        this._gazeX   = null;
        this._gazeY   = null;
        this._hue     = 40;
        this._FOLDS   = 6;
        this._off     = null;
        this._offCtx  = null;
    }

    startScene() {
        this.t       = 0;
        this._points = [];
        this._ghosts = [];
        this._gazeX  = null;
        this._gazeY  = null;
        this._hue    = 40 + Math.random() * 280;
        this._initOff();
    }

    _initOff() {
        const W = this.canvas.width, H = this.canvas.height;
        if (!this._off) this._off = document.createElement('canvas');
        this._off.width  = W;
        this._off.height = H;
        this._offCtx = this._off.getContext('2d');
        this._offCtx.fillStyle = '#000';
        this._offCtx.fillRect(0, 0, W, H);
    }

    onGaze(nx, ny) {
        this._gazeX = nx * this.canvas.width;
        this._gazeY = ny * this.canvas.height;
        this._points.push({
            x:   this._gazeX,
            y:   this._gazeY,
            hue: this._hue,
            age: 0,
        });
        if (this._points.length > 400) this._points.shift();
    }

    onBlink() {
        // Freeze current off-canvas as a ghost layer
        if (this._off) {
            const W = this.canvas.width, H = this.canvas.height;
            this._ghosts.push({
                img:     this._off.toDataURL(),
                alpha:   0.45,
                born:    this.t,
                maxLife: 7.0 + Math.random() * 5.0,
            });
            // Clear the off-canvas for next pattern
            this._offCtx.fillStyle = '#000';
            this._offCtx.fillRect(0, 0, W, H);
            this._points = [];
            this._hue = (this._hue + 55 + Math.random() * 120) % 360;
        }
    }

    _drawMirroredDot(ctx, gx, gy, cx, cy, hue, alpha, r) {
        const FOLDS = this._FOLDS;
        const dx = gx - cx, dy = gy - cy;
        const dist  = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        for (let i = 0; i < FOLDS; i++) {
            const a = angle + (i / FOLDS) * Math.PI * 2;
            for (const flip of [1, -1]) {
                const fa = flip === 1 ? a : -a + (i / FOLDS) * Math.PI * 2 * 2;
                const px = cx + Math.cos(flip === 1 ? a : fa) * dist;
                const py = cy + Math.sin(flip === 1 ? a : fa) * dist;
                const g  = ctx.createRadialGradient(px, py, 0, px, py, r);
                g.addColorStop(0,   `hsla(${hue}, 95%, 80%, ${alpha})`);
                g.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
                break; // one reflection per fold for cleaner look
            }
        }
    }

    draw(time) {
        this.t += 0.016;

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;

        // Ensure off canvas is initialised
        if (!this._off || this._off.width !== W) this._initOff();

        const offCtx = this._offCtx;

        // Slowly fade the off-canvas
        offCtx.fillStyle = 'rgba(0, 0, 0, 0.018)';
        offCtx.fillRect(0, 0, W, H);

        // Paint new points onto off-canvas
        for (const p of this._points) {
            p.age += 0.016;
            const env = Math.max(0, 1 - p.age * 0.4);
            if (env < 0.01) continue;
            this._drawMirroredDot(offCtx, p.x, p.y, cx, cy, p.hue, env * 0.55, 5);
        }
        // Remove very old points
        while (this._points.length > 0 && this._points[0].age > 3) this._points.shift();

        // Dark main canvas fade
        ctx.fillStyle = 'rgba(0, 0, 2, 0.10)';
        ctx.fillRect(0, 0, W, H);

        // Draw ghost layers (fading frozen patterns)
        for (let gi = this._ghosts.length - 1; gi >= 0; gi--) {
            const gh = this._ghosts[gi];
            const age = this.t - gh.born;
            if (age > gh.maxLife) { this._ghosts.splice(gi, 1); continue; }
            const env = Math.max(0, 1 - age / gh.maxLife);
            if (gh._img) {
                ctx.save();
                ctx.globalAlpha = gh.alpha * env;
                ctx.drawImage(gh._img, 0, 0);
                ctx.restore();
            } else if (gh.img && !gh._loading) {
                gh._loading = true;
                const img = new Image();
                img.onload = () => { gh._img = img; gh._loading = false; };
                img.src = gh.img;
            }
        }

        // Draw off-canvas onto main canvas
        ctx.drawImage(this._off, 0, 0);

        // Live gaze mirrors — bright cursor dots
        if (this._gazeX !== null) {
            const FOLDS = this._FOLDS;
            const dx = this._gazeX - cx, dy = this._gazeY - cy;
            const dist  = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            for (let i = 0; i < FOLDS; i++) {
                const a  = angle + (i / FOLDS) * Math.PI * 2;
                const px = cx + Math.cos(a) * dist;
                const py = cy + Math.sin(a) * dist;
                const g  = ctx.createRadialGradient(px, py, 0, px, py, 10);
                g.addColorStop(0,   `hsla(${this._hue + i * 15}, 100%, 90%, 0.55)`);
                g.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(px, py, 10, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Centre nucleus
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
        ng.addColorStop(0, `hsla(${this._hue}, 80%, 95%, 0.35)`);
        ng.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fill();
    }
}
