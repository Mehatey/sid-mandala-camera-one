// Session Manager — drives the full meditative experience.
class SessionManager {
    constructor(canvas, coinCanvas, coinCtx, onStageChange) {
        this.canvas        = canvas;
        this.coinCanvas    = coinCanvas;
        this.coinCtx       = coinCtx;
        this.onStageChange = onStageChange; // callback({ mode, style, name })

        this.active       = false;
        this.stageIndex   = 0;
        this.stageElapsed = 0;
        this.lastUpdate   = null;

        // Gaze tracking
        this.gazeElapsed  = 0;
        this.lastGazeTime = null;

        // Coin cursor fade
        this.coinAlpha  = 1.0;
        this.coinFading = false;

        // Flame cursor
        this.flameVisible = false;
        this.flameTime    = 0;
        this.showTip      = true;
        this.tipAlpha     = 0;

        // Centre dwell
        this.dwellTimer   = 0;
        this.DWELL_NEEDED = 1.2;

        // Sparkle glints
        this.glints = [];
        for (let i = 0; i < 6; i++) this.glints.push({
            angle: (i / 6) * Math.PI * 2,
            phase: Math.random() * Math.PI * 2,
            spd:   0.8 + Math.random() * 1.2,
        });

        // Timing constants
        this.GAZE_FADE_THRESHOLD = 18;
        this.FLAME_APPEAR_TIME   = 20;
        this.MIN_STAGE_TIME      = 20;

        // Scene sequence — arranged by intensity, calm → immersive
        // mode: null = geometric mandala; style = mandala style index
        // Arc: geometric → organic → wave → particle → watching → corridor → void → guided
        this.sequence = [
            { mode: null,        style: 1,    name: 'stillness'  },  // Thread Lines — quiet geometric entry
            { mode: null,        style: 3,    name: 'depth'      },  // Ocean Depths — deeper geometry
            { mode: 'mycelium',  style: null, name: 'mycelium'   },  // Neural Growth — first organic surprise
            { mode: null,        style: 0,    name: 'form'       },  // Geometric — return to precision
            { mode: 'embers',    style: null, name: 'embers'     },  // Embers — ascending particles
            { mode: 'tide',      style: null, name: 'tide'       },  // Tide — interference wave field
            { mode: null,        style: 2,    name: 'woven'      },  // Interwoven — complex interlace
            { mode: 'mirror',    style: null, name: 'mirror'     },  // Mirror — kaleidoscope
            { mode: 'cymatics',  style: null, name: 'cymatics'   },  // Cymatics — math made visible
            { mode: null,        style: 4,    name: 'forest'     },  // Emerald Forest — organic midpoint
            { mode: 'flow',      style: null, name: 'flow'       },  // Flow Field — particle rivers
            { mode: 'gaze',      style: null, name: 'gaze'       },  // Eye World — watching eyes
            { mode: 'nature',    style: null, name: 'nature'     },  // Natural World — first-person 3D walk
            { mode: null,        style: 5,    name: 'pixel'      },  // Pixel Art — brief lightness break
            { mode: 'recursion', style: null, name: 'recursion'  },  // Recursion — infinite corridor
            { mode: 'void',      style: null, name: 'void'       },  // Void — singularity
            { mode: 'sound',     style: null, name: 'sound'      },  // Sound Garden
            { mode: 'breath',    style: null, name: 'breath'     },  // Breath Guide — closing
        ];

        this._onKey = this._onKey.bind(this);
        window.addEventListener('keydown', this._onKey);
    }

    start() {
        this.active     = true;
        this.stageIndex = 0;
        this._resetStage();
        document.body.classList.add('experience-active');
    }

    isFlameActive()   { return this.active && this.flameVisible; }
    getCoinAlpha()    { return this.coinAlpha; }
    getCurrentStage() { return this.sequence[Math.min(this.stageIndex, this.sequence.length - 1)]; }
    getCurrentMode()  { return this.getCurrentStage().mode; }

