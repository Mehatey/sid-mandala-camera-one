// Bloom Mode — a living flower mandala.
// Hand raised high = flower opens fully. Hand low = it closes to a bud.
// Hand X = rotation speed (left slow, right fast).
// Pinch = hue shift + full unfurl burst.
// Structure: 12 petals × 6 concentric bezier layers, inner gold → outer violet.
class BloomMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._openness   = 0.0;   // 0 = closed bud, 1 = full bloom
        this._targetOpen = 0.15;
        this._rotation   = 0;
        this._rotSpeed   = 0.003;
        this._targetRotSpeed = 0.003;

        this._hue        = 44;    // base hue (shifts with pinch)
        this._hueTarget  = 44;
        this._unfurlBoost = 0;    // pinch-triggered full-open surge

        this.handX = null;
        this.handY = null;
        this._lastHandTime = -999;
    }

    startScene() {
        this.t            = 0;
        this._openness    = 0.0;
        this._targetOpen  = 0.15;
        this._rotation    = 0;
        this._rotSpeed    = 0.003;
        this._targetRotSpeed = 0.003;
        this._hue         = 38 + Math.random() * 20;
        this._hueTarget   = this._hue;
        this._unfurlBoost = 0;
        this.handX        = null;
        this.handY        = null;
        this._lastHandTime = -999;

        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.handX = (1 - normX) * W;
        this.handY = normY * H;
        this._lastHandTime = this.t;

        // Hand Y controls openness: raised hand (low normY) = open
        this._targetOpen = Math.max(0.08, 1 - normY * 1.05);

        // Hand X controls rotation speed: left = slow/reverse, right = fast
        this._targetRotSpeed = (normX - 0.5) * 0.014;
    }

    onPinch(label, normX, normY) {
        this._hueTarget  = (this._hueTarget + 55 + Math.random() * 60) % 360;
        this._unfurlBoost = 1.0;
    }

    onBlink() { this.onPinch('R', 0.5, 0.5); }

    draw(time) {
        this.t += 0.016;

        if (this.handX !== null && this.t - this._lastHandTime > 0.5) {
            this.handX = null;
            this.handY = null;
            this._targetOpen     = 0.15;
            this._targetRotSpeed = 0.003;
        }

        // Smooth interpolation
        this._openness  += (this._targetOpen - this._openness)  * 0.04;
        this._rotSpeed  += (this._targetRotSpeed - this._rotSpeed) * 0.05;
        this._hue       += (this._hueTarget - this._hue)        * 0.03;
        this._unfurlBoost = Math.max(0, this._unfurlBoost - 0.016 * 0.6);

        const open = Math.min(1, this._openness + this._unfurlBoost * 0.8);
        this._rotation += this._rotSpeed;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const cx  = W / 2, cy = H / 2;
        const sc  = Math.min(W, H) * 0.5;

        // Very slow fade — petals linger and layer up
        ctx.fillStyle = 'rgba(2, 1, 8, 0.042)';
        ctx.fillRect(0, 0, W, H);

        const PETALS = 12;
        const LAYERS = 6;

        // Each layer: radius grows outward, petal shape widens
        for (let layer = 0; layer < LAYERS; layer++) {
            const layerFrac  = layer / (LAYERS - 1);          // 0 (inner) → 1 (outer)
            const baseR      = 0.06 + layerFrac * 0.44;       // world radius
            const petalLen   = sc * baseR * (0.18 + open * 0.22);
            const petalWide  = sc * baseR * (0.06 + open * 0.14);
            const layerRot   = this._rotation * (1 - layerFrac * 0.35) + layerFrac * 0.26;

            // Hue gradient: inner = warm gold, outer = cool violet/teal
            const hue  = (this._hue + layerFrac * 165) % 360;
            const sat  = 68 - layerFrac * 12;
            const lit  = 72 - layerFrac * 18;
            const a    = (0.035 + open * 0.045) * (1 - layerFrac * 0.2);

            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${a})`;
            ctx.lineWidth   = 1.0 + (1 - layerFrac) * 0.6;

            for (let p = 0; p < PETALS; p++) {
                const angle = (p / PETALS) * Math.PI * 2 + layerRot;

                // Petal tip
                const tipX = cx + Math.cos(angle) * petalLen;
                const tipY = cy + Math.sin(angle) * petalLen;

                // Control points: two bezier handles for the petal sides
                const perpA = angle + Math.PI / 2;
                const perpB = angle - Math.PI / 2;

                // Tuck factor: when closed, petals fold inward
                const tuck = 1 - open * 0.5;
                const ctrlR = petalLen * (0.55 + open * 0.20);
                const ctrlW = petalWide * (0.8 + open * 0.4);

                const c1x = cx + Math.cos(angle) * ctrlR + Math.cos(perpA) * ctrlW * tuck;
                const c1y = cy + Math.sin(angle) * ctrlR + Math.sin(perpA) * ctrlW * tuck;
                const c2x = cx + Math.cos(angle) * ctrlR + Math.cos(perpB) * ctrlW * tuck;
                const c2y = cy + Math.sin(angle) * ctrlR + Math.sin(perpB) * ctrlW * tuck;

                // Left edge
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.quadraticCurveTo(c1x, c1y, tipX, tipY);
                ctx.stroke();

                // Right edge
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.quadraticCurveTo(c2x, c2y, tipX, tipY);
                ctx.stroke();

                // Cross arc connecting adjacent petals at this layer (creates mandala rings)
                if (layer > 0) {
                    const nextAngle = ((p + 1) / PETALS) * Math.PI * 2 + layerRot;
                    const nx = cx + Math.cos(nextAngle) * petalLen;
                    const ny = cy + Math.sin(nextAngle) * petalLen;
                    const midA = (angle + nextAngle) * 0.5;
                    const midR = petalLen * (0.88 + open * 0.08);

                    ctx.beginPath();
                    ctx.moveTo(tipX, tipY);
                    ctx.quadraticCurveTo(
                        cx + Math.cos(midA) * midR,
                        cy + Math.sin(midA) * midR,
                        nx, ny
                    );
                    ctx.stroke();
                }
            }
        }

        // Core glow — warm golden centre
        const coreA = 0.10 + open * 0.18 + this._unfurlBoost * 0.12;
        const coreR = sc * (0.038 + open * 0.025);
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
        cg.addColorStop(0,   `hsla(${this._hue}, 88%, 94%, ${coreA})`);
        cg.addColorStop(0.4, `hsla(${this._hue}, 75%, 70%, ${coreA * 0.35})`);
        cg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2);
        ctx.fill();

        // Pistil dot
        ctx.fillStyle = `hsla(${this._hue}, 80%, 90%, ${0.55 + open * 0.30})`;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Unfurl burst ring
        if (this._unfurlBoost > 0.08) {
            const br = sc * 0.52 * (1 - this._unfurlBoost);
            const ba = this._unfurlBoost * 0.18;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1, br), 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${this._hue}, 80%, 85%, ${ba})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
    }
}
