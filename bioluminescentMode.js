// Bioluminescent Mode — deep ocean darkness lit only by living light.
// Jellyfish pulse, plankton sparkle, rare fish leave bright streaks.
// Blink: a wave of cold light pulses through the water.
class BioluminescentMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._jellies  = [];
        this._plankton = [];
        this._fish     = [];
        this._wave     = 0;
    }

    startScene() {
        this.t    = 0;
        this._wave = 0;
        this._jellies  = [];
        this._plankton = [];
        this._fish     = [];
        const W = this.canvas.width, H = this.canvas.height;

        // Spawn jellyfish
        for (let i = 0; i < 7; i++) this._spawnJelly(W, H, true);

        // Spawn plankton cloud
        for (let i = 0; i < 320; i++) {
            this._plankton.push({
                x:    Math.random() * W,
                y:    Math.random() * H,
                r:    0.6 + Math.random() * 1.4,
                hue:  160 + Math.random() * 60,
                phase: Math.random() * Math.PI * 2,
                speed: 0.4 + Math.random() * 1.2,
                vx:   (Math.random() - 0.5) * 0.3,
                vy:   -(0.05 + Math.random() * 0.15),
            });
        }
    }

    _spawnJelly(W, H, initial = false) {
        const x = W * (0.1 + Math.random() * 0.8);
        const y = initial ? H * (0.1 + Math.random() * 0.85) : H + 60;
        const hue = 160 + Math.random() * 80;
        this._jellies.push({
            x, y,
            r:     30 + Math.random() * 55,
            hue,
            phase: Math.random() * Math.PI * 2,
            pulseFrq: 0.5 + Math.random() * 0.8,
            vy:   -(0.12 + Math.random() * 0.30),
            vx:   (Math.random() - 0.5) * 0.18,
            tentN: 6 + Math.floor(Math.random() * 8),
            alpha: 0.25 + Math.random() * 0.25,
        });
    }

    onBlink() {
        this._wave = 1.0;
        const W = this.canvas.width, H = this.canvas.height;
        // Rare deep-sea fish streak
        const side = Math.random() < 0.5 ? -1 : 1;
        this._fish.push({
            x:   side < 0 ? -80 : W + 80,
            y:   H * (0.2 + Math.random() * 0.6),
            vx:  side * (2.5 + Math.random() * 2.0),
            hue: 170 + Math.random() * 50,
            len: 40 + Math.random() * 60,
            life: 0, maxLife: 4.0,
        });
    }

    draw(time) {
        this.t += 0.016;
        this._wave = Math.max(0, this._wave - 0.016 * 0.8);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const t  = this.t;

        // Deep ocean background
        ctx.fillStyle = 'rgba(0, 2, 8, 0.18)';
        ctx.fillRect(0, 0, W, H);

        // Depth gradient
        const depth = ctx.createLinearGradient(0, 0, 0, H);
        depth.addColorStop(0, 'rgba(0, 5, 18, 0.06)');
        depth.addColorStop(1, 'rgba(0, 1, 4, 0.10)');
        ctx.fillStyle = depth;
        ctx.fillRect(0, 0, W, H);

        // ── Blink wave ─────────────────────────────────────────────
        if (this._wave > 0.02) {
            const wR = Math.max(W, H) * 1.5;
            const wg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, wR);
            wg.addColorStop(0,   `rgba(0, 180, 200, ${this._wave * 0.12})`);
            wg.addColorStop(0.4, `rgba(0, 120, 160, ${this._wave * 0.06})`);
            wg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = wg;
            ctx.fillRect(0, 0, W, H);
        }

        // ── Plankton ───────────────────────────────────────────────
        for (const p of this._plankton) {
            p.phase += p.speed * 0.016;
            p.x += p.vx + Math.sin(p.phase * 0.7) * 0.25;
            p.y += p.vy;
            if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;

            const glow = 0.5 + 0.5 * Math.sin(p.phase * 1.8 + this._wave * 4);
            const a    = (0.15 + glow * 0.25 + this._wave * 0.30);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${a})`;
            ctx.fill();
        }

        // ── Jellyfish ─────────────────────────────────────────────
        // Spawn replacement if one drifted off
        if (this._jellies.length < 7 && Math.random() < 0.008) {
            this._spawnJelly(W, H, false);
        }

        for (let ji = this._jellies.length - 1; ji >= 0; ji--) {
            const j = this._jellies[ji];
            j.phase += j.pulseFrq * 0.016;
            j.y += j.vy + Math.sin(t * 0.3 + ji) * 0.05;
            j.x += j.vx + Math.sin(j.phase * 0.5) * 0.12;

            if (j.y < -j.r * 3) { this._jellies.splice(ji, 1); continue; }

            const pulse = 0.75 + 0.25 * Math.sin(j.phase);
            const pR    = j.r * pulse;
            const a     = j.alpha + this._wave * 0.20;

            // Bell glow
            const bg = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, pR);
            bg.addColorStop(0,   `hsla(${j.hue}, 80%, 80%, ${a * 0.35})`);
            bg.addColorStop(0.6, `hsla(${j.hue}, 75%, 60%, ${a * 0.18})`);
            bg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(j.x, j.y, pR * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Bell cap (semi-circle)
            ctx.save();
            ctx.beginPath();
            ctx.arc(j.x, j.y, pR, Math.PI, 0);
            ctx.closePath();
            ctx.fillStyle = `hsla(${j.hue}, 80%, 70%, ${a * 0.50})`;
            ctx.fill();
            ctx.strokeStyle = `hsla(${j.hue}, 90%, 85%, ${a * 0.60})`;
            ctx.lineWidth   = 0.8;
            ctx.stroke();
            ctx.restore();

            // Tentacles
            for (let ti = 0; ti < j.tentN; ti++) {
                const tx = j.x + (ti / (j.tentN - 1) - 0.5) * pR * 1.8;
                const baseY = j.y + 2;
                const len   = pR * (1.5 + Math.sin(j.phase * 1.2 + ti * 0.8) * 0.4);
                const wg    = ctx.createLinearGradient(tx, baseY, tx, baseY + len);
                wg.addColorStop(0,   `hsla(${j.hue}, 85%, 72%, ${a * 0.55})`);
                wg.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.beginPath();
                ctx.moveTo(tx, baseY);
                ctx.quadraticCurveTo(
                    tx + Math.sin(j.phase + ti) * 8,
                    baseY + len * 0.5,
                    tx + Math.sin(j.phase * 0.7 + ti * 1.3) * 14,
                    baseY + len
                );
                ctx.strokeStyle = wg;
                ctx.lineWidth   = 0.7;
                ctx.stroke();
            }
        }

        // ── Fish streaks ──────────────────────────────────────────
        for (let fi = this._fish.length - 1; fi >= 0; fi--) {
            const f = this._fish[fi];
            f.life += 0.016;
            if (f.life > f.maxLife) { this._fish.splice(fi, 1); continue; }
            f.x += f.vx;
            const env = Math.max(0, 1 - f.life / f.maxLife);
            const fg  = ctx.createLinearGradient(f.x - f.len * Math.sign(f.vx), f.y, f.x, f.y);
            fg.addColorStop(0, 'rgba(0,0,0,0)');
            fg.addColorStop(1, `hsla(${f.hue}, 90%, 75%, ${env * 0.70})`);
            ctx.beginPath();
            ctx.moveTo(f.x - f.len * Math.sign(f.vx), f.y);
            ctx.lineTo(f.x, f.y);
            ctx.strokeStyle = fg;
            ctx.lineWidth   = 2.5;
            ctx.stroke();
            // Bright head dot
            ctx.beginPath();
            ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${f.hue}, 95%, 85%, ${env * 0.85})`;
            ctx.fill();
        }

        // ── Vignette ──────────────────────────────────────────────
        const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.15,W/2,H/2,Math.max(W,H)*0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,2,8,0.75)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
