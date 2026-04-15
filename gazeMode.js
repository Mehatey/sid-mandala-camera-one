// Gaze Mode — a hypnotic void of slow-moving eyes. Fully autonomous.
// Every blink cycles the canvas blend mode, transforming how the world looks.
class GazeMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.eyes   = [];
        this.t      = 0;

        // Blend mode cycle — each blink steps forward (only soft, beautiful blends)
        this.blendModes = ['screen', 'overlay', 'color-dodge', 'luminosity', 'screen'];
        this.blendIndex  = 0;
        this.currentBlend = 'screen';

        // Subtle background veins
        this.veins = [];
    }

    startScene() {
        this.t          = 0;
        this.blendIndex = 0;
        this.currentBlend = 'screen';
        this.eyes  = [];
        this.veins = [];

        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        // Populate ~10 eyes at scattered positions, avoid the centre
        const placements = [
            [0.14, 0.18], [0.78, 0.12], [0.50, 0.22],
            [0.88, 0.45], [0.22, 0.50], [0.65, 0.60],
            [0.10, 0.72], [0.42, 0.80], [0.82, 0.78],
            [0.55, 0.42],
        ];
        for (const [nx, ny] of placements) {
            this._spawnEye(nx * W, ny * H);
        }

        // Generate static vein endpoints
        for (let i = 0; i < 14; i++) {
            this.veins.push({
                x1: Math.random() * W,
                y1: Math.random() * H,
                x2: Math.random() * W,
                y2: Math.random() * H,
                cp1x: Math.random() * W,
                cp1y: Math.random() * H,
                phase: Math.random() * Math.PI * 2,
                spd:   0.015 + Math.random() * 0.02,
                hue:   240 + Math.random() * 80,
            });
        }
    }

    _spawnEye(x, y) {
        // Colour palettes: deep void hues
        const PALETTES = [
            { hue: 280, name: 'violet'  },
            { hue: 195, name: 'teal'    },
            { hue: 320, name: 'magenta' },
            { hue:  42, name: 'gold'    },
            { hue:   0, name: 'crimson' },
            { hue: 160, name: 'jade'    },
            { hue: 250, name: 'indigo'  },
        ];
        const pal  = PALETTES[Math.floor(Math.random() * PALETTES.length)];
        const size = 55 + Math.random() * 110; // half-width of eye

        this.eyes.push({
            x, y,
            // very slow drift
            vx: (Math.random() - 0.5) * 0.14,
            vy: (Math.random() - 0.5) * 0.09,
            size,
            // slight tilt, very slowly rotating
            rot:    (Math.random() - 0.5) * 0.35,
            rotSpd: (Math.random() - 0.5) * 0.0008,
            // iris rotation
            irisRot:    Math.random() * Math.PI * 2,
            irisRotSpd: (Math.random() > 0.5 ? 1 : -1) * (0.003 + Math.random() * 0.006),
            // pupil breath
            pupilPhase: Math.random() * Math.PI * 2,
            pupilSpd:   0.25 + Math.random() * 0.35,
            // eyelid slow blink (independent of user blink)
            lidPhase: Math.random() * Math.PI * 2,
            lidSpd:   0.04 + Math.random() * 0.06,
            // look direction drift
            lookPhase: Math.random() * Math.PI * 2,
            lookSpd:   0.06 + Math.random() * 0.10,
            // colour
            hue: pal.hue,
            sat: 65 + Math.random() * 30,
            // pupil type: 0 = round, 1 = vertical slit
            slitPupil: Math.random() > 0.55,
            alpha: 0.75 + Math.random() * 0.25,
            // micro-saccade: involuntary tiny iris tremor (fires every 2–5s)
            saccade: { dx: 0, dy: 0, decayRate: 0.82, nextAt: 2 + Math.random() * 3 },
        });
    }

    onBlink() {
        this.blendIndex   = (this.blendIndex + 1) % this.blendModes.length;
        this.currentBlend = this.blendModes[this.blendIndex];

        // All pupils contract sharply then dilate — reactive
        for (const eye of this.eyes) {
            eye.pupilPhase += Math.PI * 1.2;
        }
    }

    // Draw a single eye centred at origin (call inside ctx.save/restore with translate)
    _drawEye(eye, t) {
        const ctx = this.ctx;
        const W2  = eye.size;                                      // half eye width
        const H2  = eye.size * 0.40;                               // half eye height (aspect ~2.5:1)

        // Eyelid openness: extremely slow autonomous blink cycle
        const openT  = Math.sin(eye.lidPhase + t * eye.lidSpd);
        const openAmt = 0.78 + 0.22 * (openT * 0.5 + 0.5);        // 0.78–1.0
        const cH2    = H2 * openAmt;

        // Pupil radius
        const irisR  = W2 * 0.40;
        const maxPup = irisR * 0.68;
        const minPup = irisR * 0.22;
        const pupilR = minPup + (maxPup - minPup) * (0.5 + 0.5 * Math.sin(eye.pupilPhase + t * eye.pupilSpd));

        // Look direction (iris offset within sclera) + micro-saccade tremor
        const maxLook = W2 * 0.10;
        const lookX   = Math.cos(eye.lookPhase + t * eye.lookSpd)             * maxLook + eye.saccade.dx;
        const lookY   = Math.sin(eye.lookPhase * 0.7 + t * eye.lookSpd * 0.6) * cH2 * 0.20 + eye.saccade.dy;

        const { hue, sat } = eye;

        // ── Eye outline path ──────────────────────────────────────────────────
        const eyePath = () => {
            ctx.beginPath();
            ctx.moveTo(-W2, 0);
            ctx.bezierCurveTo(-W2 * 0.55, -cH2 * 1.15, W2 * 0.55, -cH2 * 1.15, W2, 0);
            ctx.bezierCurveTo( W2 * 0.55,  cH2 * 1.15, -W2 * 0.55, cH2 * 1.15, -W2, 0);
            ctx.closePath();
        };

        // ── Outer glow (drawn before clip) ────────────────────────────────────
        ctx.save();
        ctx.scale(1, 0.42);
        const glowG = ctx.createRadialGradient(0, 0, W2 * 0.7, 0, 0, W2 * 1.8);
        glowG.addColorStop(0,   `hsla(${hue}, ${sat}%, 55%, 0.13)`);
        glowG.addColorStop(0.5, `hsla(${hue}, ${sat}%, 45%, 0.06)`);
        glowG.addColorStop(1,   `hsla(${hue}, ${sat}%, 35%, 0)`);
        ctx.fillStyle = glowG;
        ctx.beginPath();
        ctx.arc(0, 0, W2 * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── Clipped interior ──────────────────────────────────────────────────
        ctx.save();
        eyePath();
        ctx.clip();

        // Sclera
        const scleraG = ctx.createRadialGradient(lookX, lookY, 0, lookX, lookY, W2 * 1.1);
        scleraG.addColorStop(0,   `hsla(${hue}, 18%, 82%, 0.96)`);
        scleraG.addColorStop(0.6, `hsla(${hue}, 40%, 30%, 0.97)`);
        scleraG.addColorStop(1,   `hsla(${hue}, 55%, 10%, 1)`);
        ctx.fillStyle = scleraG;
        ctx.fillRect(-W2, -cH2 * 1.3, W2 * 2, cH2 * 2.6);

        // ── Iris ──────────────────────────────────────────────────────────────
        ctx.save();
        ctx.translate(lookX, lookY);

        // Iris base
        const irisG = ctx.createRadialGradient(0, 0, pupilR * 0.4, 0, 0, irisR);
        irisG.addColorStop(0,    `hsla(${hue + 20}, ${sat + 10}%, 12%, 1)`);
        irisG.addColorStop(0.25, `hsla(${hue},      ${sat + 15}%, 38%, 1)`);
        irisG.addColorStop(0.60, `hsla(${hue - 15}, ${sat}%,      52%, 1)`);
        irisG.addColorStop(0.85, `hsla(${hue + 10}, ${sat - 5}%,  35%, 1)`);
        irisG.addColorStop(1,    `hsla(${hue + 5},  ${sat}%,      18%, 1)`);
        ctx.beginPath();
        ctx.arc(0, 0, irisR, 0, Math.PI * 2);
        ctx.fillStyle = irisG;
        ctx.fill();

        // Iris starburst lines
        ctx.save();
        ctx.rotate(eye.irisRot);
        const numLines = 28;
        for (let i = 0; i < numLines; i++) {
            const ang    = (i / numLines) * Math.PI * 2;
            const bright = 0.45 + 0.55 * Math.sin(i * 2.71828 + eye.irisRot * 4.2);
            const r0     = pupilR * 1.05;
            const r1     = irisR  * (0.82 + bright * 0.14);
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
            ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
            ctx.strokeStyle = `hsla(${hue + 55}, 95%, ${48 + bright * 36}%, ${0.22 + bright * 0.45})`;
            ctx.lineWidth   = 1.0 + bright * 0.9;
            ctx.stroke();
        }
        ctx.restore();

        // Iris concentric rings
        const ringCount = 4;
        for (let r = 0; r < ringCount; r++) {
            const rr    = irisR * (0.38 + r * 0.17);
            const alpha = 0.05 + r * 0.04;
            ctx.beginPath();
            ctx.arc(0, 0, rr, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue + 70}, 100%, 78%, ${alpha})`;
            ctx.lineWidth   = 1.2;
            ctx.stroke();
        }

        // Limbal ring (dark outer iris border)
        ctx.beginPath();
        ctx.arc(0, 0, irisR, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 60%, 8%, 0.85)`;
        ctx.lineWidth   = irisR * 0.08;
        ctx.stroke();

        // ── Pupil ─────────────────────────────────────────────────────────────
        ctx.save();
        if (eye.slitPupil) {
            // Vertical slit pupil
            const slitW = pupilR * 0.28;
            const slitH = pupilR * 1.05;
            const pupG  = ctx.createLinearGradient(0, -slitH, 0, slitH);
            pupG.addColorStop(0,   'rgba(0,0,0,0.5)');
            pupG.addColorStop(0.15, 'rgba(0,0,0,1)');
            pupG.addColorStop(0.85, 'rgba(0,0,0,1)');
            pupG.addColorStop(1,   'rgba(0,0,0,0.5)');
            ctx.beginPath();
            ctx.ellipse(0, 0, slitW, slitH, 0, 0, Math.PI * 2);
            ctx.fillStyle = pupG;
            ctx.fill();
        } else {
            // Round pupil
            const pupG = ctx.createRadialGradient(0, 0, 0, 0, 0, pupilR);
            pupG.addColorStop(0,   'rgba(0,0,0,1)');
            pupG.addColorStop(0.75,'rgba(0,0,0,0.97)');
            pupG.addColorStop(1,   `hsla(${hue}, 80%, 6%, 0.82)`);
            ctx.beginPath();
            ctx.arc(0, 0, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = pupG;
            ctx.fill();
        }

        // Catchlight
        const clR = pupilR * 0.16;
        ctx.beginPath();
        ctx.arc(-pupilR * 0.32, -pupilR * 0.38, clR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.90)';
        ctx.fill();
        // Secondary smaller catchlight
        ctx.beginPath();
        ctx.arc(pupilR * 0.22, -pupilR * 0.28, clR * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fill();

        ctx.restore(); // pupil
        ctx.restore(); // iris translate
        ctx.restore(); // clip

        // ── Eyelid edge / lash shadow ─────────────────────────────────────────
        eyePath();
        ctx.strokeStyle = `hsla(${hue}, 72%, 58%, ${eye.alpha * 0.55})`;
        ctx.lineWidth   = 1.4;
        ctx.stroke();

        // Inner corner tear-duct glint
        const tdG = ctx.createRadialGradient(-W2 * 0.92, 0, 0, -W2 * 0.92, 0, W2 * 0.12);
        tdG.addColorStop(0, `hsla(${hue + 20}, 80%, 90%, 0.30)`);
        tdG.addColorStop(1, `hsla(${hue + 20}, 80%, 90%, 0)`);
        ctx.fillStyle = tdG;
        ctx.beginPath();
        ctx.arc(-W2 * 0.92, 0, W2 * 0.12, 0, Math.PI * 2);
        ctx.fill();
    }

    // Faint veins of light threading between eyes
    _drawVeins(t) {
        const ctx = this.ctx;
        for (const v of this.veins) {
            const pulse = 0.5 + 0.5 * Math.sin(v.phase + t * v.spd);
            if (pulse < 0.25) continue;
            ctx.beginPath();
            ctx.moveTo(v.x1, v.y1);
            ctx.bezierCurveTo(v.cp1x, v.cp1y, v.cp1x, v.cp1y, v.x2, v.y2);
            ctx.strokeStyle = `hsla(${v.hue}, 80%, 60%, ${pulse * 0.045})`;
            ctx.lineWidth   = 1.0 + pulse * 0.8;
            ctx.stroke();
        }
    }

    draw(t) {
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        this.t    = t;

        // ── Slow fade — creates temporal smear / trails ───────────────────────
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(2, 1, 6, 0.055)';
        ctx.fillRect(0, 0, W, H);

        // ── Shifting void background pulse ────────────────────────────────────
        const bgHue  = 258 + Math.sin(t * 0.03) * 22;
        const bgCX   = W * (0.5 + 0.08 * Math.sin(t * 0.04));
        const bgCY   = H * (0.5 + 0.06 * Math.cos(t * 0.035));
        const bgR    = Math.max(W, H) * 0.72;
        const bgGrad = ctx.createRadialGradient(bgCX, bgCY, 0, bgCX, bgCY, bgR);
        bgGrad.addColorStop(0,   `hsla(${bgHue},      65%, 5%, 0.12)`);
        bgGrad.addColorStop(0.45,`hsla(${bgHue + 25}, 50%, 3%, 0.07)`);
        bgGrad.addColorStop(1,   `hsla(${bgHue - 18}, 40%, 1%, 0.04)`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // ── Veins ─────────────────────────────────────────────────────────────
        ctx.globalCompositeOperation = 'screen';
        this._drawVeins(t);

        // ── Eyes (with current blend mode) ────────────────────────────────────
        ctx.globalCompositeOperation = this.currentBlend;

        for (const eye of this.eyes) {
            // Update
            eye.x       += eye.vx;
            eye.y       += eye.vy;
            eye.rot     += eye.rotSpd;
            eye.irisRot += eye.irisRotSpd;

            // Micro-saccade update
            const sacc = eye.saccade;
            if (t >= sacc.nextAt) {
                const mag = 0.3 + Math.random() * 0.7;
                const ang = Math.random() * Math.PI * 2;
                sacc.dx   = Math.cos(ang) * mag;
                sacc.dy   = Math.sin(ang) * mag;
                sacc.nextAt = t + 2 + Math.random() * 4;
            }
            sacc.dx *= sacc.decayRate;
            sacc.dy *= sacc.decayRate;

            // Soft boundary: reverse & nudge when eye nears edge
            const pad = eye.size * 1.1;
            if (eye.x < pad)         { eye.x = pad;         eye.vx =  Math.abs(eye.vx); }
            if (eye.x > W - pad)     { eye.x = W - pad;     eye.vx = -Math.abs(eye.vx); }
            if (eye.y < pad * 0.55)  { eye.y = pad * 0.55;  eye.vy =  Math.abs(eye.vy); }
            if (eye.y > H - pad * 0.55) { eye.y = H - pad * 0.55; eye.vy = -Math.abs(eye.vy); }

            ctx.save();
            ctx.globalAlpha = eye.alpha;
            ctx.translate(eye.x, eye.y);
            ctx.rotate(eye.rot);
            this._drawEye(eye, t);
            ctx.restore();
        }

        // ── Reset composite op ────────────────────────────────────────────────
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
