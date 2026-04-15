// Neurogenesis Mode — watch neurons grow from nothing.
// Soma appear. Axons probe outward with growth cones. Dendrites branch.
// Synaptic contacts form and glow where axons meet dendrites.
// The palette is fluorescence microscopy: black field, GFP-green, RFP-magenta, DAPI-blue.
// After ~50 seconds the network is built and begins to fire.
// Blink: seed a new neuron at a random position.
class NeurogenesisMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this._neurons   = [];
        this._synapses  = [];  // {ax, ay, bx, by, alpha} — formed contact glows
        this._sparks    = [];  // propagating action potentials
        this._growing   = true;
        this._nextSeed  = 0;
        this._N         = 22;
        this._seeded    = 0;
    }

    startScene() {
        this.t        = 0;
        this._neurons  = [];
        this._synapses = [];
        this._sparks   = [];
        this._growing  = true;
        this._seeded   = 0;
        this._nextSeed = 0;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() {
        // Seed a new neuron instantly
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const margin = 80;
        this._seedNeuron(
            margin + Math.random() * (W - margin * 2),
            margin + Math.random() * (H - margin * 2)
        );
    }

    _seedNeuron(x, y) {
        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;
        const isExcit = Math.random() < 0.75;
        // GFP green for excitatory, RFP magenta for inhibitory
        const somaHue  = isExcit ? 138 : 310;
        const axonHue  = isExcit ? 125 : 295;
        const dendrHue = isExcit ? 155 : 325;

        // Each neuron has 1 axon + 3-6 dendrites
        const numDendrites = 3 + Math.floor(Math.random() * 4);
        const axonAngle    = Math.random() * Math.PI * 2;

        const axon = this._makeNeurite(x, y, axonAngle, true);
        const dendrites = [];
        for (let d = 0; d < numDendrites; d++) {
            const dAngle = (axonAngle + Math.PI + (d / numDendrites) * Math.PI * 2 * 0.7 + (Math.random() - 0.5) * 0.8) % (Math.PI * 2);
            dendrites.push(this._makeNeurite(x, y, dAngle, false));
        }

        this._neurons.push({
            x, y,
            somaHue, axonHue, dendrHue,
            somaR:    6 + Math.random() * 7,
            somaAge:  0,     // 0→1 as soma fully appears
            axon,
            dendrites,
            type:     isExcit ? 'e' : 'i',
            firing:   false,
            fireAge:  0,
            activation: 0,
            lastFire: -999,
            refractory: 0,
            threshold:  0.45 + Math.random() * 0.15,
        });
    }

    _makeNeurite(ox, oy, angle, isAxon) {
        // A neurite is a list of segments grown over time by a growth cone
        const MAX_LEN  = isAxon ? 180 + Math.random() * 120 : 60 + Math.random() * 80;
        const segments = [{ x: ox, y: oy }];
        const cone = {
            x:      ox + Math.cos(angle) * 3,
            y:      oy + Math.sin(angle) * 3,
            angle,
            speed:  isAxon ? 0.9 + Math.random() * 0.5 : 0.4 + Math.random() * 0.4,
            wander: isAxon ? 0.12 : 0.25,   // angular wander per step
            grown:  0,
            maxLen: MAX_LEN,
            done:   false,
        };
        // Branch points for dendrites
        const branches = [];
        return { segments, cone, branches, isAxon };
    }

    _growNeurite(neurite, dt) {
        const cone = neurite.cone;
        if (cone.done) return;

        const W = this.canvas.width  || 800;
        const H = this.canvas.height || 600;

        // Grow cone
        const steps = neurite.isAxon ? 2 : 1;
        for (let s = 0; s < steps; s++) {
            cone.angle += (Math.random() - 0.5) * cone.wander;
            cone.x     += Math.cos(cone.angle) * cone.speed;
            cone.y     += Math.sin(cone.angle) * cone.speed;
            cone.grown += cone.speed;

            // Stay within canvas
            if (cone.x < 20 || cone.x > W - 20) cone.angle = Math.PI - cone.angle;
            if (cone.y < 20 || cone.y > H - 20) cone.angle = -cone.angle;
            cone.x = Math.max(20, Math.min(W - 20, cone.x));
            cone.y = Math.max(20, Math.min(H - 20, cone.y));

            // Add segment every ~4px
            const last = neurite.segments[neurite.segments.length - 1];
            if (Math.hypot(cone.x - last.x, cone.y - last.y) > 4) {
                neurite.segments.push({ x: cone.x, y: cone.y });
            }

            // Dendrite branches
            if (!neurite.isAxon && cone.grown > 30 && Math.random() < 0.004) {
                const branchAngle = cone.angle + (Math.random() - 0.5) * Math.PI * 0.7;
                const branchMaxLen = 25 + Math.random() * 35;
                if (neurite.branches.length < 3) {
                    neurite.branches.push({
                        segments: [{ x: cone.x, y: cone.y }],
                        cone: {
                            x: cone.x, y: cone.y,
                            angle: branchAngle,
                            speed: 0.3 + Math.random() * 0.3,
                            wander: 0.35,
                            grown: 0,
                            maxLen: branchMaxLen,
                            done: false,
                        },
                        branches: [],
                        isAxon: false,
                    });
                }
            }

            // Grow sub-branches too
            for (const br of neurite.branches) {
                if (!br.cone.done) this._growNeurite(br, dt);
            }

            if (cone.grown >= cone.maxLen) { cone.done = true; break; }
        }
    }

    _checkSynapse(axon, neuron) {
        // Check if axon tip is near any dendritic segment
        const tip = axon.cone;
        for (const n of this._neurons) {
            if (n === neuron) continue;
            for (const dend of n.dendrites) {
                for (const seg of dend.segments) {
                    const d = Math.hypot(tip.x - seg.x, tip.y - seg.y);
                    if (d < 12) {
                        // Form synapse
                        const already = this._synapses.some(
                            s => Math.hypot(s.x - seg.x, s.y - seg.y) < 5
                        );
                        if (!already) {
                            this._synapses.push({
                                x:     seg.x + (Math.random() - 0.5) * 3,
                                y:     seg.y + (Math.random() - 0.5) * 3,
                                alpha: 0,
                                pre:   neuron,
                                post:  n,
                                hue:   neuron.type === 'e' ? 70 : 295,  // yellow-green or magenta
                                active: 0,
                            });
                            axon.cone.done = true; // axon stops growing after contact
                        }
                        return;
                    }
                }
            }
        }
    }

    _drawNeurite(ctx, neurite, hue, alpha) {
        if (neurite.segments.length < 2) return;

        const baseWidth = neurite.isAxon ? 2.0 : 1.1;
        ctx.strokeStyle = `hsla(${hue}, 88%, 68%, ${alpha})`;
        ctx.lineWidth   = baseWidth;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        ctx.moveTo(neurite.segments[0].x, neurite.segments[0].y);
        for (let i = 1; i < neurite.segments.length; i++) {
            ctx.lineTo(neurite.segments[i].x, neurite.segments[i].y);
        }
        ctx.stroke();

        // Growth cone tip: small glowing triangle
        if (!neurite.cone.done) {
            const tip  = neurite.cone;
            const ang  = neurite.cone.angle;
            const size = neurite.isAxon ? 5 : 3;
            ctx.fillStyle = `hsla(${hue}, 95%, 88%, ${alpha * 0.85})`;
            ctx.beginPath();
            ctx.moveTo(tip.x + Math.cos(ang)               * size,
                       tip.y + Math.sin(ang)               * size);
            ctx.lineTo(tip.x + Math.cos(ang + 2.3) * size * 0.55,
                       tip.y + Math.sin(ang + 2.3) * size * 0.55);
            ctx.lineTo(tip.x + Math.cos(ang - 2.3) * size * 0.55,
                       tip.y + Math.sin(ang - 2.3) * size * 0.55);
            ctx.closePath();
            ctx.fill();
        }

        // Sub-branches (for dendrites)
        for (const br of neurite.branches) {
            this._drawNeurite(ctx, br, hue, alpha * 0.72);
        }
    }

    _fireNetwork() {
        // After growing, add spontaneous activity
        const now = this.t;
        for (const n of this._neurons) {
            if (n.refractory > 0) {
                n.refractory -= 0.016;
                n.activation *= 0.85;
                continue;
            }
            n.activation *= 0.94;
            if (Math.random() < 0.003) n.activation += 0.35;

            if (n.activation > n.threshold) {
                n.firing  = true;
                n.fireAge = 0;
                n.activation = 0;
                n.refractory = 0.25 + Math.random() * 0.15;
                n.lastFire = now;

                // Propagate signals through synapses
                for (const syn of this._synapses) {
                    if (syn.pre === n) {
                        syn.active = 1.0;
                        // Activate post-synaptic neuron
                        syn.post.activation = Math.min(1, syn.post.activation +
                            (n.type === 'e' ? 0.22 : -0.14));
                        // Create a spark along the axon for this signal
                        if (n.axon.segments.length > 2) {
                            this._sparks.push({
                                segs: n.axon.segments,
                                prog: 0,
                                hue:  n.type === 'e' ? 125 : 310,
                            });
                        }
                    }
                }
            }

            if (n.firing) {
                n.fireAge += 0.016;
                if (n.fireAge > 0.5) n.firing = false;
            }
        }

        // Advance sparks
        for (let i = this._sparks.length - 1; i >= 0; i--) {
            const sp = this._sparks[i];
            sp.prog += 0.035;
            if (sp.prog >= 1) { this._sparks.splice(i, 1); }
        }
    }

    draw(time) {
        this.t += 0.016;
        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;

        // Very slow fade — neurites persist as they grow
        ctx.fillStyle = 'rgba(0, 2, 5, 0.045)';
        ctx.fillRect(0, 0, W, H);

        // Seed neurons over first ~35 seconds
        if (this._seeded < this._N && this.t >= this._nextSeed) {
            const margin = 70;
            this._seedNeuron(
                margin + Math.random() * (W - margin * 2),
                margin + Math.random() * (H - margin * 2)
            );
            this._seeded++;
            // Faster seeding early, slower later for organic feel
            this._nextSeed = this.t + 0.4 + Math.random() * 1.2 + this._seeded * 0.06;
        }

        // Check if network is done growing
        if (this._growing) {
            const allDone = this._seeded >= this._N &&
                this._neurons.every(n =>
                    n.axon.cone.done &&
                    n.dendrites.every(d => d.cone.done)
                );
            if (allDone) this._growing = false;
        }

        if (!this._growing) this._fireNetwork();

        // ── Grow all neurons ───────────────────────────────────────────────────────
        for (const n of this._neurons) {
            n.somaAge = Math.min(1, n.somaAge + 0.016 * 0.8);
            this._growNeurite(n.axon, 0.016);
            for (const d of n.dendrites) this._growNeurite(d, 0.016);

            // Check axon-to-dendrite contact
            if (!n.axon.cone.done) this._checkSynapse(n.axon, n);
        }

        // ── Draw dendrites (behind everything) ────────────────────────────────────
        for (const n of this._neurons) {
            const a = n.somaAge * 0.72;
            for (const d of n.dendrites) this._drawNeurite(ctx, d, n.dendrHue, a);
        }

        // ── Draw axons ─────────────────────────────────────────────────────────────
        for (const n of this._neurons) {
            const a = n.somaAge * 0.85;
            this._drawNeurite(ctx, n.axon, n.axonHue, a);
        }

        // ── Draw sparks (action potentials traveling along axons) ─────────────────
        for (const sp of this._sparks) {
            const idx = Math.min(sp.segs.length - 1, Math.floor(sp.prog * sp.segs.length));
            const seg = sp.segs[idx];
            if (!seg) continue;
            const sg = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, 8);
            sg.addColorStop(0, `hsla(${sp.hue}, 95%, 95%, 0.90)`);
            sg.addColorStop(0.5, `hsla(${sp.hue}, 85%, 70%, 0.35)`);
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Draw synaptic boutons ─────────────────────────────────────────────────
        for (const syn of this._synapses) {
            syn.alpha = Math.min(1, syn.alpha + 0.016 * 0.8);
            syn.active = Math.max(0, syn.active - 0.016 * 2.5);

            const a = syn.alpha * 0.65 + syn.active * 0.35;
            const r = 3 + syn.active * 5;

            const bg = ctx.createRadialGradient(syn.x, syn.y, 0, syn.x, syn.y, r * 2.5);
            bg.addColorStop(0, `hsla(${syn.hue}, 95%, 90%, ${a})`);
            bg.addColorStop(0.4, `hsla(${syn.hue}, 80%, 65%, ${a * 0.4})`);
            bg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(syn.x, syn.y, r * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Draw soma (cell bodies) ───────────────────────────────────────────────
        for (const n of this._neurons) {
            const a  = n.somaAge;
            const fl = n.firing ? (0.5 - n.fireAge) * 2 : 0;
            const r  = n.somaR;

            // Outer glow
            if (fl > 0 || n.activation > 0.1) {
                const gR = r * (3 + fl * 5);
                const sg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, gR);
                sg.addColorStop(0, `hsla(${n.somaHue}, 90%, 88%, ${(fl * 0.6 + n.activation * 0.25) * a})`);
                sg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = sg;
                ctx.beginPath();
                ctx.arc(n.x, n.y, gR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Soma body
            const somaG = ctx.createRadialGradient(n.x - r * 0.25, n.y - r * 0.25, 0, n.x, n.y, r);
            somaG.addColorStop(0,   `hsla(${n.somaHue}, 70%, 82%, ${a * 0.9})`);
            somaG.addColorStop(0.6, `hsla(${n.somaHue}, 80%, 48%, ${a * 0.85})`);
            somaG.addColorStop(1,   `hsla(${n.somaHue}, 90%, 22%, ${a * 0.8})`);
            ctx.fillStyle = somaG;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Nucleus (DAPI-blue staining inside soma)
            const nucR = r * 0.52;
            const nucG = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, nucR);
            nucG.addColorStop(0, `rgba(140, 180, 255, ${a * 0.55})`);
            nucG.addColorStop(1, `rgba(60,  90, 200, ${a * 0.25})`);
            ctx.fillStyle = nucG;
            ctx.beginPath();
            ctx.arc(n.x, n.y, nucR, 0, Math.PI * 2);
            ctx.fill();

            // Nucleolus
            ctx.fillStyle = `rgba(200, 220, 255, ${a * 0.65})`;
            ctx.beginPath();
            ctx.arc(n.x + nucR * 0.2, n.y - nucR * 0.2, nucR * 0.32, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Status hint ───────────────────────────────────────────────────────────
        if (this.t < 4 || (this._growing && this._seeded < 3)) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(120, 210, 160, 0.18)';
            ctx.fillText('blink to seed a new neuron', W / 2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}
