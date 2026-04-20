// ZenAudio — nature-based ambient soundscape for zentangle
// Pure Web Audio API synthesis. No audio files required.
//
// Primary layer: synthesised rain (filtered white noise)
// Secondary layer: scene-specific nature accents (wind, birds, water texture)
// Accent layer: very soft, barely-there tonal drone at low volume
//
// All oscillator drones kept at ≤0.15 gain — presence felt, not heard.
// Rain is primary. Scene changes shift rain intensity + nature character.

class ZenAudio {
    constructor() {
        this._ac      = null;
        this._master  = null;
        this._ready   = false;
        this._voices  = [];
        this._rain    = null;   // rain noise node
        this._wind    = null;   // wind noise node
        this._birdRaf = null;   // bird chirp timer
        this._curKey  = null;
    }

    async init() {
        try {
            this._ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
            if (this._ac.state === 'suspended') await this._ac.resume();
        } catch(e) { console.warn('ZenAudio: Web Audio unavailable', e); return; }

        const ac  = this._ac;
        const now = ac.currentTime;

        this._master = ac.createGain();
        this._master.gain.setValueAtTime(0, now);
        this._master.gain.linearRampToValueAtTime(0.85, now + 2.5);
        this._master.connect(ac.destination);

        // Shared reverb for depth
        this._reverb = this._buildReverb(3.5);
        this._reverb.connect(this._master);

        this._startRain();
        this._startWind();
        this._ready = true;
    }

