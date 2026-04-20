// Murmuration Mode — starling flock simulation using boids.
// Separation · alignment · cohesion produce emergent shapes against a dusk sky.
// Blink: a hawk appears at centre — flock explodes outward then slowly reforms.
class MurmurationMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._boids = [];
        this._hawk  = null;   // { x, y, life }
        this._N     = 900;
    }

    startScene() {
        this.t    = 0;
        this._hawk = null;
        const W = this.canvas.width, H = this.canvas.height;
        this._boids = [];
        for (let i = 0; i < this._N; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.2 + Math.random() * 1.0;
            this._boids.push({
                x:  W * 0.3 + (Math.random() - 0.5) * W * 0.4,
                y:  H * 0.4 + (Math.random() - 0.5) * H * 0.3,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
            });
        }
    }

    onBlink() {
        const W = this.canvas.width, H = this.canvas.height;
        this._hawk = { x: W / 2, y: H / 2, life: 3.0 };
    }

    draw(time) {
        this.t += 0.016;

        const ctx  = this.ctx;
        const W    = this.canvas.width, H = this.canvas.height;
        const t    = this.t;

        // Dusk gradient sky (rebuild each frame at low alpha for trails)
        ctx.fillStyle = 'rgba(8, 5, 14, 0.20)';
        ctx.fillRect(0, 0, W, H);

        // Subtle horizon glow
        const sky = ctx.createLinearGradient(0, H * 0.55, 0, H);
        sky.addColorStop(0, 'rgba(60, 20, 10, 0.04)');
        sky.addColorStop(1, 'rgba(20, 6, 4, 0.08)');
        ctx.fillStyle = sky;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);

        // ── Hawk ───────────────────────────────────────────────────
        if (this._hawk) {
            this._hawk.life -= 0.016;
            if (this._hawk.life <= 0) this._hawk = null;
        }
        const hawkX = this._hawk ? this._hawk.x : null;
        const hawkY = this._hawk ? this._hawk.y : null;

        // ── Boids update ───────────────────────────────────────────
        const SEP_R = 28, ALI_R = 70, COH_R = 80;
        const SEP_F = 0.28, ALI_F = 0.018, COH_F = 0.008;
        const MAX_SPD = 3.2, MIN_SPD = 1.0;

        for (let i = 0; i < this._boids.length; i++) {
            const b = this._boids[i];

            let sx = 0, sy = 0;        // separation
            let ax = 0, ay = 0;        // alignment
            let cx2 = 0, cy2 = 0;      // cohesion
            let ns = 0, na = 0, nc = 0;

            // Sample a subset for performance (every 3rd neighbour)
            for (let j = 0; j < this._boids.length; j += 3) {
                if (i === j) continue;
                const q = this._boids[j];
                const dx = b.x - q.x, dy = b.y - q.y;
                const d2 = dx * dx + dy * dy;

                if (d2 < SEP_R * SEP_R && d2 > 0) {
                    const d = Math.sqrt(d2);
                    sx += dx / d; sy += dy / d; ns++;
                }
                if (d2 < ALI_R * ALI_R) { ax += q.vx; ay += q.vy; na++; }
                if (d2 < COH_R * COH_R) { cx2 += q.x; cy2 += q.y; nc++; }
            }

            if (ns > 0) { b.vx += (sx / ns) * SEP_F; b.vy += (sy / ns) * SEP_F; }
            if (na > 0) { b.vx += (ax / na - b.vx) * ALI_F; b.vy += (ay / na - b.vy) * ALI_F; }
            if (nc > 0) { b.vx += (cx2 / nc - b.x) * COH_F; b.vy += (cy2 / nc - b.y) * COH_F; }

            // Hawk repulsion
            if (hawkX !== null) {
                const hdx = b.x - hawkX, hdy = b.y - hawkY;
                const hd  = Math.sqrt(hdx * hdx + hdy * hdy) + 1;
                const hf  = Math.max(0, 1 - hd / 280);
                b.vx += (hdx / hd) * hf * 5.0;
                b.vy += (hdy / hd) * hf * 5.0;
            }

            // Gentle pull back toward loose centre region
            const cx = W * (0.4 + 0.18 * Math.sin(t * 0.08));
            const cy = H * (0.42 + 0.12 * Math.sin(t * 0.05));
            b.vx += (cx - b.x) * 0.00012;
            b.vy += (cy - b.y) * 0.00012;

            // Speed clamp
            const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (spd > MAX_SPD) { b.vx = b.vx / spd * MAX_SPD; b.vy = b.vy / spd * MAX_SPD; }
            if (spd < MIN_SPD) { b.vx = b.vx / spd * MIN_SPD; b.vy = b.vy / spd * MIN_SPD; }

            b.x += b.vx; b.y += b.vy;

            // Wrap
            if (b.x < -20) b.x = W + 20;
            if (b.x > W + 20) b.x = -20;
            if (b.y < -20) b.y = H + 20;
            if (b.y > H + 20) b.y = -20;
        }

        // ── Draw boids ─────────────────────────────────────────────
        for (const b of this._boids) {
            const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            // Elongate in direction of travel
            const len = 2.5 + spd * 0.5;
            const ang = Math.atan2(b.vy, b.vx);
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(ang);
            ctx.fillStyle = `rgba(20, 12, 8, 0.88)`;
            ctx.beginPath();
            ctx.ellipse(0, 0, len, 1.0, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Hawk icon (if active) ──────────────────────────────────
        if (this._hawk) {
            const a = Math.min(1, this._hawk.life) * 0.6;
            ctx.save();
            ctx.strokeStyle = `rgba(200, 80, 20, ${a})`;
            ctx.lineWidth   = 1.2;
            ctx.beginPath();
            ctx.arc(this._hawk.x, this._hawk.y, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // ── Vignette ──────────────────────────────────────────────
        const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.70);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.50)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}
