// Quote Mode — mindfulness quotes, haiku, and poems.
// Blink to receive the next verse. Breathe. Read. Return.
class QuoteMode {
    constructor(ctx, canvas) {
        this.ctx        = ctx;
        this.canvas     = canvas;
        this.blinkCount = 0;
        this.current    = null;
        this.pending    = null;
        this.alpha      = 0;
        this.state      = 'waiting';  // 'waiting' | 'fadein' | 'visible' | 'fadeout'
        this.particles  = [];
        this.resize();
        this.quotes     = this._buildQuotes();
        this._used      = new Set();
    }

    resize() {
        this.w = this.canvas.width;
        this.h = this.canvas.height;
    }

    onBlink() {
        this.blinkCount++;
        const q = this._pick();
        if (this.state === 'visible') {
            this.pending = q;
            this.state   = 'fadeout';
        } else if (this.state === 'waiting' || this.state === 'fadein') {
            this.current = q;
            this.alpha   = 0;
            this.state   = 'fadein';
        }
        this._spawnParticles();
    }

    _pick() {
        if (this._used.size >= this.quotes.length) this._used.clear();
        let idx;
        do { idx = Math.floor(Math.random() * this.quotes.length); } while (this._used.has(idx));
        this._used.add(idx);
        return this.quotes[idx];
    }

    _spawnParticles() {
        for (let i = 0; i < 14; i++) {
            this.particles.push({
                x:    this.w / 2 + (Math.random() - 0.5) * this.w * 0.55,
                y:    this.h / 2 + (Math.random() - 0.5) * this.h * 0.35,
                vx:   (Math.random() - 0.5) * 0.5,
                vy:   -0.08 - Math.random() * 0.35,
                life: 1,
                size: 0.5 + Math.random() * 1.4,
                hue:  180 + Math.random() * 130
            });
        }
    }

    draw(time) {
        const ctx = this.ctx;

        // Near-black vignette fade
        ctx.fillStyle = 'rgba(3, 4, 10, 0.20)';
        ctx.fillRect(0, 0, this.w, this.h);

        // Very faint floating particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= 0.0035;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 45%, 72%, ${p.life * 0.22})`;
            ctx.fill();
        }

        // State machine
        if (this.state === 'fadein') {
            this.alpha = Math.min(1, this.alpha + 0.007);
            if (this.alpha >= 1) this.state = 'visible';
        } else if (this.state === 'fadeout') {
            this.alpha = Math.max(0, this.alpha - 0.010);
            if (this.alpha <= 0) {
                this.current = this.pending;
                this.pending = null;
                this.alpha   = 0;
                this.state   = 'fadein';
            }
        }

        if (this.current && this.alpha > 0) this._renderQuote(this.current, this.alpha, time);

        // Waiting prompt
        if (this.state === 'waiting') {
            const a = 0.18 + 0.12 * Math.sin(time * 1.1);
            ctx.fillStyle   = `rgba(200, 210, 235, ${a})`;
            ctx.font        = '13px Georgia, serif';
            ctx.textAlign   = 'center';
            ctx.fillText('blink to receive', this.w / 2, this.h * 0.84);
        }
    }

    _renderQuote(q, alpha, time) {
        const ctx    = this.ctx;
        const cx     = this.w / 2;
        const cy     = this.h / 2;
        const breath = 1 + 0.003 * Math.sin(time * 0.35);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(breath, breath);
        ctx.textAlign = 'center';

        const lines = q.text.split('\n');
        const isMini = lines.length > 2;
        const fontSize = isMini ? 20 : 26;
        const lineH    = isMini ? 40 : 52;
        const totalH   = lines.length * lineH;

        // Decorative line above
        const dw = 68;
        ctx.strokeStyle = `rgba(140, 165, 215, ${alpha * 0.28})`;
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        ctx.moveTo(-dw, -totalH / 2 - 22);
        ctx.lineTo( dw, -totalH / 2 - 22);
        ctx.stroke();

        // Quote body
        ctx.font      = `${fontSize}px Georgia, 'Times New Roman', serif`;
        ctx.fillStyle = `rgba(238, 242, 255, ${alpha})`;
        lines.forEach((line, i) => {
            ctx.fillText(line.trim(), 0, -totalH / 2 + i * lineH + lineH * 0.65);
        });

        // Attribution
        if (q.attr) {
            ctx.font      = `italic 12px Georgia, serif`;
            ctx.fillStyle = `rgba(155, 178, 225, ${alpha * 0.68})`;
            ctx.fillText(`— ${q.attr}`, 0, totalH / 2 + 28);
        }

        // Decorative line below
        ctx.strokeStyle = `rgba(140, 165, 215, ${alpha * 0.28})`;
        ctx.beginPath();
        ctx.moveTo(-dw, totalH / 2 + 50);
        ctx.lineTo( dw, totalH / 2 + 50);
        ctx.stroke();

        ctx.restore();
    }

    _buildQuotes() {
        return [
            { text: "Be here now.", attr: "Ram Dass" },
            { text: "The present moment\nis the only moment\navailable to us.", attr: "Thich Nhất Hạnh" },
            { text: "An old silent pond—\na frog jumps into the pond.\nSplash! Silence again.", attr: "Matsuo Bashō" },
            { text: "You are the sky.\nEverything else\nis just the weather.", attr: "Pema Chödrön" },
            { text: "Over the wintry forest,\nwinds howl in rage\nwith no leaves to blow.", attr: "Natsume Sōseki" },
            { text: "Wherever you are,\nbe there totally.", attr: "Eckhart Tolle" },
            { text: "The quieter you become,\nthe more you can hear.", attr: "Ram Dass" },
            { text: "Not knowing\nis most intimate.", attr: "Dizang Guichen" },
            { text: "The obstacle\nis the path.", attr: "Zen proverb" },
            { text: "Before enlightenment —\nchop wood, carry water.\nAfter — the same.", attr: "Zen proverb" },
            { text: "Between stimulus\nand response there is a space.\nIn that space: freedom.", attr: "Viktor Frankl" },
            { text: "This too shall pass.", attr: "Persian proverb" },
            { text: "When you realize\nnothing is lacking,\nthe whole world belongs to you.", attr: "Lao Tzu" },
            { text: "In the beginner's mind\nthere are many possibilities.\nIn the expert's — few.", attr: "Shunryu Suzuki" },
            { text: "Feelings come and go\nlike clouds in a windy sky.\nBreathing is my anchor.", attr: "Thich Nhất Hạnh" },
            { text: "Autumn moonlight—\na worm digs silently\ninto the dark.", attr: "Matsuo Bashō" },
            { text: "Do not dwell in the past,\ndo not dream of the future.\nConcentrate the mind on now.", attr: "The Buddha" },
            { text: "What you seek\nis seeking\nyou.", attr: "Rumi" },
            { text: "Empty your mind.\nBe formless. Shapeless.\nLike water.", attr: "Bruce Lee" },
            { text: "Silence\nis the language\nof God.", attr: "Rumi" },
            { text: "A gentle breeze,\nmoving silently\nthrough the cosmos.", attr: "" },
            { text: "Your task is not\nto seek love, but to find\nall the barriers within.", attr: "Rumi" },
        ];
    }
}
