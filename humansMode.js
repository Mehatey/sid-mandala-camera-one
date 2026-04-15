// Humans Mode — a mandala of simultaneous lives.
//
// Right now, in the same city, someone is having a baby and someone's parent just died.
// Someone is crying quietly and someone is smiling for no reason.
// Someone is alone in the dark and someone is hosting a party.
// All of it, at once, right next to each other — sealed in their own window.
//
// This mode takes that grid of apartment windows and arranges it as a mandala:
// all these lives radiate from one centre, all equally close to the source.
// The innermost ring holds the most primal states of being.
// Each ring outward holds more complex, modern, particular lives.
//
// Windows breathe slowly. Occasionally one flares — something is happening in there.
// Dark windows barely pulse. The darkest barely exist.
// Blink: all windows surge at once, then slowly settle back into their separate lives.
class HumansMode {
    constructor(ctx, canvas) {
        this.ctx   = ctx;
        this.canvas = canvas;
        this.t     = 0;
        this._wins = [];
    }

    startScene() {
        this.t = 0;
        this._build();
    }

    _build() {
        // [ring, label, [h,s,l HSL], emotional weight 0–1]
        // HSL: hue=colour temperature, s=saturation, l=lightness of the window glow
        // Weight drives font size — heavier/more universal = larger text
        const DATA = [
            // ── Ring 0: existence itself ─────────────────────────────────────
            [0, 'alone',              [215, 38, 28], 1.00],
            [0, 'praying',            [268, 48, 50], 0.92],
            [0, 'sleeping',           [ 38, 60, 44], 0.72],
            [0, 'crying quietly',     [210, 50, 52], 1.00],
            [0, 'being happy',        [ 48, 88, 62], 1.00],
            // ── Ring 1: life-altering events ─────────────────────────────────
            [1, 'new baby',               [ 42, 82, 62], 1.00],
            [1, 'parent died',            [  0,  0, 11], 0.82],
            [1, 'starting a new life',    [158, 50, 50], 1.00],
            [1, 'getting divorced',       [210, 30, 44], 0.90],
            [1, 'battling cancer',        [  0,  0, 14], 0.80],
            [1, 'lost all hope',          [  0,  0,  9], 0.70],
            [1, 'smiling for no reason',  [ 52, 88, 66], 1.00],
            [1, 'moved out',              [185, 38, 46], 0.88],
            // ── Ring 2: relationships & inner life ───────────────────────────
            [2, 'missing someone',    [215, 45, 48], 1.00],
            [2, 'calling mom',        [ 40, 70, 54], 1.00],
            [2, 'calling an ex',      [ 15, 68, 50], 1.00],
            [2, 'holding a secret',   [260, 36, 30], 0.88],
            [2, 'cheating',           [  8, 76, 46], 1.00],
            [2, 'out on a date',      [ 38, 68, 56], 1.00],
            [2, 'insomnia',           [200, 50, 56], 0.90],
            [2, 'suicide thoughts',   [  0,  0,  7], 0.58],
            [2, 'trying to move on',  [175, 36, 44], 0.90],
            [2, 'alone in the dark',  [  0,  0,  4], 0.48],
            [2, 'getting drunk',      [ 20, 76, 48], 1.00],
            [2, 'hosting a party',    [ 48, 88, 64], 1.00],
            [2, 'overthinking',       [240, 38, 46], 0.90],
            // ── Ring 3: the texture of modern daily life ─────────────────────
            [3, 'working',          [205, 56, 56], 0.88],
            [3, 'studying',         [208, 48, 53], 0.78],
            [3, "can't pay bills",  [  0,  0, 11], 0.80],
            [3, 'got fired',        [ 10, 60, 36], 0.88],
            [3, 'health problems',  [218, 33, 38], 0.88],
            [3, 'making dinner',    [ 36, 68, 50], 1.00],
            [3, 'watching netflix', [205, 58, 58], 0.78],
            [3, 'gaming',           [145, 50, 43], 0.78],
            [3, 'sad',              [220, 40, 38], 1.00],
            [3, 'hustling',         [ 28, 76, 50], 1.00],
            [3, 'instagram',        [198, 62, 60], 0.68],
            [3, 'watching reels',   [205, 52, 56], 0.66],
            [3, 'calling parents',  [ 42, 64, 50], 1.00],
            [3, 'arrested',         [  0, 50, 28], 0.88],
            [3, 'watching a movie', [ 36, 50, 40], 0.78],
            [3, 'reading a book',   [ 40, 58, 48], 0.88],
            [3, 'gambling',         [ 18, 70, 44], 0.88],
            [3, 'crypto bro',       [150, 50, 46], 0.66],
        ];

        // Group by ring, assign evenly spaced angles with per-ring phase offsets
        const byRing = [[], [], [], []];
        for (const d of DATA) byRing[d[0]].push(d);

        const phaseOff = [Math.PI * 0.10, Math.PI * 0.38, Math.PI * 0.12, Math.PI * 0.24];

        this._wins = [];
        for (let ri = 0; ri < 4; ri++) {
            const rd = byRing[ri];
            const n  = rd.length;
            for (let wi = 0; wi < n; wi++) {
                const [, text, hsl, weight] = rd[wi];
                this._wins.push({
                    ring:      ri,
                    baseAngle: (2 * Math.PI * wi / n) + phaseOff[ri],
                    text,
                    hsl,
                    weight,
                    phase: Math.random() * Math.PI * 2,
                    rate:  0.13 + Math.random() * 0.22,
                    flare: 0,
                });
            }
        }
    }

