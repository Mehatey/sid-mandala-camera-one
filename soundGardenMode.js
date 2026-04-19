// Sound Garden Mode — each blink starts a new sound and wipes old forms.
// While a sound plays, concentric rings of forms grow outward.
// Forms glow — rings overlap and bloom through screen blend mode.
// Background slowly accumulates faint ghost rings for depth.
class SoundGardenMode {
    constructor(ctx, canvas) {
        this.ctx  = ctx;
        this.canvas = canvas;
        this.forms  = [];
        this.ringIndex  = 0;
        this.spawnClock = 0;
        this.spawnInterval = 0.65;   // faster ring spawning (was 1.0s)
        this.currentSoundIdx = 0;
        this._loopHandle = null;
        this.audioCtx   = null;
        this.time       = 0;
        this._blinkFlash = 0;
        this._bgRings    = [];       // slow ghost rings behind forms
        this.resize();
        this._buildSoundDefs();
    }

    resize() { this.w = this.canvas.width; this.h = this.canvas.height; }

    startScene() {
        this.forms       = [];
        this._bgRings    = [];
        this.ringIndex   = 0;
        this.spawnClock  = 0;
        this._blinkFlash = 0;
        this.currentSoundIdx = 0;
        this._startLoop(this.soundDefs[0].type);
        this._spawnRing();
    }

    onBlink() {
        this.forms      = [];
        this.ringIndex  = 0;
        this.spawnClock = 0;
        this._blinkFlash = 1.0;
        this.currentSoundIdx = (this.currentSoundIdx + 1) % this.soundDefs.length;
        this._startLoop(this.soundDefs[this.currentSoundIdx].type);
        this._spawnRing();
        // Spawn ghost ring burst
        const cx = this.w / 2, cy = this.h / 2;
        this._bgRings.push({ cx, cy, r: 0, maxR: Math.min(this.w, this.h) * 0.55, hue: this.soundDefs[this.currentSoundIdx].hue, alpha: 0.22 });
    }

    getSoundLabel() { return null; }
    setCursor()     {}

