// ZenAudio — procedural ambient soundscape for zentangle
// Pure Web Audio API. Zero audio files. Works offline.
//
// Design:
//   Each scene has 2-4 oscillators tuned to harmonically meaningful frequencies.
//   A gain LFO on each voice creates gentle tremolo whose rate is chosen to
//   match the visual pace of the scene (slow visual = slow LFO).
//   A shared convolution reverb gives acoustic depth.
//   Dry/wet mix and master gain crossfade between scenes over ~3s.
//
// Visual-audio sync notes:
//   breath     — LFO at 0.067 Hz = 4 breaths/min, matches BreathMode's ring animation
//   golden     — frequencies tuned to golden ratio: f × φ^n (φ = 1.618)
//   psychedelic— 360Hz + 365.4Hz pair creates 5.4Hz binaural beating (theta wave)
//   nebula     — sub-bass (55Hz, felt not heard), matches the cosmic visual scale
//   julia      — pure sine harmonics (440:660:1320 = 1:1.5:3), clean like the fractal
//   void       — single 432Hz tone at very low volume; presence not sound
//   abyss      — 41Hz & 62Hz, barely audible, pressure-like, matches dark visual
//
// Blink: bell overtone at 4× current root frequency — immediate attack, 1.6s decay

class ZenAudio {
    constructor() {
        this._ac       = null;
        this._master   = null;
        this._reverb   = null;
        this._dry      = null;
        this._wet      = null;
        this._sub      = null;   // unused — kept for reference
        this._voices   = [];
        this._ready    = false;
    }

