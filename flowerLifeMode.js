// Flower of Life Mandala — sacred overlapping circle geometry.
// 6-fold rings of circles intersect to form vesica piscis and petal cells.
// Outer rings expand each layer; the whole pattern breathes and rotates slowly.
// Blink: a ripple of light traces every circle simultaneously.
class FlowerLifeMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._bloom = 0;
        this._rings = [];
    }

    startScene() {
        this.t      = 0;
        this._bloom = 0;
        this._rings = [];
    }

    onBlink() {
        this._bloom = 1.0;
        const S = Math.min(this.canvas.width, this.canvas.height);
        this._rings.push({ r: S * 0.02, maxR: S * 0.52, a: 0.55 });
    }

    draw(time) {
        this.t += 0.016;
        this._bloom = Math.max(0, this._bloom - 0.016 * 0.9);

        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = W / 2, cy = H / 2;
        const t  = this.t;
        const S  = Math.min(W, H);
        const bl = this._bloom;

        ctx.fillStyle = 'rgba(1, 2, 4, 0.10)';
        ctx.fillRect(0, 0, W, H);

        // Unit cell radius — the circle that fits one petal
        const unitR = S * 0.082;
        // Slow master rotation
        const rot   = t * 0.007;

        // ── Draw flower-of-life circles ────────────────────────────────
        // Layer 0: centre circle
        // Layer 1: 6 circles at distance unitR
        // Layer 2: 6 at distance 2*unitR, 6 at sqrt(3)*unitR
        // Layer 3: outer ring of 12

        const centres = [];
        centres.push({ x: 0, y: 0, layer: 0 });
        for (let i = 0; i < 6; i++) {
            const a = rot + (i / 6) * Math.PI * 2;
            centres.push({ x: Math.cos(a) * unitR, y: Math.sin(a) * unitR, layer: 1 });
        }
        for (let i = 0; i < 6; i++) {
            const a = rot + (i / 6) * Math.PI * 2;
            centres.push({ x: Math.cos(a) * unitR * 2, y: Math.sin(a) * unitR * 2, layer: 2 });
        }
        for (let i = 0; i < 6; i++) {
            const a = rot + Math.PI / 6 + (i / 6) * Math.PI * 2;
            centres.push({ x: Math.cos(a) * unitR * Math.sqrt(3), y: Math.sin(a) * unitR * Math.sqrt(3), layer: 2 });
        }
        for (let i = 0; i < 12; i++) {
            const a = rot + (i / 12) * Math.PI * 2;
            centres.push({ x: Math.cos(a) * unitR * Math.sqrt(7), y: Math.sin(a) * unitR * Math.sqrt(7), layer: 3 });
        }

        // Draw each circle
        for (const c of centres) {
            const pulse = 1 + 0.025 * Math.sin(t * 0.8 + c.layer * 0.7);
            const r     = unitR * pulse;

            // Stroke — teal/gold gradient effect via colour shift by layer
            const hue  = 160 + c.layer * 30;
            const a    = (0.18 - c.layer * 0.028 + bl * 0.18) * (1 + 0.15 * Math.sin(t * 0.5 + c.layer));

            ctx.beginPath();
            ctx.arc(cx + c.x, cy + c.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 80%, 68%, ${a})`;
            ctx.lineWidth   = 0.9 - c.layer * 0.12;
            ctx.stroke();

            // Inner glow fill for centre circle only
            if (c.layer === 0) {
                const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                ng.addColorStop(0,   `rgba(180, 240, 220, ${0.12 + bl * 0.15})`);
                ng.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = ng;
                ctx.fill();
            }

            // Blink: highlight all circles
            if (bl > 0.05) {
                ctx.beginPath();
                ctx.arc(cx + c.x, cy + c.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${hue + 40}, 90%, 85%, ${bl * 0.28 / (c.layer + 1)})`;
                ctx.lineWidth   = 1.5;
                ctx.stroke();
            }
        }

        // ── Dot nodes at every intersection ───────────────────────────
        // Real intersections happen where two circles of radius unitR whose
        // centres are unitR apart cross — they form an equilateral triangle grid.
        // Sample subset: all 6-around-centre intersections
        for (let i = 0; i < 6; i++) {
            const aL = rot + (i / 6) * Math.PI * 2;
            const aR = rot + ((i + 1) / 6) * Math.PI * 2;
            // Two intersection points between circle i and circle i+1 (layer-1 neighbours)
            const mx = (Math.cos(aL) + Math.cos(aR)) * unitR * 0.5;
            const my = (Math.sin(aL) + Math.sin(aR)) * unitR * 0.5;
            const dist = Math.sqrt(mx * mx + my * my);
            const perp = Math.sqrt(Math.max(0, unitR * unitR - dist * dist));
            const nx2  = -my / dist, ny2 = mx / dist;
            for (const sign of [1, -1]) {
                const px = cx + mx + nx2 * perp * sign;
                const py = cy + my + ny2 * perp * sign;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180, 240, 210, ${0.35 + bl * 0.35})`;
                ctx.fill();
            }
        }

        // ── Nucleus ──────────────────────────────────────────────────
        const ng2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, unitR * 0.5);
        ng2.addColorStop(0,   `rgba(220, 255, 240, ${0.85 + bl * 0.12})`);
        ng2.addColorStop(0.4, `rgba(100, 200, 180, ${0.45 + bl * 0.18})`);
        ng2.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, unitR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = ng2;
        ctx.fill();

        // ── Blink pulse rings ─────────────────────────────────────────
        this._rings = this._rings.filter(r => r.r < r.maxR);
        for (const r of this._rings) {
            r.r += 2.3;
            r.a *= 0.975;
            ctx.beginPath();
            ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(130, 220, 200, ${r.a * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 2.0;
            ctx.stroke();
        }
    }
}
