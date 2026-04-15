// Blink Detector — MediaPipe FaceMesh + Eye Aspect Ratio
// Calls onBlink() callback each time a complete blink is detected.
class BlinkDetector {
    constructor(onBlink, onGaze) {
        this.onBlink        = onBlink;
        this.onGaze         = onGaze || null;
        this.isActive       = false;
        this.lastBlinkTime  = 0;
        this.COOLDOWN_MS    = 600;   // min ms between registered blinks
        this.EAR_THRESHOLD  = 0.21;  // updated adaptively once baseline is known
        this.CONSEC_FRAMES  = 1;     // 1 frame is enough — faster response
        this.belowCount     = 0;
        this.blinkLocked    = false; // prevents long squint from multi-firing

        // Adaptive baseline — calibrates to each user's open-eye EAR
        this._earSamples    = [];
        this._baselineEAR   = null;  // set after 40 steady frames

        this.video    = null;
        this.faceMesh = null;
        this.camera   = null;
    }

    async start() {
        // Hidden video element for camera feed
        this.video = document.createElement('video');
        this.video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0;';
        document.body.appendChild(this.video);

        this.faceMesh = new FaceMesh({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults(r => this._processResults(r));

        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.faceMesh.send({ image: this.video });
            },
            width: 320,
            height: 240
        });

        await this.camera.start();
        this.isActive = true;
    }

    stop() {
        if (this.camera) { this.camera.stop(); this.camera = null; }
        if (this.video)  {
            const stream = this.video.srcObject;
            if (stream) stream.getTracks().forEach(t => t.stop());
            this.video.remove();
            this.video = null;
        }
        this.isActive = false;
    }

    // Eye Aspect Ratio: ratio of vertical to horizontal eye span.
    // When closed, vertical distances collapse → EAR drops sharply.
    _ear(lm, p1, p2, p3, p4, p5, p6) {
        const d = (a, b) => Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);
        return (d(p2, p6) + d(p3, p5)) / (2 * d(p1, p4));
    }

    _processResults(results) {
        if (!results.multiFaceLandmarks?.length) return;
        const lm = results.multiFaceLandmarks[0];

        // MediaPipe FaceMesh landmark indices for 6-point EAR
        // Right eye: outer=33  topFar=160 topNear=158 inner=133 botNear=153 botFar=144
        // Left eye:  outer=362 topFar=385 topNear=387 inner=263 botNear=373 botFar=380
        const rightEAR = this._ear(lm, 33,  160, 158, 133, 153, 144);
        const leftEAR  = this._ear(lm, 362, 385, 387, 263, 373, 380);
        const ear      = (rightEAR + leftEAR) * 0.5;

        // Iris gaze — landmarks 468 (right iris center) and 473 (left iris center)
        // available when refineLandmarks: true
        if (this.onGaze && lm[468] && lm[473]) {
            const gazeX = (lm[468].x + lm[473].x) * 0.5;
            const gazeY = (lm[468].y + lm[473].y) * 0.5;
            this.onGaze(gazeX, gazeY);
        }

        // ── Adaptive baseline calibration ────────────────────────────────────
        // Collect open-eye EAR samples until we have 40, then fix threshold
        // at 68% of baseline. This adapts to each user's natural eye shape.
        if (!this._baselineEAR) {
            // Only sample when eyes appear open (ear reasonably high)
            if (ear > 0.18) {
                this._earSamples.push(ear);
                if (this._earSamples.length >= 40) {
                    const sorted = [...this._earSamples].sort((a, b) => a - b);
                    // Use median to ignore any accidental blinks during calibration
                    const median = sorted[Math.floor(sorted.length / 2)];
                    this._baselineEAR  = median;
                    this.EAR_THRESHOLD = median * 0.68;
                }
            }
        }

        if (ear < this.EAR_THRESHOLD) {
            this.belowCount++;
            // Long squint (>15 frames ~0.5s) — lock so it won't fire on re-open
            if (this.belowCount > 15) this.blinkLocked = true;
        } else {
            // Eyes just opened
            if (this.belowCount >= this.CONSEC_FRAMES && !this.blinkLocked) {
                const now = Date.now();
                if (now - this.lastBlinkTime > this.COOLDOWN_MS) {
                    this.lastBlinkTime = now;
                    this.onBlink();
                }
            }
            this.belowCount  = 0;
            this.blinkLocked = false;
        }
    }
}
