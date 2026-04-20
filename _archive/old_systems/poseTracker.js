// PoseTracker — MediaPipe Pose, upper-body skeleton tracking.
//
// Tracks 33 body landmarks. Primary use:
//   · Wrist positions drive water ripple (more precise than frame-diff)
//   · Full skeleton exposed for the pip overlay
//
// onPoseMove(nx, ny, speed) — called each frame a body is detected.
//   nx/ny = position of the faster-moving wrist (raw, 0-1, not mirrored)
//   speed = normalised movement magnitude
class PoseTracker {
    constructor(onPoseMove) {
        this.onPoseMove    = onPoseMove;
        this.video         = null;
        this.pose          = null;
        this.camera        = null;
        this.isActive      = false;
        this.lastLandmarks = null;   // exposed for overlay

        this._prevL = null;   // previous left wrist {x,y}
        this._prevR = null;   // previous right wrist {x,y}
    }

    async start() {
        this.video = document.createElement('video');
        this.video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0;';
        document.body.appendChild(this.video);

        this.pose = new Pose({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
        });

        this.pose.setOptions({
            modelComplexity:        1,
            smoothLandmarks:        true,
            enableSegmentation:     false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence:  0.5,
        });

        this.pose.onResults(r => this._processResults(r));

        this.camera = new Camera(this.video, {
            onFrame: async () => { await this.pose.send({ image: this.video }); },
            width:  320,
            height: 240,
        });

        await this.camera.start();
        this.isActive = true;
    }

    stop() {
        if (this.camera) { this.camera.stop(); this.camera = null; }
        if (this.video) {
            const s = this.video.srcObject;
            if (s) s.getTracks().forEach(t => t.stop());
            this.video.remove();
            this.video = null;
        }
        this.isActive      = false;
        this.lastLandmarks = null;
        this._prevL = this._prevR = null;
    }

    _processResults(results) {
        if (!results.poseLandmarks) {
            this.lastLandmarks = null;
            return;
        }
        const lm = results.poseLandmarks;
        this.lastLandmarks = lm;

        // Left wrist = 15, right wrist = 16
        const lw = lm[15], rw = lm[16];

        let speedL = 0, speedR = 0;
        if (this._prevL) {
            const dx = lw.x - this._prevL.x, dy = lw.y - this._prevL.y;
            speedL = Math.sqrt(dx*dx + dy*dy);
        }
        if (this._prevR) {
            const dx = rw.x - this._prevR.x, dy = rw.y - this._prevR.y;
            speedR = Math.sqrt(dx*dx + dy*dy);
        }
        this._prevL = { x: lw.x, y: lw.y };
        this._prevR = { x: rw.x, y: rw.y };

        const speed = Math.max(speedL, speedR);
        if (speed < 0.003 || !this.onPoseMove) return;

        // Use the faster wrist for ripple origin
        const wrist = speedL >= speedR ? lw : rw;
        this.onPoseMove(wrist.x, wrist.y, speed);
    }
}
