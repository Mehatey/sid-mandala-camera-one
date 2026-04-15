// Vortex Mode — a logarithmic spiral galaxy rendered per-pixel.
// Five arms wind outward from a dark singularity at centre.
// The sandy base is carved by deep-blue arms and forest-green counter-arms.
// Dark veins mark each arm boundary — sharp lines where constructive
// interference becomes destructive silence.
// The galaxy slowly rotates. Blink: spin reverses, a brief flare erupts.
// Exactly the shamanic spiral visual — geology seen from orbit, alive.
class VortexMode {
    constructor(ctx, canvas) {
        this.ctx     = ctx;
        this.canvas  = canvas;
        this.t       = 0;
        this._rotDir = 1;   // +1 = clockwise, -1 = counter
        this._surge  = 0;
        this._off    = null;
        this._offCtx = null;
    }

    startScene() {
        this.t       = 0;
        this._rotDir = 1;
        this._surge  = 0;
        const W = this.canvas.width || 800, H = this.canvas.height || 600;
        const OW = 180, OH = Math.round(180 * H / W);
        if (!this._off || this._off.width !== OW || this._off.height !== OH) {
            this._off        = document.createElement('canvas');
            this._off.width  = OW;
            this._off.height = OH;
            this._offCtx     = this._off.getContext('2d');
        }
    }

    onBlink() {
        this._rotDir *= -1;   // reverse galaxy rotation
        this._surge   = 1.0;
    }

    draw(time) {
        this.t      += 0.016;
        this._surge *= 0.93;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const OW  = this._off.width;
        const OH  = this._off.height;

        const img = this._offCtx.createImageData(OW, OH);
        const buf = img.data;

        // Time drives the rotation — reversed on blink
        const t   = this.t * this._rotDir;
        const OC  = Math.min(OW, OH);   // normalisation factor
        const sur = this._surge;

        // Spiral parameters
        const ARMS    = 5;     // number of arms (5 = sunflower/shamanic)
        const WIND    = 6.8;   // tightness of winding (larger = more wound)
        // Second arm set: different winding & phase → green arms between blue
        const ARMS2   = 5;
        const WIND2   = 7.4;

        for (let py = 0; py < OH; py++) {
            for (let px = 0; px < OW; px++) {
                // Centred, normalised coordinates (shorter dim = ±1)
                const nx = (px - OW * 0.5) / (OC * 0.5);
                const ny = (py - OH * 0.5) / (OC * 0.5);
                const r  = Math.sqrt(nx * nx + ny * ny);
                const th = Math.atan2(ny, nx);

                // Logarithmic spiral phase:
                //   phi = arms * θ + log(r + offset) * winding − t * speed
                // As r→0, log shrinks fast → very tight winding at centre
                const logR = Math.log(r + 0.16);
                const phi1 = ARMS  * th + logR * WIND  - t * 0.32;
                const phi2 = ARMS2 * th + logR * WIND2 - t * 0.22 + Math.PI * 0.62;

                const v1 = Math.sin(phi1);   // arm 1: −1 → +1
                const v2 = Math.sin(phi2);   // arm 2

                // ── Sandy base texture ────────────────────────────────────────
                // Fine high-frequency crinkle: gives the video's organic terrain look
                const tex = Math.sin(nx * 14.2 + ny * 11.5 + t * 0.06) * 0.5
                          + Math.cos(nx * 8.8  - ny * 10.1 + t * 0.04) * 0.5;

                // ── Color regions ─────────────────────────────────────────────
                // Blue arm: where v1 > threshold (flat colour, video look)
                const BLUE_T  =  0.18;   // arm threshold
                const GREEN_T =  0.22;
                const isBlue  = v1 > BLUE_T;
                const isGreen = v2 > GREEN_T && !isBlue;

                // Vein darkness: near v1 zero-crossing, very thin dark lines
                const vein = Math.exp(-Math.abs(v1) * 10) * 0.88;

                // Second vein set (green arm boundaries)
                const vein2 = Math.exp(-Math.abs(v2) * 8) * 0.55;

                // Singularity darkness at core
                const core = Math.exp(-r * 7.5) * 0.96;

                // Base sandy: (188, 155, 102) — warm geological tan
                let R = 188 + tex * 14, G = 155 + tex * 10, B = 102 + tex * 5;

                if (isBlue) {
                    // Deep cobalt blue — flat, saturated
                    const edge = Math.min(1, (v1 - BLUE_T) / 0.25);
                    R = R + (14  - R) * edge;
                    G = G + (42  - G) * edge;
                    B = B + (175 - B) * edge;
                } else if (isGreen) {
                    // Forest green — flat, earthy
                    const edge = Math.min(1, (v2 - GREEN_T) / 0.25);
                    R = R + (22  - R) * edge;
                    G = G + (118 - G) * edge;
                    B = B + (28  - B) * edge;
                }

                // Vein: darken sharply at arm edges
                const vTotal = Math.max(vein, vein2 * 0.6);
                R = R * (1 - vTotal * 0.90);
                G = G * (1 - vTotal * 0.90);
                B = B * (1 - vTotal * 0.90);

                // Dark singularity core
                R = R * (1 - core);
                G = G * (1 - core);
                B = B * (1 - core);

                // Blink surge: brief brightness flash
                R = Math.min(255, R * (1 + sur * 0.50));
                G = Math.min(255, G * (1 + sur * 0.40));
                B = Math.min(255, B * (1 + sur * 0.30));

                const idx = (py * OW + px) * 4;
                buf[idx]     = Math.max(0, Math.min(255, R | 0));
                buf[idx + 1] = Math.max(0, Math.min(255, G | 0));
                buf[idx + 2] = Math.max(0, Math.min(255, B | 0));
                buf[idx + 3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);
    }
}
