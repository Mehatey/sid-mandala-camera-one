// nebvol3dMode.js — Software raymarched volumetric nebula at 1/4 resolution
export class NebVol3DMode {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this._time = 0;
    this._offscreen = null;
    this._offCtx = null;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._blinkPulse = 0;
    this._rotAngle = 0;
  }

  startScene(scene) {
    this._time = 0;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._blinkPulse = 0;
    this._rotAngle = 0;
    this._initOffscreen();
  }

  _initOffscreen() {
    const W = this.canvas.width, H = this.canvas.height;
    const ow = Math.floor(W / 4) || 1;
    const oh = Math.floor(H / 4) || 1;
    this._offscreen = document.createElement('canvas');
    this._offscreen.width = ow;
    this._offscreen.height = oh;
    this._offCtx = this._offscreen.getContext('2d');
  }

  onBlink() {
    this._blinkPulse = 1.0;
  }

  onGaze(nx, ny) {
    this._gazeX = nx;
    this._gazeY = ny;
  }

  stopScene() {
    this._offscreen = null;
    this._offCtx = null;
  }

  resize() {
    this._initOffscreen();
  }

  _density(x, y, z) {
    // Three overlapping soft spheres
    const spheres = [
      { cx: 0.3, cy: 0.1, cz: 0.2, r: 0.55 },
      { cx: -0.25, cy: -0.1, cz: -0.1, r: 0.48 },
      { cx: 0.05, cy: 0.3, cz: -0.3, r: 0.42 },
    ];
    let d = 0;
    for (const s of spheres) {
      const dx = x - s.cx, dy = y - s.cy, dz = z - s.cz;
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      d += Math.max(0, 1 - len / s.r);
    }
    // Turbulence
    d += Math.sin(x*4.0) * Math.sin(y*4.0) * Math.sin(z*4.0) * 0.18;
    return Math.max(0, d);
  }

  draw(dt) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    this._time += dt;
    this._rotAngle += dt * 0.12;
    this._blinkPulse *= 0.94;

    if (!this._offscreen || this._offscreen.width < 1) {
      this._initOffscreen();
    }
    const ow = this._offscreen.width;
    const oh = this._offscreen.height;

    const imgData = this._offCtx.createImageData(ow, oh);
    const data = imgData.data;

    const cosA = Math.cos(this._rotAngle), sinA = Math.sin(this._rotAngle);

    // Gaze star position in 3D space
    const starX = (this._gazeX - 0.5) * 0.6;
    const starY = (this._gazeY - 0.5) * 0.6;
    const starZ = 0.2;

    const STEPS = 16;
    const STEP_SIZE = 0.12;

    for (let py = 0; py < oh; py++) {
      for (let px = 0; px < ow; px++) {
        // Ray direction from camera
        const ndcX = (px / ow - 0.5) * (W / H);
        const ndcY = (py / oh - 0.5);
        const fov = 1.2;
        const rdx = ndcX * fov;
        const rdy = -ndcY * fov;
        const rdz = 1.0;
        const rdlen = Math.sqrt(rdx*rdx + rdy*rdy + rdz*rdz);

        let rx = rdx/rdlen, ry = rdy/rdlen, rz = rdz/rdlen;

        // Accumulate along ray
        let accR = 0, accG = 0, accB = 0, accA = 0;
        let ox = -rx * 0.5, oy = -ry * 0.5, oz = -rz * 0.5 + 0.1;

        for (let s = 0; s < STEPS && accA < 0.98; s++) {
          const tx = ox + rx * s * STEP_SIZE;
          const ty = oy + ry * s * STEP_SIZE;
          const tz = oz + rz * s * STEP_SIZE;

          // Rotate the density field
          const wx = tx * cosA - tz * sinA;
          const wz = tx * sinA + tz * cosA;

          const d = this._density(wx, ty, wz) * STEP_SIZE * 2.2;
          if (d <= 0) continue;

          // Color from depth and position
          const depth = s / STEPS;
          const cr = 40  + wx * 80  + depth * 60  + this._blinkPulse * 200;
          const cg = 20  + ty * 60  + depth * 30;
          const cb = 120 + wz * 100 + depth * 80;

          const alpha = Math.min(1 - accA, d * 1.8);
          accR += clamp01(cr/255) * alpha;
          accG += clamp01(cg/255) * alpha;
          accB += clamp01(cb/255) * alpha;
          accA += alpha;
        }

        // Gaze star contribution
        const sdx = ndcX*fov - starX, sdy = -ndcY*fov - starY;
        const starDist2 = sdx*sdx + sdy*sdy;
        const starGlow = Math.exp(-starDist2 * 18) * 0.7;
        accR += starGlow * 1.0;
        accG += starGlow * 0.92;
        accB += starGlow * 0.6;
        accA = Math.min(1, accA + starGlow * 0.4);

        // Blink flash: bright white from center
        const bcx = ndcX, bcy = ndcY;
        const bdist2 = bcx*bcx + bcy*bcy;
        const flash = this._blinkPulse * Math.exp(-bdist2 * 5) * 0.85;
        accR += flash; accG += flash; accB += flash;
        accA = Math.min(1, accA + flash * 0.5);

        const idx = (py * ow + px) * 4;
        data[idx]   = Math.min(255, accR * 255);
        data[idx+1] = Math.min(255, accG * 255);
        data[idx+2] = Math.min(255, accB * 255);
        data[idx+3] = Math.min(255, accA * 220);
      }
    }

    this._offCtx.putImageData(imgData, 0, 0);

    // Render to main canvas
    ctx.save();
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this._offscreen, 0, 0, W, H);
    ctx.restore();
  }
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
