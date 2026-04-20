// Drift Mode — a journey through deep space steered by your face.
// The blink detector's face-position data tilts your path through the starfield.
// Lean left → you curve left. Lean right → right. Center → drift forward.
// Blinks burst light and briefly accelerate.
// No hand tracking needed — just be present and let the universe respond.
class DriftMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this.stars   = [];
        this.nebulae = [];
        this.N_STARS   = 680;
        this.N_NEBULAE = 14;

        // Face position (fed from blinkDetector onGaze callback)
        this._faceX = 0.5;
        this._faceY = 0.5;

        // Camera lateral drift accumulates from face tilt
        this._camX  = 0;
        this._camY  = 0;
        this._camVX = 0;
        this._camVY = 0;

        this._BASE_SPEED  = 0.00060;  // forward speed — slow, meditative
        this._blinkBoost  = 0;        // fades from 1 → 0 after a blink
        this._blinkCount  = 0;
    }

    startScene() {
        this.t         = 0;
        this._faceX    = 0.5;
        this._faceY    = 0.5;
        this._camX     = 0;
        this._camY     = 0;
        this._camVX    = 0;
        this._camVY    = 0;
        this._blinkBoost = 0;
        this._blinkCount = 0;
        this._buildStarfield();
    }

    _buildStarfield() {
        this.stars = [];
        for (let i = 0; i < this.N_STARS; i++) {
            this.stars.push(this._newStar(true));
        }

        // Nebulae: slow-moving coloured dust clouds in 3D space
        const COLS = [
            { h: 235, s: 65, l: 22 },   // deep blue
            { h: 275, s: 55, l: 18 },   // violet
            { h: 198, s: 60, l: 20 },   // teal
            { h: 330, s: 48, l: 18 },   // magenta-rose
        ];
        this.nebulae = [];
        for (let i = 0; i < this.N_NEBULAE; i++) {
            const c = COLS[i % COLS.length];
            this.nebulae.push({
                x:    (Math.random() - 0.5) * 2.4,
                y:    (Math.random() - 0.5) * 2.4,
                z:    0.12 + Math.random() * 0.80,
                r:    0.055 + Math.random() * 0.10,   // world-space radius
                h:    c.h + (Math.random() - 0.5) * 22,
                s:    c.s,
                l:    c.l,
                a:    0.12 + Math.random() * 0.13,
            });
        }
    }

    _newStar(initial) {
        // ~80% white, remainder tinted
        const COLS = [
            null, null, null, null,
            { h: 205, s: 75, l: 90 },   // blue-white
            { h:  38, s: 80, l: 90 },   // warm golden
            { h: 315, s: 60, l: 90 },   // pale rose
        ];
        const col = COLS[Math.floor(Math.random() * COLS.length)];
        return {
            x:    (Math.random() - 0.5) * 2.0,
            y:    (Math.random() - 0.5) * 2.0,
            z:    initial ? 0.04 + Math.random() * 0.95 : 0.75 + Math.random() * 0.25,
            px:   0, py:   0,  // last screen pos for streak
            col,
            twinkle:    Math.random() * Math.PI * 2,
            twinkleSpd: 0.9 + Math.random() * 2.2,
            sz:   0.4 + Math.random() * 1.2,   // base size multiplier
        };
    }

    // Called every frame from main.js via the blinkDetector onGaze callback
    onFaceMove(normX, normY) {
        // Gentle exponential smoothing — the universe responds slowly
        this._faceX += (normX - this._faceX) * 0.06;
        this._faceY += (normY - this._faceY) * 0.06;
    }

    onBlink() {
        this._blinkBoost  = 1.0;
        this._blinkCount++;
    }

    draw(time) {
        this.t += 0.016;
        this._blinkBoost = Math.max(0, this._blinkBoost - 0.016 * 0.90);

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const FOV = Math.min(W, H) * 0.62;

        // Background fade: slightly more transparent during blink surge for streak feel
        const fadeA = 0.12 + this._blinkBoost * 0.10;
        ctx.fillStyle = `rgba(0, 0, 4, ${fadeA})`;
        ctx.fillRect(0, 0, W, H);

        // Forward speed + blink surge
        const speed = this._BASE_SPEED + this._blinkBoost * 0.0042;

        // Camera tilt: face deviation from centre controls lateral velocity
        // flip X so leaning right → move right (not mirrored)
        const tiltX = (0.5 - this._faceX) * 0.007;   // face left → camera drifts left
        const tiltY = (this._faceY - 0.5) * 0.004;
        this._camVX += (tiltX - this._camVX) * 0.035;
        this._camVY += (tiltY - this._camVY) * 0.035;
        this._camX  += this._camVX;
        this._camY  += this._camVY;

        // ── Nebulae (far background, parallax factor 0.25) ──────────────────────
        for (const neb of this.nebulae) {
            neb.z -= speed * 0.22;
            if (neb.z < 0.04) {
                neb.z = 0.8 + Math.random() * 0.2;
                neb.x = (Math.random() - 0.5) * 2.4;
                neb.y = (Math.random() - 0.5) * 2.4;
            }

            const wx = neb.x + this._camX * 0.25;
            const wy = neb.y + this._camY * 0.25;
            const sx = W / 2 + (wx / neb.z) * FOV;
            const sy = H / 2 + (wy / neb.z) * FOV;
            const sr = (neb.r / neb.z) * FOV;

            if (sx < -sr || sx > W + sr || sy < -sr || sy > H + sr) continue;

            const fadeZ = Math.min(1, (neb.z - 0.04) / 0.08);
            const a     = neb.a * fadeZ;
            if (a < 0.01) continue;

            const ng = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            ng.addColorStop(0,   `hsla(${neb.h}, ${neb.s}%, ${neb.l + 18}%, ${a})`);
            ng.addColorStop(0.45,`hsla(${neb.h}, ${neb.s}%, ${neb.l}%,     ${a * 0.45})`);
            ng.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = ng;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Stars ────────────────────────────────────────────────────────────────
        ctx.lineCap = 'round';
        for (const star of this.stars) {
            const lastSx = star.px;
            const lastSy = star.py;

            star.z -= speed;

            if (star.z <= 0.004) {
                star.px = 0; star.py = 0;
                Object.assign(star, this._newStar(false));
                continue;
            }

            star.twinkle += star.twinkleSpd * 0.016;
            const twink = 0.78 + 0.22 * Math.sin(star.twinkle);

            const wx = star.x + this._camX;
            const wy = star.y + this._camY;
            const sx = W / 2 + (wx / star.z) * FOV;
            const sy = H / 2 + (wy / star.z) * FOV;

            star.px = sx;
            star.py = sy;

            if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;

            // Depth-based alpha: fade in when spawning far, fade out when too close
            const fadeIn  = Math.min(1, (1 - star.z) / 0.08);   // fade in as it approaches
            const fadeOut = Math.min(1, (star.z - 0.004) / 0.015);
            const depthA  = fadeIn * fadeOut;
            if (depthA < 0.01) continue;

            const brightness = Math.min(1, 0.04 / (star.z + 0.01));
            const sr  = Math.max(0.3, star.sz * brightness * 3.8) * twink;
            const a   = Math.min(0.96, brightness * 9) * depthA * twink;
            if (a < 0.02) continue;

            const isClose = star.z < 0.18;

            // Streak: draw line from last position when close + during blink surge
            if (lastSx > 0 && isClose && (this._blinkBoost > 0.15 || star.z < 0.08)) {
                const sdx  = sx - lastSx;
                const sdy  = sy - lastSy;
                const sLen = Math.sqrt(sdx * sdx + sdy * sdy);
                if (sLen > 1.5) {
                    const sa = a * Math.min(1, sLen / 10) * 0.75;
                    ctx.strokeStyle = star.col
                        ? `hsla(${star.col.h}, ${star.col.s}%, ${star.col.l}%, ${sa})`
                        : `rgba(255,255,255,${sa})`;
                    ctx.lineWidth = sr * 0.75;
                    ctx.beginPath();
                    ctx.moveTo(lastSx, lastSy);
                    ctx.lineTo(sx, sy);
                    ctx.stroke();
                }
            }

            // Star glow (close stars get a soft halo)
            if (sr > 1.2) {
                const glowR = sr * 2.8;
                const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
                const c0 = star.col ? `hsla(${star.col.h}, ${star.col.s}%, ${star.col.l}%, ${a})` : `rgba(255,255,255,${a})`;
                const c1 = star.col ? `hsla(${star.col.h}, ${star.col.s}%, ${star.col.l}%, ${a * 0.30})` : `rgba(255,255,255,${a * 0.30})`;
                sg.addColorStop(0,    c0);
                sg.addColorStop(0.35, c1);
                sg.addColorStop(1,    'rgba(0,0,0,0)');
                ctx.fillStyle = sg;
                ctx.beginPath();
                ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = star.col
                    ? `hsla(${star.col.h}, ${star.col.s}%, ${star.col.l}%, ${a})`
                    : `rgba(255,255,255,${a})`;
                ctx.beginPath();
                ctx.arc(sx, sy, sr, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Blink burst: lens-flare ring of light from centre ────────────────────
        if (this._blinkBoost > 0.04) {
            const cx  = W / 2, cy = H / 2;
            const br  = Math.max(W, H) * 0.38 * this._blinkBoost;
            const bf  = ctx.createRadialGradient(cx, cy, 0, cx, cy, br);
            const ba  = this._blinkBoost;
            bf.addColorStop(0,   `rgba(210, 230, 255, ${ba * 0.14})`);
            bf.addColorStop(0.3, `rgba(170, 200, 255, ${ba * 0.05})`);
            bf.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = bf;
            ctx.beginPath();
            ctx.arc(cx, cy, br, 0, Math.PI * 2);
            ctx.fill();

            // Thin ring pulse
            ctx.beginPath();
            ctx.arc(cx, cy, br * (1 - this._blinkBoost * 0.5), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 220, 255, ${ba * 0.08})`;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }

        // ── Subtle vignette — draws the eye inward to the tunnel ─────────────────
        const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.22, W/2, H/2, Math.max(W,H)*0.70);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, `rgba(0,0,2,${0.40 + this._blinkBoost * 0.10})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
