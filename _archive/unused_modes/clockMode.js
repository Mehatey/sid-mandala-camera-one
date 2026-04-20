// Clock Mode — time is the only input.
// The visual is computed entirely from the real current time.
// Every second is different. Every hour has its own symmetry and colour.
// Midnight: deep indigo, 3-fold. Dawn: rose-gold, waking. Noon: blue-white, 12-fold full bloom.
// The same moment each day looks the same. Come back tomorrow at 3:47am.
// No clicks. No keys. Just presence.
class ClockMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this._lastSec = -1;   // for second-tick pulse
        this._pulse   = 0;    // second-tick expansion value
    }

    startScene() {
        this._lastSec = -1;
        this._pulse   = 0;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    // ── Time-to-colour map: 24 hours → hue, saturation, lightness ─────────────
    _palette(h24) {
        // Landmark colours at key times of day
        const stops = [
            [ 0, 232, 0.72, 0.22],  // midnight: deep indigo
            [ 3, 255, 0.65, 0.18],  // 3am: almost black violet
            [ 5, 340, 0.70, 0.38],  // pre-dawn: rose
            [ 7,  28, 0.78, 0.52],  // dawn: warm gold
            [10,  46, 0.72, 0.62],  // morning: amber
            [12, 198, 0.65, 0.72],  // noon: sky blue
            [15, 190, 0.60, 0.65],  // afternoon
            [17,  32, 0.80, 0.58],  // sunset: orange
            [19, 285, 0.65, 0.38],  // dusk: violet
            [22, 248, 0.68, 0.25],  // late night: indigo
            [24, 232, 0.72, 0.22],  // midnight again
        ];
        for (let i = 0; i < stops.length - 1; i++) {
            const [h0, hue0, s0, l0] = stops[i];
            const [h1, hue1, s1, l1] = stops[i + 1];
            if (h24 >= h0 && h24 < h1) {
                const t  = (h24 - h0) / (h1 - h0);
                // Handle hue wraparound
                let dh = hue1 - hue0;
                if (dh >  180) dh -= 360;
                if (dh < -180) dh += 360;
                return {
                    hue: ((hue0 + dh * t) + 360) % 360,
                    sat: s0 + (s1 - s0) * t,
                    lit: l0 + (l1 - l0) * t,
                };
            }
        }
        return { hue: 232, sat: 0.72, lit: 0.22 };
    }

    draw(time) {
        const now  = new Date();
        const h24  = now.getHours();
        const m    = now.getMinutes();
        const s    = now.getSeconds();
        const ms   = now.getMilliseconds();

        // Continuous time values (smooth — no snapping)
        const fSec  = s  + ms / 1000;              // [0, 60)
        const fMin  = m  + fSec  / 60;             // [0, 60)
        const fHour = (h24 % 12) + fMin  / 60;     // [0, 12)
        const fDay  =  h24       + fMin  / 60;     // [0, 24)

        // Second tick pulse
        if (s !== this._lastSec) {
            this._pulse   = 1.0;
            this._lastSec = s;
        }
        this._pulse = Math.max(0, this._pulse - 0.055);

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const R   = Math.min(W, H) * 0.44;

        // Slow fade — movement leaves ghostly trails
        ctx.fillStyle = 'rgba(0, 0, 2, 0.055)';
        ctx.fillRect(0, 0, W, H);

        const { hue, sat, lit } = this._palette(fDay);
        const S = Math.round(sat * 100), L = Math.round(lit * 100);

        // Symmetry order: hours 0–11 map to N=3–12 (then snap)
        const N    = 3 + Math.round(fHour / 12 * 9);   // 3 at 12:00am, 12 at ~11am
        const NsmL = 3 + (fHour / 12) * 9;             // fractional, for drawing

        // ── Rotation angles ──────────────────────────────────────────────────────
        const secAngle  = (fSec  / 60)  * Math.PI * 2 - Math.PI / 2;
        const minAngle  = (fMin  / 60)  * Math.PI * 2 - Math.PI / 2;
        const hourAngle = (fHour / 12)  * Math.PI * 2 - Math.PI / 2;
        const dayAngle  = (fDay  / 24)  * Math.PI * 2 - Math.PI / 2;

        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        // ── Day-progress outer arc ───────────────────────────────────────────────
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.97, -Math.PI / 2, dayAngle, false);
        ctx.strokeStyle = `hsla(${hue}, ${S}%, ${L + 18}%, 0.18)`;
        ctx.lineWidth   = 1.2;
        ctx.stroke();

        // ── 60-mark ring (minutes/seconds) ──────────────────────────────────────
        for (let i = 0; i < 60; i++) {
            const ang   = (i / 60) * Math.PI * 2 - Math.PI / 2;
            const isSec = i === s;
            const isMn  = i === m;
            const r     = R * (isSec || isMn ? 0.855 : 0.845);
            const sz    = isSec ? 3.0 + this._pulse * 2.5 : isMn ? 2.2 : 1.0;
            const a     = isSec ? 0.90 + this._pulse * 0.1 : isMn ? 0.65 : 0.14;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, sz, 0, Math.PI * 2);
            ctx.fillStyle = isSec
                ? `hsla(${hue}, ${S}%, ${Math.min(98, L + 40)}%, ${a})`
                : `hsla(${hue}, ${S}%, ${L + 10}%, ${a})`;
            ctx.fill();
        }

        // ── 12-hour marker ring ──────────────────────────────────────────────────
        for (let i = 0; i < 12; i++) {
            const ang    = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const active = Math.round(fHour) % 12 === i;
            const near   = Math.min(Math.abs(fHour - i), Math.abs(12 + fHour - i), Math.abs(fHour - i - 12));
            const a      = active ? 0.85 : Math.max(0.10, 0.55 - near * 0.20);
            const sz     = active ? 3.5 : 2.0;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * R * 0.72, cy + Math.sin(ang) * R * 0.72, sz, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, ${S}%, ${L + 15}%, ${a})`;
            ctx.fill();
        }

        // ── N-fold star form — rotates at minute-hand speed ──────────────────────
        const drawPoly = (n, r, phase, a, lw) => {
            ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const ang = (i / n) * Math.PI * 2 + phase;
                i === 0
                    ? ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r)
                    : ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
            }
            ctx.strokeStyle = `hsla(${hue}, ${S}%, ${L + 10}%, ${a})`;
            ctx.lineWidth   = lw;
            ctx.stroke();
        };

        // Outer N-gon (minute rotation)
        drawPoly(N, R * 0.58, minAngle,        0.30, 1.0);
        // Inner N-gon, counter-rotating
        drawPoly(N, R * 0.40, -minAngle * 0.7, 0.22, 1.0);
        // N-gon offset by π/N creates star
        drawPoly(N, R * 0.58, minAngle + Math.PI / N,  0.18, 0.9);

        // Hour hand spoke — thin, full length
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(hourAngle) * R * 0.52, cy + Math.sin(hourAngle) * R * 0.52);
        ctx.strokeStyle = `hsla(${hue}, ${S}%, ${L + 22}%, 0.50)`;
        ctx.lineWidth   = 1.1;
        ctx.stroke();

        // Minute hand
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(minAngle) * R * 0.70, cy + Math.sin(minAngle) * R * 0.70);
        ctx.strokeStyle = `hsla(${hue}, ${S}%, ${L + 28}%, 0.38)`;
        ctx.lineWidth   = 0.9;
        ctx.stroke();

        // ── Centre orb ───────────────────────────────────────────────────────────
        const orbR = R * (0.028 + this._pulse * 0.032);
        const cg   = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 5);
        cg.addColorStop(0,   `hsla(${hue}, ${S}%, ${Math.min(98, L+45)}%, ${0.55 + this._pulse * 0.45})`);
        cg.addColorStop(0.3, `hsla(${hue}, ${S}%, ${L + 20}%, ${0.12 + this._pulse * 0.10})`);
        cg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, orbR * 5, 0, Math.PI * 2);
        ctx.fill();

        // ── Time text — minimal, bottom centre ──────────────────────────────────
        const pad  = n => String(n).padStart(2, '0');
        const str  = `${pad(h24)}:${pad(m)}:${pad(s)}`;
        ctx.font   = '9px Helvetica Neue, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `hsla(${hue}, ${S}%, ${L + 20}%, 0.22)`;
        ctx.fillText(str, cx, H - 22);
        ctx.textAlign = 'left';
    }
}