    onGaze(normX, normY) {
        if (!this.active) return;
        const now = performance.now();
        const dt  = this.lastGazeTime ? (now - this.lastGazeTime) / 1000 : 0;
        this.lastGazeTime = now;
        const dist = Math.hypot(normX - 0.5, normY - 0.5);
        if (dist < 0.18) { this.gazeElapsed += dt; }
        else             { this.gazeElapsed = Math.max(0, this.gazeElapsed - dt * 0.3); }
        if (this.gazeElapsed >= this.GAZE_FADE_THRESHOLD && !this.coinFading) {
            this.coinFading = true;
        }
    }

    update(nowMs, mouseX, mouseY) {
        if (!this.active) return;
        const dt = this.lastUpdate ? (nowMs - this.lastUpdate) / 1000 : 0;
        this.lastUpdate    = nowMs;
        this.stageElapsed += dt;
        this.flameTime    += dt;

        if (this.coinFading && this.coinAlpha > 0) {
            this.coinAlpha = Math.max(0, this.coinAlpha - dt * 0.33);
        }

        if (!this.flameVisible && this.stageElapsed >= this.FLAME_APPEAR_TIME) {
            this.flameVisible = true;
        }

        if (this.showTip && this.flameVisible && this.stageIndex === 0) {
            this.tipAlpha = Math.min(1, this.tipAlpha + dt * 0.55);
        } else {
            this.tipAlpha = Math.max(0, this.tipAlpha - dt * 1.5);
        }

        if (this.flameVisible && mouseX !== undefined) {
            const cx = this.canvas.width  / 2;
            const cy = this.canvas.height / 2;
            if (Math.hypot(mouseX - cx, mouseY - cy) < 80 && this.stageElapsed >= this.MIN_STAGE_TIME) {
                this.dwellTimer += dt;
                if (this.dwellTimer >= this.DWELL_NEEDED) {
                    this.dwellTimer = 0;
                    if (this.stageIndex === 0) this.showTip = false;
                    if (typeof this.onFlameTrigger === 'function') {
                        this.onFlameTrigger(() => this._nextStage());
                    } else {
                        this._nextStage();
                    }
                }
            } else {
                this.dwellTimer = Math.max(0, this.dwellTimer - dt * 2);
            }
        }
    }