    onBlink() {
        for (const w of this._wins) {
            w.flare = 0.28 + Math.random() * 0.72;
        }
    }

    draw(time) {
        this.t += 0.016;
        const t = this.t;

        // Decay flares; random life-events: a window lights up briefly
        for (const w of this._wins) {
            w.flare *= 0.938;
            if (Math.random() < 0.00028) {
                w.flare = Math.max(w.flare, 0.38 + Math.random() * 0.60);
            }
        }

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2;
        const cy  = H / 2;
        const sc  = Math.min(W, H) / 600;

        // Ring radii + differential rotation (adjacent rings counter-rotate)
        const ringR   = [52, 108, 172, 242].map(r => r * sc);
        const ringRot = [
            t *  0.0019,
            t * -0.0014,
            t *  0.0010,
            t * -0.0007,
        ];

        // Window rectangle dimensions
        const WW = 21 * sc;
        const WH = 13 * sc;

        // ── Background ──────────────────────────────────────────────────────
        ctx.fillStyle = '#080509';
        ctx.fillRect(0, 0, W, H);

        // ── Mandala skeleton: concentric rings + ornamental dots ─────────────
        ctx.save();
        ctx.translate(cx, cy);

        for (let ri = 0; ri < 4; ri++) {
            ctx.beginPath();
            ctx.arc(0, 0, ringR[ri], 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(185, 150, 92, 0.055)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Outer decorative halo
        ctx.beginPath();
        ctx.arc(0, 0, ringR[3] + 32 * sc, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(185, 150, 92, 0.032)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Ornamental midpoint dots between each pair of adjacent windows per ring
        for (let ri = 0; ri < 4; ri++) {
            const rw  = this._wins.filter(w => w.ring === ri);
            const n   = rw.length;
            const rot = ringRot[ri];
            for (let wi = 0; wi < n; wi++) {
                const a0   = rw[wi].baseAngle + rot;
                const a1   = rw[(wi + 1) % n].baseAngle + rot;
                // Arc midpoint — handle wrap correctly
                let diff   = a1 - a0;
                while (diff >  Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                const aMid = a0 + diff / 2;
                const r    = ringR[ri];
                ctx.beginPath();
                ctx.arc(Math.cos(aMid) * r, Math.sin(aMid) * r, 1.3 * sc, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(200, 168, 102, 0.14)';
                ctx.fill();
            }
        }

        ctx.restore();

        // ── Windows ──────────────────────────────────────────────────────────
        for (const w of this._wins) {
            const angle = w.baseAngle + ringRot[w.ring];
            const r     = ringR[w.ring];
            const wx    = cx + Math.cos(angle) * r;
            const wy    = cy + Math.sin(angle) * r;

            // Breathing pulse: dark windows stay dim, bright ones breathe more
            const [h, s, l] = w.hsl;
            const isDark    = l < 20;
            const pulseAmp  = isDark ? 0.06 : 0.20;
            const pulse     = (1 - pulseAmp) + pulseAmp * Math.sin(t * w.rate + w.phase);
            const flareMult = 1 + w.flare * (isDark ? 0.8 : 1.6);
            const bright    = pulse * flareMult;

            const lit       = Math.min(94, l * Math.min(isDark ? 1.4 : 2.0, bright));
            const winAlpha  = Math.min(0.94,
                (isDark ? 0.35 : 0.52) + pulse * 0.28 + w.flare * 0.18
            );

            // Glow halo — size scales with weight (heavier = bigger glow)
            const glowR = WW * (1.7 + w.weight * 0.9);
            const grd   = ctx.createRadialGradient(wx, wy, 0, wx, wy, glowR);
            const gAlpha = winAlpha * 0.24 * (0.6 + w.weight * 0.4);
            grd.addColorStop(0,    `hsla(${h}, ${s}%, ${lit}%, ${gAlpha})`);
            grd.addColorStop(0.50, `hsla(${h}, ${s}%, ${lit}%, ${gAlpha * 0.30})`);
            grd.addColorStop(1,    `hsla(${h}, ${s}%, ${lit}%, 0)`);
            ctx.fillStyle = grd;
            ctx.fillRect(wx - glowR, wy - glowR, glowR * 2, glowR * 2);

            // Window rectangle
            const wx0 = wx - WW / 2;
            const wy0 = wy - WH / 2;
            ctx.fillStyle = `hsla(${h}, ${s}%, ${lit}%, ${winAlpha})`;
            ctx.fillRect(wx0, wy0, WW, WH);

            // Window pane grid — horizontal halving + vertical thirds
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
            ctx.lineWidth = 0.5;
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(wx0, wy0 + WH / 2);
            ctx.lineTo(wx0 + WW, wy0 + WH / 2);
            ctx.stroke();
            // Vertical left third
            ctx.beginPath();
            ctx.moveTo(wx0 + WW / 3, wy0);
            ctx.lineTo(wx0 + WW / 3, wy0 + WH);
            ctx.stroke();
            // Vertical right third
            ctx.beginPath();
            ctx.moveTo(wx0 + WW * 2 / 3, wy0);
            ctx.lineTo(wx0 + WW * 2 / 3, wy0 + WH);
            ctx.stroke();

            // Window frame
            ctx.strokeStyle = 'rgba(12, 8, 6, 0.88)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(wx0, wy0, WW, WH);

            // Text label — radially outward from window centre
            const labelOffset = WH / 2 + (w.ring === 0 ? 11 : 9) * sc;
            const lx = wx + Math.cos(angle) * labelOffset;
            const ly = wy + Math.sin(angle) * labelOffset;

            // Font size: scales with weight (more universal/heavy = larger)
            const baseFont = (w.ring === 0 ? 8.5 : w.ring === 1 ? 8.0 : 7.5) * sc;
            const fsize    = Math.max(4.5, baseFont * Math.pow(w.weight, 1.4));
            ctx.font = `${fsize}px -apple-system, "SF Pro Text", system-ui, sans-serif`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';

            // Label alpha: very dark window labels are barely visible
            const tAlpha = Math.min(0.85,
                (isDark ? 0.18 : 0.38) + pulse * 0.25 + w.flare * 0.22
            );
            // Slight warm tint toward the window colour
            ctx.fillStyle = `hsla(${h}, 15%, 80%, ${tAlpha})`;
            ctx.fillText(w.text, lx, ly);
        }

        // ── Centre: the shared core, the place behind all windows ────────────
        const cp  = 0.55 + 0.45 * Math.sin(t * 0.30);
        const cp2 = 0.45 + 0.55 * Math.sin(t * 0.18 + 1.2);

        // Soft outer warmth
        const cg1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * sc);
        cg1.addColorStop(0,    `rgba(255, 248, 220, ${cp * 0.50})`);
        cg1.addColorStop(0.40, `rgba(255, 228, 148, ${cp * 0.15})`);
        cg1.addColorStop(1,    'rgba(255, 200, 80, 0)');
        ctx.fillStyle = cg1;
        ctx.beginPath();
        ctx.arc(cx, cy, 30 * sc, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright point
        const cg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8 * sc);
        cg2.addColorStop(0,   `rgba(255, 252, 230, ${cp2 * 0.85})`);
        cg2.addColorStop(0.6, `rgba(255, 235, 165, ${cp2 * 0.35})`);
        cg2.addColorStop(1,   'rgba(255, 220, 100, 0)');
        ctx.fillStyle = cg2;
        ctx.beginPath();
        ctx.arc(cx, cy, 8 * sc, 0, Math.PI * 2);
        ctx.fill();

        // Centre dot
        ctx.fillStyle = `rgba(255, 250, 225, ${cp2 * 0.90})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 2 * sc, 0, Math.PI * 2);
        ctx.fill();

        // ── Edge vignette to keep attention centred ──────────────────────────
        const vig = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, Math.min(W, H) * 0.65);
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
