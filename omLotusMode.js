// Om Lotus Mode — the sacred ॐ symbol at rest in a living lotus.
// Three rings of petals unfurl in sequence as the scene opens.
// Incense particles drift upward from the centre.
// Gaze rotates the outer petals; blink triggers a full bloom pulse.
class OmLotusMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._gazeX      = 0.5;
        this._gazeY      = 0.5;
        this._gazeAngle  = 0;
        this._blinkPulse = 0;   // 0..1, decays after blink
        this._blinkWave  = 0;   // triggers a second bloom reset timer
        this._particles  = [];
        this._timers     = [];
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    startScene(scene) {
        this.t           = 0;
        this._gazeX      = 0.5;
        this._gazeY      = 0.5;
        this._gazeAngle  = 0;
        this._blinkPulse = 0;
        this._blinkWave  = 0;

        // Seed incense particles
        this._particles = [];
        for (let i = 0; i < 80; i++) {
            this._particles.push(this._newParticle(true));
        }

        // Clear any lingering timers
        this._timers.forEach(id => clearTimeout(id));
        this._timers = [];
    }

    stopScene() {
        this._timers.forEach(id => clearTimeout(id));
        this._timers = [];
    }

    resize() {
        // nothing to precalculate; draw() reads canvas dims each frame
    }

    onGaze(nx, ny) {
        this._gazeX = nx;
        this._gazeY = ny;
    }

    onBlink() {
        // Flash pulse + restart bloom wave
        this._blinkPulse = 1.0;
        this._blinkWave  = this.t;   // record time so petals re-bloom from now
    }

    // ── Per-frame draw ─────────────────────────────────────────────────────────

    draw(dt) {
        this.t += dt;
        const t   = this.t;
        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;
        const cx  = W * 0.5;
        const cy  = H * 0.5;
        const R   = Math.min(W, H);

        // ── Background ──────────────────────────────────────────────────────────
        ctx.save();
        ctx.fillStyle = '#0a0014';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // ── Mandala geometry underlay — 8-fold thin gold lines ──────────────────
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth   = 0.8;
        ctx.translate(cx, cy);
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55);
            ctx.stroke();
            // concentric arc segments
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.20, a, a + Math.PI / 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.32, a, a + Math.PI / 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.44, a, a + Math.PI / 8);
            ctx.stroke();
        }
        ctx.restore();

        // ── Gaze angle lerp ─────────────────────────────────────────────────────
        const targetAngle = Math.atan2(this._gazeY - 0.5, this._gazeX - 0.5);
        // Lerp angle correctly through the wrap
        let da = targetAngle - this._gazeAngle;
        if (da >  Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        this._gazeAngle += da * 0.02;

        // ── Blink pulse decay ───────────────────────────────────────────────────
        this._blinkPulse = Math.max(0, this._blinkPulse - dt * 1.8);

        // ── Draw lotus layers ───────────────────────────────────────────────────

        // Helper: petal open factor — sequential blooming from startScene or last blink
        const waveOrigin = this._blinkWave > 0 ? this._blinkWave : 0;
        const elapsed    = t - waveOrigin;

        const petalOpen = (i, delay, duration) => {
            const raw = (elapsed - i * delay) / duration;
            return Math.max(0, Math.min(1, raw));
        };

        // Outer layer — 16 petals, cream-white, radius W*0.36, rotated 11.25°
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._gazeAngle * 0.25);   // outer layer follows gaze most
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2 + (11.25 * Math.PI / 180);
            const open  = petalOpen(i, 0.06, 1.2);
            if (open <= 0) continue;
            const bpulse = this._blinkPulse;
            const pulse  = 1 + bpulse * 0.15 * Math.sin(t * 12);
            this._drawPetal(ctx, angle, R * 0.36 * open * pulse, R * 0.055, {
                inner: '#FFF5EE',
                outer: '#FFE4E1',
                glow:  '#FFD7D0',
                alpha: 0.75 + open * 0.15,
                shadowAlpha: 0.35
            });
        }
        ctx.restore();

        // Middle layer — 8 petals, lotus pink, radius W*0.26, rotated 22.5°
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._gazeAngle * 0.12);   // subtle gaze influence
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + (22.5 * Math.PI / 180);
            const open  = petalOpen(i, 0.10, 1.4);
            if (open <= 0) continue;
            const pulse  = 1 + this._blinkPulse * 0.12 * Math.sin(t * 10 + i);
            this._drawPetal(ctx, angle, R * 0.26 * open * pulse, R * 0.07, {
                inner: '#FFB6C1',
                outer: '#FF69B4',
                glow:  '#FF8FAF',
                alpha: 0.80 + open * 0.10,
                shadowAlpha: 0.40
            });
        }
        ctx.restore();

        // Inner layer — 8 petals, deep magenta-purple, radius W*0.18
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const open  = petalOpen(i, 0.12, 1.5);
            if (open <= 0) continue;
            const pulse  = 1 + this._blinkPulse * 0.10 * Math.sin(t * 8 + i * 0.7);
            this._drawPetal(ctx, angle, R * 0.18 * open * pulse, R * 0.06, {
                inner: '#8B008B',
                outer: '#DA70D6',
                glow:  '#C050C0',
                alpha: 0.85 + open * 0.10,
                shadowAlpha: 0.50
            });
        }
        ctx.restore();

        // ── Om symbol ───────────────────────────────────────────────────────────
        const breathScale = 1 + 0.04 * Math.sin(t * 0.8);
        const fontSize    = R * 0.25;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(breathScale, breathScale);
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = `bold ${fontSize}px serif`;

        // Glow passes — deepest first
        const glows = [
            { blur: 80, color: '#FF9933', alpha: 0.18 + this._blinkPulse * 0.12 },
            { blur: 55, color: '#FFD700', alpha: 0.28 + this._blinkPulse * 0.15 },
            { blur: 35, color: '#FF9933', alpha: 0.40 + this._blinkPulse * 0.18 },
            { blur: 20, color: '#ffffff', alpha: 0.22 + this._blinkPulse * 0.10 },
            { blur: 10, color: '#ffffff', alpha: 0.30 + this._blinkPulse * 0.08 },
        ];
        for (const g of glows) {
            ctx.save();
            ctx.shadowBlur  = g.blur;
            ctx.shadowColor = g.color;
            ctx.globalAlpha = g.alpha;
            ctx.fillStyle   = '#FFD700';
            ctx.fillText('\u0950', 0, 0);
            ctx.restore();
        }

        // Final crisp pass with gradient fill
        const grad = ctx.createLinearGradient(0, -fontSize * 0.5, 0, fontSize * 0.5);
        grad.addColorStop(0, '#FF9933');
        grad.addColorStop(1, '#FFD700');
        ctx.shadowBlur  = 8;
        ctx.shadowColor = '#FFD700';
        ctx.globalAlpha = 1;
        ctx.fillStyle   = grad;
        ctx.fillText('\u0950', 0, 0);
        ctx.restore();

        // ── Incense particles ───────────────────────────────────────────────────
        this._updateAndDrawParticles(ctx, W, H, cx, cy, dt);
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    _drawPetal(ctx, angle, length, halfWidth, style) {
        // Petal: pointed oval using two quadratic bezier curves.
        // Base at origin, tip pointing outward along `angle` at `length`.
        ctx.save();
        ctx.rotate(angle);

        // Build gradient along petal length
        const grad = ctx.createLinearGradient(0, 0, length, 0);
        grad.addColorStop(0,   style.inner);
        grad.addColorStop(1,   style.outer);

        ctx.shadowBlur  = 15;
        ctx.shadowColor = style.glow;
        ctx.globalAlpha = style.alpha;
        ctx.fillStyle   = grad;

        ctx.beginPath();
        // Base point at origin, tip at (length, 0)
        // Left curve control point perpendicular to axis
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(length * 0.45, -halfWidth, length, 0);
        ctx.quadraticCurveTo(length * 0.45,  halfWidth, 0, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    _newParticle(randomAge) {
        // Spawn near canvas centre with slight scatter
        return {
            x:    0,
            y:    0,
            ox:   (Math.random() - 0.5) * 0.04,   // normalized offset, applied in draw
            vy:   -(0.15 + Math.random() * 0.25),  // upward speed, normalized
            vx:   (Math.random() - 0.5) * 0.05,
            r:    1 + Math.random() * 2,
            life: randomAge ? Math.random() : 0,   // 0=fresh, 1=dead
            hue:  Math.random() < 0.6 ? 45 : 0,    // gold or white
            sat:  Math.random() < 0.6 ? 85 : 0,
        };
    }

    _updateAndDrawParticles(ctx, W, H, cx, cy, dt) {
        const gazePixX = this._gazeX * W;
        const gazePixY = this._gazeY * H;

        for (let i = 0; i < this._particles.length; i++) {
            const p = this._particles[i];

            // Age and respawn
            p.life += dt * 0.22;
            if (p.life >= 1) {
                this._particles[i] = this._newParticle(false);
                continue;
            }

            // Position update in pixels
            // Start near centre with offset, drift upward
            const startX = cx + p.ox * W;
            const startY = cy;

            const px = startX + p.vx * p.life * H;
            const py = startY + p.vy * p.life * H;

            // Wander
            p.vx += (Math.random() - 0.5) * 0.002;
            p.vx *= 0.995;

            // Gaze pull on nearby particles (only if gaze is set away from centre)
            const gdx = gazePixX - px;
            const gdy = gazePixY - py;
            const gd2 = gdx * gdx + gdy * gdy;
            const gazeR = W * 0.15;
            if (gd2 < gazeR * gazeR) {
                const strength = (1 - Math.sqrt(gd2) / gazeR) * 0.0003;
                p.vx += gdx * strength;
                p.vy += gdy * strength / H * H; // keep vx/vy in normalized-ish scale
            }

            // Alpha fades: rises quickly, fades slowly at the end
            const alpha = p.life < 0.1
                ? p.life * 10
                : (1 - p.life) * 0.85;

            ctx.save();
            const color = p.sat > 0
                ? `hsla(${p.hue}, ${p.sat}%, 85%, ${alpha * 0.7})`
                : `rgba(255, 255, 255, ${alpha * 0.55})`;
            ctx.fillStyle   = color;
            ctx.shadowBlur  = 4;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.arc(px, py, p.r * (1 - p.life * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
