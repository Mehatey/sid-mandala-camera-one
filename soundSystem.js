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
    }

    init() {} // no-op (warp audio removed)

    initializeAudio() {
        if (this.audioInitialized) return;
        this.audioInitialized = true;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // ── Stubs kept for call-site compatibility ───────────────────────────────
    startMeditationPad() {}
    stopMeditationPad()  {}

    // ── Warp / liquify — visual only, no audio ───────────────────────────────
    updateLiquifyState(isLiquifying) {
        this.isLiquifying = isLiquifying; // kept so callers don't throw
    }

    // ── Mode ambient switching ───────────────────────────────────────────────
    startModeAmbient(mode) {
        if (!this.audioInitialized || !this.audioCtx) return;
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
        master.gain.setTargetAtTime(0.16, ctx.currentTime, 3.0);

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
        master.gain.setTargetAtTime(0.14, ctx.currentTime, 2.5);
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
        master.gain.setTargetAtTime(0.18, ctx.currentTime, 2.0);

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
        master.gain.setTargetAtTime(0.22, ctx.currentTime, 1.8);

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
        master.gain.setTargetAtTime(0.17, ctx.currentTime, 2.5);

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
        master.gain.setTargetAtTime(0.11, ctx.currentTime, 2.2);

        lfo.connect(lfoG); lfoG.connect(master.gain); // amplitude swell only
        lfo.start();

        src.connect(hpf); hpf.connect(lpf); lpf.connect(lpf2); lpf2.connect(master);
        src.start();

        this._modeGain  = master;
        this._modeOscs  = [src, lfo];
        this._modeNodes = [hpf, lpf, lpf2, lfoG];
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

    playClick() {} // no-op
}