    // ── Noise buffer (reused for rain and wind) ────────────────────────
    _noiseBuffer(seconds) {
        const ac  = this._ac;
        const len = Math.floor(ac.sampleRate * seconds);
        const buf = ac.createBuffer(2, len, ac.sampleRate);
        for (let c = 0; c < 2; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        return buf;
    }

    // ── Convolution reverb ─────────────────────────────────────────────
    _buildReverb(dur) {
        const ac  = this._ac;
        const len = Math.floor(ac.sampleRate * dur);
        const buf = ac.createBuffer(2, len, ac.sampleRate);
        for (let c = 0; c < 2; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
        }
        const conv = ac.createConvolver();
        conv.buffer = buf;
        return conv;
    }

    // ── Rain — primary ambient layer ───────────────────────────────────
    _startRain() {
        const ac = this._ac;

        // Two noise streams: fine mist (high freq) + heavier drops (mid freq)
        const makeBand = (loFreq, hiFreq, gain) => {
            const src = ac.createBufferSource();
            src.buffer = this._noiseBuffer(3);
            src.loop   = true;

            const hp = ac.createBiquadFilter(); hp.type = 'highpass';  hp.frequency.value = loFreq;
            const lp = ac.createBiquadFilter(); lp.type = 'lowpass';   lp.frequency.value = hiFreq;
            const g  = ac.createGain();         g.gain.value = gain;

            src.connect(hp); hp.connect(lp); lp.connect(g);
            g.connect(this._master);

            // Very slow volume LFO — rain varies naturally
            const lfo  = ac.createOscillator();
            const lfoG = ac.createGain();
            lfo.frequency.value = 0.05 + Math.random() * 0.03;
            lfoG.gain.value     = gain * 0.18;
            lfo.connect(lfoG); lfoG.connect(g.gain);
            lfo.start(); src.start();

            return { src, g, lfo };
        };

        this._rainMist  = makeBand(2500, 12000, 0.18);  // fine spray — high freq hiss
        this._rainDrop  = makeBand(400,  3500,  0.14);  // heavier drops — mid texture
        this._rainLow   = makeBand(80,   400,   0.06);  // distant rumble
    }

    // ── Wind — very subtle, barely perceptible ─────────────────────────
    _startWind() {
        const ac  = this._ac;
        const src = ac.createBufferSource();
        src.buffer = this._noiseBuffer(5);
        src.loop   = true;

        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
        const g  = ac.createGain();         g.gain.value = 0;   // starts silent, scene sets it

        src.connect(lp); lp.connect(g); g.connect(this._master);
        src.start();
        this._wind = { src, g };
    }

    // ── Bird chirp — synthesised, occasional ──────────────────────────
    _chirp() {
        if (!this._ready) return;
        const ac  = this._ac;
        const now = ac.currentTime;

        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sine';

        // Random bird pitch 1800–4200 Hz with slight glide up then down
        const f0 = 1800 + Math.random() * 2400;
        osc.frequency.setValueAtTime(f0, now);
        osc.frequency.linearRampToValueAtTime(f0 * 1.18, now + 0.06);
        osc.frequency.linearRampToValueAtTime(f0 * 0.92, now + 0.14);

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.055, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(g); g.connect(this._reverb);
        osc.start(now); osc.stop(now + 0.2);

        // Sometimes a double-chirp
        if (Math.random() < 0.4) {
            const osc2 = ac.createOscillator();
            const g2   = ac.createGain();
            osc2.type  = 'sine';
            osc2.frequency.setValueAtTime(f0 * 1.1, now + 0.22);
            osc2.frequency.linearRampToValueAtTime(f0 * 1.25, now + 0.30);
            g2.gain.setValueAtTime(0, now + 0.22);
            g2.gain.linearRampToValueAtTime(0.04, now + 0.24);
            g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
            osc2.connect(g2); g2.connect(this._reverb);
            osc2.start(now + 0.22); osc2.stop(now + 0.38);
        }
    }

    _scheduleBirds(intervalMs) {
        clearTimeout(this._birdTimer);
        const jitter = (Math.random() - 0.5) * intervalMs * 0.6;
        this._birdTimer = setTimeout(() => {
            this._chirp();
            this._scheduleBirds(intervalMs);
        }, intervalMs + jitter);
    }

    _stopBirds() {
        clearTimeout(this._birdTimer);
    }

    // ── Soft scene-tone (barely audible, just presence) ───────────────
    _voice(freq, gain, lfoHz) {
        const ac  = this._ac;
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        const lfo = ac.createOscillator();
        const lfoG= ac.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.value = 0;
        g.gain.linearRampToValueAtTime(gain, now + 3);

        lfo.frequency.value = lfoHz;
        lfoG.gain.value = gain * 0.25;
        lfo.connect(lfoG); lfoG.connect(g.gain);

        osc.connect(g); g.connect(this._reverb);
        osc.start(now); lfo.start(now);
        return { osc, lfo, g };
    }

    // ── Scene profiles — nature character + accent tone ────────────────
    _profile(key) {
        // windGain: how much wind. birdInterval: ms between chirps (0 = no birds)
        // voices: very soft tonal accent [{freq, gain, lfoHz}]
        const P = {
            mandala:      { wind:0.02, birds:18000, vol:0.80, voices:[{ freq:432, gain:0.06, lfoHz:0.04 }] },
            breath:       { wind:0.03, birds:22000, vol:0.75, voices:[{ freq:174, gain:0.07, lfoHz:0.07 }] },
            embers:       { wind:0.06, birds:0,     vol:0.65, voices:[{ freq:220, gain:0.05, lfoHz:0.12 }] },
            mycelium:     { wind:0.01, birds:25000, vol:0.80, voices:[{ freq:110, gain:0.06, lfoHz:0.03 }] },
            golden:       { wind:0.02, birds:20000, vol:0.75, voices:[{ freq:220, gain:0.05, lfoHz:0.06 }] },
            tide:         { wind:0.05, birds:0,     vol:0.85, voices:[{ freq:110, gain:0.08, lfoHz:0.04 }] },
            aurora:       { wind:0.08, birds:0,     vol:0.70, voices:[{ freq:220, gain:0.04, lfoHz:0.05 }] },
            nebula:       { wind:0.04, birds:0,     vol:0.65, voices:[{ freq:55,  gain:0.07, lfoHz:0.02 }] },
            julia:        { wind:0.02, birds:0,     vol:0.70, voices:[{ freq:440, gain:0.04, lfoHz:0.05 }] },
            psychedelic:  { wind:0.03, birds:0,     vol:0.70, voices:[{ freq:360, gain:0.04, lfoHz:0.08 }] },
            humans:       { wind:0.02, birds:14000, vol:0.80, voices:[{ freq:261, gain:0.05, lfoHz:0.06 }] },
            void:         { wind:0.01, birds:0,     vol:0.50, voices:[{ freq:432, gain:0.03, lfoHz:0.02 }] },
            abyss:        { wind:0.02, birds:0,     vol:0.55, voices:[{ freq:41,  gain:0.06, lfoHz:0.02 }] },
            breathring:   { wind:0.03, birds:19000, vol:0.80, voices:[{ freq:174, gain:0.06, lfoHz:0.07 }] },
            presence:     { wind:0.02, birds:16000, vol:0.80, voices:[{ freq:528, gain:0.05, lfoHz:0.05 }] },
            mirrorgaze:   { wind:0.02, birds:20000, vol:0.75, voices:[{ freq:396, gain:0.05, lfoHz:0.04 }] },
            tidepool:     { wind:0.03, birds:12000, vol:0.85, voices:[{ freq:174, gain:0.06, lfoHz:0.05 }] },
            coral:        { wind:0.02, birds:15000, vol:0.85, voices:[{ freq:220, gain:0.05, lfoHz:0.04 }] },
            smoke:        { wind:0.07, birds:0,     vol:0.65, voices:[{ freq:174, gain:0.04, lfoHz:0.03 }] },
            mitotic:      { wind:0.02, birds:18000, vol:0.75, voices:[{ freq:261, gain:0.05, lfoHz:0.06 }] },
            bioluminescent:{ wind:0.02,birds:20000, vol:0.80, voices:[{ freq:174, gain:0.05, lfoHz:0.04 }] },
            murmuration:  { wind:0.06, birds:8000,  vol:0.80, voices:[{ freq:220, gain:0.04, lfoHz:0.08 }] },
            sandmandala:  { wind:0.02, birds:22000, vol:0.75, voices:[{ freq:432, gain:0.05, lfoHz:0.03 }] },
            geode:        { wind:0.01, birds:0,     vol:0.65, voices:[{ freq:110, gain:0.06, lfoHz:0.02 }] },
            lichtenberg:  { wind:0.04, birds:0,     vol:0.65, voices:[{ freq:220, gain:0.04, lfoHz:0.10 }] },
            rainripple:   { wind:0.04, birds:16000, vol:0.90, voices:[{ freq:174, gain:0.06, lfoHz:0.05 }] },
            spectrum:     { wind:0.01, birds:0,     vol:0.55, voices:[{ freq:174, gain:0.04, lfoHz:0.04 }] },
            voronoi:      { wind:0.02, birds:18000, vol:0.75, voices:[{ freq:261, gain:0.05, lfoHz:0.05 }] },
            interference: { wind:0.01, birds:0,     vol:0.65, voices:[{ freq:528, gain:0.04, lfoHz:0.03 }] },
            epicycle:     { wind:0.02, birds:0,     vol:0.70, voices:[{ freq:220, gain:0.05, lfoHz:0.06 }] },
            ridgeline:    { wind:0.05, birds:0,     vol:0.75, voices:[{ freq:110, gain:0.06, lfoHz:0.04 }] },
        };
        // Default: light rain, occasional birds, gentle tone
        return P[key] || { wind:0.03, birds:20000, vol:0.78, voices:[{ freq:220, gain:0.05, lfoHz:0.05 }] };
    }

    // ── Start scene ────────────────────────────────────────────────────
    startScene(key) {
        if (!this._ready) return;
        this._curKey = key;
        const p   = this._profile(key);
        const ac  = this._ac;
        const now = ac.currentTime;

        // Master volume crossfade
        this._master.gain.setTargetAtTime(p.vol, now, 1.2);

        // Wind level
        if (this._wind) {
            this._wind.g.gain.setTargetAtTime(p.wind, now, 2.0);
        }

        // Birds
        this._stopBirds();
        if (p.birds > 0) this._scheduleBirds(p.birds);

        // Clear old voices
        for (const v of this._voices) {
            v.g.gain.setTargetAtTime(0, now, 0.8);
            setTimeout(() => { try { v.osc.stop(); v.lfo.stop(); } catch(e) {} }, 2500);
        }
        this._voices = [];

        // New scene voices (very soft)
        for (const vp of p.voices) {
            this._voices.push(this._voice(vp.freq, vp.gain, vp.lfoHz));
        }
    }

    // ── Blink — soft water-drop bell ──────────────────────────────────
    onBlink() {
        if (!this._ready) return;
        const ac  = this._ac;
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.4);
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
        osc.connect(g); g.connect(this._reverb);
        osc.start(now); osc.stop(now + 1.1);
    }

    end() {
        if (!this._ac) return;
        this._stopBirds();
        const now = this._ac.currentTime;
        this._master.gain.setTargetAtTime(0, now, 1.5);
        setTimeout(() => { try { this._ac.close(); } catch(e) {} }, 5000);
    }
}
