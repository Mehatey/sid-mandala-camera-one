// Aurora Mode — the northern lights.
// Charged particles spiral along magnetic field lines and collide with the upper atmosphere.
// Oxygen at 120km glows green. At 200km, red. Nitrogen: blue and violet.
// The curtains ripple, fold, surge, and fade. No interaction needed.
// Just watch. Blink: a coronal mass ejection — sudden surge of brilliance.
class AuroraMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;
        this._bands   = [];
        this._stars   = [];
        this._surge   = 0;
        this._horizon = 0.72;
    }

    startScene() {
        this.t      = 0;
        this._surge = 0;
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this._buildStars(W, H);
        this._buildBands(W, H);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, W, H);
    }

    onBlink() {
        this._surge = 1.0;
        for (const band of this._bands) {
            band.intensity = Math.min(1, band.intensity + 0.4);
        }
    }

    _buildStars(W, H) {
        this._stars = [];
        for (let i = 0; i < 340; i++) {
            this._stars.push({
                x: Math.random() * W,
                y: Math.random() * H * this._horizon,
                r: 0.3 + Math.random() * 1.0,
                a: 0.15 + Math.random() * 0.60,
                warm: Math.random() < 0.25,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpd: 0.8 + Math.random() * 2.0,
            });
        }
    }

    _buildBands(W, H) {
        this._bands = [];
        const defs = [
            { alt: 0.62, hue: 128, hue2: 155, intens: 0.55, wid: 0.18 },
            { alt: 0.48, hue: 310, hue2: 280, intens: 0.25, wid: 0.10 },
            { alt: 0.55, hue: 175, hue2: 195, intens: 0.35, wid: 0.12 },
            { alt: 0.38, hue: 280, hue2: 255, intens: 0.18, wid: 0.08 },
            { alt: 0.70, hue: 145, hue2: 128, intens: 0.42, wid: 0.14 },
        ];
        for (const def of defs) {
            const rays = [];
            for (let r = 0; r < 80; r++) {
                rays.push({
                    xFrac: r / 79,
                    amp1: 0.008 + Math.random() * 0.018, freq1: 0.15 + Math.random() * 0.25, phase1: Math.random() * Math.PI * 2,
                    amp2: 0.003 + Math.random() * 0.010, freq2: 0.40 + Math.random() * 0.60, phase2: Math.random() * Math.PI * 2,
                    iPhase: Math.random() * Math.PI * 2, iSpd: 0.20 + Math.random() * 0.45,
                    topVar: (Math.random() - 0.5) * 0.06, botVar: (Math.random() - 0.5) * 0.04,
                    foldAmp: Math.random() * 0.012, foldFreq: 2 + Math.random() * 4, foldPh: Math.random() * Math.PI * 2,
                });
            }
            this._bands.push({
                alt: def.alt, hue: def.hue, hue2: def.hue2,
                intensity: def.intens, width: def.wid, rays,
                driftAmp: 0.015 + Math.random() * 0.025, driftFreq: 0.03 + Math.random() * 0.06, driftPh: Math.random() * Math.PI * 2,
                breathPh: Math.random() * Math.PI * 2, breathSpd: 0.04 + Math.random() * 0.08,
            });
        }
    }

    _drawBand(ctx, band, W, H, t) {
        const HZ    = H * this._horizon;
        const altY  = HZ - HZ * band.alt;
        const drift = Math.sin(t * band.driftFreq + band.driftPh) * W * band.driftAmp;
        const breath = 0.6 + 0.4 * Math.sin(t * band.breathSpd + band.breathPh);
        const intens = band.intensity * breath * (1 + this._surge * 0.8);
        const bandH  = H * band.width;

        for (const ray of band.rays) {
            const xOff = Math.sin(t * ray.freq1 + ray.phase1) * W * ray.amp1
                       + Math.sin(t * ray.freq2 + ray.phase2) * W * ray.amp2
                       + Math.sin(t * 0.8 + ray.xFrac * ray.foldFreq + ray.foldPh) * W * ray.foldAmp;
            const x   = ray.xFrac * W + drift + xOff;
            const ri  = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * ray.iSpd + ray.iPhase));
            const topY = altY + ray.topVar * H;
            const botY = topY + bandH * (0.4 + 0.6 * ri) + ray.botVar * H;
            const rayAlpha = intens * ri;
            if (rayAlpha < 0.015) continue;

            const hue = band.hue + (band.hue2 - band.hue) * Math.min(1, (altY - topY) / Math.max(1, bandH));
            const rg = ctx.createLinearGradient(x, botY, x, topY);
            rg.addColorStop(0,    `hsla(${hue}, 88%, 65%, ${rayAlpha * 0.75})`);
            rg.addColorStop(0.3,  `hsla(${hue}, 85%, 72%, ${rayAlpha * 0.50})`);
            rg.addColorStop(0.65, `hsla(${hue + 15}, 80%, 68%, ${rayAlpha * 0.22})`);
            rg.addColorStop(1,    `hsla(${hue + 25}, 75%, 60%, 0)`);
            ctx.strokeStyle = rg;
            ctx.lineWidth   = 1.2 + ri * 1.5;
            ctx.beginPath(); ctx.moveTo(x, botY); ctx.lineTo(x, topY); ctx.stroke();
        }

        const baseGlowY = altY + bandH * 0.25;
        const bg = ctx.createLinearGradient(0, baseGlowY - 2, 0, baseGlowY + 20);
        bg.addColorStop(0, `hsla(${band.hue}, 90%, 70%, ${intens * 0.30})`);
        bg.addColorStop(1, `hsla(${band.hue}, 85%, 55%, 0)`);
        ctx.fillStyle = bg; ctx.fillRect(0, baseGlowY - 2, W, 22);
    }

    draw(time) {
        this.t    += 0.016;
        this._surge = Math.max(0, this._surge - 0.016 * 0.4);

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const HZ  = H * this._horizon;

        const sky = ctx.createLinearGradient(0, 0, 0, HZ);
        sky.addColorStop(0, 'rgb(1, 2, 8)'); sky.addColorStop(0.6, 'rgb(2, 4, 14)'); sky.addColorStop(1, 'rgb(4, 8, 22)');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HZ + 2);

        for (const s of this._stars) {
            s.twinkle += s.twinkleSpd * 0.016;
            const tw = 0.65 + 0.35 * Math.sin(s.twinkle);
            const a  = s.a * tw * (1 - this._surge * 0.3);
            ctx.fillStyle = s.warm ? `rgba(255,230,180,${a})` : `rgba(200,218,255,${a})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r * tw, 0, Math.PI * 2); ctx.fill();
        }

        ctx.lineCap = 'round';
        const sorted = [...this._bands].sort((a, b) => a.alt - b.alt);
        for (const band of sorted) this._drawBand(ctx, band, W, H, this.t);

        if (this._surge > 0.02) {
            const flash = ctx.createLinearGradient(0, 0, 0, HZ);
            flash.addColorStop(0, `rgba(18,200,90,0)`);
            flash.addColorStop(0.4, `rgba(22,220,100,${this._surge * 0.08})`);
            flash.addColorStop(1, `rgba(30,240,110,${this._surge * 0.18})`);
            ctx.fillStyle = flash; ctx.fillRect(0, 0, W, HZ);
        }

        const gnd = ctx.createLinearGradient(0, HZ, 0, H);
        gnd.addColorStop(0, 'rgb(2,6,4)'); gnd.addColorStop(1, 'rgb(0,1,0)');
        ctx.fillStyle = gnd; ctx.fillRect(0, HZ, W, H - HZ);

        const reflect = ctx.createLinearGradient(0, HZ, 0, HZ + 60);
        reflect.addColorStop(0, `rgba(20,90,40,${0.12 + this._surge * 0.08})`);
        reflect.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = reflect; ctx.fillRect(0, HZ, W, 60);

        // Tree silhouettes — layered conifer shapes (spruce/fir profile)
        ctx.fillStyle = 'rgb(1,3,1)';
        for (let i = 0; i < 26; i++) {
            const tx  = (i / 25) * W;
            const ht  = 22 + 36 * Math.abs(Math.sin(i * 2.71828 + 1.4));
            const wid = 9  + 14 * Math.abs(Math.sin(i * 1.618));
            const trunkH = ht * 0.20;
            const trunkW = wid * 0.10;

            ctx.beginPath();
            ctx.moveTo(tx, HZ);                                          // apex

            // Tier 1 (topmost, narrowest)
            ctx.lineTo(tx - wid * 0.24, HZ + ht * 0.28);
            ctx.lineTo(tx - wid * 0.18, HZ + ht * 0.28);

            // Tier 2
            ctx.lineTo(tx - wid * 0.42, HZ + ht * 0.50);
            ctx.lineTo(tx - wid * 0.30, HZ + ht * 0.50);

            // Tier 3 (widest boughs)
            ctx.lineTo(tx - wid * 0.52, HZ + ht * 0.72);
            ctx.lineTo(tx - wid * 0.36, HZ + ht * 0.72);

            // Trunk
            ctx.lineTo(tx - trunkW, HZ + ht * 0.72);
            ctx.lineTo(tx - trunkW, HZ + ht);
            ctx.lineTo(tx + trunkW, HZ + ht);
            ctx.lineTo(tx + trunkW, HZ + ht * 0.72);

            // Mirror: tier 3 → tier 2 → tier 1 (right side)
            ctx.lineTo(tx + wid * 0.36, HZ + ht * 0.72);
            ctx.lineTo(tx + wid * 0.52, HZ + ht * 0.72);
            ctx.lineTo(tx + wid * 0.30, HZ + ht * 0.50);
            ctx.lineTo(tx + wid * 0.42, HZ + ht * 0.50);
            ctx.lineTo(tx + wid * 0.18, HZ + ht * 0.28);
            ctx.lineTo(tx + wid * 0.24, HZ + ht * 0.28);

            ctx.closePath();
            ctx.fill();
        }
    }
}
