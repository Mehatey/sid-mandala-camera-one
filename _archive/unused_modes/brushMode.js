// Brush Mode — sumi-e ink painting on warm paper.
// Your movement is the brush. Slow strokes = wide, full-bodied ink.
// Fast strokes = thin, nervous, scratchy — just like a real brush.
// Five inks: sumi black · indigo · vermillion · gold · jade — blink to cycle.
// Three brush types: round · calligraphy · dry — pinch to cycle.
// Marks are permanent. The paper absorbs everything.
class BrushMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._x  = null; this._y  = null;
        this._px = null; this._py = null;
        this._speed   = 0;
        this._drawing = false;   // mouse held down
        this._hand    = false;   // hand is active (always draws)

        this._inkIdx   = 0;
        this._brushIdx = 0;

        this._off    = null;
        this._offCtx = null;
        this._washes = [];   // { x, y, r, maxR, a } — water-wash blooms on blink

        this._inks = [
            { name: 'sumi',       h: 0,   s: 0,   l: 7,   a: 0.82 },
            { name: 'indigo',     h: 228, s: 62,  l: 22,  a: 0.72 },
            { name: 'vermillion', h: 12,  s: 88,  l: 36,  a: 0.68 },
            { name: 'gold',       h: 42,  s: 82,  l: 46,  a: 0.62 },
            { name: 'jade',       h: 155, s: 56,  l: 30,  a: 0.72 },
        ];
    }

    // ── Scene lifecycle ──────────────────────────────────────────────────────────
    startScene() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width  = W;
            this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }

        // Warm paper — darker toward edges, slightly warm
        const g = this._offCtx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.62);
        g.addColorStop(0, 'hsl(36, 18%, 12%)');
        g.addColorStop(1, 'hsl(28, 14%, 6%)');
        this._offCtx.fillStyle = g;
        this._offCtx.fillRect(0, 0, W, H);

        // Paper grain — subtle fibrous texture
        for (let i = 0; i < Math.floor(W * H * 0.0028); i++) {
            const gx = Math.random() * W;
            const gy = Math.random() * H;
            this._offCtx.beginPath();
            this._offCtx.arc(gx, gy, 0.4 + Math.random() * 1.4, 0, Math.PI * 2);
            this._offCtx.fillStyle = `rgba(210, 195, 162, ${0.007 + Math.random() * 0.020})`;
            this._offCtx.fill();
        }

        this._washes   = [];
        this._x = null; this._px = null;
        this._drawing  = false;
        this._hand     = false;
        this.t         = 0;
    }

    // ── Input ────────────────────────────────────────────────────────────────────
    onMouseMove(x, y) {
        this._px = this._x;
        this._py = this._y;
        this._x  = x;
        this._y  = y;
        if (this._px !== null) {
            this._speed = Math.hypot(x - this._px, y - this._py);
        }
    }

    onMouseDown(x, y) {
        this._drawing = true;
        this._px = x; this._py = y;
        this._x  = x; this._y  = y;
        this._speed = 0;
    }

    onMouseUp() {
        this._drawing = false;
        this._px = null; this._py = null;
    }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this._hand    = true;
        this._drawing = true;
        this.onMouseMove((1 - normX) * W, normY * H);
    }

    onBlink() {
        this._inkIdx = (this._inkIdx + 1) % this._inks.length;
        // Water-wash bloom around current position
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const cx = this._x ?? W * 0.5;
        const cy = this._y ?? H * 0.5;
        this._washes.push({
            x: cx, y: cy, r: 0,
            maxR: 90 + Math.random() * 160,
            a: 0.038 + Math.random() * 0.042,
        });
    }

    onPinch() {
        this._brushIdx = (this._brushIdx + 1) % 3;
    }

    // ── Brush rendering ──────────────────────────────────────────────────────────
    _paint(ctx, x1, y1, x2, y2, speed) {
        if (x1 === null || x2 === null) return;
        const ink  = this._inks[this._inkIdx];
        const dist = Math.hypot(x2 - x1, y2 - y1) + 0.1;
        const ang  = Math.atan2(y2 - y1, x2 - x1);
        const W    = this.canvas.width  || 800;
        const H    = this.canvas.height || 600;
        const scl  = Math.min(W, H) / 800;

        // Brush fatness: inverse speed relationship — slow → wide, fast → thin
        const fatness = Math.max(0, Math.exp(-speed * 0.038));

        // Per-brush-type radius
        const rMax = [44, 20, 16][this._brushIdx];
        const rMin = [5,  2,  1 ][this._brushIdx];
        const bR   = (rMin + fatness * (rMax - rMin)) * scl;

        const steps = Math.max(1, Math.ceil(dist / (bR * 0.5)));

        for (let s = 0; s <= steps; s++) {
            const f  = s / steps;
            const px = x1 + (x2 - x1) * f;
            const py = y1 + (y2 - y1) * f;
            // Width varies — slightly narrower at ends like a real brush
            const w  = bR * (0.60 + 0.40 * Math.sin(f * Math.PI + 0.3));

            if (this._brushIdx === 1) {
                // Calligraphy: ellipse rotated ~45° to stroke direction
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(ang + Math.PI * 0.22);
                ctx.beginPath();
                ctx.ellipse(0, 0, w, w * 0.18, 0, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${ink.h}, ${ink.s}%, ${ink.l}%, ${ink.a * 0.80})`;
                ctx.fill();
                // Subtle sheen along spine
                ctx.beginPath();
                ctx.ellipse(0, 0, w * 0.28, w * 0.07, 0, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${ink.h}, ${ink.s * 0.4}%, ${ink.l + 22}%, ${ink.a * 0.22})`;
                ctx.fill();
                ctx.restore();

            } else if (this._brushIdx === 2) {
                // Dry brush: scattered bristle streaks
                const count = 10 + Math.floor(fatness * 18);
                for (let k = 0; k < count; k++) {
                    const ox  = (Math.random() - 0.5) * w * 3.2;
                    const oy  = (Math.random() - 0.5) * w * 0.5;
                    const sl  = (1.5 + Math.random() * 8) * scl;
                    const ba  = ink.a * (0.18 + Math.random() * 0.55);
                    ctx.save();
                    ctx.translate(px + ox, py + oy);
                    ctx.rotate(ang + (Math.random() - 0.5) * 0.18);
                    ctx.beginPath();
                    ctx.moveTo(-sl * 0.5, 0);
                    ctx.lineTo( sl * 0.5, 0);
                    ctx.strokeStyle = `hsla(${ink.h}, ${ink.s}%, ${ink.l}%, ${ba})`;
                    ctx.lineWidth = Math.max(0.85, 1.0 * scl);
                    ctx.stroke();
                    ctx.restore();
                }

            } else {
                // Round brush: radial gradient — bright core, soft halo
                const g = ctx.createRadialGradient(px, py, 0, px, py, w);
                g.addColorStop(0,    `hsla(${ink.h}, ${ink.s * 0.5}%, ${ink.l + 16}%, ${ink.a * 0.55})`);
                g.addColorStop(0.45, `hsla(${ink.h}, ${ink.s}%,       ${ink.l}%,      ${ink.a * 0.38})`);
                g.addColorStop(1,    `hsla(${ink.h}, ${ink.s}%,       ${ink.l}%,      0)`);
                ctx.beginPath();
                ctx.arc(px, py, w, 0, Math.PI * 2);
                ctx.fillStyle = g;
                ctx.fill();
            }
        }

        // Ink bleed: very faint wide halo along the full stroke segment
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${ink.h}, ${ink.s * 0.3}%, ${ink.l + 16}%, 0.022)`;
        ctx.lineWidth   = bR * 2.8;
        ctx.lineCap     = 'round';
        ctx.stroke();
    }

    // ── Draw ─────────────────────────────────────────────────────────────────────
    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const oc  = this._offCtx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Stroke onto offscreen when drawing
        if ((this._drawing || this._hand) && this._x !== null && this._px !== null) {
            this._paint(oc, this._px, this._py, this._x, this._y, this._speed);
        }

        // Water washes expanding on offscreen
        for (const w of this._washes) {
            w.r += 1.6;
            const a = w.a * Math.pow(1 - w.r / w.maxR, 1.3);
            if (a > 0.001) {
                const g = oc.createRadialGradient(w.x, w.y, w.r * 0.25, w.x, w.y, w.r);
                g.addColorStop(0, `rgba(188, 172, 140, 0)`);
                g.addColorStop(1, `rgba(188, 172, 140, ${a})`);
                oc.fillStyle = g;
                oc.beginPath();
                oc.arc(w.x, w.y, w.r, 0, Math.PI * 2);
                oc.fill();
            }
        }
        this._washes = this._washes.filter(w => w.r < w.maxR);

        // Composite permanent layer to screen (no fade — marks are forever)
        ctx.drawImage(this._off, 0, 0);

        // ── Label: brush type + ink name ─────────────────────────────────────────
        const ink = this._inks[this._inkIdx];
        const brushNames = ['round', 'calligraphy', 'dry'];
        ctx.font = '9px Helvetica Neue, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = `hsla(${ink.h + 18}, ${ink.s * 0.45}%, 62%, 0.20)`;
        ctx.fillText(`${brushNames[this._brushIdx]}  ·  ${ink.name}`, W - 20, H - 20);
        ctx.textAlign = 'left';

        if (this.t < 6) {
            ctx.font = '9px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(190, 175, 145, 0.20)';
            ctx.fillText('click + drag to paint  ·  blink to change ink  ·  pinch to change brush', W / 2, H - 20);
            ctx.textAlign = 'left';
        }
    }
}
