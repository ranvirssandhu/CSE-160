class Triangle {
  constructor() {
    this.type = "triangle";
    this.position = [0, 0];
    this.color = [1, 1, 1, 1];
    this.size = 12;
  }

  render() {
    const x = this.position[0];
    const y = this.position[1];
    const d = this.size / 200;
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_Size, this.size);
    drawTriangle([
      x, y + d,
      x - d, y - d,
      x + d, y - d
    ]);
  }
}

function drawTriangle(vertices) {
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}