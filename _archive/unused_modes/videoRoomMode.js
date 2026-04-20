// Video Room Mode — calm spaces that expand from centre on each blink.
// Each blink opens the room further; portal dissolves back to black between rooms.
// Drop video files into the rooms array to activate.
class VideoRoomMode {
    constructor(ctx, canvas) {
        this.ctx    = ctx;
        this.canvas = canvas;
        this.roomIndex  = 0;
        this.blinkCount = 0;
        this.time       = 0;

        // Portal state
        this.portalR    = 0;          // current radius
        this.targetR    = 0;          // target radius
        this.maxR       = 0;          // full-screen radius
        this.portalAlpha = 0;

        // Transition between rooms
        this.transitioning = false;
        this.transAlpha    = 0;       // 0 = open, 1 = blacked out (closing)

        // Ripple rings on blink
        this.ripples = [];

        // Room definitions — add video src paths here when available
        this.rooms = [
            { label: 'fireplace',   src: null, hue: 25,  accent: [255, 160, 60]  },
            { label: 'forest',      src: null, hue: 130, accent: [100, 200, 120] },
            { label: 'ocean',       src: null, hue: 210, accent: [80,  160, 220] },
            { label: 'candlelight', src: null, hue: 40,  accent: [240, 190, 80]  },
            { label: 'rain window', src: null, hue: 195, accent: [140, 185, 220] },
        ];

        // Loaded video elements (keyed by room index)
        this._videoEls = {};

        this.resize();
        this._preloadVideos();
    }

    resize() {
        this.w    = this.canvas.width;
        this.h    = this.canvas.height;
        this.maxR = Math.hypot(this.w, this.h) / 2 + 20;
        if (!this.transitioning && this.targetR > 0) {
            this.targetR = this.maxR;
            this.portalR = this.maxR;
        }
    }

    onBlink() {
        this.blinkCount++;
        const room = this.rooms[this.roomIndex];

        // Ripple from centre
        this.ripples.push({
            r:     0,
            maxR:  Math.min(this.w, this.h) * 0.45,
            alpha: 0.55,
            hue:   room.hue,
        });

        if (this.portalR === 0 || this.targetR === 0) {
            // First blink in this room — open portal
            this.targetR    = this.maxR;
            this.portalAlpha = 1;
        } else {
            // Subsequent blink — advance to next room
            this._nextRoom();
        }
    }

    _nextRoom() {
        if (this.transitioning) return;
        this.transitioning = true;
        this.transAlpha    = 0;
        // Fade to black, swap room, re-open
        const advance = () => {
            this.transAlpha += 0.04;
            if (this.transAlpha < 1) {
                requestAnimationFrame(advance);
            } else {
                this.roomIndex = (this.roomIndex + 1) % this.rooms.length;
                this.portalR   = 0;
                this.targetR   = this.maxR;
                // Fade back in
                const reveal = () => {
                    this.transAlpha -= 0.035;
                    if (this.transAlpha > 0) {
                        requestAnimationFrame(reveal);
                    } else {
                        this.transAlpha    = 0;
                        this.transitioning = false;
                    }
                };
                requestAnimationFrame(reveal);
            }
        };
        requestAnimationFrame(advance);
    }

    draw(time) {
        this.time = time;
        const ctx = this.ctx;
        const cx  = this.w / 2, cy = this.h / 2;

        // Fade background
        ctx.fillStyle = 'rgba(2, 3, 14, 0.22)';
        ctx.fillRect(0, 0, this.w, this.h);

        // Grow portal toward target
        if (this.portalR < this.targetR) {
            this.portalR += (this.targetR - this.portalR) * 0.055;
            if (this.portalR > this.targetR - 0.5) this.portalR = this.targetR;
        }

        const room = this.rooms[this.roomIndex];
        const [ar, ag, ab] = room.accent;

        if (this.portalR > 1) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, this.portalR, 0, Math.PI * 2);
            ctx.clip();

