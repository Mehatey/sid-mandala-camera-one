// Hand Tracker — MediaPipe Hands
// Tracks hand movement and pinch gestures.
// onHandMove(normX, normY)          — called every frame with primary hand position
// onPinch(label, normX, normY)      — called on pinch start; label = 'Left'|'Right'
class HandTracker {
    constructor(onHandMove, onPinch) {
        this.onHandMove  = onHandMove;
        this.onPinch     = onPinch;
        this.video       = null;
        this.handsModel  = null;
        this.camera      = null;
        this.isActive    = false;
        this.PINCH_DIST  = 0.07;
        this._pinchState = {};   // label → boolean
        this.lastPos          = null; // {x, y}
        this.lastAllLandmarks = null; // exposed for overlay — array of per-hand landmark arrays
    }

    async start() {
        this.video = document.createElement('video');
        this.video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0;';
        document.body.appendChild(this.video);

        this.handsModel = new Hands({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
        });
        this.handsModel.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });
        this.handsModel.onResults(r => this._processResults(r));

        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.handsModel.send({ image: this.video });
            },
            width: 320,
            height: 240
        });

        await this.camera.start();
        this.isActive = true;
    }

    stop() {
        if (this.camera) { this.camera.stop(); this.camera = null; }
        if (this.video) {
            const stream = this.video.srcObject;
            if (stream) stream.getTracks().forEach(t => t.stop());
            this.video.remove();
            this.video = null;
        }
        this.isActive = false;
        this.lastPos = null;
    }

    _processResults(results) {
        if (!results.multiHandLandmarks?.length) {
            this._pinchState = {};
            this.lastPos = null;
            this.lastAllLandmarks = null;
            return;
        }
        this.lastAllLandmarks = results.multiHandLandmarks;

        // Use first detected hand for movement tracking
        const lm0  = results.multiHandLandmarks[0];
        const px   = lm0[9].x; // middle-finger MCP = good palm center
        const py   = lm0[9].y;
        this.lastPos = { x: px, y: py };
        if (this.onHandMove) this.onHandMove(px, py);

        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const lm    = results.multiHandLandmarks[i];
            const label = results.multiHandedness?.[i]?.label || 'Right';
            const thumb = lm[4];
            const index = lm[8];
            const dist  = Math.hypot(thumb.x - index.x, thumb.y - index.y);
            const pinch = dist < this.PINCH_DIST;
            const mx    = (thumb.x + index.x) * 0.5;
            const my    = (thumb.y + index.y) * 0.5;

            if (pinch && !this._pinchState[label]) {
                this._pinchState[label] = true;
                if (this.onPinch) this.onPinch(label, mx, my);
            } else if (!pinch) {
                this._pinchState[label] = false;
            }
        }
    }
}
