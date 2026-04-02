// Distraction System — GIFs erupt from screen centre, drift outward, then dissolve.
class DistractionSystem {

    static GIF_MAP = {
        stillness: 'coin.gif',
        depth:     'time.gif',
        form:      'purse.gif',
        woven:     'pizza.gif',
        forest:    'lighter.gif',
        pixel:     'robot.gif',
        sound:     'eye.gif',
        breath:    'blob.gif',
    };

    constructor() {
        this.sprites      = [];
        this.active       = false;
        this.currentScene = null;

        this._container = document.createElement('div');
        this._container.id = 'distractionLayer';
        document.body.appendChild(this._container);
    }

    startScene(sceneName) {
        this._clear();
        this.currentScene = sceneName;

        const gif = DistractionSystem.GIF_MAP[sceneName];
        if (!gif) return;

        this.active = true;

        // Spawn 1–3 sprites with a slight stagger
        const count = Math.random() < 0.35 ? (Math.random() < 0.5 ? 2 : 3) : 1;
        for (let i = 0; i < count; i++) {
            const delay = i * 420; // ms stagger
            setTimeout(() => {
                if (this.active) this.sprites.push(new DistractionSprite(gif, this._container));
            }, delay);
        }
    }

    onBlink() {}
    onGaze()  {}

    update(dt) {
        if (!this.active) return;
        for (let i = this.sprites.length - 1; i >= 0; i--) {
            this.sprites[i].update(dt);
            if (this.sprites[i].dead) {
                this.sprites.splice(i, 1);
            }
        }
        if (this.sprites.length === 0) this.active = false;
    }

    stop() { this._clear(); }

    _clear() {
        this.sprites.forEach(s => s.destroy());
        this.sprites = [];
        this.active  = false;
    }
}

// ── Single distraction sprite ─────────────────────────────────────────────────
class DistractionSprite {
    static FADE_IN_END    = 0.55;
    static FADE_OUT_START = 13.0;
    static LIFETIME       = 17.0;

    constructor(src, container) {
        this.age  = 0;
        this.dead = false;

        const w = window.innerWidth, h = window.innerHeight;
        this.bw = w; this.bh = h;

        // Start at screen centre
        this.x = w / 2;
        this.y = h / 2;

        // Random outward angle + speed
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.4 + Math.random() * 1.1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Slight random initial tilt that settles over time
        this.tilt    = (Math.random() - 0.5) * 28;
        this.tiltSpd = -this.tilt / 9; // settles to ~0 over 9s

        this.opacity = 0;

        this._wrap = document.createElement('div');
        this._wrap.className = 'distraction-sprite';

        this._img = document.createElement('img');
        this._img.src = src;
        this._img.draggable = false;
        this._wrap.appendChild(this._img);

        container.appendChild(this._wrap);
        this._updateDOM();
    }

    update(dt) {
        this.age += dt;

        // Decelerate: full speed → ~15% over first 8s
        const speedF = Math.max(0.15, 1 - this.age / 8);
        this.x += this.vx * speedF;
        this.y += this.vy * speedF;

        // Soft bounce at screen edges
        const PAD = 60;
        if (this.x < PAD || this.x > this.bw - PAD) this.vx *= -0.7;
        if (this.y < PAD || this.y > this.bh - PAD) this.vy *= -0.7;

        // Tilt settles
        this.tilt += this.tiltSpd * dt;

        // Perspective scale: small at centre → full size when far out
        const distFromCentre = Math.hypot(this.x - this.bw / 2, this.y - this.bh / 2);
        const maxDist = Math.hypot(this.bw / 2, this.bh / 2) * 0.9;
        this._perspScale = 0.28 + 0.72 * Math.min(1, distFromCentre / maxDist);

        // Opacity lifecycle
        if (this.age < DistractionSprite.FADE_IN_END) {
            this.opacity = this.age / DistractionSprite.FADE_IN_END;
        } else if (this.age < DistractionSprite.FADE_OUT_START) {
            this.opacity = 1.0;
        } else {
            const span = DistractionSprite.LIFETIME - DistractionSprite.FADE_OUT_START;
            this.opacity = Math.max(0, 1 - (this.age - DistractionSprite.FADE_OUT_START) / span);
        }

        if (this.age >= DistractionSprite.LIFETIME) {
            this.dead = true;
            this.destroy();
            return;
        }

        this._updateDOM();
    }

    _updateDOM() {
        const s = this._perspScale || 1;
        this._wrap.style.transform =
            `translate(${this.x}px, ${this.y}px) translate(-50%,-50%) scale(${s}) rotate(${this.tilt}deg)`;
        this._wrap.style.opacity = this.opacity;
    }

    destroy() { this._wrap.remove(); }
}