            const vid = this._videoEls[this.roomIndex];
            if (vid && vid.readyState >= 2) {
                // Draw video
                const vw = vid.videoWidth  || this.w;
                const vh = vid.videoHeight || this.h;
                const scale = Math.max(this.w / vw, this.h / vh);
                const dw = vw * scale, dh = vh * scale;
                ctx.drawImage(vid, (this.w - dw) / 2, (this.h - dh) / 2, dw, dh);
            } else {
                // Placeholder — atmospheric gradient for this room's palette
                this._drawPlaceholder(ctx, cx, cy, room, time);
            }

            // Vignette
            const vig = ctx.createRadialGradient(cx, cy, this.portalR * 0.55, cx, cy, this.portalR);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(0,0,0,0.62)');
            ctx.fillStyle = vig;
            ctx.beginPath();
            ctx.arc(cx, cy, this.portalR, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Portal edge glow
        if (this.portalR > 2) {
            const breath = 0.92 + 0.08 * Math.sin(time * 1.1);
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, this.portalR * breath, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.18 * this.portalAlpha})`;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
            ctx.restore();
        }

        // Ripple rings
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const rip = this.ripples[i];
            rip.r    += (rip.maxR - rip.r) * 0.038;
            rip.alpha -= 0.007;
            if (rip.alpha <= 0) { this.ripples.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(cx, cy, rip.r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${rip.hue}, 60%, 70%, ${rip.alpha * 0.32})`;
            ctx.lineWidth   = 1.0;
            ctx.stroke();
        }

        // Room name label — faint, centre-bottom of portal
        if (this.portalR > 40 && this.portalAlpha > 0.2) {
            const labelY = cy + Math.min(this.portalR * 0.72, this.h * 0.38);
            ctx.save();
            ctx.globalAlpha = Math.min(0.38, this.portalAlpha * 0.38) * (this.portalR / this.maxR);
            ctx.font = '11px Helvetica Neue, Helvetica, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(${ar},${ag},${ab},1)`;
            ctx.letterSpacing = '0.3em';
            ctx.fillText(room.label.toLowerCase(), cx, labelY);
            ctx.restore();
        }

        // Room-change blackout overlay
        if (this.transAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.transAlpha;
            ctx.fillStyle   = '#000';
            ctx.fillRect(0, 0, this.w, this.h);
            ctx.restore();
        }
    }

    _drawPlaceholder(ctx, cx, cy, room, time) {
        const [ar, ag, ab] = room.accent;
        // Animated atmospheric gradient — stands in for video
        const flicker = 0.88 + 0.12 * Math.sin(time * 1.8 + room.hue);
        const g = ctx.createRadialGradient(cx, cy + this.h * 0.12, 0, cx, cy, this.h * 0.65);
        g.addColorStop(0,   `rgba(${ar},${ag},${ab},${0.28 * flicker})`);
        g.addColorStop(0.4, `rgba(${Math.round(ar*0.5)},${Math.round(ag*0.5)},${Math.round(ab*0.5)},0.12)`);
        g.addColorStop(1,   'rgba(4,5,18,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.w, this.h);

        // Subtle particle drift — tiny motes of light
        const seed = room.hue * 137.508;
        for (let i = 0; i < 24; i++) {
            const sx = Math.sin(i * 127.1 + seed) * 0.5 + 0.5;
            const sy = Math.sin(i * 311.7 + seed) * 0.5 + 0.5;
            const drift = Math.sin(time * (0.3 + (i % 5) * 0.08) + i) * 18;
            const px = cx + (sx - 0.5) * this.w * 0.7 + drift;
            const py = cy + (sy - 0.5) * this.h * 0.7 + drift * 0.5;
            const tw = 0.4 + 0.6 * Math.sin(time * (1 + (i % 4) * 0.3) + i * 0.7);
            ctx.beginPath();
            ctx.arc(px, py, (0.8 + tw * 1.4), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${ar},${ag},${ab},${tw * 0.22})`;
            ctx.fill();
        }
    }

    _preloadVideos() {
        for (let i = 0; i < this.rooms.length; i++) {
            const src = this.rooms[i].src;
            if (!src) continue;
            const v = document.createElement('video');
            v.src     = src;
            v.loop    = true;
            v.muted   = true;
            v.preload = 'auto';
            v.playsInline = true;
            v.play().catch(() => {});
            this._videoEls[i] = v;
        }
    }
}