    // ── Initialise (call once on user gesture) ─────────────────────
    async init() {
        try {
            this._ac = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'playback',
            });
            if (this._ac.state === 'suspended') await this._ac.resume();
        } catch (e) {
            console.warn('ZenAudio: Web Audio not available', e);
            return;
        }

        const ac  = this._ac;
        const now = ac.currentTime;

        // ── Signal chain ───────────────────────────────────────────
        // voices ──┬─→ dry gain ──┐
        //          └─→ reverb ──→ wet gain ──┘─→ compressor ──→ output

        this._master = ac.createGain();
        this._master.gain.value = 0;

        this._dry    = ac.createGain();
        this._wet    = ac.createGain();
        this._reverb = this._buildReverb(4.2);

        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value       =  8;
        comp.ratio.value      =  5;
        comp.attack.value     =  0.05;
        comp.release.value    =  0.30;

        this._master.connect(this._dry);
        this._master.connect(this._reverb);
        this._reverb.connect(this._wet);
        this._dry.connect(comp);
        this._wet.connect(comp);
        comp.connect(ac.destination);

        // Fade master in smoothly
        this._master.gain.setTargetAtTime(0.70, now, 0.1);

        // No persistent sub — each scene profile owns its full sound character
        this._ready = true;
    }

    // ── Synthetic convolution reverb ───────────────────────────────
    // White noise with exponential decay envelope — gives natural room
    _buildReverb(duration) {
        const ac  = this._ac;
        const len = Math.floor(ac.sampleRate * duration);
        const buf = ac.createBuffer(2, len, ac.sampleRate);
        for (let c = 0; c < 2; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < len; i++) {
                const t = i / len;
                // Slight early-reflection bump then exponential tail
                const env = Math.pow(1 - t, 1.85) * (1 + 0.25 * Math.exp(-t * 6));
                d[i] = (Math.random() * 2 - 1) * env * (c === 0 ? 1.0 : 0.92);  // mild stereo spread
            }
        }
        const conv = ac.createConvolver();
        conv.buffer = buf;
        return conv;
    }

    // ── Create one oscillator voice with gain-LFO tremolo ──────────
    // Returns { osc, lfo, g } — g is the GainNode connected to master
    _voice({ freq, type, gain, lfoHz, lfoDepth }) {
        const ac  = this._ac;
        const now = ac.currentTime;

        const osc  = ac.createOscillator();
        const g    = ac.createGain();
        const lfo  = ac.createOscillator();
        const lfoG = ac.createGain();

        osc.type = type || 'sine';
        osc.frequency.value = freq;

        // Depth clamped so gain never goes negative
        const d     = gain * Math.min(0.32, lfoDepth);
        g.gain.value = gain - d;

        lfo.type = 'sine';
        lfo.frequency.value = lfoHz;
        lfoG.gain.value = d;

        lfo.connect(lfoG);
        lfoG.connect(g.gain);   // LFO modulates gain
        osc.connect(g);
        g.connect(this._master);

        osc.start(now);
        lfo.start(now);

        return { osc, lfo, g };
    }

    // ── Scene audio profiles ───────────────────────────────────────
    // Frequencies, textures, and LFO rates chosen to match each scene
    _profile(key) {
        const P = {

            // ── Original mandalas — sacred bowl tones, 432 Hz root ──
            mandala: {
                voices: [
                    { freq: 432,    type:'sine', gain:0.40, lfoHz:0.038, lfoDepth:0.22 },
                    { freq: 648,    type:'sine', gain:0.24, lfoHz:0.055, lfoDepth:0.16 },  // 3:2 fifth
                    { freq: 864,    type:'sine', gain:0.13, lfoHz:0.070, lfoDepth:0.11 },  // octave
                ],
                dry:0.50, wet:0.50, vol:0.62,
            },

            // ── Breath — LFO at 0.067 Hz = 4 breaths/min ────────────
            breath: {
                voices: [
                    { freq: 174.6,  type:'sine', gain:0.46, lfoHz:0.067, lfoDepth:0.30 },
                    { freq: 261.6,  type:'sine', gain:0.26, lfoHz:0.067, lfoDepth:0.22 },
                    { freq: 349.2,  type:'sine', gain:0.13, lfoHz:0.067, lfoDepth:0.15 },
                ],
                dry:0.44, wet:0.56, vol:0.55,
            },

            // ── Embers — triangle wave warmth, faster pulse ──────────
            embers: {
                voices: [
                    { freq: 220,    type:'triangle', gain:0.34, lfoHz:0.12, lfoDepth:0.24 },
                    { freq: 330,    type:'sine',     gain:0.22, lfoHz:0.09, lfoDepth:0.18 },
                    { freq: 660,    type:'sine',     gain:0.11, lfoHz:0.14, lfoDepth:0.12 },
                ],
                dry:0.46, wet:0.54, vol:0.52,
            },

            // ── Mycelium — underground, very slow ───────────────────
            mycelium: {
                voices: [
                    { freq: 110,    type:'sine', gain:0.44, lfoHz:0.028, lfoDepth:0.20 },
                    { freq: 165,    type:'sine', gain:0.27, lfoHz:0.038, lfoDepth:0.15 },
                    { freq: 220,    type:'sine', gain:0.15, lfoHz:0.052, lfoDepth:0.11 },
                ],
                dry:0.46, wet:0.54, vol:0.56,
            },

            // ── Golden — frequencies in φ proportion (220, ×φ, ×φ²) ─
            golden: {
                voices: [
                    { freq: 220.0,  type:'sine', gain:0.38, lfoHz:0.062, lfoDepth:0.18 },
                    { freq: 355.9,  type:'sine', gain:0.25, lfoHz:0.078, lfoDepth:0.14 },  // ×1.618
                    { freq: 575.9,  type:'sine', gain:0.14, lfoHz:0.100, lfoDepth:0.10 },  // ×2.618
                ],
                dry:0.44, wet:0.56, vol:0.58,
            },

            // ── Tide — ocean LFO rates, overlapping waves ────────────
            tide: {
                voices: [
                    { freq: 110,    type:'sine', gain:0.45, lfoHz:0.042, lfoDepth:0.28 },
                    { freq: 146.8,  type:'sine', gain:0.27, lfoHz:0.035, lfoDepth:0.22 },
                    { freq: 220,    type:'sine', gain:0.14, lfoHz:0.058, lfoDepth:0.16 },
                ],
                dry:0.40, wet:0.60, vol:0.55,
            },

            // ── Aurora — high crystalline harmonics ──────────────────
            aurora: {
                voices: [
                    { freq: 523.2,  type:'sine', gain:0.27, lfoHz:0.115, lfoDepth:0.19 },
                    { freq: 783.9,  type:'sine', gain:0.19, lfoHz:0.085, lfoDepth:0.15 },
                    { freq: 1046.5, type:'sine', gain:0.11, lfoHz:0.062, lfoDepth:0.11 },
                ],
                dry:0.36, wet:0.64, vol:0.44,
            },

            // ── Nebula — sub-bass felt not heard, vast reverb ────────
            nebula: {
                voices: [
                    { freq: 55,     type:'sine', gain:0.44, lfoHz:0.015, lfoDepth:0.15 },
                    { freq: 82.5,   type:'sine', gain:0.26, lfoHz:0.022, lfoDepth:0.11 },
                    { freq: 110,    type:'sine', gain:0.15, lfoHz:0.032, lfoDepth:0.09 },
                ],
                dry:0.28, wet:0.72, vol:0.65,
            },

            // ── Julia — pure harmonics 1:1.5:3, mathematical clarity ─
            julia: {
                voices: [
                    { freq: 440,    type:'sine', gain:0.36, lfoHz:0.058, lfoDepth:0.14 },
                    { freq: 660,    type:'sine', gain:0.22, lfoHz:0.076, lfoDepth:0.11 },
                    { freq: 1320,   type:'sine', gain:0.11, lfoHz:0.095, lfoDepth:0.08 },
                ],
                dry:0.48, wet:0.52, vol:0.52,
            },

            // ── Psychedelic — 360+365.4 Hz pair = 5.4 Hz binaural beat
            //    (theta range 4-8 Hz, associated with deep relaxation)
            psychedelic: {
                voices: [
                    { freq: 360,    type:'sine', gain:0.30, lfoHz:0.048, lfoDepth:0.19 },
                    { freq: 365.4,  type:'sine', gain:0.28, lfoHz:0.062, lfoDepth:0.17 },
                    { freq: 540,    type:'sine', gain:0.17, lfoHz:0.118, lfoDepth:0.13 },
                    { freq: 720,    type:'sine', gain:0.09, lfoHz:0.155, lfoDepth:0.09 },
                ],
                dry:0.40, wet:0.60, vol:0.56,
            },

            // ── Humans — C major, human-scale, heartbeat register ────
            humans: {
                voices: [
                    { freq: 261.6,  type:'sine', gain:0.38, lfoHz:0.082, lfoDepth:0.21 },
                    { freq: 392.0,  type:'sine', gain:0.24, lfoHz:0.068, lfoDepth:0.16 },
                    { freq: 523.2,  type:'sine', gain:0.13, lfoHz:0.055, lfoDepth:0.11 },
                ],
                dry:0.44, wet:0.56, vol:0.57,
            },

            // ── Void — single tone, near silence, just presence ──────
            void: {
                voices: [
                    { freq: 432,    type:'sine', gain:0.24, lfoHz:0.020, lfoDepth:0.10 },
                ],
                dry:0.22, wet:0.78, vol:0.36,
            },

            // ── Abyss — sub-bass only, barely audible, pressure ──────
            abyss: {
                voices: [
                    { freq: 41.2,   type:'sine', gain:0.46, lfoHz:0.018, lfoDepth:0.13 },
                    { freq: 61.7,   type:'sine', gain:0.26, lfoHz:0.025, lfoDepth:0.10 },
                ],
                dry:0.24, wet:0.76, vol:0.60,
            },

            // ── Nacre — shimmer, high harmonics, delicate ────────────
            nacre: {
                voices: [
                    { freq: 1174.7, type:'sine', gain:0.24, lfoHz:0.148, lfoDepth:0.17 },
                    { freq: 1568.0, type:'sine', gain:0.17, lfoHz:0.118, lfoDepth:0.13 },
                    { freq: 2093.0, type:'sine', gain:0.11, lfoHz:0.095, lfoDepth:0.09 },
                ],
                dry:0.35, wet:0.65, vol:0.44,
            },

            // ── Newton — crystalline precision, fractal harmonics ────
            newton: {
                voices: [
                    { freq: 396,    type:'sine', gain:0.34, lfoHz:0.065, lfoDepth:0.16 },
                    { freq: 528,    type:'sine', gain:0.22, lfoHz:0.082, lfoDepth:0.12 },
                    { freq: 792,    type:'sine', gain:0.12, lfoHz:0.105, lfoDepth:0.09 },
                ],
                dry:0.46, wet:0.54, vol:0.50,
            },

            // ── Vortex — spiral energy, rotating feeling ─────────────
            vortex: {
                voices: [
                    { freq: 180,    type:'sine', gain:0.36, lfoHz:0.055, lfoDepth:0.22 },
                    { freq: 270,    type:'sine', gain:0.24, lfoHz:0.080, lfoDepth:0.17 },
                    { freq: 540,    type:'sine', gain:0.13, lfoHz:0.110, lfoDepth:0.12 },
                ],
                dry:0.44, wet:0.56, vol:0.54,
            },

            // ── Marble — slow, heavy, geological ─────────────────────
            marble: {
                voices: [
                    { freq: 98,     type:'sine', gain:0.42, lfoHz:0.022, lfoDepth:0.18 },
                    { freq: 147,    type:'sine', gain:0.25, lfoHz:0.030, lfoDepth:0.14 },
                    { freq: 196,    type:'sine', gain:0.14, lfoHz:0.042, lfoDepth:0.10 },
                ],
                dry:0.46, wet:0.54, vol:0.56,
            },

            // ── Heart — 80→48 bpm range, warm intimacy ───────────────
            heart: {
                voices: [
                    { freq: 220,    type:'sine', gain:0.38, lfoHz:0.80/60, lfoDepth:0.28 },  // ~0.013 Hz = 80 bpm
                    { freq: 330,    type:'sine', gain:0.22, lfoHz:0.80/60, lfoDepth:0.20 },
                ],
                dry:0.46, wet:0.54, vol:0.55,
            },

            // ── Constellation — sparse, discovery, quiet ─────────────
            constellation: {
                voices: [
                    { freq: 440,    type:'sine', gain:0.24, lfoHz:0.040, lfoDepth:0.20 },
                    { freq: 660,    type:'sine', gain:0.16, lfoHz:0.055, lfoDepth:0.15 },
                ],
                dry:0.34, wet:0.66, vol:0.44,
            },

            // ── Harmonograph — pendulum decay, diminishing arcs ──────
            harmonograph: {
                voices: [
                    { freq: 293.7,  type:'sine', gain:0.38, lfoHz:0.045, lfoDepth:0.22 },
                    { freq: 440.0,  type:'sine', gain:0.24, lfoHz:0.060, lfoDepth:0.16 },
                    { freq: 587.3,  type:'sine', gain:0.14, lfoHz:0.078, lfoDepth:0.12 },
                ],
                dry:0.48, wet:0.52, vol:0.52,
            },

            // ── Cymatics — standing waves, resonance nodes ───────────
            cymatics: {
                voices: [
                    { freq: 256,    type:'sine', gain:0.40, lfoHz:0.090, lfoDepth:0.20 },
                    { freq: 384,    type:'sine', gain:0.26, lfoHz:0.090, lfoDepth:0.16 },
                    { freq: 512,    type:'sine', gain:0.14, lfoHz:0.090, lfoDepth:0.11 },
                ],
                dry:0.50, wet:0.50, vol:0.54,
            },

            // ── Attractor — chaotic orbit, unpredictable ─────────────
            attractor: {
                voices: [
                    { freq: 146.8,  type:'sine', gain:0.36, lfoHz:0.072, lfoDepth:0.28 },
                    { freq: 220.0,  type:'sine', gain:0.24, lfoHz:0.110, lfoDepth:0.22 },
                    { freq: 329.6,  type:'sine', gain:0.14, lfoHz:0.155, lfoDepth:0.17 },
                ],
                dry:0.42, wet:0.58, vol:0.52,
            },

            // ── Reaction — chemistry spreading, rhythmic pulse ────────
            reaction: {
                voices: [
                    { freq: 174.6,  type:'triangle', gain:0.38, lfoHz:0.130, lfoDepth:0.24 },
                    { freq: 261.6,  type:'sine',     gain:0.24, lfoHz:0.095, lfoDepth:0.18 },
                    { freq: 523.2,  type:'sine',     gain:0.12, lfoHz:0.160, lfoDepth:0.13 },
                ],
                dry:0.44, wet:0.56, vol:0.50,
            },

            // ── Gravity — deformation of space, weight ───────────────
            gravity: {
                voices: [
                    { freq: 73.4,   type:'sine', gain:0.44, lfoHz:0.030, lfoDepth:0.18 },
                    { freq: 110.0,  type:'sine', gain:0.28, lfoHz:0.042, lfoDepth:0.14 },
                    { freq: 146.8,  type:'sine', gain:0.16, lfoHz:0.058, lfoDepth:0.10 },
                ],
                dry:0.40, wet:0.60, vol:0.58,
            },

            // ── Terrain — geological, drifting, tectonic ─────────────
            terrain: {
                voices: [
                    { freq: 82.4,   type:'sine', gain:0.42, lfoHz:0.018, lfoDepth:0.16 },
                    { freq: 123.5,  type:'sine', gain:0.26, lfoHz:0.026, lfoDepth:0.12 },
                    { freq: 164.8,  type:'sine', gain:0.14, lfoHz:0.038, lfoDepth:0.10 },
                ],
                dry:0.44, wet:0.56, vol:0.55,
            },

            // ── Rain — droplets, irregular, soft white noise feel ─────
            rain: {
                voices: [
                    { freq: 587.3,  type:'sine', gain:0.22, lfoHz:0.180, lfoDepth:0.26 },
                    { freq: 880.0,  type:'sine', gain:0.15, lfoHz:0.240, lfoDepth:0.22 },
                    { freq: 1174.7, type:'sine', gain:0.10, lfoHz:0.320, lfoDepth:0.18 },
                ],
                dry:0.36, wet:0.64, vol:0.42,
            },

            // ── Frost — ice crystalline, delicate, high and still ─────
            frost: {
                voices: [
                    { freq: 1046.5, type:'sine', gain:0.22, lfoHz:0.055, lfoDepth:0.14 },
                    { freq: 1568.0, type:'sine', gain:0.15, lfoHz:0.078, lfoDepth:0.11 },
                    { freq: 2093.0, type:'sine', gain:0.09, lfoHz:0.105, lfoDepth:0.08 },
                ],
                dry:0.32, wet:0.68, vol:0.40,
            },

            // ── Jelly — soft, buoyant, undulating ────────────────────
            jelly: {
                voices: [
                    { freq: 220,    type:'sine', gain:0.34, lfoHz:0.065, lfoDepth:0.28 },
                    { freq: 311.1,  type:'sine', gain:0.22, lfoHz:0.082, lfoDepth:0.22 },
                    { freq: 466.2,  type:'sine', gain:0.13, lfoHz:0.100, lfoDepth:0.17 },
                ],
                dry:0.40, wet:0.60, vol:0.50,
            },

            // ── Swarm — collective motion, many voices murmuring ──────
            swarm: {
                voices: [
                    { freq: 329.6,  type:'sine', gain:0.28, lfoHz:0.140, lfoDepth:0.24 },
                    { freq: 392.0,  type:'sine', gain:0.22, lfoHz:0.190, lfoDepth:0.20 },
                    { freq: 493.9,  type:'sine', gain:0.16, lfoHz:0.260, lfoDepth:0.17 },
                    { freq: 587.3,  type:'sine', gain:0.10, lfoHz:0.340, lfoDepth:0.14 },
                ],
                dry:0.42, wet:0.58, vol:0.48,
            },

            // ── Neurogenesis — growth, firing, synaptic ───────────────
            neurogenesis: {
                voices: [
                    { freq: 246.9,  type:'sine', gain:0.34, lfoHz:0.095, lfoDepth:0.22 },
                    { freq: 370.0,  type:'sine', gain:0.22, lfoHz:0.130, lfoDepth:0.18 },
                    { freq: 493.9,  type:'sine', gain:0.13, lfoHz:0.175, lfoDepth:0.14 },
                ],
                dry:0.44, wet:0.56, vol:0.50,
            },

            // ── Wax — warm encaustic, slow hexagonal pulse ────────────
            wax: {
                voices: [
                    { freq: 174.6,  type:'triangle', gain:0.40, lfoHz:0.035, lfoDepth:0.20 },
                    { freq: 261.6,  type:'sine',     gain:0.26, lfoHz:0.048, lfoDepth:0.16 },
                    { freq: 349.2,  type:'sine',     gain:0.14, lfoHz:0.065, lfoDepth:0.12 },
                ],
                dry:0.46, wet:0.54, vol:0.54,
            },

            // ── Patina — oxidised copper, slow spreading ──────────────
            patina: {
                voices: [
                    { freq: 196.0,  type:'sine', gain:0.38, lfoHz:0.028, lfoDepth:0.16 },
                    { freq: 293.7,  type:'sine', gain:0.24, lfoHz:0.038, lfoDepth:0.12 },
                    { freq: 392.0,  type:'sine', gain:0.13, lfoHz:0.050, lfoDepth:0.09 },
                ],
                dry:0.44, wet:0.56, vol:0.52,
            },

            // ── Ink — bleeding on paper, organic spread ───────────────
            ink: {
                voices: [
                    { freq: 220.0,  type:'sine', gain:0.36, lfoHz:0.040, lfoDepth:0.19 },
                    { freq: 330.0,  type:'sine', gain:0.22, lfoHz:0.055, lfoDepth:0.15 },
                    { freq: 440.0,  type:'sine', gain:0.12, lfoHz:0.072, lfoDepth:0.11 },
                ],
                dry:0.44, wet:0.56, vol:0.50,
            },

            // ── Iris — dark oiled silk, deep iridescence ──────────────
            iris: {
                voices: [
                    { freq: 246.9,  type:'sine', gain:0.34, lfoHz:0.050, lfoDepth:0.18 },
                    { freq: 370.0,  type:'sine', gain:0.22, lfoHz:0.068, lfoDepth:0.14 },
                    { freq: 493.9,  type:'sine', gain:0.12, lfoHz:0.088, lfoDepth:0.10 },
                ],
                dry:0.38, wet:0.62, vol:0.50,
            },

            // ── Lava — viscous, molten, slow-moving heat ──────────────
            lava: {
                voices: [
                    { freq: 87.3,   type:'triangle', gain:0.44, lfoHz:0.020, lfoDepth:0.18 },
                    { freq: 130.8,  type:'sine',     gain:0.28, lfoHz:0.028, lfoDepth:0.14 },
                    { freq: 174.6,  type:'sine',     gain:0.15, lfoHz:0.038, lfoDepth:0.10 },
                ],
                dry:0.44, wet:0.56, vol:0.58,
            },

            // ── Caustic — light refraction through water ──────────────
            caustic: {
                voices: [
                    { freq: 523.2,  type:'sine', gain:0.28, lfoHz:0.100, lfoDepth:0.20 },
                    { freq: 659.3,  type:'sine', gain:0.20, lfoHz:0.130, lfoDepth:0.16 },
                    { freq: 783.9,  type:'sine', gain:0.12, lfoHz:0.165, lfoDepth:0.12 },
                ],
                dry:0.38, wet:0.62, vol:0.46,
            },

            // ── Fabric — woven threads, structural rhythm ─────────────
            fabric: {
                voices: [
                    { freq: 261.6,  type:'triangle', gain:0.36, lfoHz:0.060, lfoDepth:0.18 },
                    { freq: 392.0,  type:'sine',     gain:0.24, lfoHz:0.080, lfoDepth:0.14 },
                    { freq: 523.2,  type:'sine',     gain:0.13, lfoHz:0.100, lfoDepth:0.10 },
                ],
                dry:0.46, wet:0.54, vol:0.50,
            },

            // ── Membrane — tension, surface vibration ─────────────────
            membrane: {
                voices: [
                    { freq: 311.1,  type:'sine', gain:0.36, lfoHz:0.085, lfoDepth:0.22 },
                    { freq: 466.2,  type:'sine', gain:0.24, lfoHz:0.112, lfoDepth:0.18 },
                    { freq: 622.3,  type:'sine', gain:0.13, lfoHz:0.145, lfoDepth:0.14 },
                ],
                dry:0.42, wet:0.58, vol:0.50,
            },

            // ── Field — open, expansive, electromagnetic ──────────────
            field: {
                voices: [
                    { freq: 136.1,  type:'sine', gain:0.38, lfoHz:0.032, lfoDepth:0.16 },
                    { freq: 204.2,  type:'sine', gain:0.25, lfoHz:0.044, lfoDepth:0.12 },
                    { freq: 272.1,  type:'sine', gain:0.14, lfoHz:0.058, lfoDepth:0.09 },
                ],
                dry:0.40, wet:0.60, vol:0.52,
            },

            // ── Flow — fluid, laminar, continuous ─────────────────────
            flow: {
                voices: [
                    { freq: 184.9,  type:'sine', gain:0.38, lfoHz:0.048, lfoDepth:0.22 },
                    { freq: 277.2,  type:'sine', gain:0.25, lfoHz:0.062, lfoDepth:0.17 },
                    { freq: 369.9,  type:'sine', gain:0.14, lfoHz:0.080, lfoDepth:0.12 },
                ],
                dry:0.42, wet:0.58, vol:0.52,
            },

            // ── Mirror — reflective symmetry, doubled ─────────────────
            mirror: {
                voices: [
                    { freq: 369.9,  type:'sine', gain:0.32, lfoHz:0.055, lfoDepth:0.16 },
                    { freq: 493.9,  type:'sine', gain:0.24, lfoHz:0.055, lfoDepth:0.14 },  // same LFO = mirror
                    { freq: 739.9,  type:'sine', gain:0.13, lfoHz:0.055, lfoDepth:0.10 },
                ],
                dry:0.44, wet:0.56, vol:0.50,
            },

            // ── Recursion — self-similar, nested depth ────────────────
            recursion: {
                voices: [
                    { freq: 277.2,  type:'sine', gain:0.36, lfoHz:0.070, lfoDepth:0.20 },
                    { freq: 415.3,  type:'sine', gain:0.24, lfoHz:0.105, lfoDepth:0.16 },
                    { freq: 554.4,  type:'sine', gain:0.14, lfoHz:0.158, lfoDepth:0.12 },
                ],
                dry:0.44, wet:0.56, vol:0.50,
            },

            // ── Orrery — planetary motion, clockwork, orbital ─────────
            orrery: {
                voices: [
                    { freq: 432,    type:'sine', gain:0.30, lfoHz:0.025, lfoDepth:0.14 },
                    { freq: 648,    type:'sine', gain:0.20, lfoHz:0.040, lfoDepth:0.11 },
                    { freq: 1080,   type:'sine', gain:0.11, lfoHz:0.062, lfoDepth:0.08 },
                ],
                dry:0.42, wet:0.58, vol:0.48,
            },

            // ── Gaze — watching, quiet presence, still ────────────────
            gaze: {
                voices: [
                    { freq: 432,    type:'sine', gain:0.28, lfoHz:0.022, lfoDepth:0.12 },
                    { freq: 648,    type:'sine', gain:0.18, lfoHz:0.030, lfoDepth:0.09 },
                ],
                dry:0.30, wet:0.70, vol:0.42,
            },

            // ── Meridian — chakra tones, ascending register ───────────
            meridian: {
                voices: [
                    { freq: 396,    type:'sine', gain:0.34, lfoHz:0.042, lfoDepth:0.16 },
                    { freq: 528,    type:'sine', gain:0.24, lfoHz:0.058, lfoDepth:0.13 },
                    { freq: 639,    type:'sine', gain:0.16, lfoHz:0.072, lfoDepth:0.10 },
                    { freq: 741,    type:'sine', gain:0.10, lfoHz:0.088, lfoDepth:0.08 },
                ],
                dry:0.42, wet:0.58, vol:0.52,
            },

            // ── Sound Garden — has its own audio engine; bed is near-silent ─
            soundgarden: {
                voices: [
                    { freq: 110,    type:'sine', gain:0.08, lfoHz:0.022, lfoDepth:0.10 },
                ],
                dry:0.20, wet:0.80, vol:0.18,
            },
        };

        return P[key] || P.breath;   // breath as neutral fallback
    }

    // ── Switch to scene ─────────────────────────────────────────────
    startScene(key) {
        if (!this._ready) return;
        const ac  = this._ac;
        const now = ac.currentTime;
        const p   = this._profile(key);

        // Fade out existing voices
        const retiring = this._voices.slice();
        for (const v of retiring) {
            v.g.gain.setTargetAtTime(0, now, 1.8);
            setTimeout(() => {
                try { v.osc.stop(); v.lfo.stop(); } catch (e) {}
            }, 6000);
        }

        // Transition dry/wet and master volume
        this._dry.gain.setTargetAtTime(p.dry, now + 0.4, 1.6);
        this._wet.gain.setTargetAtTime(p.wet, now + 0.4, 1.6);
        this._master.gain.setTargetAtTime(p.vol, now + 0.4, 2.0);

        // Create new voices, staggered entry for naturalness
        this._voices = p.voices.map((vDef, i) => {
            const v = this._voice(vDef);
            // Each voice was started at base gain = vDef.gain - depth; reset to 0, then fade in
            const base = vDef.gain - vDef.gain * Math.min(0.32, vDef.lfoDepth);
            v.g.gain.setValueAtTime(0, now);
            v.g.gain.setTargetAtTime(base, now + i * 0.35 + 1.4, 2.0);
            return v;
        });
    }

    // ── Blink: bell overtone of current root ───────────────────────
    onBlink() {
        if (!this._ready) return;
        const ac  = this._ac;
        const now = ac.currentTime;

        // Frequency: 4× current root (two octaves up), resolves to 3× for warmth
        const root  = this._voices.length > 0 ? this._voices[0].osc.frequency.value : 440;
        const freq  = root * 4;

        const osc  = ac.createOscillator();
        const g    = ac.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.018, now);
        osc.frequency.setTargetAtTime(freq, now + 0.06, 0.25);  // pitch settle = natural bell

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.10, now + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(g);
        g.connect(this._master);
        osc.start(now);
        osc.stop(now + 2.2);
    }

    // ── End: fade everything out ────────────────────────────────────
    end() {
        if (!this._ready) return;
        const ac  = this._ac;
        const now = ac.currentTime;

        this._master.gain.setTargetAtTime(0, now, 2.8);

        setTimeout(() => {
            try { this._ac.close(); } catch (e) {}
            this._ready = false;
        }, 10000);
    }
}
