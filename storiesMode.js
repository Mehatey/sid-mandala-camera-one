// Stories Mode — the rest of the human condition.
// Fragments of real experience drift slowly upward through the dark.
// Background: a live water ripple simulation — blink drops a stone in still water.
// Hand: nearby stories slow down and come into full focus.
// Pinch: summons a new cluster from the archive.
class StoriesMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._particles  = [];
        this._spawnTimer = 0;

        // Water ripple simulation — two wave buffers
        this.GW = 220;
        this.GH = 165;
        this._wA  = null;   // current frame heights
        this._wB  = null;   // previous frame heights
        this._wTmp = null;
        this._off    = null;
        this._offCtx = null;
        this._imgData = null;

        this.handX = null;
        this.handY = null;
        this._lastHandTime = -999;
    }

    startScene() {
        this.t           = 0;
        this._particles  = [];
        this._spawnTimer = 0;
        this.handX       = null;
        this.handY       = null;
        this._lastHandTime = -999;
        this._initWater();

        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);

        // Seed initial spread — distributed vertically so canvas fills right away
        for (let i = 0; i < 16; i++) this._spawn(true);
    }

    // ── Water simulation ────────────────────────────────────────────────────────

    _initWater() {
        const N = this.GW * this.GH;
        this._wA   = new Float32Array(N);
        this._wB   = new Float32Array(N);
        this._wTmp = new Float32Array(N);
        if (!this._off) this._off = document.createElement('canvas');
        this._off.width  = this.GW;
        this._off.height = this.GH;
        this._offCtx  = this._off.getContext('2d');
        this._imgData = this._offCtx.createImageData(this.GW, this.GH);
    }

    _ripple(normCx, normCy, strength) {
        const cx = ((normCx) * this.GW) | 0;
        const cy = ((normCy) * this.GH) | 0;
        const r  = 10 + Math.floor(Math.random() * 8);
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx*dx + dy*dy > r*r) continue;
                const x = cx + dx, y = cy + dy;
                if (x < 1 || x >= this.GW - 1 || y < 1 || y >= this.GH - 1) continue;
                this._wA[y * this.GW + x] = strength;
            }
        }
    }

    _stepWater() {
        const GW = this.GW, GH = this.GH;
        const A = this._wA, B = this._wB, T = this._wTmp;
        for (let y = 1; y < GH - 1; y++) {
            for (let x = 1; x < GW - 1; x++) {
                const i  = y * GW + x;
                T[i] = (A[i-1] + A[i+1] + A[i-GW] + A[i+GW]) / 2 - B[i];
                T[i] *= 0.988;  // damping — ripples fade naturally
            }
        }
        // Swap: B ← A, A ← T
        this._wB = A;
        this._wA = T;
        this._wTmp = B;
    }

    _renderWater() {
        const GW = this.GW, GH = this.GH;
        const A    = this._wA;
        const data = this._imgData.data;

        for (let y = 1; y < GH - 1; y++) {
            for (let x = 1; x < GW - 1; x++) {
                const i = y * GW + x;
                // Gradient gives the "caustic" light shimmer
                const gx = A[i+1] - A[i-1];
                const gy = A[i+GW] - A[i-GW];
                const light = (gx + gy) * 2.8;

                const idx = i << 2;
                data[idx]   = Math.max(0, Math.min(255, (6  + light) | 0));
                data[idx+1] = Math.max(0, Math.min(255, (14 + light * 1.2) | 0));
                data[idx+2] = Math.max(0, Math.min(255, (32 + light * 1.8) | 0));
                data[idx+3] = 255;
            }
        }
        this._offCtx.putImageData(this._imgData, 0, 0);
    }

    // ── Story particles ─────────────────────────────────────────────────────────

    _occupiedRects() {
        return this._particles.map(p => ({
            x: p.x - 4,
            y: p.y - 4,
            w: p.w + 8,
            h: p.h + 8,
        }));
    }

    _overlaps(ax, ay, aw, ah, rects) {
        for (const r of rects) {
            if (ax < r.x + r.w && ax + aw > r.x &&
                ay < r.y + r.h && ay + ah > r.y) return true;
        }
        return false;
    }

    _spawn(scatter) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const s = _STORIES[Math.floor(Math.random() * _STORIES.length)];

        const layer    = 0.25 + Math.random() * 0.75;
        const fontSize = Math.round(9 + layer * 11);  // 9–20px
        const vy       = -(0.22 + layer * 0.38);      // always upward, min 0.22

        // Pre-measure text to get bounds
        this.ctx.font = `${fontSize}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
        let maxW = 0;
        for (const line of s.lines) {
            const m = this.ctx.measureText(line).width;
            if (m > maxW) maxW = m;
        }
        const tw = maxW;
        const th = s.lines.length * fontSize * 1.55;

        // Find a non-overlapping spawn position (up to 20 attempts)
        const occupied = this._occupiedRects();
        let x, y, placed = false;

        for (let attempt = 0; attempt < 20; attempt++) {
            if (scatter) {
                // Distribute across full height of canvas
                x = 50 + Math.random() * (W - 100 - tw);
                y = 60 + Math.random() * (H - 120 - th);
            } else {
                // Spawn from just below canvas, random x
                x = 50 + Math.random() * (W - 100 - tw);
                y = H + 30 + Math.random() * 80;
            }
            if (!this._overlaps(x, y, tw, th, occupied)) {
                placed = true;
                break;
            }
        }
        if (!placed) return;  // skip if no room — will try again next cycle

        const lifetime = 420 + Math.random() * 360;

        this._particles.push({
            lines:    s.lines,
            tone:     s.tone,
            x, y,
            vx:       (Math.random() - 0.5) * 0.06,
            vy,
            size:     fontSize,
            layer,
            age:      scatter ? Math.random() * lifetime * 0.55 : 0,
            lifetime,
            w:        tw,
            h:        th,
        });
    }

    // ── Events ──────────────────────────────────────────────────────────────────

    onHandMove(normX, normY) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        this.handX = (1 - normX) * W;
        this.handY = normY * H;
        this._lastHandTime = this.t;

        // Hand dragging through water makes a ripple
        if (Math.random() < 0.08) {
            this._ripple(1 - normX, normY, 180 + Math.random() * 120);
        }
    }

    onPinch(label, normX, normY) {
        for (let i = 0; i < 5; i++) this._spawn(false);
        this._ripple(1 - normX, normY, 700);
    }

    onBlink() {
        // Drop a stone in the water — random position
        const rx = 0.15 + Math.random() * 0.70;
        const ry = 0.15 + Math.random() * 0.70;
        this._ripple(rx, ry, 900 + Math.random() * 400);
    }

    // ── Draw ────────────────────────────────────────────────────────────────────

    draw(time) {
        this.t += 0.016;

        if (this.handX !== null && this.t - this._lastHandTime > 0.5) {
            this.handX = null;
            this.handY = null;
        }

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Step water simulation 3× per frame for smooth ripples
        this._stepWater();
        this._stepWater();
        this._stepWater();
        this._renderWater();

        // Draw water as full-canvas background
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(this._off, 0, 0, W, H);

        // Spawn new stories periodically — keep density consistent
        this._spawnTimer++;
        if (this._spawnTimer > 70 && this._particles.length < 18) {
            this._spawn(false);
            this._spawnTimer = 0;
        }

        // Sort back-to-front so front-layer text draws on top
        this._particles.sort((a, b) => a.layer - b.layer);

        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.age += 1;

            // Hand attraction: stories near palm drift toward it and reveal
            let proximityBoost = 0;
            if (this.handX !== null) {
                const dx  = this.handX - (p.x + p.w / 2);
                const dy  = this.handY - (p.y + p.h / 2);
                const d   = Math.sqrt(dx*dx + dy*dy) + 1;
                if (d < 240) {
                    const pull = (1 - d / 240) * 0.010;
                    p.vx += (dx / d) * pull;
                    // Only attract horizontally — never pull downward
                    proximityBoost = Math.max(0, 1 - d / 240) * 0.72;
                }
            }

            // Damping — gentle, always preserves upward drift
            p.vx *= 0.95;
            p.vy  = p.vy * 0.97 + (-(0.22 + p.layer * 0.38)) * 0.03;
            // Hard floor: never drift downward
            if (p.vy > -0.10) p.vy = -0.10;

            p.x += p.vx;
            p.y += p.vy;

            // Opacity: bell curve — fade in, peak, fade out
            const lf    = p.age / p.lifetime;
            const rawA  = lf < 0.12 ? lf / 0.12
                        : lf > 0.78 ? (1 - lf) / 0.22
                        : 1.0;
            const baseA = rawA * (0.18 + p.layer * 0.58);
            const opacity = Math.min(0.90, baseA + proximityBoost);

            if (opacity < 0.006) {
                if (p.age > p.lifetime || p.y + p.h < -20) {
                    this._particles.splice(i, 1);
                }
                continue;
            }

            // Cull if drifted off-screen
            if (p.y + p.h < -30 || p.x > W + 50 || p.x + p.w < -50) {
                this._particles.splice(i, 1);
                continue;
            }

            ctx.font = `${p.size}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
            ctx.textBaseline = 'top';

            let r = 238, g = 232, b = 226;
            if (p.tone === 'warm')  { r = 252; g = 236; b = 204; }
            if (p.tone === 'cool')  { r = 205; g = 222; b = 252; }
            if (p.tone === 'muted') { r = 192; g = 192; b = 198; }

            const lineH = p.size * 1.55;
            for (let li = 0; li < p.lines.length; li++) {
                ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
                ctx.fillText(p.lines[li], p.x, p.y + li * lineH);
            }
        }
    }
}