    draw(time) {
        this.time = time;
        this._blinkFlash = Math.max(0, this._blinkFlash - 0.016 * 2.2);

        const ctx = this.ctx;

        this.spawnClock += 0.016;
        if (this.spawnClock >= this.spawnInterval) {
            this.spawnClock -= this.spawnInterval;
            this._spawnRing();
        }

        // Softer fade for richer accumulation
        ctx.fillStyle = 'rgba(2, 3, 16, 0.14)';
        ctx.fillRect(0, 0, this.w, this.h);

        const cx = this.w / 2, cy = this.h / 2;
        const def = this.soundDefs[this.currentSoundIdx];
        const breath = 0.88 + 0.12 * Math.sin(time * 0.65);
        const gr = Math.min(this.w, this.h) * 0.18 * breath;

        // Background ghost rings
        this._bgRings = this._bgRings.filter(r => r.r < r.maxR);
        for (const r of this._bgRings) {
            r.r     += 0.8;
            r.alpha *= 0.994;
            ctx.beginPath();
            ctx.arc(r.cx, r.cy, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${r.hue}, 55%, 68%, ${r.alpha * (1 - r.r / r.maxR)})`;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }

        // Center atmospheric glow — larger, more vivid
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
        cg.addColorStop(0,   `hsla(${def.hue}, 65%, 72%, ${0.12 + this._blinkFlash * 0.18})`);
        cg.addColorStop(0.4, `hsla(${def.hue}, 55%, 62%, 0.04)`);
        cg.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fill();

        // Blink flash ring
        if (this._blinkFlash > 0.05) {
            const fr = (1 - this._blinkFlash) * Math.min(this.w, this.h) * 0.5;
            ctx.beginPath(); ctx.arc(cx, cy, fr, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${def.hue}, 70%, 80%, ${this._blinkFlash * 0.45})`;
            ctx.lineWidth   = 2.5; ctx.stroke();
        }

        // Use screen blend for glowing forms
        ctx.globalCompositeOperation = 'screen';

        for (const f of this.forms) {
            f.scale = Math.min(1.0, f.scale + 0.040);
            f.alpha = Math.min(0.88, f.alpha + 0.030);
            this._drawForm(f, time);
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _spawnRing() {
        const cx = this.w / 2, cy = this.h / 2;
        const def   = this.soundDefs[this.currentSoundIdx];
        const count = 8;
        const idx   = this.ringIndex++;
        const maxDist = Math.min(this.w, this.h) * 0.44;
        const dist  = Math.min(48 + idx * 52, maxDist);
        const baseAngle = (idx % 2 === 0) ? 0 : Math.PI / count;

        // Add ghost ring for each new ring spawned
        this._bgRings.push({ cx, cy, r: dist * 0.7, maxR: dist * 1.8, hue: def.hue, alpha: 0.12 });

        for (let i = 0; i < count; i++) {
            const ang = baseAngle + (i / count) * Math.PI * 2;
            this.forms.push({
                x:     cx + Math.cos(ang) * dist,
                y:     cy + Math.sin(ang) * dist,
                type:  def.type,
                hue:   def.hue,
                birth: this.time,
                phase: i * (Math.PI * 2 / count),
                scale: 0,
                alpha: 0,
                size:  def.size,
            });
        }
    }

    _drawForm(f, time) {
        const ctx   = this.ctx;
        const pulse = 0.92 + 0.08 * Math.sin(time * 1.20 + f.phase);
        const s     = f.scale * pulse * f.size;
        const a     = f.alpha;

        // Glow pass — larger, lower alpha
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.globalAlpha = a * 0.30;
        ctx.scale(2.2, 2.2);
        this._drawShape(ctx, f.type, s * 0.45, 1.0, f.hue + 15, time + f.phase);
        ctx.restore();

        // Core pass
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.globalAlpha = a;
        switch (f.type) {
            case 'bird':    this._fBird(ctx, s, 1.0, f.hue, time + f.phase);    break;
            case 'bowl':    this._fBowl(ctx, s, 1.0, f.hue, time + f.phase);    break;
            case 'drop':    this._fDrop(ctx, s, 1.0, f.hue, time + f.phase);    break;
            case 'wind':    this._fWind(ctx, s, 1.0, f.hue, time + f.phase);    break;
            case 'cricket': this._fCricket(ctx, s, 1.0, f.hue, time + f.phase); break;
            case 'bell':    this._fBell(ctx, s, 1.0, f.hue, time + f.phase);    break;
            case 'whale':   this._fWhale(ctx, s, 1.0, f.hue, time + f.phase);   break;
            case 'rain':    this._fRain(ctx, s, 1.0, f.hue, time + f.phase);    break;
            case 'om':      this._fOm(ctx, s, 1.0, f.hue, time + f.phase);      break;
            case 'chime':   this._fChime(ctx, s, 1.0, f.hue, time + f.phase);   break;
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    _drawShape(ctx, type, s, a, hue, t) {
        switch (type) {
            case 'bird':    this._fBird(ctx, s, a, hue, t);    break;
            case 'bowl':    this._fBowl(ctx, s, a, hue, t);    break;
            case 'drop':    this._fDrop(ctx, s, a, hue, t);    break;
            case 'wind':    this._fWind(ctx, s, a, hue, t);    break;
            case 'cricket': this._fCricket(ctx, s, a, hue, t); break;
            case 'bell':    this._fBell(ctx, s, a, hue, t);    break;
            case 'whale':   this._fWhale(ctx, s, a, hue, t);   break;
            case 'rain':    this._fRain(ctx, s, a, hue, t);    break;
            case 'om':      this._fOm(ctx, s, a, hue, t);      break;
            case 'chime':   this._fChime(ctx, s, a, hue, t);   break;
        }
    }

    // ── Abstract form shapes ──────────────────────────────────────────────────

    _fBird(ctx, s, a, hue, t) {
        const flap = Math.sin(t * 3.2) * 0.18;
        ctx.strokeStyle = `hsla(${hue}, 65%, 82%, ${a * 0.80})`;
        ctx.lineWidth = 1.4 * s; ctx.lineCap = 'round';
        for (const dir of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(dir*10*s, (-7+flap*8)*s, dir*20*s, (-3+flap*5)*s, dir*26*s, 2*s);
            ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 2.8*s, 0, Math.PI*2);
        ctx.fillStyle = `hsla(${hue}, 65%, 85%, ${a * 0.7})`; ctx.fill();
    }

    _fBowl(ctx, s, a, hue, t) {
        const sway = Math.sin(t * 0.75) * 0.10;
        for (let i = 3; i >= 1; i--) {
            const r = i * 9.0 * s;
            ctx.beginPath();
            ctx.arc(0, 0, r, Math.PI*(0.08+sway), Math.PI*(0.92-sway));
            ctx.strokeStyle = `hsla(${hue}, 52%, 86%, ${a*(0.35+i*0.20)})`;
            ctx.lineWidth = 1.0 * s; ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(-22*s, 2*s); ctx.lineTo(22*s, 2*s);
        ctx.strokeStyle = `hsla(${hue}, 45%, 78%, ${a*0.30})`;
        ctx.lineWidth = 1.1*s; ctx.stroke();
    }

    _fDrop(ctx, s, a, hue, t) {
        const bob = Math.sin(t * 2.0) * 1.8 * s;
        ctx.fillStyle = `hsla(${hue}, 72%, 78%, ${a * 0.58})`;
        ctx.beginPath(); ctx.arc(0, 6*s+bob, 6.5*s, 0, Math.PI*2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, bob);
        ctx.bezierCurveTo(7*s, bob, 7*s, 9*s+bob, 0, 13*s+bob);
        ctx.bezierCurveTo(-7*s, 9*s+bob, -7*s, bob, 0, bob);
        ctx.fillStyle = `hsla(${hue}, 68%, 82%, ${a * 0.42})`; ctx.fill();
    }

    _fWind(ctx, s, a, hue, t) {
        const sweep = Math.sin(t * 1.3) * 5 * s;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const yo = (i - 1) * 7 * s;
            ctx.beginPath();
            ctx.moveTo(-22*s, yo);
            ctx.bezierCurveTo(-8*s, yo-sweep*(1-i*0.3), 8*s, yo+sweep*(1-i*0.3), 22*s, yo);
            ctx.strokeStyle = `hsla(${hue}, 42%, 76%, ${a*(0.60-i*0.12)})`;
            ctx.lineWidth = (1.3-i*0.3)*s; ctx.stroke();
        }
    }

    _fCricket(ctx, s, a, hue, t) {
        for (let i = 0; i < 8; i++) {
            const ang = (i/8)*Math.PI*2 + t*0.45;
            const d = (3.5+(i%3)*3)*s;
            const tw = 0.5+0.5*Math.sin(t*9+i*1.4);
            ctx.beginPath();
            ctx.arc(Math.cos(ang)*d, Math.sin(ang)*d, (0.8+tw*1.0)*s, 0, Math.PI*2);
            ctx.fillStyle = `hsla(${hue}, 62%, 80%, ${a*(0.42+tw*0.40)})`; ctx.fill();
        }
    }

    _fBell(ctx, s, a, hue, t) {
        const ring = 0.95 + 0.05*Math.sin(t*4.5);
        for (let i = 0; i < 3; i++) {
            const r = (5+i*5.8)*s*ring;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
            ctx.strokeStyle = `hsla(${hue}, 56%, 85%, ${a*(0.72-i*0.20)})`;
            ctx.lineWidth = (1.2-i*0.3)*s; ctx.stroke();
        }
    }

    _fWhale(ctx, s, a, hue, t) {
        const wave = Math.sin(t*0.65)*5*s;
        ctx.strokeStyle = `hsla(${hue}, 62%, 74%, ${a*0.68})`;
        ctx.lineWidth = 2.4*s; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-24*s, wave);
        ctx.bezierCurveTo(-10*s, -7*s+wave, 10*s, 7*s-wave, 24*s, -wave);
        ctx.stroke();
        ctx.lineWidth = 1.1*s;
        ctx.strokeStyle = `hsla(${hue}, 56%, 70%, ${a*0.48})`;
        ctx.beginPath();
        ctx.moveTo(24*s,-wave); ctx.quadraticCurveTo(30*s,-9*s-wave,28*s,-16*s-wave);
        ctx.moveTo(24*s,-wave); ctx.quadraticCurveTo(31*s,-1*s-wave,29*s,7*s-wave);
        ctx.stroke();
    }

    _fRain(ctx, s, a, hue, t) {
        ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const x = (i-2.5)*6.5*s;
            const phase = Math.sin(t*3.8+i*0.95);
            const len = (9+Math.abs(phase)*4)*s;
            const y = phase*4*s;
            ctx.strokeStyle = `hsla(${hue}, 66%, 80%, ${a*(0.36+Math.abs(phase)*0.25)})`;
            ctx.lineWidth = 1.0*s;
            ctx.beginPath(); ctx.moveTo(x, y-len/2); ctx.lineTo(x, y+len/2); ctx.stroke();
        }
    }

    _fOm(ctx, s, a, hue, t) {
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const ang = (i/100)*Math.PI*2*2.8 + t*0.25;
            const r   = (i/100)*18*s;
            const x = Math.cos(ang)*r, y = Math.sin(ang)*r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${hue}, 58%, 78%, ${a*0.65})`;
        ctx.lineWidth = 1.0*s; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 2.5*s, 0, Math.PI*2);
        ctx.fillStyle = `hsla(${hue}, 60%, 82%, ${a*0.62})`; ctx.fill();
    }

    _fChime(ctx, s, a, hue, t) {
        const rot = t*0.38; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const ang = (i/6)*Math.PI*2+rot;
            const len = 15*s;
            ctx.strokeStyle = `hsla(${hue}, 72%, 88%, ${a*0.75})`;
            ctx.lineWidth = 1.0*s;
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(ang)*len, Math.sin(ang)*len); ctx.stroke();
            const mx = Math.cos(ang)*len*0.55, my = Math.sin(ang)*len*0.55;
            const perp = ang+Math.PI/2, bl = 4.5*s;
            ctx.strokeStyle = `hsla(${hue}, 66%, 84%, ${a*0.48})`;
            ctx.beginPath();
            ctx.moveTo(mx-Math.cos(perp)*bl, my-Math.sin(perp)*bl);
            ctx.lineTo(mx+Math.cos(perp)*bl, my+Math.sin(perp)*bl);
            ctx.stroke();
        }
    }

    // ── Sound loop management ────────────────────────────────────────────────

    _startLoop(type) {
        this._stopLoop();
        this._ensureAudio();
        if (!this.audioCtx) return;
        this._playSound(type, this.audioCtx.currentTime);
        const interval = this._loopInterval(type);
        this._loopHandle = setInterval(() => {
            if (this.audioCtx) this._playSound(type, this.audioCtx.currentTime);
        }, interval * 1000);
    }

    _stopLoop() {
        if (this._loopHandle) { clearInterval(this._loopHandle); this._loopHandle = null; }
    }

    _loopInterval(type) {
        const map = {
            bird: 1.6, bowl: 6.0, drop: 1.8, wind: 2.2, cricket: 1.2,
            bell: 3.5, whale: 5.5, rain: 2.2, om: 5.0, chime: 2.5,
        };
        return map[type] || 2.0;
    }

    _buildSoundDefs() {
        this.soundDefs = [
            { type: 'bird',    hue: 48,  size: 1.0  },
            { type: 'bowl',    hue: 200, size: 1.2  },
            { type: 'drop',    hue: 210, size: 0.9  },
            { type: 'wind',    hue: 168, size: 1.1  },
            { type: 'cricket', hue: 92,  size: 0.85 },
            { type: 'bell',    hue: 50,  size: 1.0  },
            { type: 'whale',   hue: 225, size: 1.15 },
            { type: 'rain',    hue: 195, size: 0.9  },
            { type: 'om',      hue: 278, size: 1.1  },
            { type: 'chime',   hue: 240, size: 1.0  },
        ];
    }

    _ensureAudio() {
        if (!this.audioCtx) {
            try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { return; }
        }
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    }

    _playSound(type, now) {
        switch (type) {
            case 'bird':    this._sBird(now);    break;
            case 'bowl':    this._sBowl(now);    break;
            case 'drop':    this._sDrop(now);    break;
            case 'wind':    this._sWind(now);    break;
            case 'cricket': this._sCricket(now); break;
            case 'bell':    this._sBell(now);    break;
            case 'whale':   this._sWhale(now);   break;
            case 'rain':    this._sRain(now);    break;
            case 'om':      this._sOm(now);      break;
            case 'chime':   this._sChime(now);   break;
        }
    }

    _sBird(now) {
        const ac = this.audioCtx;
        for (let chirp = 0; chirp < 2; chirp++) {
            const t = now + chirp * 0.22;
            const mod = ac.createOscillator(), mg = ac.createGain();
            const car = ac.createOscillator(), g  = ac.createGain();
            mod.frequency.value = 160 + chirp * 20; mg.gain.value = 1100;
            car.frequency.setValueAtTime(2100 + chirp * 200, t);
            car.frequency.linearRampToValueAtTime(2900 + chirp * 200, t + 0.14);
            mod.connect(mg); mg.connect(car.frequency);
            car.connect(g);  g.connect(ac.destination);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.16, t + 0.025);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
            mod.start(t); car.start(t); mod.stop(t + 0.25); car.stop(t + 0.25);
        }
    }
    _sBowl(now) {
        const ac = this.audioCtx;
        [[220,0.11],[438,0.05],[657,0.03]].forEach(([freq,amp]) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.frequency.value = freq; o.type = 'sine';
            g.gain.setValueAtTime(amp, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 5.5);
            o.connect(g); g.connect(ac.destination);
            o.start(now); o.stop(now + 6.0);
        });
    }
    _sDrop(now) {
        const ac = this.audioCtx;
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.setValueAtTime(1100, now);
        o.frequency.exponentialRampToValueAtTime(380, now + 0.18);
        o.type = 'sine';
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        o.connect(g); g.connect(ac.destination);
        o.start(now); o.stop(now + 0.4);
    }
    _sWind(now) {
        const ac = this.audioCtx;
        const len = ac.sampleRate * 2;
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const f = ac.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 350; f.Q.value = 0.7;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.14, now + 0.5);
        g.gain.linearRampToValueAtTime(0.06, now + 1.4);
        g.gain.linearRampToValueAtTime(0, now + 2.0);
        src.connect(f); f.connect(g); g.connect(ac.destination);
        src.start(now);
    }
    _sCricket(now) {
        const ac = this.audioCtx;
        for (let i = 0; i < 3; i++) {
            const t = now + i * 0.24;
            const o = ac.createOscillator(), am = ac.createOscillator();
            const ag = ac.createGain(), g = ac.createGain();
            o.frequency.value = 4100; am.frequency.value = 60; ag.gain.value = 0.08;
            am.connect(ag); ag.connect(g.gain);
            o.connect(g); g.connect(ac.destination);
            g.gain.setValueAtTime(0.09, t); g.gain.setValueAtTime(0, t + 0.14);
            am.start(t); o.start(t); am.stop(t + 0.18); o.stop(t + 0.18);
        }
    }
    _sBell(now) {
        const ac = this.audioCtx;
        [[523,0.14],[1047,0.06],[1568,0.04],[2093,0.02]].forEach(([f,amp],i) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.frequency.value = f; o.type = 'sine';
            g.gain.setValueAtTime(amp, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 2.8 - i * 0.3);
            o.connect(g); g.connect(ac.destination);
            o.start(now); o.stop(now + 3.2);
        });
    }
    _sWhale(now) {
        const ac = this.audioCtx;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(165, now);
        o.frequency.linearRampToValueAtTime(260, now + 1.8);
        o.frequency.linearRampToValueAtTime(120, now + 4.0);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.12, now + 0.6);
        g.gain.setValueAtTime(0.10, now + 3.2);
        g.gain.linearRampToValueAtTime(0, now + 4.5);
        o.connect(g); g.connect(ac.destination);
        o.start(now); o.stop(now + 5.0);
    }
    _sRain(now) {
        const ac = this.audioCtx;
        const len = ac.sampleRate * 2;
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() < 0.08 ? (Math.random()*2-1)*0.6 : 0;
        const src = ac.createBufferSource(); src.buffer = buf;
        const f = ac.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 2800;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.22, now);
        g.gain.linearRampToValueAtTime(0, now + 2.0);
        src.connect(f); f.connect(g); g.connect(ac.destination);
        src.start(now);
    }
    _sOm(now) {
        const ac = this.audioCtx;
        [[110,0.08],[165,0.045],[220,0.025]].forEach(([freq,amp]) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.frequency.value = freq; o.type = 'sine';
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(amp, now + 0.7);
            g.gain.setValueAtTime(amp, now + 2.8);
            g.gain.linearRampToValueAtTime(0, now + 4.0);
            o.connect(g); g.connect(ac.destination);
            o.start(now); o.stop(now + 4.5);
        });
    }
    _sChime(now) {
        const ac = this.audioCtx;
        [523,659,784,880,1047,1318].forEach((freq,i) => {
            const t = now + i*0.14 + Math.sin(i*1.7)*0.05;
            const o = ac.createOscillator(), g = ac.createGain();
            o.frequency.value = freq; o.type = 'sine';
            g.gain.setValueAtTime(0.09, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
            o.connect(g); g.connect(ac.destination);
            o.start(t); o.stop(t + 2.2);
        });
    }
}
