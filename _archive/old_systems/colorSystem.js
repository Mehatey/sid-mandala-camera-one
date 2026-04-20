// Psychedelic Color System
class ColorSystem {
    constructor() {
        this.time = 0;
        this.colorModes = {
            psychedelic: this.psychedelicColor.bind(this),
            mandelbrot: this.mandelbrotColor.bind(this),
            neon: this.neonColor.bind(this),
            ocean: this.oceanColor.bind(this),
            fire: this.fireColor.bind(this)
        };
    }

    update(deltaTime) {
        this.time += deltaTime;
    }

    getColor(x, y, z = 0, mode = 'psychedelic', intensity = 1.0) {
        const colorFunc = this.colorModes[mode] || this.colorModes.psychedelic;
        return colorFunc(x, y, z, intensity);
    }

    // Psychedelic: Vibrant, shifting colors
    psychedelicColor(x, y, z, intensity) {
        const scale = 0.01;
        const r = Math.sin((x * scale + this.time * 0.5) * intensity) * 0.5 + 0.5;
        const g = Math.sin((y * scale + this.time * 0.7) * intensity + Math.PI / 3) * 0.5 + 0.5;
        const b = Math.sin((z * scale + this.time * 0.9) * intensity + Math.PI * 2 / 3) * 0.5 + 0.5;

        return {
            r: Math.floor(r * 255),
            g: Math.floor(g * 255),
            b: Math.floor(b * 255),
            alpha: 0.7 + Math.sin(this.time + x * 0.01) * 0.3
        };
    }

    // Mandelbrot-style: Deep blues, purples, magentas
    mandelbrotColor(x, y, z, intensity) {
        const scale = 0.005;
        const dist = Math.sqrt(x * x + y * y) * scale;
        const angle = Math.atan2(y, x);
        
        const r = Math.sin(dist * 2 + this.time * 0.3 + angle) * 0.3 + 0.7;
        const g = Math.sin(dist * 3 + this.time * 0.4 + angle + Math.PI / 4) * 0.4 + 0.6;
        const b = Math.sin(dist * 4 + this.time * 0.5 + angle + Math.PI / 2) * 0.5 + 0.5;

        return {
            r: Math.floor(r * 200 + 55),
            g: Math.floor(g * 100 + 50),
            b: Math.floor(b * 255),
            alpha: 0.8 + Math.sin(dist * 10) * 0.2
        };
    }

    // Neon: Bright cyan, magenta, yellow
    neonColor(x, y, z, intensity) {
        const scale = 0.02;
        const hue = (Math.atan2(y, x) + Math.PI) / (Math.PI * 2) + this.time * 0.1;
        const sat = 0.8 + Math.sin((x + y) * scale) * 0.2;
        const val = 0.9 + Math.sin(z * scale + this.time) * 0.1;

        return this.hsvToRgb(hue, sat, val);
    }

    // Ocean: Deep blues and teals
    oceanColor(x, y, z, intensity) {
        const scale = 0.01;
        const depth = Math.sin((x + y) * scale + this.time * 0.2) * 0.5 + 0.5;
        
        return {
            r: Math.floor(20 + depth * 50),
            g: Math.floor(100 + depth * 100),
            b: Math.floor(150 + depth * 105),
            alpha: 0.6 + depth * 0.4
        };
    }

    // Fire: Reds, oranges, yellows
    fireColor(x, y, z, intensity) {
        const scale = 0.015;
        const heat = Math.sin((x + y) * scale - this.time * 0.5) * 0.5 + 0.5;
        
        return {
            r: Math.floor(200 + heat * 55),
            g: Math.floor(100 + heat * 100),
            b: Math.floor(heat * 50),
            alpha: 0.7 + heat * 0.3
        };
    }

    hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = v - c;
        let r, g, b;

        if (h < 1/6) { r = c; g = x; b = 0; }
        else if (h < 2/6) { r = x; g = c; b = 0; }
        else if (h < 3/6) { r = 0; g = c; b = x; }
        else if (h < 4/6) { r = 0; g = x; b = c; }
        else if (h < 5/6) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return {
            r: Math.floor((r + m) * 255),
            g: Math.floor((g + m) * 255),
            b: Math.floor((b + m) * 255),
            alpha: 0.8
        };
    }

    toRGBA(color) {
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha})`;
    }

    toHex(color) {
        return `#${[color.r, color.g, color.b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('')}`;
    }
}

