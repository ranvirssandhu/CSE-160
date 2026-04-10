const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform float u_Size;
void main() {
  gl_Position = a_Position;
  gl_PointSize = u_Size;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

let shapesList = [];

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedType = POINT;
let g_selectedColor = [1, 1, 1, 1];
let g_selectedSize = 12;
let g_selectedSegments = 18;
let g_showPicture = false;
let g_mirrorMode = false;
let g_prevX = null;
let g_prevY = null;

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();
  canvas.onmousedown = function(ev) {
    handleClicks(ev);
  };
  canvas.onmousemove = function(ev) {
    if (ev.buttons === 1) {
      handleClicks(ev);
    }
  };
  window.onmouseup = function() {
    g_prevX = null;
    g_prevY = null;
  };
  gl.clearColor(0, 0, 0, 1);
  renderAllShapes();
}

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
}

function connectVariablesToGLSL() {
  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_Size = gl.getUniformLocation(gl.program, "u_Size");
}

function addActionsForHtmlUI() {
  document.getElementById("pointButton").onclick = function() {
    g_selectedType = POINT;
    updateBrushButtons();
  };

  document.getElementById("triangleButton").onclick = function() {
    g_selectedType = TRIANGLE;
    updateBrushButtons();
  };

  document.getElementById("circleButton").onclick = function() {
    g_selectedType = CIRCLE;
    updateBrushButtons();
  };

  document.getElementById("clearButton").onclick = function() {
    shapesList = [];
    g_showPicture = false;
    renderAllShapes();
  };

  document.getElementById("pictureButton").onclick = function() {
    g_showPicture = true;
    renderAllShapes();
  };

  document.getElementById("mirrorButton").onclick = function() {
    g_mirrorMode = !g_mirrorMode;
    this.textContent = g_mirrorMode ? "Mirror Mode On" : "Mirror Mode Off";
    this.className = g_mirrorMode ? "active" : "secondary";
  };

  document.getElementById("redSlide").oninput = function() {
    g_selectedColor[0] = Number(this.value) / 100;
    document.getElementById("redValue").textContent = this.value;
  };

  document.getElementById("greenSlide").oninput = function() {
    g_selectedColor[1] = Number(this.value) / 100;
    document.getElementById("greenValue").textContent = this.value;
  };

  document.getElementById("blueSlide").oninput = function() {
    g_selectedColor[2] = Number(this.value) / 100;
    document.getElementById("blueValue").textContent = this.value;
  };

  document.getElementById("sizeSlide").oninput = function() {
    g_selectedSize = Number(this.value);
    document.getElementById("sizeValue").textContent = this.value;
  };

  document.getElementById("segmentSlide").oninput = function() {
    g_selectedSegments = Number(this.value);
    document.getElementById("segmentValue").textContent = this.value;
  };

  updateBrushButtons();
}

function updateBrushButtons() {
  const pointButton = document.getElementById("pointButton");
  const triangleButton = document.getElementById("triangleButton");
  const circleButton = document.getElementById("circleButton");

  pointButton.className = g_selectedType === POINT ? "active" : "secondary";
  triangleButton.className = g_selectedType === TRIANGLE ? "active" : "secondary";
  circleButton.className = g_selectedType === CIRCLE ? "active" : "secondary";
}

function handleClicks(ev) {
  const pos = convertCoordinatesEventToGL(ev);

  if (g_prevX !== null && g_prevY !== null && ev.buttons === 1) {
    stampBetween(g_prevX, g_prevY, pos[0], pos[1]);
    if (g_mirrorMode) {
      stampBetween(-g_prevX, g_prevY, -pos[0], pos[1]);
    }
  } else {
    addShapeAt(pos[0], pos[1]);
    if (g_mirrorMode) {
      addShapeAt(-pos[0], pos[1]);
    }
  }

  g_prevX = pos[0];
  g_prevY = pos[1];
  renderAllShapes();
}

function addShapeAt(x, y) {
  let shape;

  if (g_selectedType === POINT) {
    shape = new Point();
  } else if (g_selectedType === TRIANGLE) {
    shape = new Triangle();
  } else {
    shape = new Circle();
    shape.segments = g_selectedSegments;
  }

  shape.position = [x, y];
  shape.color = [g_selectedColor[0], g_selectedColor[1], g_selectedColor[2], 1];
  shape.size = g_selectedSize;
  shapesList.push(shape);
}

function stampBetween(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const spacing = Math.max(0.008, g_selectedSize / 320);
  const steps = Math.max(1, Math.ceil(distance / spacing));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    addShapeAt(x, y);
  }
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (let i = 0; i < shapesList.length; i++) {
    shapesList[i].render();
  }
  if (g_showPicture) {
    drawPictureScene();
  }
}

function convertCoordinatesEventToGL(ev) {
  const rect = ev.target.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) - canvas.width / 2) / (canvas.width / 2);
  const y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);
  return [x, y];
}

function drawColoredTriangle(vertices, color) {
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  drawTriangle(vertices);
}

