// Breath Guide Mode — memory-anchored breath with evocative words and soft organic shapes.
class BreathMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this.INHALE   = 4.0;
        this.HOLD_IN  = 1.0;
        this.EXHALE   = 5.0;
        this.HOLD_OUT = 1.0;
        this.cycle = this.INHALE + this.HOLD_IN + this.EXHALE + this.HOLD_OUT;
        this._memIdx    = 0;
        this._cycleCount = 0;
        this.resize();
    }

    // Each full breath cycle brings a different sense-memory.
    // inhale/exhale phrases replace clinical labels.
    static MEMORIES = [
        { inhale: 'bonfire smoke',       exhale: 'crackling wood',   hueIn: 30,  hueEx: 18,  satIn: 68, satEx: 62 },
        { inhale: 'petrichor',           exhale: 'soft rain',        hueIn: 88,  hueEx: 198, satIn: 52, satEx: 48 },
        { inhale: 'cedar & pine',        exhale: 'evening mist',     hueIn: 132, hueEx: 200, satIn: 46, satEx: 42 },
        { inhale: 'morning light',       exhale: 'fading embers',    hueIn: 48,  hueEx: 278, satIn: 58, satEx: 50 },
        { inhale: 'ocean salt',          exhale: 'still water',      hueIn: 198, hueEx: 218, satIn: 54, satEx: 48 },
        { inhale: 'summer thunderstorm', exhale: 'cold stone floor', hueIn: 252, hueEx: 208, satIn: 46, satEx: 36 },
        { inhale: 'fresh linen',         exhale: 'candlelight',      hueIn: 208, hueEx: 38,  satIn: 34, satEx: 58 },
    ];

    resize() { this.w = this.canvas.width; this.h = this.canvas.height; }

    startScene() {
        this.t          = 0;
        this._memIdx    = 0;
        this._cycleCount = 0;
    }

    onBlink() { /* breath mode ignores blinks — dwell flame advances */ }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const cx = this.w / 2, cy = this.h / 2;
        const phase = this.t % this.cycle;

        // Advance memory at start of each new cycle
        const cycleNo = Math.floor(this.t / this.cycle);
        if (cycleNo !== this._cycleCount) {
            this._cycleCount = cycleNo;
            this._memIdx = (this._memIdx + 1) % BreathMode.MEMORIES.length;
        }
        const mem = BreathMode.MEMORIES[this._memIdx];

        let expansion, label, hue, sat;
        if (phase < this.INHALE) {
            expansion = phase / this.INHALE;
            label     = mem.inhale;
            hue       = mem.hueIn;
            sat       = mem.satIn;
        } else if (phase < this.INHALE + this.HOLD_IN) {
            expansion = 1.0;
            label     = null;
            hue       = (mem.hueIn + mem.hueEx) / 2;
            sat       = (mem.satIn + mem.satEx) / 2;
        } else if (phase < this.INHALE + this.HOLD_IN + this.EXHALE) {
            expansion = 1.0 - (phase - this.INHALE - this.HOLD_IN) / this.EXHALE;
            label     = mem.exhale;
            hue       = mem.hueEx;
            sat       = mem.satEx;
        } else {
            expansion = 0;
            label     = null;
            hue       = mem.hueEx;
            sat       = Math.round(mem.satEx * 0.75);
        }

        // Ease-in-out quad for organic feel
        const e = expansion < 0.5
            ? 2 * expansion * expansion
            : 1 - Math.pow(-2 * expansion + 2, 2) / 2;

        // Background fade
        ctx.fillStyle = 'rgba(2, 3, 14, 0.15)';
        ctx.fillRect(0, 0, this.w, this.h);

        const minR = 28, maxR = Math.min(this.w, this.h) * 0.36;
        const r = minR + e * (maxR - minR);

        // Outer atmospheric haze
        const atmo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.9);
        atmo.addColorStop(0,    `hsla(${hue}, ${sat}%, 66%, ${0.20 * e + 0.04})`);
        atmo.addColorStop(0.45, `hsla(${hue + 14}, ${sat - 6}%, 58%, ${0.07 * e})`);
        atmo.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = atmo;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 2.9, 0, Math.PI * 2);
        ctx.fill();

        // Soft organic blob
        this._drawBlob(ctx, cx, cy, r, e, hue, sat, time);

        // Concentric rings fading outward
        for (let i = 1; i <= 5; i++) {
            const ri    = r * (0.21 + i * 0.14);
            const pulse = 0.94 + 0.06 * Math.sin(time * 1.0 + i * 1.1);
            const a     = (0.11 + e * 0.07) / (i * 0.75);
            ctx.beginPath();
            ctx.arc(cx, cy, ri * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue + i * 9}, ${sat + 8}%, 74%, ${a})`;
            ctx.lineWidth   = 0.6;
            ctx.stroke();
        }

        // Memory phrase — fades in with expansion, out near hold
        if (label) {
            const prog  = phase < this.INHALE ? phase / this.INHALE : 1 - (phase - this.INHALE - this.HOLD_IN) / this.EXHALE;
            const wordA = Math.min(1, Math.min(prog * 2.5, (1 - prog) * 2.5 + 0.1)) * 0.72;
            if (wordA > 0.01) {
                ctx.save();
                ctx.font          = '300 16px Helvetica Neue, Helvetica, Arial, sans-serif';
                ctx.textAlign     = 'center';
                ctx.letterSpacing = '0.28em';
                ctx.fillStyle     = `hsla(${hue + 10}, ${sat - 5}%, 88%, ${wordA})`;
                ctx.fillText(label.toLowerCase(), cx, cy + r + 44);
                ctx.restore();
            }
        }
    }

    _drawBlob(ctx, cx, cy, r, e, hue, sat, time) {
        ctx.save();

        // Radial gradient fill — rich depth
        const grd = ctx.createRadialGradient(cx, cy - r * 0.12, 0, cx, cy, r * 1.15);
        grd.addColorStop(0,    `hsla(${hue + 24}, ${sat + 14}%, 80%, ${0.10 + e * 0.13})`);
        grd.addColorStop(0.42, `hsla(${hue},      ${sat + 6}%,  64%, ${0.07 + e * 0.09})`);
        grd.addColorStop(0.80, `hsla(${hue - 20}, ${sat - 6}%,  50%, ${0.03 + e * 0.04})`);
        grd.addColorStop(1,    'rgba(0,0,0,0)');

        this._blobPath(ctx, cx, cy, r, time);
        ctx.fillStyle = grd;
        ctx.fill();

        // Soft luminous edge
        ctx.strokeStyle = `hsla(${hue + 10}, ${sat + 12}%, 80%, ${0.22 + e * 0.18})`;
        ctx.lineWidth   = 1.1;
        this._blobPath(ctx, cx, cy, r, time);
        ctx.stroke();

        ctx.restore();
    }

    _blobPath(ctx, cx, cy, r, time) {
        const n = 10;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const base = (i / n) * Math.PI * 2;
            const wr   = r * (1 + 0.10 * Math.sin(time * 1.5 + i * 2.2 + 0.7));
            pts.push({ x: cx + Math.cos(base) * wr, y: cy + Math.sin(base) * wr, a: base });
        }
        const cp = r * 0.52;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const cur  = pts[i];
            const nxt  = pts[(i + 1) % n];
            const cpx0 = cur.x + Math.cos(cur.a + Math.PI / 2) * cp;
            const cpy0 = cur.y + Math.sin(cur.a + Math.PI / 2) * cp;
            const cpx1 = nxt.x + Math.cos(nxt.a - Math.PI / 2) * cp;
            const cpy1 = nxt.y + Math.sin(nxt.a - Math.PI / 2) * cp;
            if (i === 0) ctx.moveTo(cur.x, cur.y);
            ctx.bezierCurveTo(cpx0, cpy0, cpx1, cpy1, nxt.x, nxt.y);
        }
        ctx.closePath();
    }
}
