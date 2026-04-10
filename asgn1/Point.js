class Point {
  constructor() {
    this.type = "point";
    this.position = [0, 0];
    this.color = [1, 1, 1, 1];
    this.size = 12;
  }

  render() {
    gl.disableVertexAttribArray(a_Position);
    gl.vertexAttrib3f(a_Position, this.position[0], this.position[1], 0);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_Size, this.size);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}