function drawPictureScene() {
  drawColoredTriangle([-1, 1, -1, 0.15, 1, 1], [0.53, 0.8, 0.98, 1]);
  drawColoredTriangle([1, 1, -1, 0.15, 1, 0.15], [0.53, 0.8, 0.98, 1]);

  drawColoredTriangle([-1, 0.15, -1, -1, 1, 0.15], [0.23, 0.67, 0.3, 1]);
  drawColoredTriangle([1, 0.15, -1, -1, 1, -1], [0.18, 0.58, 0.27, 1]);

  drawColoredTriangle([0.62, 0.78, 0.78, 0.62, 0.62, 0.46], [1, 0.9, 0.16, 1]);
  drawColoredTriangle([0.62, 0.78, 0.46, 0.62, 0.62, 0.46], [1, 0.9, 0.16, 1]);
  drawColoredTriangle([0.62, 0.78, 0.78, 0.62, 0.78, 0.78], [1, 0.85, 0.1, 1]);
  drawColoredTriangle([0.62, 0.78, 0.46, 0.62, 0.46, 0.78], [1, 0.85, 0.1, 1]);

  drawColoredTriangle([-0.98, 0.02, -0.68, 0.56, -0.38, 0.02], [0.42, 0.36, 0.4, 1]);
  drawColoredTriangle([-0.68, 0.56, -0.52, 0.26, -0.38, 0.02], [0.48, 0.42, 0.47, 1]);
  drawColoredTriangle([-0.68, 0.56, -0.82, 0.25, -0.98, 0.02], [0.36, 0.3, 0.35, 1]);
  drawColoredTriangle([-0.76, 0.4, -0.68, 0.56, -0.6, 0.4], [0.97, 0.97, 1, 1]);

  drawColoredTriangle([-0.5, 0.02, -0.08, 0.72, 0.34, 0.02], [0.33, 0.35, 0.48, 1]);
  drawColoredTriangle([-0.08, 0.72, 0.12, 0.32, 0.34, 0.02], [0.4, 0.42, 0.55, 1]);
  drawColoredTriangle([-0.08, 0.72, -0.26, 0.34, -0.5, 0.02], [0.28, 0.3, 0.42, 1]);
  drawColoredTriangle([-0.16, 0.5, -0.08, 0.72, 0, 0.5], [0.97, 0.97, 1, 1]);

  drawColoredTriangle([-0.28, -0.15, -0.28, -0.67, 0.18, -0.15], [0.81, 0.56, 0.33, 1]);
  drawColoredTriangle([0.18, -0.15, -0.28, -0.67, 0.18, -0.67], [0.75, 0.5, 0.28, 1]);

  drawColoredTriangle([-0.36, -0.15, -0.05, 0.12, 0.26, -0.15], [0.67, 0.12, 0.14, 1]);
  drawColoredTriangle([-0.05, 0.12, 0.1, -0.03, 0.26, -0.15], [0.57, 0.09, 0.11, 1]);

  drawColoredTriangle([-0.09, -0.67, -0.09, -0.36, 0.02, -0.36], [0.38, 0.22, 0.1, 1]);
  drawColoredTriangle([-0.09, -0.67, 0.02, -0.36, 0.02, -0.67], [0.34, 0.18, 0.08, 1]);

  drawColoredTriangle([-0.22, -0.28, -0.22, -0.42, -0.1, -0.28], [0.72, 0.9, 1, 1]);
  drawColoredTriangle([-0.1, -0.28, -0.22, -0.42, -0.1, -0.42], [0.65, 0.84, 1, 1]);

  drawColoredTriangle([0.04, -0.28, 0.04, -0.42, 0.16, -0.28], [0.72, 0.9, 1, 1]);
  drawColoredTriangle([0.16, -0.28, 0.04, -0.42, 0.16, -0.42], [0.65, 0.84, 1, 1]);

  drawColoredTriangle([0.48, -0.67, 0.48, -0.36, 0.58, -0.36], [0.43, 0.24, 0.11, 1]);
  drawColoredTriangle([0.48, -0.67, 0.58, -0.36, 0.58, -0.67], [0.38, 0.21, 0.1, 1]);

  drawColoredTriangle([0.34, -0.36, 0.53, -0.08, 0.72, -0.36], [0.04, 0.53, 0.19, 1]);
  drawColoredTriangle([0.37, -0.21, 0.53, 0.04, 0.69, -0.21], [0.06, 0.64, 0.24, 1]);
  drawColoredTriangle([0.4, -0.06, 0.53, 0.17, 0.66, -0.06], [0.1, 0.76, 0.3, 1]);

  drawColoredTriangle([-0.92, -0.72, -0.92, -0.28, -0.84, -0.28], [1, 1, 1, 1]);
  drawColoredTriangle([-0.92, -0.72, -0.84, -0.28, -0.84, -0.72], [1, 1, 1, 1]);
  drawColoredTriangle([-0.84, -0.28, -0.68, -0.28, -0.84, -0.4], [1, 1, 1, 1]);
  drawColoredTriangle([-0.68, -0.28, -0.68, -0.4, -0.84, -0.4], [1, 1, 1, 1]);
  drawColoredTriangle([-0.84, -0.4, -0.68, -0.58, -0.76, -0.58], [1, 1, 1, 1]);
  drawColoredTriangle([-0.84, -0.4, -0.76, -0.58, -0.84, -0.58], [1, 1, 1, 1]);

  drawColoredTriangle([-0.6, -0.28, -0.42, -0.28, -0.6, -0.38], [1, 1, 1, 1]);
  drawColoredTriangle([-0.42, -0.28, -0.42, -0.38, -0.6, -0.38], [1, 1, 1, 1]);
  drawColoredTriangle([-0.6, -0.38, -0.6, -0.5, -0.5, -0.38], [1, 1, 1, 1]);
  drawColoredTriangle([-0.6, -0.5, -0.42, -0.5, -0.6, -0.6], [1, 1, 1, 1]);
  drawColoredTriangle([-0.42, -0.5, -0.42, -0.6, -0.6, -0.6], [1, 1, 1, 1]);
  drawColoredTriangle([-0.42, -0.6, -0.42, -0.72, -0.5, -0.6], [1, 1, 1, 1]);
}

function initShaders(gl, vshader, fshader) {
  const program = createProgram(gl, vshader, fshader);
  gl.useProgram(program);
  gl.program = program;
  return true;
}

function createProgram(gl, vshader, fshader) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  return program;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}