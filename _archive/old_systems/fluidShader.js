'use strict';

// ── Fluid Shader ──────────────────────────────────────────────────────────────
// Domain-warped fractal noise rendered in WebGL, layered over the mandala canvas
// via CSS mix-blend-mode: screen. Dark areas stay transparent; bright areas add
// a slow-moving meditation-blue color wash.
//
// Usage:
//   const fs = new FluidShader();
//   fs.start();          // begin animation
//   fs.stop();           // pause
//   fs.onBlink();        // trigger ripple from center
//   fs.resize();         // call on window resize
// ─────────────────────────────────────────────────────────────────────────────

class FluidShader {
    constructor() {
        this._canvas = document.createElement('canvas');
        this._canvas.id = 'shaderCanvas';
        document.body.appendChild(this._canvas);

        // premultipliedAlpha:false → correct alpha for CSS compositing
        this._gl = this._canvas.getContext('webgl', {
            premultipliedAlpha: false,
            alpha: true,
            antialias: false,
        });

        this._dead    = false;
        this._running = false;
        this._raf     = null;
        this._t0      = performance.now();
        this._blinkAmt = 0;
        this._blinkPos = [0.5, 0.5]; // normalised [0..1], origin bottom-left in GL

        if (!this._gl) {
            console.warn('FluidShader: WebGL not available');
            this._dead = true;
            return;
        }

        this._setup();
        this.resize();
    }

    // ── WebGL initialisation ─────────────────────────────────────────────────

