// Cymatics Mode — four wave sources radiating across dark water.
// Each source emits circular traveling waves. Where waves meet they
// superpose: constructive interference = bright bands, destructive = silence.
// Four sources (instead of three) create denser, more complex interference.
// Blink: sources jump to new positions, palette cycles to a new element.
class CymaticsMode {
    constructor(ctx, canvas) {
        this.ctx      = ctx;
        this.canvas   = canvas;
        this.t        = 0;
        this._sources = [];
        this._off     = null;
        this._offCtx  = null;
        this._ramp    = null;
        this._buildRamp(205);
    }

    _hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if      (h < 60)  { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else              { r = c; g = 0; b = x; }
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
        ];
    }

    _buildRamp(hue) {
        this._hueBase = hue;
        this._ramp    = new Uint8Array(256 * 3);
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            const h = (hue + (1 - t) * 28) % 360;
            const s = 60 + t * 32;
            // Higher lightness — more visible, more contrast
            const l = Math.min(96, t < 0.45 ? t * t * 160 : 24 + t * 70);
            const [r, g, b] = this._hslToRgb(h, s, l);
            this._ramp[i * 3]     = r;
            this._ramp[i * 3 + 1] = g;
            this._ramp[i * 3 + 2] = b;
        }
        this._ramp[0] = 0; this._ramp[1] = 1; this._ramp[2] = 5;
    }

    startScene() {
        this.t        = 0;
        this._buildRamp(185 + Math.random() * 30);

        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        const OW = 260, OH = Math.round(260 * H / W);

        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }

        // Four sources — diamond arrangement gives richer interference
        this._sources = [
            { sx: OW * 0.35, sy: OH * 0.50, vx: 0, vy: 0, homeX: OW * 0.35, homeY: OH * 0.50, phOff: 0.00 },
            { sx: OW * 0.65, sy: OH * 0.50, vx: 0, vy: 0, homeX: OW * 0.65, homeY: OH * 0.50, phOff: 2.09 },
            { sx: OW * 0.50, sy: OH * 0.24, vx: 0, vy: 0, homeX: OW * 0.50, homeY: OH * 0.24, phOff: 4.19 },
            { sx: OW * 0.50, sy: OH * 0.76, vx: 0, vy: 0, homeX: OW * 0.50, homeY: OH * 0.76, phOff: 1.05 },
        ];
    }

    onBlink() {
        const OW = this._off ? this._off.width  : 260;
        const OH = this._off ? this._off.height : 146;
        for (const s of this._sources) {
            s.homeX = OW * (0.15 + Math.random() * 0.70);
            s.homeY = OH * (0.15 + Math.random() * 0.70);
        }
        const hues = [205, 165, 270, 35, 300, 185, 340, 50, 120, 240];
        this._buildRamp(hues[Math.floor(Math.random() * hues.length)]);
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const OW  = this._off.width;
        const OH  = this._off.height;

        for (const s of this._sources) {
            s.vx += (s.homeX - s.sx) * 0.0012;
            s.vy += (s.homeY - s.sy) * 0.0012;
            s.vx += Math.sin(this.t * 0.17 + s.phOff * 2.3) * 0.020;
            s.vy += Math.cos(this.t * 0.12 + s.phOff * 1.9) * 0.016;
            s.vx *= 0.980;
            s.vy *= 0.980;
            s.sx += s.vx;
            s.sy += s.vy;
        }

        // Slightly higher wavenumber for finer interference bands
        const k   = 0.210;
        const ω   = 2.40;
        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;
        const ramp = this._ramp;
        const t    = this.t;
        const s0 = this._sources[0];
        const s1 = this._sources[1];
        const s2 = this._sources[2];
        const s3 = this._sources[3];

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                const dx0 = px - s0.sx, dy0 = py - s0.sy;
                const dx1 = px - s1.sx, dy1 = py - s1.sy;
                const dx2 = px - s2.sx, dy2 = py - s2.sy;
                const dx3 = px - s3.sx, dy3 = py - s3.sy;

                const d0 = Math.sqrt(dx0*dx0 + dy0*dy0);
                const d1 = Math.sqrt(dx1*dx1 + dy1*dy1);
                const d2 = Math.sqrt(dx2*dx2 + dy2*dy2);
                const d3 = Math.sqrt(dx3*dx3 + dy3*dy3);

                // Four waves superpose — range [-4, 4]
                const val = Math.sin(k*d0 - ω*t + s0.phOff)
                          + Math.sin(k*d1 - ω*t + s1.phOff)
                          + Math.sin(k*d2 - ω*t + s2.phOff)
                          + Math.sin(k*d3 - ω*t + s3.phOff);

                // Normalize to [0,1], sharper gamma for crisp bright rings
                const norm   = Math.max(0, Math.min(1, (val / 4 + 1) / 2));
                const bright = Math.pow(norm, 1.4);
                const ri     = Math.round(bright * 255);

                const pidx    = (py * OW + px) * 4;
                buf[pidx]     = ramp[ri * 3];
                buf[pidx + 1] = ramp[ri * 3 + 1];
                buf[pidx + 2] = ramp[ri * 3 + 2];
                buf[pidx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);

        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        // Source halos — brighter and larger
        for (const s of this._sources) {
            const wx = (s.sx / OW) * W;
            const wy = (s.sy / OH) * H;
            const sg = ctx.createRadialGradient(wx, wy, 0, wx, wy, 28);
            sg.addColorStop(0, 'rgba(220, 240, 255, 0.32)');
            sg.addColorStop(0.5, 'rgba(180, 220, 255, 0.08)');
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(wx, wy, 28, 0, Math.PI * 2); ctx.fill();
        }
    }
}
