// Neural Mode — a living artificial nervous system.
// Neurons fire, signals travel, connections strengthen with use.
// The network organises itself. It has memory — heavily-used paths glow brightest.
// Click anywhere to inject a signal burst into the nearest neuron.
// Watch cascades, oscillations, and self-sustaining rhythms emerge.
// Excitatory neurons: blue-white. Inhibitory: red-orange. Signals: travelling sparks.
class NeuralMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._neurons  = [];
        this._signals  = [];   // travelling spikes: {from, to, prog, type}
        this._N        = 88;
        this._K        = 5;    // connections per neuron
    }

    startScene() {
        this.t        = 0;
        this._signals = [];
        this._build();

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);

        // Seed initial activity — inject into 4 random neurons
        for (let i = 0; i < 4; i++) {
            const n = this._neurons[Math.floor(Math.random() * this._neurons.length)];
            n.activation = 0.85 + Math.random() * 0.15;
        }
    }

    _build() {
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;
        this._neurons = [];

        // Scatter neurons with some clustering
        for (let i = 0; i < this._N; i++) {
            const excitatory = Math.random() < 0.78;
            this._neurons.push({
                x:          60 + Math.random() * (W - 120),
                y:          60 + Math.random() * (H - 120),
                activation: 0,
                refractory: 0,
                type:       excitatory ? 'e' : 'i',
                threshold:  excitatory ? 0.42 + Math.random() * 0.18 : 0.35 + Math.random() * 0.15,
                axons:      [],   // {target, weight, lastFiredT}
                flash:      0,    // visual fire flash countdown
            });
        }

        // Wire: K nearest neighbours + a few random long-range
        for (const n of this._neurons) {
            // Sort others by distance
            const others = this._neurons
                .filter(o => o !== n)
                .map(o => ({ o, d: Math.hypot(o.x - n.x, o.y - n.y) }))
                .sort((a, b) => a.d - b.d);

            // K nearest
            for (let k = 0; k < Math.min(this._K, others.length); k++) {
                n.axons.push({ target: others[k].o, weight: 0.25 + Math.random() * 0.35, lastFired: 0 });
            }
            // 2 random long-range
            for (let r = 0; r < 2; r++) {
                const rnd = others[this._K + Math.floor(Math.random() * (others.length - this._K))];
                if (rnd) n.axons.push({ target: rnd.o, weight: 0.15 + Math.random() * 0.20, lastFired: 0 });
            }
        }
    }

    onPolePlace(x, y) { this._inject(x, y, 1.0); }  // shared with magnetic routing

    onTap() {
        // pulse all neurons slightly — used from pulse routing in scenes.html
    }

    _inject(x, y, strength) {
        // Inject into nearest neuron
        let nearest = null, nearestD = Infinity;
        for (const n of this._neurons) {
            const d = Math.hypot(n.x - x, n.y - y);
            if (d < nearestD) { nearestD = d; nearest = n; }
        }
        if (nearest) {
            nearest.activation = Math.min(1, nearest.activation + strength);
        }
    }

    draw(time) {
        this.t += 0.016;
        const dt  = 0.016;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Dark fade with subtle trail
        ctx.fillStyle = 'rgba(0, 2, 8, 0.085)';
        ctx.fillRect(0, 0, W, H);

        // ── 1. Advance travelling signals ────────────────────────────────────────
        const SIGNAL_SPEED = 0.022;
        for (let i = this._signals.length - 1; i >= 0; i--) {
            const sig = this._signals[i];
            sig.prog += SIGNAL_SPEED;
            if (sig.prog >= 1) {
                // Deliver signal to target
                const delta = sig.type === 'e'
                    ? sig.axon.weight * 0.7
                    : -sig.axon.weight * 0.5;
                sig.axon.target.activation = Math.max(0, Math.min(1,
                    sig.axon.target.activation + delta));
                this._signals.splice(i, 1);
            }
        }

        // ── 2. Simulate neurons ──────────────────────────────────────────────────
        const now = this.t;
        for (const n of this._neurons) {
            // Random spontaneous nudge — keeps the network alive
            if (Math.random() < 0.0018) n.activation += 0.28;

            // Refractory cooldown
            if (n.refractory > 0) {
                n.refractory = Math.max(0, n.refractory - dt);
                n.activation *= 0.75;  // fast decay during refractory
                continue;
            }

            // Decay toward 0
            n.activation *= 0.938;

            // Fire?
            if (n.activation > n.threshold) {
                n.flash      = 1.0;
                n.refractory = 0.30 + Math.random() * 0.10;   // ~300ms refractory

                // Send signals along all axons
                for (const axon of n.axons) {
                    this._signals.push({
                        from:  n,
                        to:    axon.target,
                        axon,
                        prog:  0,
                        type:  n.type,
                    });
                    // Hebbian weight strengthening — use makes connections grow
                    axon.weight = Math.min(0.88, axon.weight + 0.004);
                    axon.lastFired = now;
                }

                // Weight decay for unused axons (synaptic pruning)
                for (const axon of n.axons) {
                    if (now - axon.lastFired > 8) axon.weight = Math.max(0.08, axon.weight - 0.001);
                }
            }

            n.flash = Math.max(0, n.flash - dt * 3.5);
        }

        // ── 3. Draw axons ────────────────────────────────────────────────────────
        ctx.lineCap = 'round';
        for (const n of this._neurons) {
            for (const axon of n.axons) {
                const wNorm = (axon.weight - 0.08) / 0.80;
                const a     = 0.04 + wNorm * 0.22;
                const hue   = n.type === 'e' ? 205 : 15;
                ctx.beginPath();
                ctx.moveTo(n.x, n.y);
                ctx.lineTo(axon.target.x, axon.target.y);
                ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${a})`;
                ctx.lineWidth   = 0.75 + wNorm * 0.75;
                ctx.stroke();
            }
        }

        // ── 4. Draw travelling signal sparks ─────────────────────────────────────
        for (const sig of this._signals) {
            const sx = sig.from.x + (sig.axon.target.x - sig.from.x) * sig.prog;
            const sy = sig.from.y + (sig.axon.target.y - sig.from.y) * sig.prog;
            const hue = sig.type === 'e' ? 195 : 18;
            const a   = 0.55 + sig.axon.weight * 0.40;

            // Spark glow
            const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
            sg.addColorStop(0,   `hsla(${hue}, 88%, 92%, ${a})`);
            sg.addColorStop(0.5, `hsla(${hue}, 75%, 68%, ${a * 0.35})`);
            sg.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(sx, sy, 7, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── 5. Draw neurons ──────────────────────────────────────────────────────
        for (const n of this._neurons) {
            const act  = n.activation;
            const fl   = n.flash;
            const hue  = n.type === 'e' ? 205 : 18;
            const size = 2.8 + fl * 3.5;
            const a    = 0.25 + act * 0.55 + fl * 0.25;

            if (fl > 0.05 || act > 0.1) {
                // Glow
                const glowR = size * (2.5 + fl * 3);
                const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
                ng.addColorStop(0,   `hsla(${hue}, 85%, 88%, ${(fl * 0.5 + act * 0.2)})`);
                ng.addColorStop(0.4, `hsla(${hue}, 70%, 65%, ${(fl * 0.12 + act * 0.05)})`);
                ng.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = ng;
                ctx.beginPath();
                ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Core dot
            ctx.beginPath();
            ctx.arc(n.x, n.y, size * 0.55, 0, Math.PI * 2);
            ctx.fillStyle = n.refractory > 0
                ? `hsla(${hue}, 40%, 30%, 0.50)`
                : `hsla(${hue}, 80%, ${50 + act * 38 + fl * 18}%, ${a})`;
            ctx.fill();
        }

        // ── 6. Hint ──────────────────────────────────────────────────────────────
        const firing = this._neurons.filter(n => n.flash > 0.1).length;
        if (firing === 0 && this.t < 3) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(160,185,220,0.20)';
            ctx.fillText('click anywhere to inject a signal', W/2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