    _setup() {
        const gl = this._gl;

        // ── Vertex shader — just a full-screen quad ──────────────────────────
        const VERT = `
            attribute vec2 a_pos;
            void main() {
                gl_Position = vec4(a_pos, 0.0, 1.0);
            }
        `;

        // ── Fragment shader — domain-warped FBM in meditation blues ──────────
        //
        // Technique: two rounds of domain warping (Inigo Quilez, 2003)
        //   q = fbm(uv + t)
        //   r = fbm(uv + 4·q + t)
        //   f = fbm(uv + 3·r + t)
        //
        // The three fbm calls produce a slowly churning organic flow.
        // A mediump-safe hash avoids precision artifacts.
        const FRAG = `
            precision mediump float;

            uniform float u_time;
            uniform vec2  u_res;
            uniform float u_blinkAmt;
            uniform vec2  u_blinkPos;

            // --- mediump-safe hash (no large sin argument) ------------------
            float hash(vec2 p) {
                p = fract(p * vec2(0.1031, 0.1030));
                p += dot(p, p + 33.33);
                return fract((p.x + p.y) * p.x);
            }

            // --- bicubic smooth noise ----------------------------------------
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);     // smoothstep
                return mix(
                    mix(hash(i),                hash(i + vec2(1.0, 0.0)), f.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
                    f.y
                );
            }

            // --- FBM: 5 octaves, gentle 30° rotation per octave -------------
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                // 30° rotation matrix — breaks grid alignment, adds isotropy
                mat2 rot = mat2(0.866, 0.5, -0.5, 0.866);
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p  = rot * p * 2.05 + vec2(3.17, 7.43);
                    a *= 0.48;
                }
                return v;
            }

            // anchor: 0 = form (blue), 1 = breath (amber), 2 = sound (teal)
            uniform int u_anchor;

            // --- Palette: form — deep navy → royal blue → periwinkle → violet
            vec3 palForm(float t) {
                t = clamp(t, 0.0, 1.0);
                vec3 c0 = vec3(0.01, 0.03, 0.14);
                vec3 c1 = vec3(0.05, 0.16, 0.50);
                vec3 c2 = vec3(0.18, 0.40, 0.80);
                vec3 c3 = vec3(0.40, 0.62, 0.92);
                vec3 c4 = vec3(0.68, 0.78, 0.98);
                if (t < 0.25) return mix(c0, c1, t * 4.0);
                if (t < 0.50) return mix(c1, c2, (t - 0.25) * 4.0);
                if (t < 0.75) return mix(c2, c3, (t - 0.50) * 4.0);
                return mix(c3, c4, (t - 0.75) * 4.0);
            }

            // --- Palette: breath — near-black → deep amber → warm gold → pale gold
            vec3 palBreath(float t) {
                t = clamp(t, 0.0, 1.0);
                vec3 c0 = vec3(0.06, 0.02, 0.01);
                vec3 c1 = vec3(0.28, 0.12, 0.03);
                vec3 c2 = vec3(0.62, 0.32, 0.08);
                vec3 c3 = vec3(0.86, 0.60, 0.22);
                vec3 c4 = vec3(0.96, 0.86, 0.60);
                if (t < 0.25) return mix(c0, c1, t * 4.0);
                if (t < 0.50) return mix(c1, c2, (t - 0.25) * 4.0);
                if (t < 0.75) return mix(c2, c3, (t - 0.50) * 4.0);
                return mix(c3, c4, (t - 0.75) * 4.0);
            }

            // --- Palette: sound — near-black → deep jade → teal → pale mint
            vec3 palSound(float t) {
                t = clamp(t, 0.0, 1.0);
                vec3 c0 = vec3(0.01, 0.05, 0.04);
                vec3 c1 = vec3(0.02, 0.18, 0.15);
                vec3 c2 = vec3(0.06, 0.42, 0.34);
                vec3 c3 = vec3(0.22, 0.66, 0.52);
                vec3 c4 = vec3(0.58, 0.86, 0.74);
                if (t < 0.25) return mix(c0, c1, t * 4.0);
                if (t < 0.50) return mix(c1, c2, (t - 0.25) * 4.0);
                if (t < 0.75) return mix(c2, c3, (t - 0.50) * 4.0);
                return mix(c3, c4, (t - 0.75) * 4.0);
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_res;

                // Very slow time — the whole field takes ~2.5 minutes to fully cycle
                float t = u_time * 0.042;

                // Two-level domain warp
                vec2 q = vec2(
                    fbm(uv * 2.0 + t),
                    fbm(uv * 2.0 + vec2(5.24, 1.31) + t * 0.80)
                );
                vec2 r = vec2(
                    fbm(uv * 2.0 + 4.0 * q + vec2(1.70, 9.20) + t * 0.60),
                    fbm(uv * 2.0 + 4.0 * q + vec2(8.30, 2.80) + t * 0.50)
                );
                float f = fbm(uv * 2.0 + 3.0 * r + t * 0.35);

                // Blink ripple — concentric outward wave from u_blinkPos
                if (u_blinkAmt > 0.001) {
                    float d = length(uv - u_blinkPos);
                    // Wave front: speed 2.2 normalised units/s, decay with distance & time
                    float wave = sin(d * 20.0 - u_time * 3.0)
                                 * exp(-d * 5.5)
                                 * u_blinkAmt;
                    f = clamp(f + wave * 0.22, 0.0, 1.0);
                }

                vec3 col;
                if (u_anchor == 1) col = palBreath(f);
                else if (u_anchor == 2) col = palSound(f);
                else col = palForm(f);

                // Alpha: dark areas stay transparent, bright areas glow through.
                // smoothstep range controls how much of the field is visible.
                float alpha = smoothstep(0.24, 0.70, f) * 0.46;

                gl_FragColor = vec4(col, alpha);
            }
        `;

        const prog = this._buildProgram(VERT, FRAG);
        if (!prog) { this._dead = true; return; }
        this._prog = prog;
        gl.useProgram(prog);

        // Full-screen quad (two triangles covering clip space)
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,   1, -1,   -1,  1,
             1, -1,   1,  1,   -1,  1,
        ]), gl.STATIC_DRAW);

        const aPos = gl.getAttribLocation(prog, 'a_pos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        // Uniform handles
        this._u = {
            time:     gl.getUniformLocation(prog, 'u_time'),
            res:      gl.getUniformLocation(prog, 'u_res'),
            blinkAmt: gl.getUniformLocation(prog, 'u_blinkAmt'),
            blinkPos: gl.getUniformLocation(prog, 'u_blinkPos'),
            anchor:   gl.getUniformLocation(prog, 'u_anchor'),
        };

        // Default: form / blue
        gl.uniform1i(this._u.anchor, 0);

        // Alpha blending within the WebGL framebuffer
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
    }

    _buildProgram(vSrc, fSrc) {
        const gl = this._gl;

        const compile = (type, src) => {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error('FluidShader compile error:\n', gl.getShaderInfoLog(sh));
                return null;
            }
            return sh;
        };

        const vert = compile(gl.VERTEX_SHADER,   vSrc);
        const frag = compile(gl.FRAGMENT_SHADER, fSrc);
        if (!vert || !frag) return null;

        const prog = gl.createProgram();
        gl.attachShader(prog, vert);
        gl.attachShader(prog, frag);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('FluidShader link error:\n', gl.getProgramInfoLog(prog));
            return null;
        }
        return prog;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    // Render at half pixel resolution — WebGL bilinear handles soft noise beautifully
    resize() {
        if (this._dead) return;
        this._canvas.width  = Math.max(1, Math.floor(window.innerWidth  / 2));
        this._canvas.height = Math.max(1, Math.floor(window.innerHeight / 2));
        this._gl.viewport(0, 0, this._canvas.width, this._canvas.height);
    }

    // Set colour anchor — call before start(), or any time to shift palette
    // anchor: 'form' (default blue) | 'breath' (amber) | 'sound' (teal)
    setAnchor(anchor) {
        if (this._dead) return;
        const idx = { form: 0, breath: 1, sound: 2 }[anchor] ?? 0;
        this._gl.useProgram(this._prog);
        this._gl.uniform1i(this._u.anchor, idx);
    }

    // Call whenever a blink is detected
    onBlink(normX = 0.5, normY = 0.5) {
        if (this._dead) return;
        // GL y-axis is flipped relative to page (origin at bottom-left)
        this._blinkPos = [normX, 1.0 - normY];
        this._blinkAmt = 1.0;
    }

    start() {
        if (this._dead || this._running) return;
        this._running = true;
        this._canvas.classList.add('active');
        const tick = () => {
            if (!this._running) return;
            this._raf = requestAnimationFrame(tick);
            this._render();
        };
        tick();
    }

    stop() {
        this._running = false;
        cancelAnimationFrame(this._raf);
        this._canvas.classList.remove('active');
    }

    // ── Render loop ──────────────────────────────────────────────────────────

    _render() {
        const gl = this._gl;
        const t  = (performance.now() - this._t0) / 1000;

        // Blink energy decays to 0 over ~1.4 s at 60 fps
        this._blinkAmt = Math.max(0, this._blinkAmt - 0.012);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(this._u.time,     t);
        gl.uniform2f(this._u.res,      this._canvas.width, this._canvas.height);
        gl.uniform1f(this._u.blinkAmt, this._blinkAmt);
        gl.uniform2fv(this._u.blinkPos, this._blinkPos);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
