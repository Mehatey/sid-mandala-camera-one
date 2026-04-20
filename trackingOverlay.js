// TrackingOverlay — TouchDesigner-style visualisation drawn over the camera pip.
//
// Draws on a canvas that sits pixel-perfect on top of the pip video.
// Updated each animation frame via tick(blinker, tracker).
//
// Visuals:
//   · Face mesh: key contour points, eye outline, iris cross-hair, nose, lips
//   · Hand skeleton: all 21 landmarks connected with finger-bone lines
//   · Corner brackets (scope / sensor aesthetic)
//   · Animated scan line
//   · Tiny status label ("FACE · HAND")
//   · EAR blink-level micro-bar (bottom edge)

class TrackingOverlay {
    constructor(pipEl) {
        this._pip = pipEl;
        this._W   = 112;
        this._H   = 84;
        this._scan = 0;   // scan-line y position 0..1

        // Create overlay canvas — sits on top of the video
        this._canvas = document.createElement('canvas');
        this._canvas.width  = this._W;
        this._canvas.height = this._H;
        Object.assign(this._canvas.style, {
            position:      'absolute',
            inset:         '0',
            width:         '100%',
            height:        '100%',
            pointerEvents: 'none',
            zIndex:        '2',
        });
        // pip is position:fixed which already acts as containing block — don't change it
        pipEl.appendChild(this._canvas);

        this._ctx = this._canvas.getContext('2d');

        // MediaPipe hand connection pairs (21 landmarks)
        this._HAND_CONNECTIONS = [
            [0,1],[1,2],[2,3],[3,4],          // thumb
            [0,5],[5,6],[6,7],[7,8],           // index
            [0,9],[9,10],[10,11],[11,12],      // middle
            [0,13],[13,14],[14,15],[15,16],    // ring
            [0,17],[17,18],[18,19],[19,20],    // pinky
            [5,9],[9,13],[13,17],              // palm arch
        ];

        // Face contour landmark indices (subset — oval + brows)
        this._FACE_OVAL = [
            10, 338, 297, 332, 284, 251, 389, 356, 454,
            323, 361, 288, 397, 365, 379, 378, 400, 377,
            152, 148, 176, 149, 150, 136, 172,  58, 132,
             93, 234, 127, 162,  21,  54, 103,  67, 109, 10
        ];

        // Eye landmark groups for connection lines
        this._RIGHT_EYE = [33, 160, 158, 133, 153, 144, 33];
        this._LEFT_EYE  = [362, 385, 387, 263, 373, 380, 362];

        // Lips (simplified outer contour)
        this._LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
                      375, 321, 405, 314, 17, 84, 181, 91, 146, 61];

        // Nose bridge
        this._NOSE = [168, 6, 197, 195, 5, 4, 1];

