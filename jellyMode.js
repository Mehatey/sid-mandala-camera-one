// Jelly Mode — bioluminescent jellyfish drifting upward through dark water.
// Each has a pulsing translucent bell, glowing edge veins, trailing tentacles.
// They glow where they overlap. The whole scene breathes.
// Blink: all jellies flare at once — the abyss lights up — then returns to dark.
// Mouse: jellies are drawn gently toward your cursor, like curiosity.
class JellyMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this._jellies = [];
        this._mx     = null;
        this._my     = null;
        this._off    = null;
        this._offCtx = null;
    }

    startScene() {
        this.t        = 0;
        this._mx      = null;
        this._jellies = [];
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width  = W;
            this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }
        this._offCtx.fillStyle = '#01020c';
        this._offCtx.fillRect(0, 0, W, H);

        // Bioluminescent water motes — tiny floating particles that drift in the column
        this._motes = [];
        for (let i = 0; i < 90; i++) {
            const hue = 150 + Math.random() * 90;
            this._motes.push({
                x:          Math.random() * W,
                y:          Math.random() * H,
                vx:         (Math.random() - 0.5) * 0.10,
                vy:         -(0.03 + Math.random() * 0.10),
                r:          0.25 + Math.random() * 0.75,
                baseA:      0.03 + Math.random() * 0.075,
                hue,
                twinkle:    Math.random() * Math.PI * 2,
                twinkleSpd: 0.5 + Math.random() * 2.5,
            });
        }

        for (let i = 0; i < 7; i++) this._spawn(W, H, true);
    }

    onMouseMove(x, y)  { this._mx = x; this._my = y; }
    onHandMove(nx, ny) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this._mx = (1 - nx) * W;
        this._my = ny * H;
    }

    onBlink() {
        for (const j of this._jellies) j.glowBurst = 1.0;
    }

    _spawn(W, H, initial = false) {
        const hueBase = 155 + Math.random() * 90;  // teal → cyan → blue-violet
        const r       = 22 + Math.random() * 40;
        this._jellies.push({
            x:            Math.random() * W,
            y:            initial ? Math.random() * H * 1.1 : H + r * 2 + 20,
            r,
            a:            0,
            targetA:      0.22 + Math.random() * 0.35,
            riseSpeed:    0.15 + Math.random() * 0.22,
            driftPhase:   Math.random() * Math.PI * 2,
            pulsePhase:   Math.random() * Math.PI * 2,
            pulseRate:    0.35 + Math.random() * 0.45,
            tentacleN:    6 + Math.floor(Math.random() * 5),
            tentacleLen:  35 + Math.random() * 55,
            hue:          hueBase,
            glowBurst:    0,
            mx:           0, my: 0,  // smooth cursor follow
        });
    }

    _drawJelly(ctx, j, t) {
        const { x, y, r, hue, a, glowBurst, tentacleN, tentacleLen, pulsePhase, pulseRate } = j;
        const pulse  = 0.80 + 0.20 * Math.sin(t * pulseRate * Math.PI * 2 + pulsePhase);
        const pr     = r * pulse;
        const totalA = Math.min(1, a + glowBurst * 0.7);

        ctx.save();
        ctx.translate(x, y);

        // ── Outer glow ────────────────────────────────────────────────────────
        const outerR = pr * 2.2;
        const grd    = ctx.createRadialGradient(0, -pr * 0.15, 0, 0, 0, outerR);
        grd.addColorStop(0,   `hsla(${hue},     82%, 68%, ${totalA * 0.22})`);
        grd.addColorStop(0.5, `hsla(${hue + 25},72%, 58%, ${totalA * 0.07})`);
        grd.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(0, -pr * 0.2, outerR, outerR * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Bell fill ─────────────────────────────────────────────────────────
        ctx.beginPath();
        ctx.moveTo(-pr, 0);
        ctx.bezierCurveTo(-pr, -pr * 1.35, pr, -pr * 1.35, pr, 0);
        // Gentle scalloped bottom
        const scallops = 5;
        for (let s = scallops; s >= 0; s--) {
            const sx = -pr + (s / scallops) * pr * 2;
            const sy =  Math.sin((s / scallops) * Math.PI) * pr * 0.12;
            ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue}, 60%, 52%, ${totalA * 0.15})`;
        ctx.fill();

        // ── Bell edge (glowing rim) ────────────────────────────────────────────
        ctx.beginPath();
        ctx.moveTo(-pr, 0);
        ctx.bezierCurveTo(-pr, -pr * 1.35, pr, -pr * 1.35, pr, 0);
        ctx.strokeStyle = `hsla(${hue}, 86%, 74%, ${totalA * 0.60})`;
        ctx.lineWidth   = 1.2;
        ctx.stroke();

        // ── Inner radial veins ─────────────────────────────────────────────────
        const veins = 7;
        for (let v = 1; v < veins; v++) {
            const vfrac = v / veins;
            const vx    = -pr + vfrac * pr * 2;
            // Curve from rim base to crown
            ctx.beginPath();
            ctx.moveTo(vx, 0);
            ctx.quadraticCurveTo(vx * 0.45, -pr * 0.75, 0, -pr * 1.1);
            ctx.strokeStyle = `hsla(${hue + 18}, 72%, 68%, ${totalA * 0.22})`;
            ctx.lineWidth   = 0.65;
            ctx.stroke();
        }

        // ── Oral arms (central mass) ───────────────────────────────────────────
        for (let arm = -1; arm <= 1; arm += 2) {
            ctx.beginPath();
            ctx.moveTo(arm * pr * 0.18, 0);
            ctx.bezierCurveTo(
                arm * pr * 0.35, pr * 0.4,
                arm * pr * 0.5,  pr * 0.7,
                arm * pr * 0.28, pr * 1.0
            );
            ctx.strokeStyle = `hsla(${hue + 10}, 70%, 65%, ${totalA * 0.18})`;
            ctx.lineWidth   = 0.9;
            ctx.stroke();
        }

        // ── Tentacles ─────────────────────────────────────────────────────────
        for (let ti = 0; ti < tentacleN; ti++) {
            const frac = ti / (tentacleN - 1);
            const tx   = (-pr * 0.88) + frac * (pr * 1.76);
            ctx.beginPath();
            ctx.moveTo(tx, 0);
            const segs = 8;
            for (let seg = 1; seg <= segs; seg++) {
                const sf  = seg / segs;
                const sy  = sf * tentacleLen;
                const sx  = tx + Math.sin(t * 1.3 + ti * 0.85 + pulsePhase + seg * 0.4) * (sf * r * 0.38);
                if (seg === 1) ctx.lineTo(sx, sy);
                else           ctx.lineTo(sx, sy);
            }
            const tentA = totalA * (0.18 + Math.abs(Math.sin(t * 0.8 + ti)) * 0.12);
            ctx.strokeStyle = `hsla(${hue + 8}, 72%, 68%, ${tentA})`;
            ctx.lineWidth   = 0.7;
            ctx.stroke();
        }

        ctx.restore();
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const oc  = this._offCtx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Deep ocean — very slow fade
        oc.fillStyle = 'rgba(1, 2, 12, 0.025)';
        oc.fillRect(0, 0, W, H);

        // ── Water motes — drawn first so jellies appear in front ─────────────
        for (const m of this._motes) {
            m.x       += m.vx + Math.sin(this.t * 0.28 + m.twinkle) * 0.04;
            m.y       += m.vy;
            m.twinkle += m.twinkleSpd * 0.016;
            if (m.y < -4) m.y = H + 4;
            if (m.x < -4) m.x = W + 4;
            if (m.x > W + 4) m.x = -4;

            const ta = m.baseA * (0.45 + 0.55 * Math.abs(Math.sin(m.twinkle)));
            if (ta < 0.01) continue;

            // Tiny glow disk
            const mg = oc.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
            mg.addColorStop(0,   `hsla(${m.hue}, 80%, 70%, ${ta * 0.8})`);
            mg.addColorStop(0.5, `hsla(${m.hue}, 70%, 58%, ${ta * 0.25})`);
            mg.addColorStop(1,   'rgba(0,0,0,0)');
            oc.fillStyle = mg;
            oc.beginPath(); oc.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2); oc.fill();

            // Hard core dot
            oc.beginPath();
            oc.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            oc.fillStyle = `hsla(${m.hue}, 85%, 78%, ${ta})`;
            oc.fill();
        }

        // Update + draw jellies
        for (let i = this._jellies.length - 1; i >= 0; i--) {
            const j = this._jellies[i];

            // Gentle rise + horizontal sway
            j.y -= j.riseSpeed;
            j.x += Math.sin(this.t * 0.22 + j.driftPhase) * 0.12;

            // Soft cursor attraction
            if (this._mx !== null) {
                const attrX = this._mx - j.x;
                const attrY = this._my - j.y;
                const dist  = Math.hypot(attrX, attrY);
                const pull  = Math.max(0, 1 - dist / (W * 0.45)) * 0.00015;
                j.mx = (j.mx || 0) + attrX * pull;
                j.my = (j.my || 0) + attrY * pull;
                j.mx *= 0.94;
                j.my *= 0.94;
                j.x  += j.mx;
                j.y  += j.my;
            }

            j.a         += (j.targetA - j.a) * 0.018;
            j.glowBurst *= 0.92;

            // Remove when far off top
            if (j.y < -(j.r * 2 + j.tentacleLen + 40)) {
                this._jellies.splice(i, 1);
                this._spawn(W, H);
                continue;
            }

            this._drawJelly(oc, j, this.t);
        }

        // Keep population
        while (this._jellies.length < 7) this._spawn(W, H);

        // Composite with screen blend to get the bioluminescent glow look
        ctx.drawImage(this._off, 0, 0);
    }
}
