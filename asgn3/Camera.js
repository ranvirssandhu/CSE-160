window.Camera = class Camera {
  constructor(width, height, collisionCheck) {
    this.eye = [0, 1.2, 12];
    this.at = [0, 1.2, 11];
    this.up = [0, 1, 0];
    this.yaw = -90;
    this.pitch = -8;
    this.speed = 0.18;
    this.turnSpeed = 4;
    this.canMoveTo = collisionCheck;
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.updateAt();
    this.updateViewMatrix();
    this.projectionMatrix.setPerspective(60, width / height, 0.1, 1000);
  }

  updateAt() {
    const yawRad = this.yaw * Math.PI / 180;
    const pitchRad = this.pitch * Math.PI / 180;
    const x = Math.cos(yawRad) * Math.cos(pitchRad);
    const y = Math.sin(pitchRad);
    const z = Math.sin(yawRad) * Math.cos(pitchRad);

    this.at[0] = this.eye[0] + x;
    this.at[1] = this.eye[1] + y;
    this.at[2] = this.eye[2] + z;
  }

  updateViewMatrix() {
    this.updateAt();
    this.viewMatrix.setLookAt(
      this.eye[0], this.eye[1], this.eye[2],
      this.at[0], this.at[1], this.at[2],
      this.up[0], this.up[1], this.up[2]
    );
  }

  getForward() {
    let x = this.at[0] - this.eye[0];
    let z = this.at[2] - this.eye[2];
    let len = Math.sqrt(x * x + z * z);

    if (len === 0) {
      return [0, 0, -1];
    }

    return [x / len, 0, z / len];
  }

  tryMove(dx, dz) {
    const nextX = this.eye[0] + dx;
    const nextZ = this.eye[2] + dz;

    if (!this.canMoveTo || this.canMoveTo(nextX, this.eye[2])) {
      this.eye[0] = nextX;
    }

    if (!this.canMoveTo || this.canMoveTo(this.eye[0], nextZ)) {
      this.eye[2] = nextZ;
    }

    this.updateViewMatrix();
  }

  moveForward() {
    const f = this.getForward();
    this.tryMove(f[0] * this.speed, f[2] * this.speed);
  }

  moveBackwards() {
    const f = this.getForward();
    this.tryMove(-f[0] * this.speed, -f[2] * this.speed);
  }

  moveLeft() {
    const f = this.getForward();
    this.tryMove(f[2] * this.speed, -f[0] * this.speed);
  }

  moveRight() {
    const f = this.getForward();
    this.tryMove(-f[2] * this.speed, f[0] * this.speed);
  }

  panLeft() {
    this.yaw -= this.turnSpeed;
    this.updateViewMatrix();
  }

  panRight() {
    this.yaw += this.turnSpeed;
    this.updateViewMatrix();
  }

  pan(amount) {
    this.yaw += amount;
    this.updateViewMatrix();
  }

  tilt(amount) {
    this.pitch += amount;

    if (this.pitch > 80) {
      this.pitch = 80;
    }

    if (this.pitch < -80) {
      this.pitch = -80;
    }

    this.updateViewMatrix();
  }
};