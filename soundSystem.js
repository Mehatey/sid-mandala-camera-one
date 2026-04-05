// Sound System — per-scene synthesized ambients. No looping bg file. No warp sound.
class SoundSystem {
    constructor() {
        this.audioCtx        = null;
        this.audioInitialized = false;
        this.isLiquifying    = false;
        this._modeGain       = null;
        this._modeOscs       = [];
        this._modeNodes      = [];
        this._modeIntervals  = [];
        // Base ambient — runs throughout whole experience
        this._baseGain       = null;
        this._baseOscs       = [];
        this._baseNodes      = [];
    }

    init() {} // no-op (warp audio removed)

    initializeAudio() {
        if (this.audioInitialized) return;
        this.audioInitialized = true;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    }

    // ── Stubs kept for call-site compatibility ───────────────────────────────
    startMeditationPad() {}
    stopMeditationPad()  {}

    // ── Warp / liquify — visual only, no audio ───────────────────────────────
    updateLiquifyState(isLiquifying) {
        this.isLiquifying = isLiquifying; // kept so callers don't throw
    }

    // ── Base ambient — nature texture + choir pad — runs throughout ──────────
    startBaseAmbient() {
        if (!this.audioInitialized || !this.audioCtx || this._baseGain) return;
        const ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        if (ctx.state === 'suspended') ctx.resume();

        const master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.55, ctx.currentTime, 1.2); // audible fade-in

