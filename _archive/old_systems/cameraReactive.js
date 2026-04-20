// Simple Camera Reactivity - Detects brightness and motion
class CameraReactive {
    constructor(videoElement, callback) {
        this.video = videoElement;
        this.callback = callback;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastFrame = null;
        this.brightness = 0.5;
        this.motion = 0;
        this.isRunning = false;
    }

    async start() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 320,
                    height: 240,
                    facingMode: 'user'
                }
            });

            this.video.srcObject = stream;
            this.video.play();

            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth || 320;
                this.canvas.height = this.video.videoHeight || 240;
                this.isRunning = true;
                this.processFrame();
            });
        } catch (error) {
            console.log('Camera not available, using defaults');
            // Continue without camera
            this.brightness = 0.5;
            this.motion = 0;
            if (this.callback) {
                this.callback(this.brightness, this.motion);
            }
        }
    }

    processFrame() {
        if (!this.isRunning || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(() => this.processFrame());
            return;
        }

        // Draw video frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Calculate brightness
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            totalBrightness += (r + g + b) / 3;
        }
        this.brightness = (totalBrightness / (data.length / 4)) / 255;

        // Calculate motion (difference from last frame)
        if (this.lastFrame) {
            let motionSum = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                const lastR = this.lastFrame[i];
                const lastG = this.lastFrame[i + 1];
                const lastB = this.lastFrame[i + 2];
                const lastBrightness = (lastR + lastG + lastB) / 3;
                
                motionSum += Math.abs(brightness - lastBrightness);
            }
            this.motion = (motionSum / (data.length / 4)) / 255;
            this.motion = Math.min(1, this.motion * 10); // Amplify motion
        }

        // Store current frame
        this.lastFrame = new Uint8ClampedArray(data);

        // Smooth values
        this.brightness = this.brightness * 0.3 + this.brightness * 0.7;
        this.motion = this.motion * 0.5 + this.motion * 0.5;

        if (this.callback) {
            this.callback(this.brightness, this.motion);
        }

        requestAnimationFrame(() => this.processFrame());
    }

    stop() {
        this.isRunning = false;
        if (this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
    }
}