// ── Story archive ─────────────────────────────────────────────────────────────
const _STORIES = [
    { lines: ["my mom used to hum this song.", "she's been gone six years now."], tone: 'warm' },
    { lines: ["i don't know why i'm crying", "but i am"], tone: 'cool' },
    { lines: ["stopped the car. needed that."], tone: 'neutral' },
    { lines: ["i'm 34 and still figuring out who i am"], tone: 'muted' },
    { lines: ["we don't talk anymore", "but i hope he's okay"], tone: 'cool' },
    { lines: ["this found me at exactly the right moment"], tone: 'warm' },
    { lines: ["i turned 40 alone.", "ordered my favourite food. it was okay."], tone: 'neutral' },
    { lines: ["some days are just heavy"], tone: 'muted' },
    { lines: ["moved to a new city.", "don't know a single person."], tone: 'cool' },
    { lines: ["she never knew how much she meant to me"], tone: 'warm' },
    { lines: ["still haven't told my parents.", "that was two years ago."], tone: 'muted' },
    { lines: ["the night i almost didn't make it", "i was listening to something like this"], tone: 'cool' },
    { lines: ["i miss who i was before everything happened"], tone: 'cool' },
    { lines: ["three years of therapy.", "i'm finally starting to like myself."], tone: 'warm' },
    { lines: ["strangers on the internet understand me", "better than anyone in my life"], tone: 'neutral' },
    { lines: ["sometimes the loneliness is physical"], tone: 'cool' },
    { lines: ["my dad isn't proud of me", "and i've accepted that"], tone: 'muted' },
    { lines: ["i rebuilt my whole life at 45. it's possible."], tone: 'warm' },
    { lines: ["my brother and i don't speak.", "i think about him every day."], tone: 'cool' },
    { lines: ["was the first in my family to go to college.", "nobody cared."], tone: 'muted' },
    { lines: ["learning to say no", "is the hardest thing i've ever done"], tone: 'neutral' },
    { lines: ["moved across the world for love.", "lost both."], tone: 'cool' },
    { lines: ["a stranger held the door.", "i almost cried. that bad a week."], tone: 'warm' },
    { lines: ["been carrying this for years.", "didn't realise until just now."], tone: 'neutral' },
    { lines: ["we had one more year together", "and we spent it fighting"], tone: 'cool' },
    { lines: ["i keep the voicemail.", "can't bring myself to listen to it."], tone: 'warm' },
    { lines: ["growing up poor taught me things", "i still can't name"], tone: 'muted' },
    { lines: ["everyone thinks i'm fine.", "i'm not fine."], tone: 'neutral' },
    { lines: ["made it to 30. didn't think i would."], tone: 'warm' },
    { lines: ["the version of me from five years ago", "would be so confused. and so relieved."], tone: 'warm' },
    { lines: ["i forgave my father.", "not for him."], tone: 'neutral' },
    { lines: ["she raised me alone.", "i didn't understand that", "until i became a parent."], tone: 'warm' },
    { lines: ["the divorce was the right choice.", "grief has no logic."], tone: 'muted' },
    { lines: ["i've been pretending to be okay for so long", "i forgot the difference"], tone: 'cool' },
    { lines: ["small mercies. that's what this year was."], tone: 'neutral' },
    { lines: ["i deleted 12 years of photos.", "it took 30 seconds."], tone: 'cool' },
    { lines: ["my therapist said i was allowed to take up space.", "i still don't believe it."], tone: 'neutral' },
    { lines: ["first christmas without him.", "we made his recipe. nobody said anything."], tone: 'warm' },
    { lines: ["i left. it was the right thing.", "some days i'm still not sure."], tone: 'muted' },
    { lines: ["two hours drive to see her.", "she didn't know who i was.", "i went every week."], tone: 'warm' },
    { lines: ["nobody tells you grief comes in waves", "for years"], tone: 'cool' },
    { lines: ["i'm the one who got away.", "i'm also the one who stayed too long."], tone: 'neutral' },
    { lines: ["watched my city change", "until i didn't recognise it"], tone: 'muted' },
    { lines: ["we laughed at that table for hours.", "i'd give anything."], tone: 'warm' },
    { lines: ["the body remembers", "what the mind tries to forget"], tone: 'cool' },
    { lines: ["i started over at 52. terrifying. necessary."], tone: 'warm' },
    { lines: ["my daughter asked why i was crying.", "i said because something was beautiful."], tone: 'warm' },
    { lines: ["been sober three years.", "lost a lot. got myself back."], tone: 'neutral' },
    { lines: ["i sent the message.", "no reply. i sent it anyway."], tone: 'muted' },
    { lines: ["we used to talk every day.", "i don't remember when that stopped."], tone: 'cool' },
    { lines: ["the house is quiet now", "in a way it never was before"], tone: 'neutral' },
    { lines: ["i carry my grandmother's recipe in my handwriting now.", "that felt important."], tone: 'warm' },
    { lines: ["got the job. sat in the car and wept.", "first good news in a year."], tone: 'warm' },
    { lines: ["a kind word from a stranger", "can hold you for a week"], tone: 'neutral' },
    { lines: ["i was invisible for so long", "i don't know how to be seen"], tone: 'cool' },
    { lines: ["wrote him a letter. never sent it.", "it helped anyway."], tone: 'warm' },
    { lines: ["i thought i was the only one.", "apparently not."], tone: 'neutral' },
    { lines: ["the medication works.", "i wish i hadn't waited so long."], tone: 'warm' },
    { lines: ["we are all just trying to find our way home"], tone: 'neutral' },
    { lines: ["i held her hand at the end.", "i'm glad i was there."], tone: 'warm' },
    { lines: ["been in this city ten years.", "still feel like i just arrived."], tone: 'muted' },
    { lines: ["asked for help. the world didn't end."], tone: 'warm' },
    { lines: ["i don't know what i'm doing.", "most people don't. that helps."], tone: 'neutral' },
    { lines: ["the grief isn't gone.", "i just learned to carry it differently."], tone: 'warm' },
    { lines: ["this is the first time i've felt understood all year"], tone: 'neutral' },
    { lines: ["we don't get enough time. with anyone."], tone: 'cool' },
    { lines: ["i look like my mother now.", "i used to hate that."], tone: 'warm' },
    { lines: ["if you're reading this at 3am:", "me too. you're not alone."], tone: 'neutral' },
];
