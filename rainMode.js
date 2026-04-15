// Rain Mode — a slow rain falls and pools on an invisible surface.
// Each drop lands with a flattened ripple ring. Splashes catch the light.
// Blink: a brief downpour, then quiet returns.
// A scene for settling — for the kind of stillness that arrives with weather.
class RainMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._drops    = [];
        this._ripples  = [];
        this._splashes = [];
        this._off    = null;
        this._offCtx = null;
    }

    startScene() {
        this.t      = 0;
        this._drops    = [];
        this._ripples  = [];
        this._splashes = [];
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        if (!this._off || this._off.width !== W || this._off.height !== H) {
            this._off = document.createElement('canvas');
            this._off.width  = W;
            this._off.height = H;
            this._offCtx = this._off.getContext('2d');
        }
        // Deep night atmosphere
        this._offCtx.fillStyle = '#01020c';
        this._offCtx.fillRect(0, 0, W, H);
    }

    onBlink() {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        for (let i = 0; i < 90; i++) this._spawn(W, H, true);
    }

    _spawn(W, H, heavy = false) {
        const speed = heavy
            ? 7 + Math.random() * 5
            : 3.5 + Math.random() * 4.5;
        this._drops.push({
            x:   Math.random() * (W + 60) - 30,
            y:  -(10 + Math.random() * H * 0.4),
            len: heavy ? 14 + Math.random() * 18 : 8 + Math.random() * 14,
            speed,
            a:   0.08 + Math.random() * 0.22,
            w:   0.4 + Math.random() * 0.5,
        });
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const oc  = this._offCtx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Gradual spawn ramp — starts sparse, settles into steady rain
        const rate = Math.min(5, 1.5 + this.t * 0.18);
        for (let i = 0; i < Math.ceil(rate); i++) {
            if (Math.random() < (rate % 1 || 1)) this._spawn(W, H);
        }

        // Very slow surface fade — rainwater lingers
        oc.fillStyle = 'rgba(1, 2, 12, 0.016)';
        oc.fillRect(0, 0, W, H);

        // Update + draw streaks
        const landed = [];
        this._drops = this._drops.filter(d => {
            d.y += d.speed;
            if (d.y > H * 0.96 + d.len) {
                // Landing point — slight variation by x position for terrain feel
                landed.push({ x: d.x, y: H * 0.93 + (Math.sin(d.x * 0.03) * H * 0.04) });
                return false;
            }
            oc.beginPath();
            oc.moveTo(d.x, d.y - d.len);
            oc.lineTo(d.x, d.y);
            oc.strokeStyle = `rgba(155, 210, 255, ${d.a})`;
            oc.lineWidth = d.w;
            oc.stroke();
            return true;
        });

        // Create ripples + micro-splashes at landing points
        for (const l of landed) {
            this._ripples.push({
                cx: l.x, cy: l.y,
                r: 0, maxR: 12 + Math.random() * 14,
                a: 0.42 + Math.random() * 0.22,
            });
            // 2-4 tiny splash droplets
            const sc = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < sc; i++) {
                const ang = -Math.PI * 0.25 - Math.random() * Math.PI * 0.5;
                const spd = 0.6 + Math.random() * 1.6;
                this._splashes.push({
                    x: l.x, y: l.y,
                    vx: Math.cos(ang + (Math.random() - 0.5) * 1.2) * spd,
                    vy: Math.sin(ang) * spd,
                    life: 0.9 + Math.random() * 0.3,
                });
            }
        }

        // Update + draw ripple rings (flattened ellipse for perspective)
        this._ripples = this._ripples.filter(r => r.a > 0.01);
        for (const r of this._ripples) {
            r.r += 0.55;
            r.a *= 0.918;
            if (r.r > r.maxR) { r.a = 0; continue; }
            oc.save();
            oc.translate(r.cx, r.cy);
            oc.scale(1, 0.22);   // flat perspective ellipse
            oc.beginPath();
            oc.arc(0, 0, r.r, 0, Math.PI * 2);
            oc.strokeStyle = `rgba(130, 205, 255, ${r.a})`;
            oc.lineWidth   = 0.9;
            oc.stroke();
            oc.restore();
        }

        // Update + draw splashes
        this._splashes = this._splashes.filter(s => s.life > 0);
        for (const s of this._splashes) {
            s.x  += s.vx;
            s.y  += s.vy;
            s.vy += 0.10;
            s.life -= 0.055;
            oc.beginPath();
            oc.arc(s.x, s.y, 0.9, 0, Math.PI * 2);
            oc.fillStyle = `rgba(180, 228, 255, ${Math.max(0, s.life * 0.55)})`;
            oc.fill();
        }

        // Composite to screen
        ctx.drawImage(this._off, 0, 0);
    }
}