        // ── Nature texture: soft brown noise (birds / wind) ───────────────────
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, sr * 6, sr);
        const dat = buf.getChannelData(0);
        let last  = 0;
        for (let i = 0; i < dat.length; i++) {
            const w = Math.random() * 2 - 1;
            last    = (last + 0.018 * w) / 1.018;
            dat[i]  = last * 12;
        }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = buf;
        noiseSrc.loop   = true;

        const nlpf = ctx.createBiquadFilter();
        nlpf.type = 'lowpass'; nlpf.frequency.value = 520; nlpf.Q.value = 0.3;
        const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.18;
        noiseSrc.connect(nlpf); nlpf.connect(noiseGain); noiseGain.connect(master);
        noiseSrc.start();

        // ── Choir pad: warm C major hymn voicing ──────────────────────────────
        const choirNotes = [130.81, 164.81, 196.00, 246.94, 293.66, 392.00];
        const choirAmps  = [0.18,   0.14,   0.12,   0.09,   0.07,   0.05 ];
        const oscs = [];

        const choirGain = ctx.createGain(); choirGain.gain.value = 0.55;
        choirGain.connect(master);

        // Slow amplitude breath — 14s cycle
        const breathLfo  = ctx.createOscillator();
        const breathLfoG = ctx.createGain();
        breathLfo.frequency.value = 0.072;
        breathLfoG.gain.value     = 0.10;
        breathLfo.connect(breathLfoG); breathLfoG.connect(choirGain.gain);
        breathLfo.start(); oscs.push(breathLfo);

        choirNotes.forEach((f, i) => {
            [-0.003, +0.003].forEach(det => {
                const osc = ctx.createOscillator();
                const g   = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f * (1 + det);
                g.gain.value = choirAmps[i];
                osc.connect(g); g.connect(choirGain);
                osc.start(); oscs.push(osc);
            });
        });

        this._baseGain  = master;
        this._baseOscs  = [noiseSrc, ...oscs];
        this._baseNodes = [nlpf, noiseGain, choirGain, breathLfoG];
    }

    stopBaseAmbient() {
        if (!this._baseGain || !this.audioCtx) return;
        const t = this.audioCtx.currentTime;
        this._baseGain.gain.setTargetAtTime(0, t, 1.2);
        const oscs = this._baseOscs;
        setTimeout(() => {
            oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch(e){} });
        }, 4000);
        this._baseGain  = null;
        this._baseOscs  = [];
        this._baseNodes = [];
    }

    // ── Mode ambient switching ───────────────────────────────────────────────
    startModeAmbient(mode) {
        if (!this.audioInitialized || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        this._stopModeNodes();

        switch (mode) {
            // ── Six mandala scenes: each completely different ──────────────
            case 'stillness':
                // Solfeggio / healing frequencies — pure sine, barely-perceptible beating
                this._startSolfeggio();
                break;
            case 'depth':
                // Nature — very soft brown noise shaped as distant water
                this._startNature();
                break;
            case 'form':
                // Beethoven-inspired — slow piano arpeggio in E minor
                this._startBeethoven();
                break;
            case 'woven':
                // Tibetan singing bowls — struck gently with natural random timing
                this._startBowls();
                break;
            case 'forest':
                // Om chanting — deep drone with vowel formant sweep
                this._startOm();
                break;
            case 'pixel':
                // Rain — very gentle white noise shaped as soft rain
                this._startRain();
                break;
            // ── Other visual modes ─────────────────────────────────────────
            case 'water':
                this._startPad([
                    { f: 55,   amp: 0.07 }, { f: 73,  amp: 0.04 },
                    { f: 110,  amp: 0.025 }, { f: 2200, amp: 0.005, type: 'sine' },
                ], 280, 0.18, 0.04, 0.008);
                break;
            case 'cosmos':
                this._startPad([
                    { f: 32, amp: 0.09 }, { f: 48,  amp: 0.04 },
                    { f: 640, amp: 0.012 }, { f: 960, amp: 0.007 },
                ], 100, 0.14, 0.025, 0.012);
                break;
            case 'watercolor':
                this._startPad([
                    { f: 220, amp: 0.055 }, { f: 261, amp: 0.040 },
                    { f: 329, amp: 0.032 }, { f: 440, amp: 0.022 },
                ], 700, 0.15, 0.05, 0.005);
                break;
            case 'aurora':
                this._startPad([
                    { f: 174, amp: 0.048 }, { f: 220, amp: 0.048 },
                    { f: 293, amp: 0.040 }, { f: 440, amp: 0.030 }, { f: 587, amp: 0.016 },
                ], 800, 0.17, 0.07, 0.004);
                break;
            case 'quotes':
                this._startPad([
                    { f: 110, amp: 0.040 }, { f: 147, amp: 0.022 },
                ], 450, 0.08, 0.02, 0.004);
                break;
            case 'embers':
                // Low crackling warmth — filtered brown noise + deep sub drone
                this._startPad([
                    { f: 48,  amp: 0.055 },
                    { f: 72,  amp: 0.032 },
                    { f: 96,  amp: 0.018 },
                ], 180, 0.22, 0.06, 0.006);
                break;
            case 'mirror':
                // Crystalline upper partials — pure sine tones like glass harmonics
                this._startPad([
                    { f: 440,  amp: 0.030 },
                    { f: 528,  amp: 0.028 },
                    { f: 660,  amp: 0.022 },
                    { f: 880,  amp: 0.014 },
                    { f: 1320, amp: 0.008 },
                ], 1200, 0.18, 0.08, 0.003);
                break;
            case 'flow':
                // Gentle sustained drone — low wind-like pad
                this._startPad([
                    { f: 82,  amp: 0.050 },
                    { f: 110, amp: 0.038 },
                    { f: 164, amp: 0.025 },
                    { f: 220, amp: 0.015 },
                ], 600, 0.20, 0.05, 0.005);
                break;
            case 'gaze':
                // Alien / watchful — binaural theta beating, high ethereal shimmer
                this._startGaze();
                break;
            case 'mycelium':
                // Underground root network — sub bass pulse + earth texture
                this._startMycelium();
                break;
            case 'cymatics':
                // Pure harmonic series — physics made audible
                this._startCymatics();
                break;
            case 'tide':
                // Deep ocean — sub drones + shaped oceanic noise swell
                this._startTide();
                break;
            case 'recursion':
                // Infinite corridor — pure fifth drone stack, slow inward pull
                this._startRecursion();
                break;
            case 'void':
                // Emptiness — ultra quiet pure tones at threshold of perception
                this._startVoid();
                break;
            case 'nature':
                // Forest walk — wind, rustling leaves, deep hum
                this._startForestAmbient();
                break;
            // sound scene handled by SoundGardenMode — nothing here
            default: break;
        }
    }

    // ── Solfeggio / healing frequencies ─────────────────────────────────────
    // 174 Hz (foundation), 396 Hz (liberation), 528 Hz (transformation)
    // Each note paired ±1.5 Hz for ultra-subtle binaural beating
    _startSolfeggio() {
        const ctx = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.42, ctx.currentTime, 2.0);

        const freqs = [174, 396, 528];
        const amps  = [0.045, 0.032, 0.024];
        const oscs  = [];

        freqs.forEach((f, i) => {
            [-1.5, +1.5].forEach(detune => {
                const osc = ctx.createOscillator();
                const g   = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f + detune;
                g.gain.value = amps[i];
                osc.connect(g); g.connect(master);
                osc.start();
                oscs.push(osc);
            });
        });

        this._modeGain  = master;
        this._modeOscs  = oscs;
        this._modeNodes = [];
    }

    // ── Nature / flowing water ───────────────────────────────────────────────
    _startNature() {
        const ctx   = this.audioCtx;
        const sr    = ctx.sampleRate;
        const len   = sr * 4;
        const buf   = ctx.createBuffer(1, len, sr);
        const data  = buf.getChannelData(0);

        // Brown noise (1/f²)
        let last = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            last = (last + 0.02 * white) / 1.02;
            data[i] = last * 14;
        }

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop   = true;

        // Heavy low-pass — very soft, distant water sound
        const lpf = ctx.createBiquadFilter();
        lpf.type  = 'lowpass';
        lpf.frequency.value = 380;
        lpf.Q.value = 0.3;

        const lpf2 = ctx.createBiquadFilter();
        lpf2.type  = 'lowpass';
        lpf2.frequency.value = 600;
        lpf2.Q.value = 0.2;

        // Very slow amplitude swell (not filter modulation — avoids harshness)
        const ampLfo  = ctx.createOscillator();
        const ampLfoG = ctx.createGain();
        ampLfo.frequency.value = 0.035; // ~28s cycle — barely perceptible
        ampLfoG.gain.value     = 0.018;
        ampLfo.connect(ampLfoG);
        ampLfo.start();

        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.40, ctx.currentTime, 2.0);
        ampLfoG.connect(master.gain); // gentle swell on master

        src.connect(lpf); lpf.connect(lpf2); lpf2.connect(master);
        src.start();

        this._modeGain  = master;
        this._modeOscs  = [src, ampLfo];
        this._modeNodes = [lpf, lpf2, ampLfoG];
    }

    // ── Beethoven-inspired — slow piano arpeggio (E minor) ─────────────────
    _startBeethoven() {
        const ctx   = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.45, ctx.currentTime, 1.8);

        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass'; lpf.frequency.value = 1400; lpf.Q.value = 0.5;
        lpf.connect(master);

        // E minor arpeggio — Für Elise inspired
        const pattern = [164.81, 246.94, 329.63, 392.00, 329.63, 246.94];
        let noteIdx = 0;

        const playNote = () => {
            if (!this.audioInitialized || !this.audioCtx) return;
            const freq = pattern[noteIdx % pattern.length];
            noteIdx++;
            const now = ctx.currentTime;

            [-0.002, +0.002].forEach(d => {
                const osc = ctx.createOscillator();
                const env = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq * (1 + d);
                env.gain.setValueAtTime(0, now);
                env.gain.linearRampToValueAtTime(0.052, now + 0.08);
                env.gain.exponentialRampToValueAtTime(0.001, now + 2.2); // shorter sustain
                osc.connect(env); env.connect(lpf);
                osc.start(now); osc.stop(now + 2.5);
            });
        };

        playNote();
        // True random intervals using recursive setTimeout
        const scheduleNext = () => {
            if (!this.audioInitialized) return;
            const delay = 2600 + Math.random() * 800;
            const id = setTimeout(() => { playNote(); scheduleNext(); }, delay);
            this._modeIntervals.push(id);
        };
        scheduleNext();

        this._modeGain  = master;
        this._modeOscs  = [];
        this._modeNodes = [lpf];
    }

    // ── Tibetan singing bowls ────────────────────────────────────────────────
    _startBowls() {
        const ctx   = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.50, ctx.currentTime, 1.5);

        const fundamentals = [110, 146.8];

        const strikeBowl = () => {
            if (!this.audioInitialized || !this.audioCtx) return;
            const f   = fundamentals[Math.floor(Math.random() * fundamentals.length)];
            const now = ctx.currentTime;

            [1, 2.756, 5.404].forEach((ratio, hi) => {
                const freq  = f * ratio;
                const amp   = [0.09, 0.045, 0.018][hi];
                const decay = [9.0, 6.5, 3.5][hi]; // longer, more reverberant

                const osc = ctx.createOscillator();
                const env = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                env.gain.setValueAtTime(amp, now + 0.01);
                env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
                osc.connect(env); env.connect(master);
                osc.start(now); osc.stop(now + decay + 0.3);
            });

            // True random next strike (recursive setTimeout)
            const delay = 8000 + Math.random() * 5000;
            const id = setTimeout(strikeBowl, delay);
            this._modeIntervals.push(id);
        };

        // First strike after a gentle delay
        const id0 = setTimeout(strikeBowl, 1500);
        this._modeIntervals.push(id0);

        this._modeGain  = master;
        this._modeOscs  = [];
        this._modeNodes = [];
    }

    // ── Om chanting ─────────────────────────────────────────────────────────
    _startOm() {
        const ctx   = this.audioCtx;

        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.44, ctx.currentTime, 2.0);

        const notes = [136, 272, 408, 544, 680];
        const amps  = [0.08, 0.055, 0.042, 0.028, 0.014];
        const oscs  = [];

        const bpf = ctx.createBiquadFilter();
        bpf.type            = 'bandpass';
        bpf.frequency.value = 550;
        bpf.Q.value         = 1.8; // softer Q — less harsh
        bpf.connect(master);

        // Very slow formant sweep — 14s cycle
        const lfo  = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = 0.072;
        lfoG.gain.value     = 260; // narrower sweep range
        lfo.connect(lfoG); lfoG.connect(bpf.frequency);
        lfo.start();
        oscs.push(lfo);

        // Gentle amplitude breathing (8s cycle)
        const ampLfo  = ctx.createOscillator();
        const ampLfoG = ctx.createGain();
        ampLfo.frequency.value = 0.125;
        ampLfoG.gain.value     = 0.030; // reduced modulation depth
        ampLfo.connect(ampLfoG); ampLfoG.connect(master.gain);
        ampLfo.start();
        oscs.push(ampLfo);

        notes.forEach((f, i) => {
            [-0.002, +0.002].forEach(d => {
                const osc = ctx.createOscillator();
                const g   = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f * (1 + d);
                g.gain.value = amps[i] * 0.45;
                osc.connect(g);
                g.connect(bpf);
                g.connect(master); // dry component
                osc.start();
                oscs.push(osc);
            });
        });

        this._modeGain  = master;
        this._modeOscs  = oscs;
        this._modeNodes = [bpf, lfoG, ampLfoG];
    }

    // ── Rain sounds — very gentle, atmospheric ───────────────────────────────
    _startRain() {
        const ctx = this.audioCtx;
        const sr  = ctx.sampleRate;
        const len = sr * 3;

        const buf  = ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;

        // Soft shaping — two low-pass stages for a very muffled, distant rain
        const hpf = ctx.createBiquadFilter();
        hpf.type = 'highpass'; hpf.frequency.value = 120; hpf.Q.value = 0.3;

        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass'; lpf.frequency.value = 1200; lpf.Q.value = 0.3;

        const lpf2 = ctx.createBiquadFilter();
        lpf2.type = 'lowpass'; lpf2.frequency.value = 2000; lpf2.Q.value = 0.2;

        // Very gentle slow amplitude modulation only (no filter sweep — avoids harshness)
        const lfo  = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = 0.06; // ~16s cycle
        lfoG.gain.value     = 0.015; // tiny modulation

        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.38, ctx.currentTime, 2.0);

        lfo.connect(lfoG); lfoG.connect(master.gain); // amplitude swell only
        lfo.start();

        src.connect(hpf); hpf.connect(lpf); lpf.connect(lpf2); lpf2.connect(master);
        src.start();

        this._modeGain  = master;
        this._modeOscs  = [src, lfo];
        this._modeNodes = [hpf, lpf, lpf2, lfoG];
    }

    // ── Gaze — alien / watchful: binaural theta beating + high shimmer ────────
    _startGaze() {
        const ctx    = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.28, ctx.currentTime, 2.2);
        const oscs = [];

        // Sub undertone
        [108, 216].forEach((f, i) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = f; g.gain.value = [0.040, 0.020][i];
            osc.connect(g); g.connect(master); osc.start(); oscs.push(osc);
        });

        // Binaural theta beating at ~7 Hz across two harmonic pairs
        [[432, 439], [648, 655]].forEach(([f1, f2], i) => {
            [f1, f2].forEach(f => {
                const osc = ctx.createOscillator(); const g = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = f; g.gain.value = [0.022, 0.014][i];
                osc.connect(g); g.connect(master); osc.start(); oscs.push(osc);
            });
        });

        // Very slow amplitude breath (20s cycle)
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 0.050; lfoG.gain.value = 0.06;
        lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start(); oscs.push(lfo);

        this._modeGain = master; this._modeOscs = oscs; this._modeNodes = [lfoG];
    }

    // ── Mycelium — underground root pulse: sub bass + earth texture ─────────
    _startMycelium() {
        const ctx    = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.38, ctx.currentTime, 2.0);
        const oscs = [];

        // Sub bass root drones
        [40, 60, 120].forEach((f, i) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = f; g.gain.value = [0.065, 0.045, 0.025][i];
            osc.connect(g); g.connect(master); osc.start(); oscs.push(osc);
        });

        // Organic slow pulse (22s cycle)
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 0.045; lfoG.gain.value = 0.08;
        lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start(); oscs.push(lfo);

        // Brown noise — earth texture
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, sr * 4, sr); const dat = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < dat.length; i++) {
            last = (last + 0.018 * (Math.random() * 2 - 1)) / 1.018; dat[i] = last * 12;
        }
        const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
        const nlpf  = ctx.createBiquadFilter(); nlpf.type = 'lowpass'; nlpf.frequency.value = 180; nlpf.Q.value = 0.3;
        const nGain = ctx.createGain(); nGain.gain.value = 0.10;
        noise.connect(nlpf); nlpf.connect(nGain); nGain.connect(master); noise.start(); oscs.push(noise);

        this._modeGain = master; this._modeOscs = oscs; this._modeNodes = [lfoG, nlpf, nGain];
    }

    // ── Cymatics — pure harmonic series: physics made audible ───────────────
    _startCymatics() {
        const ctx    = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.40, ctx.currentTime, 1.8);
        const oscs = [];

        // Room resonance delay
        const delay  = ctx.createDelay(1.5); delay.delayTime.value = 0.38;
        const fbGain = ctx.createGain(); fbGain.gain.value = 0.16;
        delay.connect(fbGain); fbGain.connect(delay);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0.12;
        delay.connect(wetGain); wetGain.connect(master);

        const harmonics = [160, 320, 480, 640, 800, 960];
        const amps      = [0.068, 0.042, 0.028, 0.018, 0.011, 0.006];
        harmonics.forEach((f, i) => {
            [-0.0015, +0.0015].forEach(d => {
                const osc = ctx.createOscillator(); const g = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = f * (1 + d); g.gain.value = amps[i];
                osc.connect(g); g.connect(master); g.connect(delay);
                osc.start(); oscs.push(osc);
            });
        });

        this._modeGain = master; this._modeOscs = oscs; this._modeNodes = [delay, fbGain, wetGain];
    }

    // ── Tide — deep ocean: sub drones + brown noise swell ───────────────────
    _startTide() {
        const ctx    = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.42, ctx.currentTime, 2.5);
        const oscs = [];

        // Deep sub ocean drones
        [28, 40, 55].forEach((f, i) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = f; g.gain.value = [0.055, 0.045, 0.030][i];
            osc.connect(g); g.connect(master); osc.start(); oscs.push(osc);
        });

        // Oceanic brown noise
        const sr  = ctx.sampleRate;
        const buf = ctx.createBuffer(1, sr * 8, sr); const dat = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < dat.length; i++) {
            last = (last + 0.020 * (Math.random() * 2 - 1)) / 1.020; dat[i] = last * 12;
        }
        const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
        const nlpf  = ctx.createBiquadFilter(); nlpf.type = 'lowpass'; nlpf.frequency.value = 320; nlpf.Q.value = 0.4;
        const nGain = ctx.createGain(); nGain.gain.value = 0.22;
        noise.connect(nlpf); nlpf.connect(nGain); nGain.connect(master); noise.start(); oscs.push(noise);

        // Tidal amplitude swell — 6s cycle
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 0.165; lfoG.gain.value = 0.09;
        lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start(); oscs.push(lfo);

        this._modeGain = master; this._modeOscs = oscs; this._modeNodes = [nlpf, nGain, lfoG];
    }

    // ── Recursion — infinite corridor: fifth-stack drone, inward pull ────────
    _startRecursion() {
        const ctx    = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.36, ctx.currentTime, 2.0);
        const oscs = [];

        // Pure fifth stack — 55 / 82.5 / 110 / 165 / 220 Hz
        [55, 82.5, 110, 165, 220].forEach((f, i) => {
            [-0.002, +0.002].forEach(d => {
                const osc = ctx.createOscillator(); const g = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = f * (1 + d);
                g.gain.value = [0.062, 0.040, 0.028, 0.016, 0.009][i];
                osc.connect(g); g.connect(master); osc.start(); oscs.push(osc);
            });
        });

        // Slow receding breath (36s cycle)
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 0.028; lfoG.gain.value = 0.05;
        lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start(); oscs.push(lfo);

        this._modeGain = master; this._modeOscs = oscs; this._modeNodes = [lfoG];
    }

    // ── Void — emptiness: ultra quiet pure tones at perception threshold ─────
    _startVoid() {
        const ctx    = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.14, ctx.currentTime, 3.0);
        const oscs = [];

        [55, 110, 220, 528].forEach((f, i) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = f;
            g.gain.value = [0.055, 0.035, 0.018, 0.008][i];
            osc.connect(g); g.connect(master); osc.start(); oscs.push(osc);
        });

        this._modeGain = master; this._modeOscs = oscs; this._modeNodes = [];
    }

    // ── Forest ambient — wind, rustling leaves, deep hum ─────────────────────
    _startForestAmbient() {
        const ctx    = this.audioCtx;
        const master = ctx.createGain(); master.gain.value = 0;
        master.connect(ctx.destination);
        master.gain.setTargetAtTime(0.44, ctx.currentTime, 2.0);
        const sr = ctx.sampleRate; const oscs = [];

        // Wind — brown noise LPF
        const wBuf = ctx.createBuffer(1, sr * 6, sr); const wDat = wBuf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < wDat.length; i++) {
            last = (last + 0.018 * (Math.random() * 2 - 1)) / 1.018; wDat[i] = last * 12;
        }
        const wSrc  = ctx.createBufferSource(); wSrc.buffer = wBuf; wSrc.loop = true;
        const wLpf  = ctx.createBiquadFilter(); wLpf.type = 'lowpass'; wLpf.frequency.value = 450; wLpf.Q.value = 0.4;
        const wGain = ctx.createGain(); wGain.gain.value = 0.26;
        wSrc.connect(wLpf); wLpf.connect(wGain); wGain.connect(master); wSrc.start(); oscs.push(wSrc);

        // Rustling leaves — white noise BPF ~2500Hz
        const lBuf = ctx.createBuffer(1, sr * 4, sr); const lDat = lBuf.getChannelData(0);
        for (let i = 0; i < lDat.length; i++) lDat[i] = Math.random() * 2 - 1;
        const lSrc  = ctx.createBufferSource(); lSrc.buffer = lBuf; lSrc.loop = true;
        const lBpf  = ctx.createBiquadFilter(); lBpf.type = 'bandpass'; lBpf.frequency.value = 2400; lBpf.Q.value = 0.8;
        const lGain = ctx.createGain(); lGain.gain.value = 0.10;
        lSrc.connect(lBpf); lBpf.connect(lGain); lGain.connect(master); lSrc.start(); oscs.push(lSrc);

        // Slow wind amplitude modulation (12s cycle)
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 0.083; lfoG.gain.value = 0.08;
        lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start(); oscs.push(lfo);

        // Deep forest hum
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = 55; g.gain.value = 0.035;
        osc.connect(g); g.connect(master); osc.start(); oscs.push(osc);

        this._modeGain = master; this._modeOscs = oscs; this._modeNodes = [wLpf, wGain, lBpf, lGain, lfoG];
    }

    // ── Generic pad (used by water/cosmos/watercolor/aurora/quotes) ──────────
    _startPad(notes, filterHz, masterGain, lfoAmp, lfoFreq) {
        const ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterHz; filter.Q.value = 0.5;

        const delay  = ctx.createDelay(2);
        delay.delayTime.value = 0.55;
        const fbGain = ctx.createGain(); fbGain.gain.value = 0.14;
        delay.connect(fbGain); fbGain.connect(delay);
        const wetGain = ctx.createGain(); wetGain.gain.value = 0.13;
        delay.connect(wetGain);

        const mGain = ctx.createGain(); mGain.gain.value = 0;
        filter.connect(mGain); wetGain.connect(mGain);
        mGain.connect(ctx.destination);
        mGain.gain.setTargetAtTime(masterGain, ctx.currentTime, 2.0);

        const oscs = [];
        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = n.type || 'sine';
            osc.frequency.value = n.f * (1 + (Math.random() - 0.5) * 0.003);
            g.gain.value = n.amp;
            osc.connect(g); g.connect(filter); g.connect(delay);
            osc.start(); oscs.push(osc);
        });

        const lfo  = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = lfoFreq;
        lfoG.gain.value     = filterHz * lfoAmp;
        lfo.connect(lfoG); lfoG.connect(filter.frequency);
        lfo.start(); oscs.push(lfo);

        this._modeGain  = mGain;
        this._modeOscs  = oscs;
        this._modeNodes = [filter, delay, fbGain, wetGain, lfoG];
    }

    _stopModeNodes() {
        if (this._modeGain && this.audioCtx) {
            const t = this.audioCtx.currentTime;
            this._modeGain.gain.cancelScheduledValues(t);
            this._modeGain.gain.setTargetAtTime(0, t, 0.6);
        }
        const oscs = this._modeOscs;
        if (oscs && oscs.length) {
            setTimeout(() => {
                oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch(e){} });
            }, 2500);
        }
        // Clear all scheduled timeouts/intervals
        this._modeIntervals.forEach(id => { clearInterval(id); clearTimeout(id); });
        this._modeIntervals = [];

        this._modeGain  = null;
        this._modeOscs  = [];
        this._modeNodes = [];
    }

    // ── Pentatonic fold tone (blink/click feedback) — very quiet ────────────
    playFoldTone(layerIndex) {
        if (!this.audioCtx || !this.audioInitialized) return;
        const ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        const freqs = [220, 261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 659.3, 784.0];
        const freq  = freqs[layerIndex % freqs.length];

        [-0.002, +0.002].forEach(d => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq * (1 + d);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.016, now + 0.06); // much quieter
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(now); osc.stop(now + 1.5);
        });
    }

    // ── Blink tone — mode-specific feedback on every blink ───────────────────
    playBlinkTone(mode) {
        if (!this.audioCtx || !this.audioInitialized) return;
        if (!mode) return; // mandala modes handled separately by playFoldTone
        const ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;

        switch (mode) {
            case 'gaze': {
                // Ethereal upward shimmer gliss
                [1320, 1760].forEach((f, i) => {
                    const osc = ctx.createOscillator(); const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(f, now);
                    osc.frequency.linearRampToValueAtTime(f * 1.20, now + 0.9);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.016 - i * 0.003, now + 0.04);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.start(now); osc.stop(now + 2.0);
                });
                break;
            }
            case 'void': {
                // Distant bell — pure, long, barely there
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = 432;
                gain.gain.setValueAtTime(0.022, now + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now); osc.stop(now + 4.2);
                break;
            }
            case 'recursion': {
                // Deep bass pulse — corridor heartbeat
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(80, now);
                osc.frequency.exponentialRampToValueAtTime(38, now + 0.38);
                gain.gain.setValueAtTime(0.14, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.65);
                break;
            }
            case 'mycelium': {
                // Organic click — noise burst BPF ~420Hz
                const sr  = ctx.sampleRate;
                const buf = ctx.createBuffer(1, Math.floor(sr * 0.08), sr);
                const d   = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
                const src = ctx.createBufferSource(); const bpf = ctx.createBiquadFilter(); const gain = ctx.createGain();
                src.buffer = buf;
                bpf.type = 'bandpass'; bpf.frequency.value = 420; bpf.Q.value = 1.5;
                gain.gain.value = 0.28;
                src.connect(bpf); bpf.connect(gain); gain.connect(ctx.destination);
                src.start(now);
                break;
            }
            case 'cymatics': {
                // Crystal bowl — 528Hz transformation frequency
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = 528;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.034, now + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now); osc.stop(now + 2.7);
                break;
            }
            case 'tide': {
                // Water drop — pluck with pitch fall
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(340, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.55);
                gain.gain.setValueAtTime(0.028, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now); osc.stop(now + 1.2);
                break;
            }
            case 'nature': {
                // Wind chime — random pentatonic high tone
                const freqs = [784, 1047, 1175, 1319, 1568];
                const f = freqs[Math.floor(Math.random() * freqs.length)];
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = f;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.022, now + 0.008);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now); osc.stop(now + 2.0);
                break;
            }
            case 'embers': {
                // Warm crackle — short low noise burst
                const sr  = ctx.sampleRate;
                const buf = ctx.createBuffer(1, Math.floor(sr * 0.14), sr);
                const d   = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - (i / d.length) * 3.5);
                const src = ctx.createBufferSource(); const lpf = ctx.createBiquadFilter(); const gain = ctx.createGain();
                src.buffer = buf;
                lpf.type = 'lowpass'; lpf.frequency.value = 380;
                gain.gain.value = 0.32;
                src.connect(lpf); lpf.connect(gain); gain.connect(ctx.destination);
                src.start(now);
                break;
            }
            case 'mirror': {
                // Glass harmonic — sharp high sine
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = 1047;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.020, now + 0.018);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now); osc.stop(now + 1.1);
                break;
            }
            case 'flow': {
                // Soft breath — shaped noise burst
                const sr  = ctx.sampleRate;
                const buf = ctx.createBuffer(1, Math.floor(sr * 0.30), sr);
                const d   = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
                const src = ctx.createBufferSource(); const bpf = ctx.createBiquadFilter(); const gain = ctx.createGain();
                src.buffer = buf;
                bpf.type = 'bandpass'; bpf.frequency.value = 600; bpf.Q.value = 0.8;
                gain.gain.value = 0.22;
                src.connect(bpf); bpf.connect(gain); gain.connect(ctx.destination);
                src.start(now);
                break;
            }
            default: {
                // Generic soft bell
                const osc = ctx.createOscillator(); const gain = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = 440;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.014, now + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now); osc.stop(now + 1.2);
            }
        }
    }

    playClick() {} // no-op
}
