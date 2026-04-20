// EyeSceneMode — The Great Eye. A mystical, deeply visual meditation on eyes,
// perception, and the all-seeing. The eye breathes, tracks, blinks, and stares
// back from the void. Behind it pulses sacred geometry; around it, satellite
// eyes drift in slow orbits. All watching. All aware.
class EyeSceneMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        // Pupil tracking
        this.px     = 0; this.py = 0;
        this.gazePx = 0; this.gazePy = 0;
        // Blink state
        this.blinkT       = -1;    // time blink started (-1 = none)
        this.blinkPhase   = 0;     // 0=open 1=closing 2=held 3=opening
        this.lidAmount    = 0;     // 0=open 1=closed
        // Iris color cycling
        this.colorIdx     = 0;
        this.colorT       = 0;
        // Ripple on blink
        this.rippleR      = 0;
        this.rippleAlpha  = 0;
        // Particles
        this.particles    = [];
        this.burstActive  = false;
        // Stars
        this.stars        = [];
        // Satellite eyes
        this.satEyes      = [];
        // Satellite blink delays
        this.satBlinkT    = [];
        this._init();
    }

    _init() {
        this.stars = Array.from({ length: 120 }, () => ({
            x: Math.random(), y: Math.random(),
            r: 0.5 + Math.random() * 1.2,
            twinkle: Math.random() * Math.PI * 2,
            speed: 0.4 + Math.random() * 1.2
        }));

        this.particles = Array.from({ length: 50 }, (_, i) => ({
            angle: (i / 50) * Math.PI * 2,
            dist:  0.92 + Math.random() * 0.12,   // fraction of iris radius
            speed: (0.18 + Math.random() * 0.22) * (Math.random() < 0.5 ? 1 : -1),
            size:  1 + Math.random() * 1.5,
            alpha: 0.4 + Math.random() * 0.5,
            vx: 0, vy: 0, bursting: false
        }));

        const satColors = [
            '#1a0a4a', '#0a3a1a', '#3a1a00', '#1a2a3a', '#2a0a2a', '#003a2a'
        ];
        this.satEyes = Array.from({ length: 6 }, (_, i) => ({
            orbitPhase:  (i / 6) * Math.PI * 2,
            orbitSpeed:  0.04 + i * 0.006,
            orbitRx:     0.34 + (i % 3) * 0.04,   // fraction of W
            orbitRy:     0.24 + (i % 2) * 0.04,   // fraction of H
            scale:       0.12 + Math.random() * 0.08,
            color:       satColors[i],
            lidness:     Math.random() * 0.45,      // how half-lidded normally
            blinkT:      -1,
            lidAmount:   0,
            px: 0, py: 0
        }));
    }

    startScene(scene) {
        this.t          = 0;
        this.px         = 0; this.py = 0;
        this.gazePx     = 0; this.gazePy = 0;
        this.blinkT     = -1;
        this.lidAmount  = 0;
        this.colorIdx   = 0;
        this.colorT     = 0;
        this.rippleAlpha= 0;
        this.rippleR    = 0;
        this.burstActive= false;
        for (const p of this.particles) { p.bursting = false; p.vx = 0; p.vy = 0; }
        for (const s of this.satEyes)   { s.blinkT = -1; s.lidAmount = 0; }
    }

    onBlink() {
        if (this.blinkT < 0) {
            this.blinkT   = this.t;
            this.blinkPhase = 1;
            // Advance iris color
            this.colorIdx = (this.colorIdx + 1) % 3;
            // Trigger ripple
            this.rippleR     = 0;
            this.rippleAlpha = 0.9;
            // Burst particles
            this.burstActive = true;
            for (const p of this.particles) {
                p.bursting = true;
                const a = Math.random() * Math.PI * 2;
                p.vx = Math.cos(a) * (2 + Math.random() * 3);
                p.vy = Math.sin(a) * (2 + Math.random() * 3);
            }
            // Satellite blink delays
            for (let i = 0; i < this.satEyes.length; i++) {
                this.satEyes[i].blinkT = this.t + i * 0.05;
            }
        }
    }

    onGaze(nx, ny) {
        // Store normalised gaze as offset from centre (-1..1)
        this.gazePx = (nx - 0.5) * 2;
        this.gazePy = (ny - 0.5) * 2;
    }

    stopScene() {}

    resize() {}

    // Interpolate between jewel colors
    _irisColor(idx, t) {
        const jewels = ['#1a0a4a', '#0a3a1a', '#3a1a00'];
        const next   = (idx + 1) % 3;
        const a = jewels[idx], b = jewels[next];
        const pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
        const pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
        const r  = Math.round(pa[0] + (pb[0]-pa[0])*t);
        const g  = Math.round(pa[1] + (pb[1]-pa[1])*t);
        const bv = Math.round(pa[2] + (pb[2]-pa[2])*t);
        return `rgb(${r},${g},${bv})`;
    }

    _drawEye(ctx, cx, cy, ew, eh, irisR, pupilR, pupilOx, pupilOy, lidAmt, color, fiberCount) {
        ctx.save();
        // Eye path helper: almond shape
        const makeEyePath = () => {
            const path = new Path2D();
            path.moveTo(cx - ew / 2, cy);
            path.bezierCurveTo(cx - ew * 0.18, cy - eh, cx + ew * 0.18, cy - eh, cx + ew / 2, cy);
            path.bezierCurveTo(cx + ew * 0.18, cy + eh, cx - ew * 0.18, cy + eh, cx - ew / 2, cy);
            return path;
        };

        // Clip to eye shape
        const eyePath = makeEyePath();
        ctx.clip(eyePath);

        // Sclera
        ctx.fillStyle = '#f8f4ec';
        ctx.fill(eyePath);

        // Iris radial gradient
        const grad = ctx.createRadialGradient(cx + pupilOx * 0.3, cy + pupilOy * 0.3, 0, cx, cy, irisR);
        grad.addColorStop(0,   color);
        const midColor = color.replace(/rgb\((\d+),(\d+),(\d+)\)/, (_, r, g, b) =>
            `rgba(${Math.min(255, +r+40)},${Math.min(255, +g+40)},${Math.min(255, +b+40)},1)`);
        grad.addColorStop(0.5, midColor || '#2a1a6a');
        grad.addColorStop(1,   'rgba(80,60,120,0.6)');
        ctx.beginPath();
        ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Iris fibers
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 0.5;
        for (let i = 0; i < fiberCount; i++) {
            const angle = (i / fiberCount) * Math.PI * 2;
            const wave  = Math.sin(angle * 7 + this.t * 0.4) * 0.06;
            const x0    = cx + Math.cos(angle + wave) * pupilR * 1.1;
            const y0    = cy + Math.sin(angle + wave) * pupilR * 1.1;
            const x1    = cx + Math.cos(angle - wave * 0.5) * irisR * 0.97;
            const y1    = cy + Math.sin(angle - wave * 0.5) * irisR * 0.97;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        ctx.restore();

        // Limbal ring
        ctx.beginPath();
        ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth   = irisR * 0.05;
        ctx.stroke();

        // Pupil
        const pCx = cx + pupilOx, pCy = cy + pupilOy;
        const pupilPulse = pupilR * (1 + 0.04 * Math.sin(this.t * 0.9));
        const pGrad = ctx.createRadialGradient(pCx, pCy, 0, pCx, pCy, pupilPulse);
        pGrad.addColorStop(0, '#000000');
        pGrad.addColorStop(0.7, '#050005');
        pGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.beginPath();
        ctx.arc(pCx, pCy, pupilPulse, 0, Math.PI * 2);
        ctx.fillStyle = pGrad;
        ctx.fill();

        // Catchlight
        ctx.beginPath();
        ctx.arc(pCx - pupilPulse * 0.28, pCy - pupilPulse * 0.3, pupilPulse * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fill();

        ctx.restore();

        // Eye outline stroke
        ctx.save();
        ctx.strokeStyle = 'rgba(180,160,200,0.6)';
        ctx.lineWidth   = 1.2;
        ctx.stroke(makeEyePath());
        ctx.restore();

        // Eyelid crease (subtle arc above eye)
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(cx, cy - eh * 0.1, ew * 0.42, Math.PI * 0.15, Math.PI * 0.85);
        ctx.strokeStyle = '#ccbbdd';
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.restore();

        // Blink lids
        if (lidAmt > 0.001) {
            ctx.save();
            ctx.clip(makeEyePath());
            // Top lid
            const topClose = cy - eh + (cy - (-eh)) * lidAmt;
            ctx.beginPath();
            ctx.moveTo(cx - ew / 2, cy);
            ctx.bezierCurveTo(cx - ew * 0.18, cy - eh, cx + ew * 0.18, cy - eh, cx + ew / 2, cy);
            ctx.lineTo(cx + ew / 2, topClose - cy + cy);
            ctx.bezierCurveTo(
                cx + ew * 0.18, cy - eh * (1 - lidAmt * 2),
                cx - ew * 0.18, cy - eh * (1 - lidAmt * 2),
                cx - ew / 2, topClose - cy + cy
            );
            ctx.fillStyle = '#050008';
            ctx.fill();
            // Bottom lid
            ctx.beginPath();
            ctx.moveTo(cx - ew / 2, cy);
            ctx.bezierCurveTo(cx - ew * 0.18, cy + eh, cx + ew * 0.18, cy + eh, cx + ew / 2, cy);
            ctx.lineTo(cx + ew / 2, cy + eh * lidAmt * 0.6);
            ctx.bezierCurveTo(
                cx + ew * 0.18, cy + eh * (1 - lidAmt),
                cx - ew * 0.18, cy + eh * (1 - lidAmt),
                cx - ew / 2, cy + eh * lidAmt * 0.6
            );
            ctx.fillStyle = '#050008';
            ctx.fill();
            ctx.restore();
        }
    }

    draw(dt) {
        this.t += dt;
        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;
        const cx  = W * 0.5, cy = H * 0.5;

        // Update blink state
        if (this.blinkT >= 0) {
            const elapsed = this.t - this.blinkT;
            if (elapsed < 0.15)       { this.blinkPhase = 1; this.lidAmount = Math.min(1, elapsed / 0.15); }
            else if (elapsed < 0.25)  { this.blinkPhase = 2; this.lidAmount = 1; }
            else if (elapsed < 0.45)  { this.blinkPhase = 3; this.lidAmount = 1 - (elapsed - 0.25) / 0.20; }
            else                      { this.blinkT = -1; this.lidAmount = 0; }
        }

        // Iris color interpolation
        this.colorT = (this.t * 0.08) % 1;

        // Lazy pupil tracking
        const irisR  = H * 0.14;
        const maxOff = irisR * 0.4;
        const targetPx = this.gazePx * maxOff;
        const targetPy = this.gazePy * maxOff;
        this.px += (targetPx - this.px) * 0.05;
        this.py += (targetPy - this.py) * 0.05;

        // --- Background ---
        ctx.save();
        ctx.fillStyle = '#050008';
        ctx.fillRect(0, 0, W, H);

        // Nebula wash
        const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55);
        nebGrad.addColorStop(0,   'rgba(40,10,70,0.45)');
        nebGrad.addColorStop(0.5, 'rgba(20,5,40,0.2)');
        nebGrad.addColorStop(1,   'transparent');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // Stars
        ctx.save();
        for (const s of this.stars) {
            s.twinkle += dt * s.speed;
            const a = 0.3 + 0.5 * Math.abs(Math.sin(s.twinkle));
            ctx.globalAlpha = a;
            ctx.fillStyle   = '#ffffff';
            ctx.beginPath();
            ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Sacred geometry — concentric 8-fold rings
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = '#d4aa55';
        ctx.lineWidth   = 0.8;
        for (let ring = 1; ring <= 5; ring++) {
            const rr = irisR * (1.5 + ring * 0.55);
            for (let seg = 0; seg < 8; seg++) {
                const a0 = (seg / 8) * Math.PI * 2 + this.t * 0.01;
                const a1 = a0 + Math.PI / 8;
                ctx.beginPath();
                ctx.arc(cx, cy, rr, a0, a1);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Providence triangle behind eye
        ctx.save();
        ctx.globalAlpha = 0.07;
        const triR = irisR * 2.6;
        ctx.strokeStyle = '#d4aa55';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
            i === 0 ? ctx.moveTo(cx + Math.cos(a) * triR, cy + Math.sin(a) * triR)
                    : ctx.lineTo(cx + Math.cos(a) * triR, cy + Math.sin(a) * triR);
        }
        ctx.closePath();
        ctx.stroke();
        // Rays from vertices
        ctx.globalAlpha = 0.04;
        for (let i = 0; i < 3; i++) {
            const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
            const vx2 = cx + Math.cos(a) * triR, vy2 = cy + Math.sin(a) * triR;
            for (let r2 = -4; r2 <= 4; r2++) {
                const spread = a + r2 * 0.06;
                ctx.beginPath();
                ctx.moveTo(vx2, vy2);
                ctx.lineTo(vx2 + Math.cos(spread) * W, vy2 + Math.sin(spread) * W);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Ripple
        if (this.rippleAlpha > 0.01) {
            this.rippleR     += dt * irisR * 4;
            this.rippleAlpha *= 0.88;
            ctx.save();
            ctx.globalAlpha  = this.rippleAlpha;
            ctx.strokeStyle  = '#d4aa55';
            ctx.lineWidth    = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, irisR + this.rippleR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Satellite eyes
        for (const s of this.satEyes) {
            s.orbitPhase += dt * s.orbitSpeed;
            const sx = cx + Math.cos(s.orbitPhase) * W * s.orbitRx;
            const sy = cy + Math.sin(s.orbitPhase) * H * s.orbitRy;
            const sEW = W * s.scale * 0.55;
            const sEH = sEW * 0.33;
            const sIR = sEW * 0.32;
            const sPR = sIR * 0.45;
            // Satellite pupil tracking
            const sMOff = sIR * 0.4;
            s.px += (this.gazePx * sMOff - s.px) * 0.04;
            s.py += (this.gazePy * sMOff - s.py) * 0.04;
            // Satellite blink
            if (s.blinkT >= 0) {
                const e = this.t - s.blinkT;
                if (e < 0.15) s.lidAmount = Math.min(1, e / 0.15);
                else if (e < 0.25) s.lidAmount = 1;
                else if (e < 0.45) s.lidAmount = 1 - (e - 0.25) / 0.20;
                else { s.blinkT = -1; s.lidAmount = 0; }
            }
            const finalLid = Math.max(s.lidAmount, s.lidness * 0.5);
            ctx.save();
            ctx.globalAlpha = 0.72;
            this._drawEye(ctx, sx, sy, sEW, sEH, sIR, sPR, s.px, s.py, finalLid, s.color, 20);
            ctx.restore();
        }

        // Particles orbiting iris
        const irisColor = this._irisColor(this.colorIdx, this.colorT);
        ctx.save();
        for (const p of this.particles) {
            if (p.bursting) {
                p.angle += (p.speed * dt * 0.5);
                p.vx *= 0.96; p.vy *= 0.96;
                const baseX = cx + Math.cos(p.angle) * irisR * p.dist;
                const baseY = cy + Math.sin(p.angle) * irisR * p.dist;
                const burstX = baseX + p.vx * 18;
                const burstY = baseY + p.vy * 18;
                if (Math.abs(p.vx) < 0.05 && Math.abs(p.vy) < 0.05) p.bursting = false;
                ctx.globalAlpha = p.alpha * 0.9;
                ctx.fillStyle   = '#f0d890';
                ctx.beginPath(); ctx.arc(burstX, burstY, p.size, 0, Math.PI * 2); ctx.fill();
            } else {
                p.angle += p.speed * dt;
                const px2 = cx + Math.cos(p.angle) * irisR * p.dist;
                const py2 = cy + Math.sin(p.angle) * irisR * p.dist;
                ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(this.t * 1.2 + p.angle));
                ctx.fillStyle   = '#f0d890';
                ctx.beginPath(); ctx.arc(px2, py2, p.size, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();

        // Main eye
        const ew = W * 0.55, eh = W * 0.09;
        const pupilR = H * 0.06;
        ctx.save();
        this._drawEye(ctx, cx, cy, ew, eh, irisR, pupilR, this.px, this.py, this.lidAmount, irisColor, 40);
        ctx.restore();
    }
}
