// lattice3dMode.js — 3D cubic lattice of glowing points with wave displacement
export class Lattice3DMode {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this._time = 0;
    this._rotY = 0;
    this._rotX = 0;
    this._wavePulse = 0;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._impulseX = 0;
    this._impulseZ = 0;
    this._points = [];
    this._buildLattice();
  }

  _buildLattice() {
    const N = 5;
    const SPACING = 60;
    this._points = [];
    for (let ix = 0; ix < N; ix++) {
      for (let iy = 0; iy < N; iy++) {
        for (let iz = 0; iz < N; iz++) {
          this._points.push({
            ox: (ix - 2) * SPACING,
            oy: (iy - 2) * SPACING,
            oz: (iz - 2) * SPACING,
            ix, iy, iz,
          });
        }
      }
    }
  }

  startScene(scene) {
    this._time = 0;
    this._rotY = 0;
    this._rotX = 0.3;
    this._wavePulse = 0;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._buildLattice();
  }

  onBlink() {
    this._wavePulse = 1;
  }

  onGaze(nx, ny) {
    this._gazeX = nx;
    this._gazeY = ny;
    // Convert gaze to 3D impulse coords
    this._impulseX = (nx - 0.5) * 240;
    this._impulseZ = (ny - 0.5) * 240;
  }

  stopScene() {}
  resize() {}

  draw(dt) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    const focalLen = W * 0.85;

    this._time += dt;
    this._rotY += dt * 0.3;
    this._rotX += dt * 0.15;
    this._wavePulse *= 0.97;

    // Background fade
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,5,0.22)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const cosY = Math.cos(this._rotY), sinY = Math.sin(this._rotY);
    const cosX = Math.cos(this._rotX), sinX = Math.sin(this._rotX);

    const amplitude = 18 + this._wavePulse * 55;

    // Project all points
    const proj = this._points.map(p => {
      // Wave displacement on Y axis
      const dist = Math.sqrt(p.ox*p.ox + p.oz*p.oz);
      const wave = Math.sin(dist * 0.15 - this._time * 2) * amplitude;

      // Gaze impulse — local disturbance near nearest point
      const gdx = p.ox - this._impulseX;
      const gdz = p.oz - this._impulseZ;
      const gdist = Math.sqrt(gdx*gdx + gdz*gdz);
      const gazeWave = Math.exp(-gdist * 0.015) * Math.sin(gdist * 0.2 - this._time * 4) * 20;

      let x = p.ox;
      let y = p.oy + wave + gazeWave;
      let z = p.oz;

      // Y rotation
      const rx = x*cosY - z*sinY;
      const rz = x*sinY + z*cosY;
      // X rotation
      const ry2 = y*cosX - rz*sinX;
      const rz2 = y*sinX + rz*cosX;

      const s = focalLen / (focalLen + rz2 + focalLen * 0.3);
      return {
        sx: cx + rx * s,
        sy: cy + ry2 * s,
        z: rz2,
        s,
        ix: p.ix, iy: p.iy, iz: p.iz,
        idx: this._points.indexOf(p),
      };
    });

    const N = 5;

    // Draw connections first (back to front sort handled by low alpha)
    ctx.save();
    for (let i = 0; i < this._points.length; i++) {
      const p = this._points[i];
      const pp = proj[i];
      const neighbors = [
        p.ix < N-1 ? i + N*N : -1,
        p.iy < N-1 ? i + N   : -1,
        p.iz < N-1 ? i + 1   : -1,
      ];
      for (const ni of neighbors) {
        if (ni < 0 || ni >= proj.length) continue;
        const np = proj[ni];
        const avgZ = (pp.z + np.z) / 2;
        const depthAlpha = Math.max(0, Math.min(0.55, 0.55 - avgZ * 0.0008));
        if (depthAlpha < 0.02) continue;
        ctx.beginPath();
        ctx.moveTo(pp.sx, pp.sy);
        ctx.lineTo(np.sx, np.sy);
        ctx.strokeStyle = `rgba(80,180,255,${depthAlpha.toFixed(3)})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
    ctx.restore();

    // Sort points back to front
    const sortedProj = [...proj].sort((a, b) => a.z - b.z);

    for (const pp of sortedProj) {
      ctx.save();
      const depthT = Math.max(0, Math.min(1, 1 - pp.z * 0.0012 + 0.5));
      const r = Math.max(1.5, 5 * pp.s * depthT);
      const alpha = Math.max(0.1, Math.min(1, depthT * 0.9 + 0.1));

      const hue = 180 + pp.ix * 12 + pp.iy * 8;
      const grad = ctx.createRadialGradient(pp.sx, pp.sy, 0, pp.sx, pp.sy, r * 2.2);
      grad.addColorStop(0, `hsla(${hue},100%,90%,${alpha.toFixed(2)})`);
      grad.addColorStop(0.4, `hsla(${hue},90%,65%,${(alpha*0.7).toFixed(2)})`);
      grad.addColorStop(1, `hsla(${hue},80%,40%,0)`);

      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, r * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue},100%,95%,${alpha.toFixed(2)})`;
      ctx.shadowColor = `hsl(${hue},100%,80%)`;
      ctx.shadowBlur = 8 * pp.s;
      ctx.fill();
      ctx.restore();
    }
  }
}
