// Mandala3D — perspective-projected 3D lotus mandala for Scene 1 (Stillness).
// Concentric petal rings in 3D; camera orbits slowly; mouse steers tilt & rotation.
// Each blink blooms a new ring outward; up to MAX_RINGS total.
class Mandala3D {

    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.rings  = [];
        this.MAX_RINGS = 11;
        this.t  = 0;
        this.cx = 0;
        this.cy = 0;

        // Camera
        this.rotY    = 0;         // slow auto-orbit around Y axis
        this.rotYSpd = 0.0038;
        this.tiltX   = 0.50;      // static downward tilt (~28°)
        this.camDist = 530;
        this.camFov  = 465;

        // Mouse-driven offsets (smoothed)
        this._mRotY  = 0;  this._tMRotY  = 0;
        this._mTiltX = 0;  this._tMTiltX = 0;

        // Pre-computed rotation matrix (updated once per frame in _updateTrig)
        this._cosY = 1; this._sinY = 0;
        this._cosX = 1; this._sinX = 0;

        // Bloom ripple waves on blink
        this.bloomWaves = [];

        // Floating light motes
        this._motes    = [];
        this._moteMax  = 55;
    }

    // ── Scene lifecycle ───────────────────────────────────────────────────────
    startScene() {
        this.t = 0;
        this.rotY = 0;
        this.rings = [];
        this.bloomWaves = [];
        this._motes = [];
        this.cx = this.canvas.width  / 2;
        this.cy = this.canvas.height / 2;

        // Seed initial 4 rings
        for (let i = 0; i < 4; i++) this._addRing(i, true);

        // Seed atmospheric motes
        for (let i = 0; i < this._moteMax; i++) this._spawnMote(true);
    }

    onBlink() {
        if (this.rings.length < this.MAX_RINGS) {
            this._addRing(this.rings.length, false);
        }
        this.bloomWaves.push({ age: 0, life: 2.2 });
    }

    setMousePosition(mx, my) {
        const W = this.canvas.width, H = this.canvas.height;
        this._tMRotY  = ((mx / W) - 0.5) * 1.5;   // left-right → Y rotation
        this._tMTiltX = ((my / H) - 0.5) * 0.65;  // up-down    → X tilt
    }

    // ── Ring factory ─────────────────────────────────────────────────────────
    _addRing(idx, instant) {
        const t    = this.MAX_RINGS > 1 ? idx / (this.MAX_RINGS - 1) : 0;
        const r    = 38 + t * 265;          // 38 → 303 world units

        // Petal height follows a sine arc: small bud → open → flat outer edge
        const petalH = 10 + 60 * Math.sin(Math.PI * t * 0.88);

        // Hue: inner navy-blue (228) → outer cyan-turquoise (186)
        const hue  = Math.round(228 - t * 42);

        // Alternate rings offset by half petal for interlocking appearance
        const petals = 12;
        const rot    = idx % 2 === 0 ? 0 : (Math.PI / petals);

        this.rings.push({ idx, r, petals, petalH, hue, alpha: instant ? 1 : 0, rot });
    }

    // ── Floating motes (atmospheric light particles) ──────────────────────────
    _spawnMote(initial) {
        const ri   = Math.floor(Math.random() * Math.max(1, this.rings.length));
        const ring = this.rings[ri] || { r: 90, hue: 210, petalH: 30 };
        const ang  = Math.random() * Math.PI * 2;
        const rOff = (Math.random() - 0.5) * ring.r * 0.35;
        this._motes.push({
            rx:  Math.cos(ang) * (ring.r + rOff),
            ry:  (Math.random() - 0.2) * ring.petalH * 0.75,
            rz:  Math.sin(ang) * (ring.r + rOff),
            vy:  0.006 + Math.random() * 0.011,
            hue:   ring.hue,
            size:  0.9 + Math.random() * 1.5,
            alpha: 0.14 + Math.random() * 0.42,
            age:   initial ? Math.random() * 8 : 0,
            life:  5 + Math.random() * 9,
        });
    }

    // ── Perspective projection ────────────────────────────────────────────────
    // _updateTrig() must be called once per frame before any _project() calls.
    _updateTrig() {
        const yAngle = this.rotY + this._mRotY;
        this._cosY   = Math.cos(yAngle);
        this._sinY   = Math.sin(yAngle);
        const xAngle = this.tiltX + this._mTiltX;
        this._cosX   = Math.cos(xAngle);
        this._sinX   = Math.sin(xAngle);
    }

    _project(px, py, pz) {
        // Y-axis rotation
        const rx =  px * this._cosY + pz * this._sinY;
        const rz = -px * this._sinY + pz * this._cosY;

        // X-axis tilt
        const ry2 =  py * this._cosX - rz * this._sinX;
        const rz2 =  py * this._sinX + rz * this._cosX;

        const dz = this.camDist + rz2;
        if (dz < 5) return null;
        const sc = this.camFov / dz;
        return { x: this.cx + rx * sc, y: this.cy - ry2 * sc, sc, dz };
    }

    // ── Main draw entry ───────────────────────────────────────────────────────
    draw(time) {
        this.t += 0.016;
        this.rotY    += this.rotYSpd;
        this._mRotY  += (this._tMRotY  - this._mRotY)  * 0.045;
        this._mTiltX += (this._tMTiltX - this._mTiltX) * 0.035;
        this._updateTrig();

        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;
        this.cx   = W / 2;
        this.cy   = H / 2;

        // Slow dark fade (builds trail)
        ctx.fillStyle = 'rgba(1, 2, 14, 0.10)';
        ctx.fillRect(0, 0, W, H);

        // Fade in newly added rings
        for (const ring of this.rings) {
            if (ring.alpha < 1) ring.alpha = Math.min(1, ring.alpha + 0.013);
        }

        // Collect petals for depth-sorted painter's algorithm (back → front)
        const items = [];
        for (const ring of this.rings) {
            const dθ = (Math.PI * 2) / ring.petals;
            for (let j = 0; j < ring.petals; j++) {
                const θ  = ring.rot + j * dθ;
                const tx = ring.r * Math.cos(θ);
                const tz = ring.r * Math.sin(θ);
                const p  = this._project(tx, ring.petalH * 0.55, tz);
                items.push({ ring, θ, dθ, dz: p ? p.dz : 9999 });
            }
        }
        items.sort((a, b) => b.dz - a.dz); // furthest first

        // Draw concentric base-plane dotted circles
        this._drawBase();

        // Draw all petals in depth order
        for (const it of items) this._drawPetal(it.ring, it.θ, it.dθ);

        // Core glow at origin
        this._drawCore();

        // Atmospheric motes
        this._drawMotes();

        // Bloom ripple waves (on blink)
        this._drawBloom();
    }

    // ── Base plane: dotted ring outlines ──────────────────────────────────────
    _drawBase() {
        const ctx = this.ctx;
        const N   = 52;
        for (const ring of this.rings) {
            if (ring.alpha < 0.04) continue;
            ctx.save();
            ctx.globalAlpha = ring.alpha * 0.16;
            ctx.strokeStyle = `hsl(${ring.hue}, 68%, 52%)`;
            ctx.lineWidth   = 1.0;
            ctx.setLineDash([2, 5]);
            ctx.beginPath();
            let first = true;
            for (let k = 0; k <= N; k++) {
                const a = (k / N) * Math.PI * 2;
                const p = this._project(ring.r * Math.cos(a), 0, ring.r * Math.sin(a));
                if (!p) { first = true; continue; }
                if (first) { ctx.moveTo(p.x, p.y); first = false; }
                else         ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    // ── Single petal: two Bezier edges + inner arc + central vein ────────────
    _drawPetal(ring, θ, dθ) {
        const ctx = this.ctx;
        const r   = ring.r;
        const h   = ring.petalH;
        const hw  = dθ * 0.44;     // half-angular width of petal
        const ri  = r * 0.50;      // inner radius (base arc)

        // Six key 3D points that define the petal
        const bL   = [ri * Math.cos(θ - hw),                0, ri * Math.sin(θ - hw)               ]; // base-left
        const bR   = [ri * Math.cos(θ + hw),                0, ri * Math.sin(θ + hw)               ]; // base-right
        const tip  = [r  * Math.cos(θ),                     h, r  * Math.sin(θ)                    ]; // tip (top)
        const cpL  = [r  * Math.cos(θ - hw * 0.52) * 1.06, h * 0.55, r * Math.sin(θ - hw * 0.52) * 1.06]; // Bezier ctrl L
        const cpR  = [r  * Math.cos(θ + hw * 0.52) * 1.06, h * 0.55, r * Math.sin(θ + hw * 0.52) * 1.06]; // Bezier ctrl R
        const bMid = [ri * Math.cos(θ) * 0.88,              0, ri * Math.sin(θ) * 0.88             ]; // inner arc midpoint

        const pBL  = this._project(...bL);
        const pBR  = this._project(...bR);
        const pTip = this._project(...tip);
        const pCpL = this._project(...cpL);
        const pCpR = this._project(...cpR);
        const pBMid= this._project(...bMid);

        if (!pBL || !pBR || !pTip || !pCpL || !pCpR) return;

        // Depth-driven brightness: close petals are bright, far petals are dim
        const baseScale = this.camFov / this.camDist;      // ≈ 0.877
        const bright    = Math.max(0.12, Math.min(1.0, pTip.sc / baseScale));
        const alpha     = ring.alpha * (0.46 + 0.44 * bright);
        const hue       = ring.hue;
        const sat       = 65 + 24 * bright;
        const lit       = 26 + 44 * bright;

        ctx.save();
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        // Ghost fill (very subtle translucent interior)
        if (pBMid) {
            ctx.beginPath();
            ctx.moveTo(pBL.x, pBL.y);
            ctx.quadraticCurveTo(pCpL.x, pCpL.y, pTip.x, pTip.y);
            ctx.quadraticCurveTo(pCpR.x, pCpR.y, pBR.x, pBR.y);
            ctx.quadraticCurveTo(pBMid.x, pBMid.y, pBL.x, pBL.y);
            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${alpha * 0.07})`;
            ctx.fill();
        }

        // Left edge stroke
        const strokeAlpha = alpha;
        const lw          = 1.0 + bright * 0.90;
        ctx.strokeStyle   = `hsla(${hue}, ${sat}%, ${lit + 10}%, ${strokeAlpha})`;
        ctx.lineWidth     = lw;
        ctx.beginPath();
        ctx.moveTo(pBL.x, pBL.y);
        ctx.quadraticCurveTo(pCpL.x, pCpL.y, pTip.x, pTip.y);
        ctx.stroke();

        // Right edge stroke
        ctx.beginPath();
        ctx.moveTo(pTip.x, pTip.y);
        ctx.quadraticCurveTo(pCpR.x, pCpR.y, pBR.x, pBR.y);
        ctx.stroke();

        // Inner base arc (subtle, lighter hue)
        if (pBMid) {
            ctx.strokeStyle = `hsla(${hue + 14}, ${sat}%, ${lit + 17}%, ${alpha * 0.38})`;
            ctx.lineWidth   = 0.75;
            ctx.beginPath();
            ctx.moveTo(pBL.x, pBL.y);
            ctx.quadraticCurveTo(pBMid.x, pBMid.y, pBR.x, pBR.y);
            ctx.stroke();
        }

        // Central vein (very faint line from base centre to tip)
        if (pBMid) {
            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit + 24}%, ${alpha * 0.24})`;
            ctx.lineWidth   = 0.6;
            ctx.beginPath();
            ctx.moveTo(pBMid.x, pBMid.y);
            ctx.lineTo(pTip.x,  pTip.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ── Core glow at origin ───────────────────────────────────────────────────
    _drawCore() {
        const ctx   = this.ctx;
        const p0    = this._project(0, 0, 0);
        if (!p0) return;

        const pulse = 1 + 0.11 * Math.sin(this.t * 0.88);
        const r     = 20 * pulse;

        // Wide soft glow
        const grd = ctx.createRadialGradient(p0.x, p0.y, 0, p0.x, p0.y, r * 4);
        grd.addColorStop(0,    `rgba(175, 228, 255, ${0.52 + 0.10 * Math.sin(this.t * 1.35)})`);
        grd.addColorStop(0.22, `rgba(80,  168, 248, 0.18)`);
        grd.addColorStop(0.55, `rgba(28,  88,  205, 0.06)`);
        grd.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, r * 4, 0, Math.PI * 2);
        ctx.fill();

        // Bright centre pinpoint
        ctx.save();
        ctx.shadowColor = 'rgba(200, 238, 255, 0.70)';
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = `rgba(225, 243, 255, ${0.60 + 0.15 * Math.sin(this.t * 2.2)})`;
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── Atmospheric floating motes ────────────────────────────────────────────
    _drawMotes() {
        const ctx       = this.ctx;
        const baseScale = this.camFov / this.camDist;

        // Keep quota filled
        while (this._motes.length < this._moteMax) this._spawnMote(false);

        for (let i = this._motes.length - 1; i >= 0; i--) {
            const m = this._motes[i];
            m.age += 0.016;
            m.ry  += m.vy;

            if (m.age > m.life) { this._motes.splice(i, 1); continue; }

            const lr  = m.age / m.life;
            const env = lr < 0.18 ? lr / 0.18 : 1 - Math.pow((lr - 0.18) / 0.82, 0.55);
            const p   = this._project(m.rx, m.ry, m.rz);
            if (!p) continue;

            const scaledSize = m.size * (p.sc / baseScale);
            if (scaledSize < 0.15) continue;

            ctx.save();
            ctx.globalAlpha = m.alpha * env * Math.min(1, p.sc / baseScale);
            ctx.shadowColor = `hsl(${m.hue}, 92%, 72%)`;
            ctx.shadowBlur  = scaledSize * 6;
            ctx.fillStyle   = `hsl(${m.hue}, 84%, 70%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.25, scaledSize), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ── Bloom ripple wave (projects the wave circle into XZ-plane ellipse) ────
    _drawBloom() {
        const ctx = this.ctx;
        const N   = 40;

        for (let i = this.bloomWaves.length - 1; i >= 0; i--) {
            const bw = this.bloomWaves[i];
            bw.age += 0.016;
            if (bw.age >= bw.life) { this.bloomWaves.splice(i, 1); continue; }

            const progress = bw.age / bw.life;
            const maxR = this.rings.length > 0
                ? this.rings[this.rings.length - 1].r * 1.40
                : 220;
            const wR    = maxR * Math.pow(progress, 0.46);
            const alpha = (1 - progress) * 0.52;

            ctx.save();
            ctx.strokeStyle = `rgba(148, 220, 255, ${alpha})`;
            ctx.lineWidth   = 1.8 * (1 - progress * 0.65);
            ctx.beginPath();
            let first = true;
            for (let k = 0; k <= N; k++) {
                const a = (k / N) * Math.PI * 2;
                const p = this._project(wR * Math.cos(a), 0, wR * Math.sin(a));
                if (!p) { first = true; continue; }
                if (first) { ctx.moveTo(p.x, p.y); first = false; }
                else         ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    destroy() {
        this.rings = [];
        this.bloomWaves = [];
        this._motes = [];
    }
}