    drawCoinGlints(ctx, cx, cy, globalTime) {
        if (!this.active || this.coinAlpha <= 0.05) return;
        const a = this.coinAlpha;
        for (const g of this.glints) {
            const phase  = globalTime * g.spd + g.phase;
            const bright = (Math.sin(phase) + 1) / 2;
            if (bright < 0.4) continue;
            const dist  = 18 + bright * 12;
            const gx    = cx + Math.cos(g.angle + globalTime * 0.3) * dist;
            const gy    = cy + Math.sin(g.angle + globalTime * 0.3) * dist;
            const size  = 1.0 + bright * 2.0;
            const alpha = bright * 0.75 * a;
            ctx.save();
            ctx.shadowBlur  = 6;
            ctx.shadowColor = `rgba(255, 240, 200, ${alpha})`;
            ctx.fillStyle   = `rgba(255, 248, 220, ${alpha})`;
            ctx.translate(gx, gy);
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const a0 = (i / 4) * Math.PI * 2;
                const a1 = a0 + Math.PI / 4;
                ctx.lineTo(Math.cos(a0) * size * 2.2, Math.sin(a0) * size * 2.2);
                ctx.lineTo(Math.cos(a1) * size * 0.5, Math.sin(a1) * size * 0.5);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    drawFlameCursor(ctx, mouseX, mouseY, globalTime) {
        if (!this.flameVisible) return;
        const x = mouseX, y = mouseY, t = globalTime;

        const halo = ctx.createRadialGradient(x, y + 4, 0, x, y, 55);
        halo.addColorStop(0,   'rgba(255,160,30,0.22)');
        halo.addColorStop(0.5, 'rgba(255,100,15,0.08)');
        halo.addColorStop(1,   'rgba(255,60,5,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(x, y, 55, 0, Math.PI * 2); ctx.fill();

        const wisps = [
            { col:[255,80,10],  a:0.70, w:1.00, h:1.00, ph:0   },
            { col:[255,140,20], a:0.55, w:0.55, h:0.85, ph:1.3 },
            { col:[255,215,60], a:0.75, w:0.28, h:0.62, ph:2.6 },
        ];
        for (const wd of wisps) {
            const wobble = Math.sin(t * 3.4 + wd.ph) * 5.5 * wd.w;
            const height = 40 * wd.h, width = 11 * wd.w;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, y + 4);
            ctx.bezierCurveTo(x-width+wobble,y-height*0.42,x+width*0.6+wobble*0.5,y-height*0.76,x+wobble*0.3,y-height);
            ctx.bezierCurveTo(x-width*0.5+wobble*0.3,y-height*0.76,x+width*0.6+wobble,y-height*0.42,x,y+4);
            ctx.closePath();
            const [r,g,b] = wd.col;
            const fg = ctx.createLinearGradient(x, y+4, x, y-height);
            fg.addColorStop(0,   `rgba(${r},${g},${b},${wd.a})`);
            fg.addColorStop(0.6, `rgba(${r},${g},${b},${wd.a*0.5})`);
            fg.addColorStop(1,   'rgba(255,255,200,0)');
            ctx.fillStyle = fg; ctx.fill(); ctx.restore();
        }

        const core = ctx.createRadialGradient(x,y+2,0,x,y+2,9);
        core.addColorStop(0,'rgba(255,255,240,0.95)');
        core.addColorStop(0.5,'rgba(255,220,100,0.65)');
        core.addColorStop(1,'rgba(255,120,20,0)');
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x,y+2,9,0,Math.PI*2); ctx.fill();

        const cx2 = this.canvas.width/2, cy2 = this.canvas.height/2;
        if (Math.hypot(mouseX-cx2,mouseY-cy2) < 80 && this.stageElapsed >= this.MIN_STAGE_TIME) {
            const fill = Math.min(1, this.dwellTimer / this.DWELL_NEEDED);
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx2,cy2,60,-Math.PI/2,-Math.PI/2+fill*Math.PI*2);
            ctx.strokeStyle = `rgba(255,180,60,${0.55+fill*0.35})`;
            ctx.lineWidth = 2; ctx.stroke();
            const cg = ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,60);
            cg.addColorStop(0,`rgba(255,180,60,${fill*0.12})`);
            cg.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx2,cy2,60,0,Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // tip text removed
    }

    _resetStage() {
        this.stageElapsed = 0;
        this.gazeElapsed  = 0;
        this.lastGazeTime = null;
        this.lastUpdate   = null;
        this.coinAlpha    = 1.0;
        this.coinFading   = false;
        this.flameVisible = false;
        this.flameTime    = 0;
        this.dwellTimer   = 0;
    }

    _nextStage() {
        if (this.stageIndex < this.sequence.length - 1) {
            this.stageIndex++;
            this._resetStage();
            this.onStageChange(this.getCurrentStage());
        } else {
            this._endExperience();
        }
    }

    _prevStage() {
        if (this.stageIndex > 0) {
            this.stageIndex--;
            this._resetStage();
            this.onStageChange(this.getCurrentStage());
        }
    }

    _endExperience() {
        this.active = false;
        document.body.classList.remove('experience-active');
        document.dispatchEvent(new CustomEvent('experienceEnd'));
    }

    _onKey(e) {
        if (!this.active) return;
        if (e.key === 'ArrowRight') { this.dwellTimer = 0; this._nextStage(); }
        if (e.key === 'ArrowLeft')  { this.dwellTimer = 0; this._prevStage(); }
    }

    destroy() { window.removeEventListener('keydown', this._onKey); }
}
