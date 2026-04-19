// Nature Sort Mode — nature videos progressively pixel-sorted into meditative AI vision.
//
// HOW TO USE YOUR OWN VIDEOS:
//   Drop .mp4 / .webm files into a `videos/` subfolder next to complete.html, then add
//   their filenames to the _sources array below.  The mode works without any videos
//   by using a procedural organic fallback that is also pixel-sorted.
//
// Sort behaviour:
//   A "sort front" sweeps slowly left-to-right across the frame (~10 s per pass).
//   Every column to the left of the front has its pixels sorted by brightness —
//   dark rows sink, bright rows rise — creating long vertical streaks where the
//   natural image dissolves into pure luminance geometry.
//   After a full pass the front retreats, then the next video loads.
//   Blink jumps immediately to the next video and resets the sort.
//
class NatureSortMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.t      = 0;

        // ── Video sources ──────────────────────────────────────────────
        // Add your own mp4/webm filenames here (relative to complete.html).
        // Leave array empty to use the procedural fallback only.
        this._sources = [
            'videos/nature1.mp4',
            'videos/nature2.mp4',
            'videos/nature3.mp4',
            'videos/water.mp4',
            'videos/forest.mp4',
            'videos/clouds.mp4',
            'videos/rain.mp4',
        ];

        this._videos   = [];   // HTMLVideoElement[]
        this._vidIdx   = 0;
        this._vidReady = false;

        // Sort state
        this._sortX    = 0;    // current sort front (0..BW)
        this._sortDir  = 1;    // +1 advance / -1 retreat
        this._holdT    = 0;    // time spent at full-sort hold
        this._HOLD_DUR = 4.5;  // seconds to stay fully sorted before retreating

        // Pixel buffers (low-res for performance)
        this._BW = 0; this._BH = 0;
        this._off = null; this._offCtx = null;
        this._sorted = null; this._sortedCtx = null;

        // Pre-allocated column scratch buffers (max 400px tall)
        this._cR   = new Uint8Array(400);
        this._cG   = new Uint8Array(400);
        this._cB   = new Uint8Array(400);
        this._cA   = new Uint8Array(400);
        this._cLum = new Float32Array(400);

        this._flash    = 0;
        this._tintHue  = 200;   // AI tint hue, shifts on each video
        this._scanY    = 0;     // scanning line Y position (0..1)
        this._noise    = null;  // procedural fallback canvas
        this._noiseCtx = null;
    }

    startScene() {
        this.t        = 0;
        this._sortX   = 0;
        this._sortDir = 1;
        this._holdT   = 0;
        this._flash   = 0;
        this._scanY   = 0;
        this._tintHue = 180 + Math.random() * 60;

        this._initBuffers();
        this._loadVideos();
    }

    _initBuffers() {
        const W      = this.canvas.width  || 800;
        const H      = this.canvas.height || 600;
        const aspect = W / H;
        const BW     = 300;
        const BH     = Math.round(BW / aspect);

        this._BW = BW; this._BH = BH;

        if (!this._off) this._off = document.createElement('canvas');
        this._off.width  = BW; this._off.height = BH;
        this._offCtx = this._off.getContext('2d', { willReadFrequently: true });

        if (!this._sorted) this._sorted = document.createElement('canvas');
        this._sorted.width  = BW; this._sorted.height = BH;
        this._sortedCtx = this._sorted.getContext('2d', { willReadFrequently: true });

        if (!this._noise) this._noise = document.createElement('canvas');
        this._noise.width  = BW; this._noise.height = BH;
        this._noiseCtx = this._noise.getContext('2d');
    }

    _loadVideos() {
        if (this._videos.length > 0) {
            this._playVideo(this._vidIdx); return;
        }
        for (const src of this._sources) {
            const v      = document.createElement('video');
            v.src        = src;
            v.loop       = true;
            v.muted      = true;
            v.playsInline= true;
            v.crossOrigin= 'anonymous';
            v.preload    = 'auto';
            v._ok        = false;
            v.addEventListener('canplaythrough', () => {
                v._ok = true;
                if (!this._vidReady) { this._vidReady = true; this._playVideo(0); }
            });
            v.addEventListener('error', () => { v._ok = false; });
            this._videos.push(v);
            v.load();
        }
    }

    _playVideo(idx) {
        const N = this._videos.length;
        if (N === 0) { this._vidReady = false; return; }
        for (let i = 0; i < N; i++) {
            const v = this._videos[(idx + i) % N];
            if (v._ok) {
                this._vidIdx = (idx + i) % N;
                v.currentTime = Math.random() * Math.max(0, (v.duration || 30) - 5);
                v.play().catch(() => {});
                this._videos.forEach((vv, j) => { if (j !== this._vidIdx) vv.pause(); });
                return;
            }
        }
        this._vidReady = false;
    }

    _nextVideo() {
        this._sortX   = 0;
        this._sortDir = 1;
        this._holdT   = 0;
        this._tintHue = (this._tintHue + 35 + Math.random() * 50) % 360;
        if (this._vidReady) this._playVideo(this._vidIdx + 1);
    }

    onBlink() {
        this._flash = 1.0;
        this._nextVideo();
    }

    // ── Procedural organic fallback (forest-floor / deep-water aesthetic) ──
    _drawFallback(t) {
        const ctx = this._noiseCtx;
        const BW  = this._BW, BH = this._BH;
        // Build a flowing organic colour field in the noise buffer
        const step = 4;
        for (let x = 0; x < BW; x += step) {
            for (let y = 0; y < BH; y += step) {
                const nx = x / BW, ny = y / BH;
                // Three-layer sine noise
                const v1 = Math.sin(nx * 9.3 + t * 0.22) * Math.cos(ny * 7.1 + t * 0.18);
                const v2 = Math.sin((nx + ny) * 6.5 - t * 0.14) * 0.6;
                const v3 = Math.sin(nx * 4.2 - ny * 3.8 + t * 0.31) * 0.4;
                const v  = (v1 + v2 + v3) / 2;   // -1..1
                // Palette: deep greens, aquas, warm dappled light
                const hue  = 120 + v * 55 + Math.sin(t * 0.07) * 20;
                const sat  = 40 + v * 20;
                const lum  = 12 + (v + 1) * 18;
                ctx.fillStyle = `hsl(${hue},${sat}%,${lum}%)`;
                ctx.fillRect(x, y, step, step);
            }
        }
    }

    // ── Threshold pixel sort on one column ────────────────────────────
    // Scans for runs of pixels brighter than threshold, sorts each run
    // by luminance (dark sinks, bright rises).  Pre-allocated buffers used.
    _sortColumn(data, x) {
        const BW = this._BW, BH = this._BH;
        const cR = this._cR, cG = this._cG, cB = this._cB, cA = this._cA;
        const cLum = this._cLum;

        for (let y = 0; y < BH; y++) {
            const i   = (y * BW + x) * 4;
            cR[y]     = data[i];
            cG[y]     = data[i + 1];
            cB[y]     = data[i + 2];
            cA[y]     = data[i + 3];
            cLum[y]   = cR[y] * 0.299 + cG[y] * 0.587 + cB[y] * 0.114;
        }

        // Threshold: only sort "lit" runs (avoids sorting silhouettes)
        const THRESH = 22;
        let runStart = -1;

        for (let y = 0; y <= BH; y++) {
            const lit = y < BH && cLum[y] > THRESH;
            if (lit && runStart === -1) {
                runStart = y;
            } else if (!lit && runStart !== -1) {
                const len = y - runStart;
                if (len > 1) {
                    // Collect indices, sort by luminance
                    const run = [];
                    for (let j = 0; j < len; j++) run.push(runStart + j);
                    run.sort((a, b) => cLum[a] - cLum[b]);
                    // Copy to temp, write back in sorted order
                    const tR = new Uint8Array(len), tG = new Uint8Array(len);
                    const tB = new Uint8Array(len), tA = new Uint8Array(len);
                    for (let j = 0; j < len; j++) {
                        tR[j] = cR[run[j]]; tG[j] = cG[run[j]];
                        tB[j] = cB[run[j]]; tA[j] = cA[run[j]];
                    }
                    for (let j = 0; j < len; j++) {
                        const di = ((runStart + j) * BW + x) * 4;
                        data[di]   = tR[j]; data[di+1] = tG[j];
                        data[di+2] = tB[j]; data[di+3] = tA[j];
                    }
                }
                runStart = -1;
            }
        }
    }

    draw(time) {
        this.t += 0.016;
        this._flash = Math.max(0, this._flash - 0.016 * 1.4);
        this._scanY = (this._scanY + 0.0045) % 1;

        const ctx = this.ctx;
        const W   = this.canvas.width  || 800;
        const H   = this.canvas.height || 600;
        const BW  = this._BW, BH = this._BH;
        const t   = this.t;
        const fl  = this._flash;

        if (!this._off || this._BW === 0) this._initBuffers();

        // ── Draw source into off-canvas ─────────────────────────────
        const vid = this._videos[this._vidIdx];
        const useVideo = this._vidReady && vid && vid._ok && vid.readyState >= 2;

        if (useVideo) {
            this._offCtx.drawImage(vid, 0, 0, BW, BH);
        } else {
            this._drawFallback(t);
            this._offCtx.drawImage(this._noise, 0, 0, BW, BH);
        }

        // ── Advance sort front ─────────────────────────────────────
        // Full sweep: ~10 s for 300 cols → 0.5 cols/frame
        const ADV   = 0.50;
        const RETR  = 0.35;

        if (this._sortDir === 1) {
            this._sortX = Math.min(BW, this._sortX + ADV);
            if (this._sortX >= BW) {
                this._sortDir = 0;   // hold
                this._holdT   = 0;
            }
        } else if (this._sortDir === 0) {
            this._holdT += 0.016;
            if (this._holdT >= this._HOLD_DUR) this._sortDir = -1;
        } else {
            this._sortX = Math.max(0, this._sortX - RETR);
            if (this._sortX <= 0) { this._nextVideo(); }
        }

        // ── Apply pixel sort ───────────────────────────────────────
        let imgData;
        try { imgData = this._offCtx.getImageData(0, 0, BW, BH); }
        catch(e) { ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H); return; }

        const sortCols = Math.floor(this._sortX);
        for (let x = 0; x < sortCols; x++) {
            this._sortColumn(imgData.data, x);
        }

        this._offCtx.putImageData(imgData, 0, 0);

        // ── Composite onto main canvas ─────────────────────────────
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(this._off, 0, 0, W, H);
        ctx.restore();

        // ── AI tint on the sorted region ───────────────────────────
        // Subtle cool desaturation overlay — makes sorted area feel "processed"
        if (sortCols > 0) {
            const tintW = (sortCols / BW) * W;
            const tintG = ctx.createLinearGradient(0, 0, tintW, 0);
            tintG.addColorStop(0,   `hsla(${this._tintHue}, 60%, 40%, 0.10)`);
            tintG.addColorStop(0.85,`hsla(${this._tintHue}, 50%, 30%, 0.08)`);
            tintG.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = tintG;
            ctx.fillRect(0, 0, tintW, H);
        }

        // ── Sort-front edge glow ───────────────────────────────────
        if (this._sortDir !== 0) {
            const ex  = (this._sortX / BW) * W;
            const dir = this._sortDir;
            const eg  = ctx.createLinearGradient(ex - 18 * dir, 0, ex + 6 * dir, 0);
            eg.addColorStop(0,   'rgba(0,0,0,0)');
            eg.addColorStop(0.6, `hsla(${this._tintHue}, 80%, 70%, 0.10)`);
            eg.addColorStop(1,   `hsla(${this._tintHue}, 90%, 85%, 0.35)`);
            ctx.fillStyle = eg;
            ctx.fillRect(ex - 20, 0, 26, H);
        }

        // ── Horizontal scan line (single bright sweep) ─────────────
        const scanYpx = this._scanY * H;
        const scanG   = ctx.createLinearGradient(0, scanYpx - 8, 0, scanYpx + 8);
        scanG.addColorStop(0,   'rgba(0,0,0,0)');
        scanG.addColorStop(0.5, `hsla(${this._tintHue}, 80%, 80%, 0.08)`);
        scanG.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = scanG;
        ctx.fillRect(0, scanYpx - 8, W, 16);

        // ── CRT scan-line texture (every 3px) ─────────────────────
        ctx.save();
        ctx.globalAlpha = 0.045;
        ctx.fillStyle   = '#000';
        for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
        ctx.restore();

        // ── Faint dot grid on sorted region only ──────────────────
        if (sortCols > 2) {
            const sortW = (sortCols / BW) * W;
            ctx.save();
            ctx.globalAlpha = 0.04 + 0.02 * Math.sin(t * 0.3);
            for (let gx = 0; gx < sortW; gx += 12) {
                for (let gy = 0; gy < H; gy += 12) {
                    ctx.fillStyle = `hsla(${this._tintHue}, 70%, 70%, 1)`;
                    ctx.fillRect(gx, gy, 1, 1);
                }
            }
            ctx.restore();
        }

        // ── Vignette ─────────────────────────────────────────────
        const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.20, W/2, H/2, Math.max(W,H)*0.72);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.62)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // ── Subtle mode label ─────────────────────────────────────
        if (useVideo) {
            const prog = this._sortX / BW;
            const word = this._sortDir === 1  ? 'dissolving' :
                         this._sortDir === 0  ? 'crystallised' : 'returning';
            ctx.save();
            ctx.font        = `${Math.round(W * 0.016)}px monospace`;
            ctx.fillStyle   = `hsla(${this._tintHue}, 60%, 70%, ${0.10 + prog * 0.08})`;
            ctx.textAlign   = 'right';
            ctx.textBaseline= 'bottom';
            ctx.fillText(word, W - Math.round(W * 0.025), H - Math.round(H * 0.03));
            ctx.restore();
        }

        // ── Blink flash ──────────────────────────────────────────
        if (fl > 0.02) {
            ctx.fillStyle = `rgba(255,255,255,${fl * 0.22})`;
            ctx.fillRect(0, 0, W, H);
        }
    }
}