        this._lastEAR = 0;
        this._faceDetected = false;
        this._handDetected = false;
    }

    // Map normalised landmark (0-1) to pip canvas pixels.
    // x is mirrored to match the CSS scaleX(-1) on the video element.
    _lx(nx) { return (1 - nx) * this._W; }
    _ly(ny) { return ny * this._H; }

    _drawPath(ctx, lm, indices, close) {
        if (!indices.length) return;
        ctx.beginPath();
        ctx.moveTo(this._lx(lm[indices[0]].x), this._ly(lm[indices[0]].y));
        for (let i = 1; i < indices.length; i++) {
            const p = lm[indices[i]];
            ctx.lineTo(this._lx(p.x), this._ly(p.y));
        }
        if (close) ctx.closePath();
    }

    _drawFace(ctx, lm) {
        ctx.save();

        // Face oval outline
        ctx.strokeStyle = 'rgba(0, 220, 180, 0.30)';
        ctx.lineWidth   = 0.6;
        this._drawPath(ctx, lm, this._FACE_OVAL, false);
        ctx.stroke();

        // Eyes
        ctx.strokeStyle = 'rgba(80, 210, 255, 0.55)';
        ctx.lineWidth   = 0.7;
        this._drawPath(ctx, lm, this._RIGHT_EYE, true);
        ctx.stroke();
        this._drawPath(ctx, lm, this._LEFT_EYE, true);
        ctx.stroke();

        // Nose bridge
        ctx.strokeStyle = 'rgba(0, 200, 160, 0.22)';
        ctx.lineWidth   = 0.5;
        this._drawPath(ctx, lm, this._NOSE, false);
        ctx.stroke();

        // Lips
        ctx.strokeStyle = 'rgba(80, 180, 255, 0.22)';
        ctx.lineWidth   = 0.5;
        this._drawPath(ctx, lm, this._LIPS, true);
        ctx.stroke();

        // Iris cross-hairs (landmarks 468 right, 473 left)
        for (const idx of [468, 473]) {
            if (!lm[idx]) continue;
            const ix = this._lx(lm[idx].x);
            const iy = this._ly(lm[idx].y);
            const r  = 3.5;
            ctx.strokeStyle = 'rgba(120, 240, 200, 0.80)';
            ctx.lineWidth   = 0.7;
            // Circle
            ctx.beginPath();
            ctx.arc(ix, iy, r, 0, Math.PI * 2);
            ctx.stroke();
            // Cross
            ctx.beginPath();
            ctx.moveTo(ix - r * 1.7, iy); ctx.lineTo(ix + r * 1.7, iy);
            ctx.moveTo(ix, iy - r * 1.7); ctx.lineTo(ix, iy + r * 1.7);
            ctx.stroke();
        }

        // Nose tip dot
        const nt = lm[1];
        ctx.fillStyle = 'rgba(0, 230, 190, 0.60)';
        ctx.beginPath();
        ctx.arc(this._lx(nt.x), this._ly(nt.y), 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // EAR micro-bar — bottom strip (3px tall)
        const rightEAR = this._calcEAR(lm, 33, 160, 158, 133, 153, 144);
        const leftEAR  = this._calcEAR(lm, 362, 385, 387, 263, 373, 380);
        this._lastEAR  = (rightEAR + leftEAR) * 0.5;
    }

    _calcEAR(lm, p1, p2, p3, p4, p5, p6) {
        const d = (a, b) => Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);
        const v = (d(p2, p6) + d(p3, p5)) / (2 * d(p1, p4) + 0.0001);
        return Math.min(1, v);
    }

    _drawHand(ctx, lm) {
        ctx.save();

        // Bone connections
        ctx.strokeStyle = 'rgba(255, 180, 60, 0.45)';
        ctx.lineWidth   = 0.7;
        for (const [a, b] of this._HAND_CONNECTIONS) {
            if (!lm[a] || !lm[b]) continue;
            ctx.beginPath();
            ctx.moveTo(this._lx(lm[a].x), this._ly(lm[a].y));
            ctx.lineTo(this._lx(lm[b].x), this._ly(lm[b].y));
            ctx.stroke();
        }

        // Landmark dots — fingertips brighter
        const FINGERTIPS = new Set([4, 8, 12, 16, 20]);
        for (let i = 0; i < lm.length; i++) {
            const p = lm[i];
            const tip = FINGERTIPS.has(i);
            const r   = tip ? 1.8 : 1.0;
            ctx.fillStyle = tip
                ? 'rgba(255, 200, 80, 0.90)'
                : 'rgba(255, 160, 40, 0.55)';
            ctx.beginPath();
            ctx.arc(this._lx(p.x), this._ly(p.y), r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawChrome(ctx, faceDetected, handDetected) {
        const W = this._W, H = this._H;
        const L = 7;   // bracket arm length
        const T = 0.7; // bracket line width

        // Corner brackets
        ctx.strokeStyle = 'rgba(0, 210, 170, 0.55)';
        ctx.lineWidth   = T;
        const corners = [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]];
        for (const [x, y, sx, sy] of corners) {
            ctx.beginPath();
            ctx.moveTo(x + sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * L);
            ctx.stroke();
        }

        // Centre crosshair (very faint)
        ctx.strokeStyle = 'rgba(0, 180, 140, 0.12)';
        ctx.lineWidth   = 0.4;
        ctx.beginPath();
        ctx.moveTo(W/2 - 5, H/2); ctx.lineTo(W/2 + 5, H/2);
        ctx.moveTo(W/2, H/2 - 5); ctx.lineTo(W/2, H/2 + 5);
        ctx.stroke();

        // Scan line
        this._scan = (this._scan + 0.008) % 1;
        const sy = this._scan * H;
        const sg = ctx.createLinearGradient(0, sy - 4, 0, sy + 4);
        sg.addColorStop(0,   'rgba(0, 230, 180, 0)');
        sg.addColorStop(0.5, 'rgba(0, 230, 180, 0.18)');
        sg.addColorStop(1,   'rgba(0, 230, 180, 0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, sy - 4, W, 8);

        // Status label — bottom-left
        ctx.font         = '4.5px monospace';
        ctx.fillStyle    = 'rgba(0, 200, 160, 0.65)';
        const parts = [];
        if (faceDetected) parts.push('FACE');
        if (handDetected) parts.push('HAND');
        if (!parts.length) parts.push('SCANNING');
        ctx.fillText(parts.join(' · '), 3, H - 3);

        // EAR bar — 3px tall strip at very bottom
        if (faceDetected) {
            const earNorm = Math.min(1, this._lastEAR / 0.35);   // ~0.35 = fully open
            ctx.fillStyle = 'rgba(80, 220, 200, 0.18)';
            ctx.fillRect(0, H - 2, W * earNorm, 2);
        }

        // Top-right: detection indicator dot
        const dotColor = (faceDetected || handDetected)
            ? 'rgba(0, 240, 180, 0.80)'
            : 'rgba(80, 80, 80, 0.40)';
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(W - 5, 5, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Call after the pip's innerHTML is reset and video re-added — re-appends the canvas on top
    reattach() {
        this._pip.appendChild(this._canvas);
    }

    tick(blinker, tracker) {
        const ctx = this._ctx;
        const W = this._W, H = this._H;
        ctx.clearRect(0, 0, W, H);

        const faceLM = blinker?.lastLandmarks   || null;
        const handLMs = tracker?.lastAllLandmarks || null;

        this._faceDetected = !!faceLM;
        this._handDetected = !!(handLMs && handLMs.length);

        if (faceLM)  this._drawFace(ctx, faceLM);
        if (handLMs) for (const lm of handLMs) this._drawHand(ctx, lm);

        this._drawChrome(ctx, this._faceDetected, this._handDetected);
    }
}
