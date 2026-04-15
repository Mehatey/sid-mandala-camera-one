// Letters Mode — typing as a slow combustion.
// Every key you press leaves a character on the canvas.
// Each one ages: white → gold → amber → ignition.
// At ignition it bursts into particles that drift and dissolve.
// Type anything. Watch your words become light.
// Enter: all current characters flutter upward like startled birds.
// Backspace: the newest character combusts immediately.
// Space: a silent burst of wind scatters whatever's nearby.
class LettersMode {
    constructor(ctx, canvas) {
        this.ctx       = ctx;
        this.canvas    = canvas;
        this.t         = 0;
        this._chars    = [];    // live letter particles
        this._sparks   = [];    // post-burst spark particles
        this._nextSize = 0;     // cycles through sizes for variety
    }

    startScene() {
        this.t      = 0;
        this._chars  = [];
        this._sparks = [];

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onKey(key) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        if (key === 'Enter') {
            // Flutter: give all chars an upward burst
            for (const c of this._chars) {
                c.vy -= 2.5 + Math.random() * 2.5;
                c.vx += (Math.random() - 0.5) * 2;
            }
            return;
        }

        if (key === 'Backspace') {
            // Immediately combust newest char
            if (this._chars.length) {
                const c = this._chars.pop();
                this._burst(c);
            }
            return;
        }

        if (key === ' ') {
            // Wind: scatter nearby chars
            const wx = W / 2 + (Math.random() - 0.5) * W * 0.5;
            const wy = H / 2 + (Math.random() - 0.5) * H * 0.5;
            for (const c of this._chars) {
                const dx = c.x - wx, dy = c.y - wy;
                const d  = Math.sqrt(dx*dx + dy*dy) + 1;
                if (d < 220) {
                    const f = (1 - d/220) * 4;
                    c.vx += (dx/d) * f;
                    c.vy += (dy/d) * f;
                }
            }
            return;
        }

        // Printable character — place it
        if (key.length !== 1) return;

        // Spread across canvas — avoid clustering
        let x, y, attempts = 0;
        do {
            x = 60  + Math.random() * (W - 120);
            y = 80  + Math.random() * (H - 160);
            attempts++;
        } while (attempts < 15 && this._tooClose(x, y, 55));

        const sizes = [26, 34, 42, 30, 38];
        const size  = sizes[this._nextSize % sizes.length];
        this._nextSize++;

        const lifetime = 3.5 + Math.random() * 2.5;   // seconds until burst

        this._chars.push({
            char:     key,
            x, y,
            vx:       (Math.random() - 0.5) * 0.5,
            vy:       0.08 + Math.random() * 0.12,     // gentle downward drift
            size,
            age:      0,
            lifetime,
        });

        // Cap particle count
        while (this._chars.length > 60) {
            const oldest = this._chars.shift();
            this._burst(oldest);
        }
    }

    _tooClose(x, y, minD) {
        for (const c of this._chars) {
            if (Math.hypot(c.x - x, c.y - y) < minD) return true;
        }
        return false;
    }

    _burst(c) {
        const count = 18 + Math.floor(Math.random() * 10);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 2.8;
            this._sparks.push({
                x:     c.x,
                y:     c.y,
                vx:    Math.cos(angle) * speed,
                vy:    Math.sin(angle) * speed - 1.2,
                age:   0,
                life:  0.6 + Math.random() * 0.8,
                size:  0.8 + Math.random() * 2.0,
                hue:   32 + Math.random() * 30,
            });
        }
    }

    draw(time) {
        this.t = time;
        const dt  = 0.016;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Very slow fade — characters leave long ghosts
        ctx.fillStyle = 'rgba(0, 0, 2, 0.048)';
        ctx.fillRect(0, 0, W, H);

        // ── Spark particles ──────────────────────────────────────────────────────
        for (let i = this._sparks.length - 1; i >= 0; i--) {
            const s = this._sparks[i];
            s.age += dt;
            if (s.age > s.life) { this._sparks.splice(i, 1); continue; }

            s.vx *= 0.96;
            s.vy  = s.vy * 0.96 + 0.04;   // gravity
            s.x  += s.vx;
            s.y  += s.vy;

            const frac = s.age / s.life;
            const a    = (1 - frac) * (1 - frac) * 0.85;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * (1 - frac * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue}, 92%, 78%, ${a})`;
            ctx.fill();
        }

        // ── Letter characters ────────────────────────────────────────────────────
        for (let i = this._chars.length - 1; i >= 0; i--) {
            const c = this._chars[i];
            c.age += dt;

            if (c.age >= c.lifetime) {
                this._burst(c);
                this._chars.splice(i, 1);
                continue;
            }

            // Physics: gravity + soft bounce
            c.vy = Math.min(c.vy + 0.012, 1.8);   // gravity cap
            c.vx *= 0.988;
            c.x  += c.vx;
            c.y  += c.vy;

            // Bounce off canvas floor
            if (c.y > H - 50) {
                c.vy *= -0.45;
                c.y   = H - 50;
                c.vx *= 0.75;
            }

            // Life fraction → colour
            const lf  = c.age / c.lifetime;

            // Pre-burst expansion
            const preBurst = lf > 0.88 ? (lf - 0.88) / 0.12 : 0;
            const scale    = 1.0 + preBurst * 0.35;
            const fontSize = c.size * scale;

            // Colour arc: white → warm cream → gold → deep amber → hot white before burst
            let r, g, b, a;
            if (lf < 0.30) {
                // White — ice entry
                const t = lf / 0.30;
                r = 245; g = 245 - t * 20; b = 255 - t * 60;
                a = Math.min(1, lf / 0.08) * (0.75 + t * 0.15);
            } else if (lf < 0.65) {
                // Warm gold
                const t = (lf - 0.30) / 0.35;
                r = 255; g = 220 - t * 60; b = 170 - t * 110;
                a = 0.88;
            } else if (lf < 0.88) {
                // Deep amber
                const t = (lf - 0.65) / 0.23;
                r = 255; g = 160 - t * 40; b = 60 - t * 30;
                a = 0.88 - t * 0.10;
            } else {
                // Pre-burst brightening
                r = 255; g = 200 + preBurst * 55; b = 180 + preBurst * 75;
                a = 0.78 + preBurst * 0.22;
            }

            ctx.save();
            ctx.font = `${fontSize}px Georgia, 'Times New Roman', serif`;
            ctx.textBaseline = 'middle';

            // Glow layer
            ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.22})`;
            ctx.filter = `blur(${2 + preBurst * 5}px)`;
            ctx.fillText(c.char, c.x, c.y);

            // Sharp layer
            ctx.filter = 'none';
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.fillText(c.char, c.x, c.y);

            ctx.restore();
        }

        // Hint when empty
        if (this._chars.length === 0 && this._sparks.length === 0) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180,175,220,0.18)';
            ctx.fillText('start typing', W/2, H/2 + 16);
            ctx.textAlign = 'left';
        }
    }
}
