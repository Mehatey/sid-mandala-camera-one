// Fluid Mode — smoke and heat in a living void.
// A real 2D fluid simulation (semi-Lagrangian advection + diffusion).
// Smoke rises, cools, swirls. Vortices form and dissolve.
// Vorticity maps to hue: clockwise = warm amber, counter = cool violet.
// Blink: hot plume burst. Face tilt: changes gravity direction.
// Two autonomous sources drift and shift every 8–20 seconds.
class FluidMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        this.GW = 128;
        this.GH = 96;
        const sz = this.GW * this.GH;

        // Velocity fields
        this._u  = new Float32Array(sz);  // x-velocity
        this._v  = new Float32Array(sz);  // y-velocity
        this._u0 = new Float32Array(sz);  // temp
        this._v0 = new Float32Array(sz);

        // Scalar fields: smoke density + temperature
        this._d  = new Float32Array(sz);  // density (smoke)
        this._T  = new Float32Array(sz);  // temperature
        this._d0 = new Float32Array(sz);
        this._T0 = new Float32Array(sz);

        this._dt      = 0.35;
        this._visc    = 0.000008;  // viscosity
        this._diff    = 0.000005;  // smoke diffusion rate
        this._dissip  = 0.994;     // density decay per step
        this._tdissip = 0.990;     // temperature decay

        this._sources   = [];
        this._faceX     = 0.5;
        this._faceY     = 0.5;
        this._blinkBurst = 0;

        this._off    = document.createElement('canvas');
        this._off.width  = this.GW;
        this._off.height = this.GH;
        this._offCtx = this._off.getContext('2d');
    }

    startScene() {
        this.t = 0;
        const sz = this.GW * this.GH;
        this._u.fill(0); this._v.fill(0);
        this._d.fill(0); this._T.fill(0);
        this._u0.fill(0); this._v0.fill(0);
        this._d0.fill(0); this._T0.fill(0);
        this._faceX = 0.5; this._faceY = 0.5;
        this._blinkBurst = 0;
        this._sources = [
            { x: 0.3, y: 0.75, nextMove: 8  + Math.random() * 12, phase: 0 },
            { x: 0.7, y: 0.75, nextMove: 12 + Math.random() * 12, phase: Math.PI },
        ];

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width || 800, this.canvas.height || 600);
    }

    onBlink() {
        this._blinkBurst = 1.0;
        // Hot dense burst at random mid-screen position
        const gx = Math.round(this.GW * (0.2 + Math.random() * 0.6));
        const gy = Math.round(this.GH * (0.3 + Math.random() * 0.5));
        this._addSource(gx, gy, 18, 12, 2.2);
    }

    onFaceMove(normX, normY) {
        this._faceX += (normX - this._faceX) * 0.04;
        this._faceY += (normY - this._faceY) * 0.04;
    }

    // Add density + temperature at grid cell, with Gaussian spread
    _addSource(gx, gy, density, temperature, radius) {
        const GW = this.GW, GH = this.GH;
        const r2 = radius * radius;
        const sig = r2 * 0.5;
        for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
            for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
                const nx = gx + dx, ny = gy + dy;
                if (nx < 1 || nx >= GW-1 || ny < 1 || ny >= GH-1) continue;
                const d2 = dx*dx + dy*dy;
                if (d2 > r2) continue;
                const w = Math.exp(-d2 / sig);
                const i = ny * GW + nx;
                this._d[i] = Math.min(5, this._d[i] + density * w);
                this._T[i] = Math.min(5, this._T[i] + temperature * w);
            }
        }
    }

    // Diffuse a scalar field using Gauss-Seidel relaxation
    _diffuse(dst, src, diff, dt, passes) {
        const GW = this.GW, GH = this.GH;
        const a = dt * diff * (GW - 2) * (GH - 2);
        // Copy src → dst first
        dst.set(src);
        for (let p = 0; p < passes; p++) {
            for (let y = 1; y < GH-1; y++) {
                for (let x = 1; x < GW-1; x++) {
                    const i = y*GW + x;
                    dst[i] = (src[i] +
                        a * (dst[i-1] + dst[i+1] + dst[i-GW] + dst[i+GW])
                    ) / (1 + 4 * a);
                }
            }
        }
    }

    // Semi-Lagrangian advection (unconditionally stable)
    _advect(dst, src, u, v, dt) {
        const GW = this.GW, GH = this.GH;
        for (let y = 1; y < GH-1; y++) {
            for (let x = 1; x < GW-1; x++) {
                const i  = y*GW + x;
                let px = x - dt * u[i];
                let py = y - dt * v[i];
                px = Math.max(0.5, Math.min(GW - 1.5, px));
                py = Math.max(0.5, Math.min(GH - 1.5, py));
                const ix = px | 0, iy = py | 0;
                const fx = px - ix, fy = py - iy;
                dst[i] = (1-fx)*(1-fy)*src[iy*GW+ix] +
                          fx  *(1-fy)*src[iy*GW+ix+1] +
                         (1-fx)* fy  *src[(iy+1)*GW+ix] +
                          fx  * fy  *src[(iy+1)*GW+ix+1];
            }
        }
    }

    // Project velocity field to be divergence-free (pressure solve)
    _project(u, v, p, div) {
        const GW = this.GW, GH = this.GH;
        const h  = 1.0 / Math.max(GW, GH);
        p.fill(0);
        // Compute divergence
        for (let y = 1; y < GH-1; y++) {
            for (let x = 1; x < GW-1; x++) {
                const i = y*GW + x;
                div[i] = -0.5 * h * (
                    u[i+1] - u[i-1] +
                    v[i+GW] - v[i-GW]
                );
            }
        }
        // Gauss-Seidel solve for pressure
        for (let iter = 0; iter < 20; iter++) {
            for (let y = 1; y < GH-1; y++) {
                for (let x = 1; x < GW-1; x++) {
                    const i = y*GW + x;
                    p[i] = (div[i] + p[i-1] + p[i+1] + p[i-GW] + p[i+GW]) * 0.25;
                }
            }
        }
        // Subtract pressure gradient from velocity
        for (let y = 1; y < GH-1; y++) {
            for (let x = 1; x < GW-1; x++) {
                const i = y*GW + x;
                u[i] -= 0.5 * (p[i+1]  - p[i-1])  / h;
                v[i] -= 0.5 * (p[i+GW] - p[i-GW]) / h;
            }
        }
    }

    _step() {
        const GW = this.GW, GH = this.GH;
        const dt = this._dt;

        // Gravity direction from face tilt
        const gx = (this._faceX - 0.5) * 0.08;
        const gy = 0.05;  // always slightly downward + face bias

        // Buoyancy: hot regions rise, cold fall
        for (let i = 0; i < GW*GH; i++) {
            if (this._T[i] > 0.01) {
                this._v[i] -= this._T[i] * 0.12 + gy * 0.4;
                this._u[i] += this._T[i] * gx;
            }
        }

        // Velocity step
        this._diffuse(this._u0, this._u, this._visc, dt, 6);
        this._diffuse(this._v0, this._v, this._visc, dt, 6);

        // Reuse d0/T0 as pressure/divergence scratch for projection
        this._project(this._u0, this._v0, this._d0, this._T0);

        this._advect(this._u, this._u0, this._u0, this._v0, dt);
        this._advect(this._v, this._v0, this._u0, this._v0, dt);

        this._project(this._u, this._v, this._d0, this._T0);

        // Density + temperature step
        this._diffuse(this._d0, this._d, this._diff, dt, 4);
        this._advect(this._d, this._d0, this._u, this._v, dt);

        this._diffuse(this._T0, this._T, this._diff * 1.5, dt, 4);
        this._advect(this._T, this._T0, this._u, this._v, dt);

        // Dissipate
        for (let i = 0; i < GW*GH; i++) {
            this._d[i] *= this._dissip;
            this._T[i] *= this._tdissip;
            this._u[i] *= 0.995;
            this._v[i] *= 0.995;
        }
    }

    draw(time) {
        this.t += 0.016;
        this._blinkBurst = Math.max(0, this._blinkBurst - 0.016 * 0.8);

        const GW = this.GW, GH = this.GH;
        const W  = this.canvas.width  || 800;
        const H  = this.canvas.height || 600;

        // Update autonomous sources
        for (const src of this._sources) {
            src.phase += 0.016;
            const gx = Math.round((src.x + Math.sin(src.phase * 0.3) * 0.08) * (GW-2) + 1);
            const gy = Math.round(src.y * (GH-2) + 1);
            this._addSource(gx, gy, 1.8, 0.9, 3.5);
            // Add upward velocity
            const ci = gy * GW + gx;
            this._v[ci] -= 1.2;
            this._u[ci] += Math.sin(this.t * 0.7 + src.phase) * 0.3;

            if (this.t >= src.nextMove) {
                src.x = 0.15 + Math.random() * 0.70;
                src.y = 0.55 + Math.random() * 0.40;
                src.nextMove = this.t + 8 + Math.random() * 16;
            }
        }

        // Run simulation
        this._step();

        // ── Render to ImageData ────────────────────────────────────────────────
        const img = this._offCtx.createImageData(GW, GH);
        const d   = img.data;

        for (let y = 0; y < GH; y++) {
            for (let x = 0; x < GW; x++) {
                const i   = y * GW + x;
                const den = Math.min(1, this._d[i] * 0.55);
                const tmp = Math.min(1, this._T[i] * 0.42);

                if (den < 0.005) {
                    const p = i * 4;
                    d[p] = 0; d[p+1] = 0; d[p+2] = 2; d[p+3] = 255;
                    continue;
                }

                // Vorticity for hue — compute curl of velocity
                let vort = 0;
                if (x > 0 && x < GW-1 && y > 0 && y < GH-1) {
                    vort = (this._v[i+1] - this._v[i-1]) -
                           (this._u[i+GW] - this._u[i-GW]);
                }
                const vortSign = vort > 0 ? 1 : -1;
                const vortMag  = Math.min(1, Math.abs(vort) * 0.25);

                // Hue: temperature → warm amber; vorticity → shifts warm/cool
                // Cold neutral smoke: blue-gray. Hot: amber-gold. Vortex: violet/rose
                let hue, sat, lit;
                if (tmp > 0.3) {
                    // Hot: amber/gold
                    hue = 38 - tmp * 20;
                    sat = 70 + tmp * 25;
                    lit = 35 + den * 45 + tmp * 20;
                } else {
                    // Cool smoke: steel blue to violet, shifted by vorticity
                    hue = 220 + vortSign * vortMag * 55;
                    sat = 30 + vortMag * 45;
                    lit = 15 + den * 60;
                }

                // Convert HSL → RGB
                const [r, g, b] = hslToRgb(hue / 360, sat / 100, Math.min(0.88, lit / 100));
                const p = i * 4;
                d[p] = r; d[p+1] = g; d[p+2] = b; d[p+3] = 255;
            }
        }

        this._offCtx.putImageData(img, 0, 0);

        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch(e) {}
        ctx.drawImage(this._off, 0, 0, W, H);

        if (this.t < 4) {
            ctx.font = '10px Helvetica Neue, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180, 200, 240, 0.18)';
            ctx.fillText('blink to inject a hot plume', W / 2, H - 22);
            ctx.textAlign = 'left';
        }
    }
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q-p)*6*t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q-p)*(2/3-t)*6;
            return p;
        };
        const q = l < 0.5 ? l*(1+s) : l+s-l*s;
        const p = 2*l-q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}
