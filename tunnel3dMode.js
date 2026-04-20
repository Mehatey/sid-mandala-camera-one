// tunnel3dMode.js — Infinite 3D tunnel flythrough
class Tunnel3DMode {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this._rings = [];
    this._z = 0;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._paletteIndex = 0;
    this._palettes = [
      { inner: '#00cfff', outer: '#003366', glow: '#66eeff' }, // electric blue
      { inner: '#ffaa00', outer: '#3a1a00', glow: '#ffdd88' }, // amber
      { inner: '#00ff99', outer: '#003322', glow: '#aaffdd' }, // emerald
      { inner: '#cc66ff', outer: '#1a0033', glow: '#eeaaff' }, // violet
    ];
  }

  startScene(scene) {
    this._z = 0;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._paletteIndex = 0;
    this._buildRings();
  }

  _buildRings() {
    this._rings = [];
    const RING_COUNT = 20;
    const Z_SPREAD = 600;
    for (let i = 0; i < RING_COUNT; i++) {
      this._rings.push({
        z: (i / RING_COUNT) * Z_SPREAD,
        twistOffset: i * 0.18,
      });
    }
  }

  onBlink() {
    this._paletteIndex = (this._paletteIndex + 1) % this._palettes.length;
  }

  onGaze(nx, ny) {
    this._gazeX = nx;
    this._gazeY = ny;
  }

  stopScene() {}
  resize() {}

  draw(dt) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const palette = this._palettes[this._paletteIndex];
    const focalLen = W * 0.8;
    const SIDES = 8;
    const BASE_RADIUS = W * 0.38;
    const Z_SPREAD = 600;
    const ADVANCE = dt * 80;

    // Trail fade
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, W, H);

    // Gaze steering: offset the tunnel center
    const offsetX = (this._gazeX - 0.5) * W * 0.3;
    const offsetY = (this._gazeY - 0.5) * H * 0.3;
    const cx = W / 2 - offsetX;
    const cy = H / 2 - offsetY;

    // Advance z offset
    this._z = (this._z + ADVANCE) % Z_SPREAD;

    // Build projected rings with effective z
    const projected = this._rings.map(ring => {
      let z = (ring.z - this._z + Z_SPREAD) % Z_SPREAD;
      return { z, twistOffset: ring.twistOffset };
    });

    // Sort back to front (highest z first)
    projected.sort((a, b) => b.z - a.z);

    for (const ring of projected) {
      const z = ring.z;
      if (z < 1) continue;
      const scale = focalLen / (focalLen + z);
      const r = BASE_RADIUS * scale;
      const alpha = Math.min(1, scale * 1.4);

      // Compute polygon vertices
      const pts = [];
      for (let s = 0; s < SIDES; s++) {
        const angle = (s / SIDES) * Math.PI * 2 + ring.twistOffset;
        pts.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      }

      // Draw filled polygon with color
      ctx.save();
      const depthT = 1 - z / Z_SPREAD;
      const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      grad.addColorStop(0, hexAlpha(palette.outer, alpha * 0.7 * depthT));
      grad.addColorStop(0.5, hexAlpha(palette.inner, alpha * depthT));
      grad.addColorStop(1, hexAlpha(palette.outer, alpha * 0.7 * depthT));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < SIDES; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.strokeStyle = hexAlpha(palette.glow, alpha * 0.9 * depthT);
      ctx.lineWidth = Math.max(0.5, 2 * scale);
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 12 * scale;
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

function hexAlpha(hex, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
