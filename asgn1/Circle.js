class Circle {
  constructor() {
    this.type = "circle";
    this.position = [0, 0];
    this.color = [1, 1, 1, 1];
    this.size = 12;
    this.segments = 18;
  }

  render() {
    const x = this.position[0];
    const y = this.position[1];
    const r = this.size / 200;
    const step = 360 / this.segments;
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_Size, this.size);

    for (let angle = 0; angle < 360; angle += step) {
      const a1 = angle * Math.PI / 180;
      const a2 = (angle + step) * Math.PI / 180;
      const x1 = x + r * Math.cos(a1);
      const y1 = y + r * Math.sin(a1);
      const x2 = x + r * Math.cos(a2);
      const y2 = y + r * Math.sin(a2);

      drawTriangle([
        x, y,
        x1, y1,
        x2, y2
      ]);
    }
  }
}