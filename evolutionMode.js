// Evolution Mode — a meditative journey through the arc of life.
// 300 particles morph between creature silhouettes, from primordial cell
// to cosmic starburst. Each stage dwells for 4 seconds then advances.
// Blink: advance immediately. Gaze: gentle attractor on nearby particles.
class EvolutionMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._N          = 300;
        this._particles  = [];
        this._stage      = 0;
        this._dwellTimer = 0;       // seconds since morph reached 95%
        this._dwelling   = false;
        this._advancing  = false;
        this._morphPct   = 0;       // 0..1, completion of current morph

        this._gazeNX     = 0.5;
        this._gazeNY     = 0.5;

        this._stageNames = [
            'PRIMORDIAL',
            'SEA LIFE',
            'AMPHIBIAN',
            'REPTILE',
            'MAMMAL',
            'PRIMATE',
            'HUMAN',
            'COSMIC',
        ];

        this._stageTints = [
            [0,   30,  80],    // deep ocean blue
            [0,   80,  80],    // teal
            [40,  70,  20],    // muddy green
            [80,  55,  10],    // ochre brown
            [70,  45,  15],    // warm brown
            [15,  55,  20],    // forest green
            [90,  75,   5],    // golden
            [20,   5,  40],    // deep purple
        ];

        this._stageColors = [
            '#44aaff',   // primordial: cyan
            '#00bfff',   // sea: deep sky blue
            '#7fff00',   // amphibian: chartreuse
            '#cd853f',   // reptile: peru
            '#daa520',   // mammal: goldenrod
            '#d2691e',   // primate: chocolate
            '#f0e68c',   // human: khaki
            '#ffffff',   // cosmic: white
        ];
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    startScene(scene) {
        this.t           = 0;
        this._stage      = 0;
        this._dwellTimer = 0;
        this._dwelling   = false;
        this._advancing  = false;
        this._gazeNX     = 0.5;
        this._gazeNY     = 0.5;

        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const S = Math.min(W, H);

        // Build particles at random positions; assign first-stage targets
        const targets = this._buildPointCloud(0, W, H, S);
        this._particles = [];
        for (let i = 0; i < this._N; i++) {
            const tgt = targets[i % targets.length];
            this._particles.push({
                x:   W * 0.5 + (Math.random() - 0.5) * W,
                y:   H * 0.5 + (Math.random() - 0.5) * H,
                tx:  tgt.x,
                ty:  tgt.y,
                vx:  (Math.random() - 0.5) * 2,
                vy:  (Math.random() - 0.5) * 2,
                r:   1.5 + Math.random(),
            });
        }
        this._morphPct = 0;
    }

    stopScene() {}

    resize() {}

    onGaze(nx, ny) {
        this._gazeNX = nx;
        this._gazeNY = ny;
    }

    onBlink() {
        this._advance();
    }

    // ── Per-frame draw ─────────────────────────────────────────────────────────

    draw(dt) {
        this.t += dt;
        const t   = this.t;
        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;
        const S   = Math.min(W, H);

        // ── Background: trail fade ──────────────────────────────────────────────
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // ── Era tint ────────────────────────────────────────────────────────────
        const tint = this._stageTints[this._stage];
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.fillStyle   = `rgb(${tint[0]}, ${tint[1]}, ${tint[2]})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // ── Gaze attractor ──────────────────────────────────────────────────────
        const gazePixX = this._gazeNX * W;
        const gazePixY = this._gazeNY * H;
        const gazeR    = S * 0.15;
        const gazeR2   = gazeR * gazeR;

        // ── Update particles ────────────────────────────────────────────────────
        let totalDist = 0;
        for (const p of this._particles) {
            // Lerp toward target
            const lerpF = 0.03 * dt * 60;
            p.vx += (p.tx - p.x) * lerpF - p.vx * 0.1;
            p.vy += (p.ty - p.y) * lerpF - p.vy * 0.1;

            // Gaze pull
            const gdx = gazePixX - p.x;
            const gdy = gazePixY - p.y;
            const gd2 = gdx * gdx + gdy * gdy;
            if (gd2 < gazeR2) {
                const strength = (1 - Math.sqrt(gd2) / gazeR) * 0.15;
                p.vx += gdx * strength * dt;
                p.vy += gdy * strength * dt;
            }

            // Velocity cap
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (spd > 12) { p.vx = p.vx / spd * 12; p.vy = p.vy / spd * 12; }

            p.x += p.vx;
            p.y += p.vy;

            totalDist += Math.abs(p.x - p.tx) + Math.abs(p.y - p.ty);
        }

        // Morph progress: average distance / a calibration constant
        const avgDist = totalDist / this._N;
        this._morphPct = Math.max(0, Math.min(1, 1 - avgDist / (S * 0.4)));

        // Dwell logic
        if (this._morphPct > 0.95 && !this._advancing) {
            this._dwellTimer += dt;
            this._dwelling = true;
            if (this._dwellTimer >= 4.0) {
                this._advance();
            }
        } else if (this._morphPct < 0.90) {
            this._dwellTimer = 0;
            this._dwelling   = false;
        }

        // ── Draw particles ──────────────────────────────────────────────────────
        const baseColor = this._stageColors[this._stage];
        const isCosmicStage = (this._stage === 7);

        for (const p of this._particles) {
            ctx.save();
            if (isCosmicStage) {
                // Rainbow glow for cosmic
                const hue = (((p.tx - W * 0.5) / (S * 0.6)) * 180 + t * 30) % 360;
                ctx.shadowBlur  = 6;
                ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
                ctx.fillStyle   = `hsl(${hue}, 80%, 85%)`;
            } else {
                ctx.fillStyle = baseColor;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Stage label ─────────────────────────────────────────────────────────
        ctx.save();
        ctx.globalAlpha  = 0.30;
        ctx.fillStyle    = '#ffffff';
        ctx.font         = `${W * 0.025}px monospace`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this._stageNames[this._stage], W * 0.5, H - 20);
        ctx.restore();

        // ── Morph progress bar (subtle) ─────────────────────────────────────────
        if (!this._dwelling) {
            const barW = W * 0.25 * this._morphPct;
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.fillStyle   = baseColor;
            ctx.fillRect(W * 0.5 - W * 0.125, H - 10, barW, 2);
            ctx.restore();
        }
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    _advance() {
        if (this._advancing) return;
        this._advancing  = true;
        this._dwellTimer = 0;
        this._dwelling   = false;

        const nextStage = (this._stage + 1) % 8;
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const S = Math.min(W, H);

        const targets = this._buildPointCloud(nextStage, W, H, S);

        // Shuffle targets and assign; some particles get a velocity burst
        const shuffled = targets.slice().sort(() => Math.random() - 0.5);
        for (let i = 0; i < this._particles.length; i++) {
            const p   = this._particles[i];
            const tgt = shuffled[i % shuffled.length];
            p.tx = tgt.x;
            p.ty = tgt.y;

            // Random escape burst for ~30% of particles
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const burst = 3 + Math.random() * 6;
                p.vx += Math.cos(angle) * burst;
                p.vy += Math.sin(angle) * burst;
            }
        }

        this._stage     = nextStage;
        this._morphPct  = 0;
        this._advancing = false;
    }

    // Returns array of {x, y} pixel positions for the given stage.
    // All shapes are generated mathematically.
    _buildPointCloud(stage, W, H, S) {
        const cx = W * 0.5;
        const cy = H * 0.5;
        const pts = [];

        // Helper: sample an ellipse
        const ellipsePts = (ex, ey, rx, ry, n, angle = 0) => {
            const out = [];
            for (let i = 0; i < n; i++) {
                const a  = (i / n) * Math.PI * 2;
                const lx = Math.cos(a) * rx;
                const ly = Math.sin(a) * ry;
                out.push({
                    x: cx + ex + lx * Math.cos(angle) - ly * Math.sin(angle),
                    y: cy + ey + lx * Math.sin(angle) + ly * Math.cos(angle),
                });
            }
            return out;
        };

        // Helper: fill ellipse with random interior points
        const fillEllipse = (ex, ey, rx, ry, n, angle = 0) => {
            const out = [];
            for (let i = 0; i < n; i++) {
                const a  = Math.random() * Math.PI * 2;
                const r2 = Math.sqrt(Math.random());
                const lx = r2 * rx * Math.cos(a);
                const ly = r2 * ry * Math.sin(a);
                out.push({
                    x: cx + ex + lx * Math.cos(angle) - ly * Math.sin(angle),
                    y: cy + ey + lx * Math.sin(angle) + ly * Math.cos(angle),
                });
            }
            return out;
        };

        // Helper: line segment samples
        const linePts = (x1, y1, x2, y2, n) => {
            const out = [];
            for (let i = 0; i <= n; i++) {
                const f = i / n;
                out.push({ x: cx + x1 + (x2 - x1) * f, y: cy + y1 + (y2 - y1) * f });
            }
            return out;
        };

        const sc = S * 0.38;   // global scale factor

        switch (stage) {
            case 0: {
                // Primordial amoeba — irregular soft blob
                const blob = [];
                for (let i = 0; i < this._N; i++) {
                    const a   = Math.random() * Math.PI * 2;
                    const r2  = Math.sqrt(Math.random());
                    const rx  = sc * 0.50 * (1 + 0.20 * Math.sin(a * 3));
                    const ry  = sc * 0.38 * (1 + 0.18 * Math.cos(a * 2));
                    blob.push({ x: cx + r2 * rx * Math.cos(a), y: cy + r2 * ry * Math.sin(a) });
                }
                return blob;
            }

            case 1: {
                // Fish — elongated body + tail fan + head nub
                const body   = fillEllipse(0, 0, sc * 0.42, sc * 0.18, 160);
                const head   = fillEllipse(sc * 0.40, 0, sc * 0.13, sc * 0.13, 55);
                // Tail: triangle fan
                const tail   = [];
                for (let i = 0; i < 55; i++) {
                    const f   = i / 55;
                    const tx2 = -sc * 0.42 + (-sc * 0.18) * f;
                    const ty2 = (f - 0.5) * sc * 0.30;
                    tail.push({ x: cx + tx2, y: cy + ty2 });
                }
                // Dorsal fin
                const fin = [];
                for (let i = 0; i < 30; i++) {
                    const f  = i / 30;
                    fin.push({ x: cx + (f - 0.2) * sc * 0.40, y: cy - sc * 0.18 - f * sc * 0.14 });
                }
                return [...body, ...head, ...tail, ...fin];
            }

            case 2: {
                // Frog — wide squat body, 4 splayed limbs, round eyes
                const body   = fillEllipse(0, 0, sc * 0.30, sc * 0.20, 100);
                const head   = fillEllipse(0, -sc * 0.22, sc * 0.18, sc * 0.15, 60);
                // Eyes (two small circles on top of head)
                const eyeL   = ellipsePts(-sc * 0.12, -sc * 0.31, sc * 0.06, sc * 0.06, 22);
                const eyeR   = ellipsePts( sc * 0.12, -sc * 0.31, sc * 0.06, sc * 0.06, 22);
                // 4 legs: front pair shorter, back pair long and bent outward
                const limbs  = [
                    ...linePts(-sc * 0.30,  sc * 0.05, -sc * 0.50,  sc * 0.22, 15),
                    ...linePts( sc * 0.30,  sc * 0.05,  sc * 0.50,  sc * 0.22, 15),
                    ...linePts(-sc * 0.28,  sc * 0.18, -sc * 0.55,  sc * 0.38, 20),
                    ...linePts( sc * 0.28,  sc * 0.18,  sc * 0.55,  sc * 0.38, 20),
                ];
                // Feet spread
                const feet   = [
                    ...linePts(-sc * 0.55, sc * 0.38, -sc * 0.70, sc * 0.30, 8),
                    ...linePts(-sc * 0.55, sc * 0.38, -sc * 0.65, sc * 0.48, 8),
                    ...linePts( sc * 0.55, sc * 0.38,  sc * 0.70, sc * 0.30, 8),
                    ...linePts( sc * 0.55, sc * 0.38,  sc * 0.65, sc * 0.48, 8),
                ];
                return [...body, ...head, ...eyeL, ...eyeR, ...limbs, ...feet];
            }

            case 3: {
                // T-rex dinosaur — large torso, tiny arms, big legs, long tail
                const torso  = fillEllipse(0, -sc * 0.04, sc * 0.26, sc * 0.18, 90);
                const head2  = fillEllipse(sc * 0.30, -sc * 0.22, sc * 0.16, sc * 0.11, 50);
                // Tiny arms
                const armL   = linePts(sc * 0.14, -sc * 0.10, sc * 0.22, sc * 0.04, 10);
                const armR   = linePts(sc * 0.14, -sc * 0.10, sc * 0.26, sc * 0.08, 10);
                // Massive hind legs
                const legL   = [
                    ...linePts(-sc * 0.12, sc * 0.14, -sc * 0.22, sc * 0.38, 15),
                    ...linePts(-sc * 0.22, sc * 0.38, -sc * 0.30, sc * 0.50, 10),
                ];
                const legR   = [
                    ...linePts( sc * 0.06, sc * 0.14,  sc * 0.16, sc * 0.38, 15),
                    ...linePts( sc * 0.16, sc * 0.38,  sc * 0.26, sc * 0.50, 10),
                ];
                // Long tapering tail to the left
                const tail2  = [];
                for (let i = 0; i < 40; i++) {
                    const f  = i / 40;
                    tail2.push({ x: cx - sc * 0.26 - f * sc * 0.42, y: cy + f * sc * 0.12 });
                }
                return [...torso, ...head2, ...armL, ...armR, ...legL, ...legR, ...tail2];
            }

            case 4: {
                // Wolf/dog — body, 4 legs, head with pointed ears, tail
                const body   = fillEllipse(0, 0, sc * 0.32, sc * 0.16, 100);
                const head2  = fillEllipse(sc * 0.34, -sc * 0.14, sc * 0.15, sc * 0.13, 50);
                // Pointed ears
                const earL   = [
                    ...linePts(sc * 0.26, -sc * 0.26, sc * 0.31, -sc * 0.38, 8),
                    ...linePts(sc * 0.31, -sc * 0.38, sc * 0.38, -sc * 0.26, 8),
                ];
                const earR   = [
                    ...linePts(sc * 0.38, -sc * 0.26, sc * 0.43, -sc * 0.38, 8),
                    ...linePts(sc * 0.43, -sc * 0.38, sc * 0.48, -sc * 0.26, 8),
                ];
                // 4 legs
                const legs   = [
                    ...linePts(-sc * 0.22, sc * 0.14, -sc * 0.26, sc * 0.40, 14),
                    ...linePts(-sc * 0.06, sc * 0.14, -sc * 0.10, sc * 0.40, 14),
                    ...linePts( sc * 0.10, sc * 0.14,  sc * 0.08, sc * 0.40, 14),
                    ...linePts( sc * 0.24, sc * 0.14,  sc * 0.26, sc * 0.40, 14),
                ];
                // Upward curving tail
                const tail3  = [];
                for (let i = 0; i < 30; i++) {
                    const f  = i / 30;
                    tail3.push({ x: cx - sc * 0.32 - f * sc * 0.18, y: cy - f * f * sc * 0.22 });
                }
                return [...body, ...head2, ...earL, ...earR, ...legs, ...tail3];
            }

            case 5: {
                // Primate/ape — hunched, very long arms, round head, short legs
                const torso  = fillEllipse(0, sc * 0.04, sc * 0.18, sc * 0.22, 80);
                const head2  = fillEllipse(0, -sc * 0.28, sc * 0.16, sc * 0.16, 55);
                // Long arms reaching toward the ground
                const armLL  = [
                    ...linePts(-sc * 0.18, -sc * 0.08, -sc * 0.40,  sc * 0.12, 14),
                    ...linePts(-sc * 0.40,  sc * 0.12, -sc * 0.44,  sc * 0.36, 14),
                ];
                const armRR  = [
                    ...linePts( sc * 0.18, -sc * 0.08,  sc * 0.40,  sc * 0.12, 14),
                    ...linePts( sc * 0.40,  sc * 0.12,  sc * 0.44,  sc * 0.36, 14),
                ];
                // Short bent legs
                const legLL  = [
                    ...linePts(-sc * 0.12,  sc * 0.25, -sc * 0.18,  sc * 0.44, 12),
                    ...linePts(-sc * 0.18,  sc * 0.44, -sc * 0.10,  sc * 0.50, 8),
                ];
                const legRR  = [
                    ...linePts( sc * 0.12,  sc * 0.25,  sc * 0.18,  sc * 0.44, 12),
                    ...linePts( sc * 0.18,  sc * 0.44,  sc * 0.10,  sc * 0.50, 8),
                ];
                return [...torso, ...head2, ...armLL, ...armRR, ...legLL, ...legRR];
            }

            case 6: {
                // Human — upright bilateral figure
                const head2   = ellipsePts(0, -sc * 0.34, sc * 0.11, sc * 0.13, 35);
                const neck    = linePts(0, -sc * 0.21, 0, -sc * 0.16, 6);
                const shouldL = linePts(0, -sc * 0.16, -sc * 0.22, -sc * 0.14, 10);
                const shouldR = linePts(0, -sc * 0.16,  sc * 0.22, -sc * 0.14, 10);
                const torso   = [
                    ...linePts(0, -sc * 0.16, -sc * 0.14, sc * 0.14, 14),
                    ...linePts(0, -sc * 0.16,  sc * 0.14, sc * 0.14, 14),
                    ...linePts(-sc * 0.14, sc * 0.14, sc * 0.14, sc * 0.14, 14),
                ];
                const armLL   = [
                    ...linePts(-sc * 0.22, -sc * 0.14, -sc * 0.30, sc * 0.06, 12),
                    ...linePts(-sc * 0.30,  sc * 0.06, -sc * 0.24, sc * 0.24, 12),
                ];
                const armRR   = [
                    ...linePts( sc * 0.22, -sc * 0.14,  sc * 0.30, sc * 0.06, 12),
                    ...linePts( sc * 0.30,  sc * 0.06,  sc * 0.24, sc * 0.24, 12),
                ];
                const legLL   = [
                    ...linePts(-sc * 0.07, sc * 0.14, -sc * 0.12, sc * 0.36, 14),
                    ...linePts(-sc * 0.12, sc * 0.36, -sc * 0.14, sc * 0.52, 12),
                    ...linePts(-sc * 0.14, sc * 0.52, -sc * 0.22, sc * 0.52, 8),
                ];
                const legRR   = [
                    ...linePts( sc * 0.07, sc * 0.14,  sc * 0.12, sc * 0.36, 14),
                    ...linePts( sc * 0.12, sc * 0.36,  sc * 0.14, sc * 0.52, 12),
                    ...linePts( sc * 0.14, sc * 0.52,  sc * 0.22, sc * 0.52, 8),
                ];
                return [
                    ...head2, ...neck,
                    ...shouldL, ...shouldR,
                    ...torso,
                    ...armLL, ...armRR,
                    ...legLL, ...legRR,
                ];
            }

            case 7: {
                // Cosmic starburst — radial mandala of particles
                const star = [];
                const rays  = 12;
                for (let i = 0; i < this._N; i++) {
                    const rayIdx = Math.floor(Math.random() * rays);
                    const baseA  = (rayIdx / rays) * Math.PI * 2;
                    const wobble = (Math.random() - 0.5) * (Math.PI / rays) * 0.6;
                    const angle  = baseA + wobble;
                    const dist   = (0.05 + Math.random() * 0.95) * sc * 0.90;
                    star.push({
                        x: cx + Math.cos(angle) * dist,
                        y: cy + Math.sin(angle) * dist,
                    });
                }
                return star;
            }

            default:
                return fillEllipse(0, 0, sc * 0.40, sc * 0.40, this._N);
        }
    }
}
