// helix3dMode.js — Double helix (DNA) rotating in 3D
class Helix3DMode {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this._time = 0;
    this._phase = 0;
    this._rotY = 0;
    this._rotX = 0;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._themeIndex = 0;
    this._themes = [
      { strandA: '#00cfff', strandB: '#ff6680', rung: '#aaffee', bg: 'rgba(0,0,8,0.18)' },
      { strandA: '#ffaa00', strandB: '#ff44aa', rung: '#ffeeaa', bg: 'rgba(8,4,0,0.18)' },
      { strandA: '#44ff99', strandB: '#ff9944', rung: '#ccffdd', bg: 'rgba(0,8,2,0.18)' },
      { strandA: '#cc88ff', strandB: '#44ccff', rung: '#ddbbff', bg: 'rgba(4,0,8,0.18)' },
    ];
    this._NODES = 40;
  }

  startScene(scene) {
    this._time = 0;
    this._phase = 0;
    this._rotY = 0;
    this._rotX = 0.15;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._themeIndex = 0;
  }

  onBlink() {
    this._themeIndex = (this._themeIndex + 1) % this._themes.length;
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
    const cx = W / 2, cy = H / 2;
    const focalLen = W * 0.85;

    this._time += dt;
    this._phase += dt * 0.9;
    this._rotY += dt * 0.45;

    // Gaze tilts X rotation target
    const targetRotX = (this._gazeY - 0.5) * 1.1 + 0.15;
    this._rotX += (targetRotX - this._rotX) * dt * 2.5;

    const theme = this._themes[this._themeIndex];

    // Trail fade
    ctx.save();
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const cosY = Math.cos(this._rotY), sinY = Math.sin(this._rotY);
    const cosX = Math.cos(this._rotX), sinX = Math.sin(this._rotX);

    const NODES = this._NODES;
    const STEP = 0.4;
    const RADIUS = Math.min(W, H) * 0.18;
    const SPACING = H / (NODES + 4);

    // Build both strands
    const strandA = [], strandB = [];
    for (let i = 0; i < NODES; i++) {
      const t = i * STEP;
      const yBase = (i - NODES / 2) * SPACING;

      // Strand A
      const ax = Math.cos(t + this._phase) * RADIUS;
      const az = Math.sin(t + this._phase) * RADIUS;
      strandA.push(project3D(ax, yBase, az, cosY, sinY, cosX, sinX, cx, cy, focalLen));

      // Strand B (180° out of phase)
      const bx = Math.cos(t + this._phase + Math.PI) * RADIUS;
      const bz = Math.sin(t + this._phase + Math.PI) * RADIUS;
      strandB.push(project3D(bx, yBase, bz, cosY, sinY, cosX, sinX, cx, cy, focalLen));
    }

    // Collect all nodes with strand identity for depth sorting
    const allNodes = [];
    for (let i = 0; i < NODES; i++) {
      allNodes.push({ ...strandA[i], strand: 'A', i });
      allNodes.push({ ...strandB[i], strand: 'B', i });
    }
    allNodes.sort((a, b) => a.z - b.z);

    // Draw rungs (connecting corresponding nodes between strands) first
    ctx.save();
    for (let i = 0; i < NODES; i++) {
      if (i % 3 !== 0) continue; // every 3rd node for clarity
      const pa = strandA[i], pb = strandB[i];
      const avgZ = (pa.z + pb.z) / 2;
      const alpha = depthAlpha(avgZ, 0.55);
      if (alpha < 0.03) continue;
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.strokeStyle = hexAlpha(theme.rung, alpha * 0.7);
      ctx.lineWidth = Math.max(0.5, 1.5 * (pa.s + pb.s) * 0.5);
      ctx.shadowColor = theme.rung;
      ctx.shadowBlur = 4;
      ctx.stroke();
    }
    ctx.restore();

    // Draw strand lines
    for (const [strand, color] of [[strandA, theme.strandA], [strandB, theme.strandB]]) {
      ctx.save();
      for (let i = 0; i < NODES - 1; i++) {
        const pa = strand[i], pb = strand[i+1];
        const avgZ = (pa.z + pb.z) / 2;
        const alpha = depthAlpha(avgZ, 0.75);
        if (alpha < 0.03) continue;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = hexAlpha(color, alpha);
        ctx.lineWidth = Math.max(0.8, 2.2 * (pa.s + pb.s) * 0.5);
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw nodes as 3D spheres (depth-sorted)
    for (const node of allNodes) {
      const color = node.strand === 'A' ? theme.strandA : theme.strandB;
      const alpha = depthAlpha(node.z, 1.0);
      if (alpha < 0.05) continue;
      const r = Math.max(2, 7 * node.s);

      ctx.save();
      const grad = ctx.createRadialGradient(
        node.sx - r*0.3, node.sy - r*0.3, r*0.05,
        node.sx, node.sy, r
      );
      grad.addColorStop(0, hexAlpha('#ffffff', alpha * 0.9));
      grad.addColorStop(0.3, hexAlpha(color, alpha * 0.95));
      grad.addColorStop(1, hexAlpha(color, 0));

      ctx.beginPath();
      ctx.arc(node.sx, node.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 * node.s;
      ctx.fill();
      ctx.restore();
    }
  }
}

function project3D(x, y, z, cosY, sinY, cosX, sinX, cx, cy, focalLen) {
  // Y rotation
  const rx = x * cosY - z * sinY;
  const rz = x * sinY + z * cosY;
  // X rotation
  const ry2 = y * cosX - rz * sinX;
  const rz2 = y * sinX + rz * cosX;
  const s = focalLen / (focalLen + rz2 + focalLen * 0.4);
  return { sx: cx + rx * s, sy: cy + ry2 * s, z: rz2, s };
}

function depthAlpha(z, maxAlpha) {
  return Math.max(0, Math.min(maxAlpha, maxAlpha - z * 0.0007));
}

function hexAlpha(hex, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return hex;
}
