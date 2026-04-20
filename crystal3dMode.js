// crystal3dMode.js — Rotating 3D icosahedron crystal gem with flat shading
class Crystal3DMode {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this._rotX = 0;
    this._rotY = 0;
    this._time = 0;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._shattered = false;
    this._shatterTimer = 0;
    this._vertices = [];
    this._velocities = [];
    this._baseVertices = [];
    this._faces = [];
    this._hue = 200;
    this._buildIcosahedron();
  }

  _buildIcosahedron() {
    const phi = 1.6180339887;
    const raw = [
      [0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi],
      [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
      [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1],
    ];
    this._baseVertices = raw.map(v => {
      const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
      return [v[0]/len, v[1]/len, v[2]/len];
    });
    this._faces = [
      [0,1,8],[0,8,4],[0,4,5],[0,5,9],[0,9,1],
      [1,6,8],[8,6,10],[8,10,4],[4,10,2],[4,2,5],
      [5,2,11],[5,11,9],[9,11,7],[9,7,1],[1,7,6],
      [3,6,7],[3,7,11],[3,11,2],[3,2,10],[3,10,6],
    ];
    this._vertices = this._baseVertices.map(v => [...v]);
    this._velocities = this._baseVertices.map(() => [0, 0, 0]);
  }

  startScene(scene) {
    this._rotX = 0;
    this._rotY = 0;
    this._time = 0;
    this._gazeX = 0.5;
    this._gazeY = 0.5;
    this._shattered = false;
    this._shatterTimer = 0;
    this._hue = 200;
    this._vertices = this._baseVertices.map(v => [...v]);
    this._velocities = this._baseVertices.map(() => [0, 0, 0]);
  }

  onBlink() {
    if (!this._shattered) {
      this._shattered = true;
      this._shatterTimer = 0;
      this._velocities = this._vertices.map(v => {
        const speed = 0.04 + Math.random() * 0.08;
        return [v[0]*speed, v[1]*speed, v[2]*speed];
      });
    }
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
    const focalLen = W * 0.9;
    const scale = Math.min(W, H) * 0.28;

    this._time += dt;

    // Background
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Rotation rates influenced by gaze
    const gazeInfluenceX = (this._gazeY - 0.5) * 0.4;
    const gazeInfluenceY = (this._gazeX - 0.5) * 0.4;
    this._rotX += (dt * 0.35 + gazeInfluenceX * dt);
    this._rotY += (dt * 0.55 + gazeInfluenceY * dt);

    // Hue shifts slowly
    this._hue = (this._hue + dt * 8) % 360;

    // Handle shatter/rebuild
    if (this._shattered) {
      this._shatterTimer += dt;
      for (let i = 0; i < this._vertices.length; i++) {
        this._vertices[i][0] += this._velocities[i][0];
        this._vertices[i][1] += this._velocities[i][1];
        this._vertices[i][2] += this._velocities[i][2];
      }
      if (this._shatterTimer > 2.0) {
        this._shattered = false;
        this._vertices = this._baseVertices.map(v => [...v]);
        this._velocities = this._baseVertices.map(() => [0, 0, 0]);
      }
    }

    // Apply rotation matrices
    const cosX = Math.cos(this._rotX), sinX = Math.sin(this._rotX);
    const cosY = Math.cos(this._rotY), sinY = Math.sin(this._rotY);

    const projected = this._vertices.map(v => {
      // Y rotation
      let x = v[0]*cosY - v[2]*sinY;
      let y = v[1];
      let z = v[0]*sinY + v[2]*cosY;
      // X rotation
      let y2 = y*cosX - z*sinX;
      let z2 = y*sinX + z*cosX;
      const s = focalLen / (focalLen + z2 * scale + focalLen * 0.5);
      return { sx: cx + x*scale*s, sy: cy + y2*scale*s, z: z2 };
    });

    // Light direction normalized
    const lx = 0.5, ly = 0.8, lz = 0.6;
    const llen = Math.sqrt(lx*lx + ly*ly + lz*lz);
    const light = [lx/llen, ly/llen, lz/llen];

    // Compute face data
    const faceData = this._faces.map(f => {
      const v0 = this._vertices[f[0]], v1 = this._vertices[f[1]], v2 = this._vertices[f[2]];
      const p0 = projected[f[0]], p1 = projected[f[1]], p2 = projected[f[2]];

      // Face normal from base vertices (apply same rotation)
      const ax = v1[0]-v0[0], ay = v1[1]-v0[1], az = v1[2]-v0[2];
      const bx = v2[0]-v0[0], by = v2[1]-v0[1], bz = v2[2]-v0[2];
      let nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx;
      const nlen = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
      nx/=nlen; ny/=nlen; nz/=nlen;
      // Rotate normal
      let rnx = nx*cosY - nz*sinY;
      let rnz = nx*sinY + nz*cosY;
      let rny2 = ny*cosX - rnz*sinX;
      let rnz2 = ny*sinX + rnz*cosX;

      const dot = Math.max(0, rnx*light[0] + rny2*light[1] + rnz2*light[2]);
      const centZ = (projected[f[0]].z + projected[f[1]].z + projected[f[2]].z) / 3;
      return { f, p0, p1, p2, dot, centZ };
    });

    // Sort back to front
    faceData.sort((a, b) => a.centZ - b.centZ);

    for (const fd of faceData) {
      ctx.save();
      const brightness = 30 + fd.dot * 70;
      const sat = 70 + fd.dot * 30;
      const alpha = this._shattered
        ? Math.max(0, 1 - this._shatterTimer / 2)
        : 0.82 + fd.dot * 0.18;
      ctx.beginPath();
      ctx.moveTo(fd.p0.sx, fd.p0.sy);
      ctx.lineTo(fd.p1.sx, fd.p1.sy);
      ctx.lineTo(fd.p2.sx, fd.p2.sy);
      ctx.closePath();
      ctx.fillStyle = `hsla(${(this._hue + fd.dot*40)%360},${sat}%,${brightness}%,${alpha.toFixed(2)})`;
      ctx.strokeStyle = `hsla(${this._hue},90%,85%,0.25)`;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = `hsl(${this._hue},100%,80%)`;
      ctx.shadowBlur = 6 * fd.dot;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
