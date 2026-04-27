const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute float a_Shade;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotation;
uniform mat4 u_ViewProjMatrix;
varying float v_Shade;
void main() {
  gl_Position = u_ViewProjMatrix * u_GlobalRotation * u_ModelMatrix * a_Position;
  v_Shade = a_Shade;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
varying float v_Shade;
void main() {
  gl_FragColor = vec4(u_FragColor.rgb * v_Shade, u_FragColor.a);
}
`;

let canvas;
let gl;
let a_Position;
let a_Shade;
let u_ModelMatrix;
let u_GlobalRotation;
let u_ViewProjMatrix;
let u_FragColor;

let g_cubeBuffer;
let g_cubeVertexCount = 0;
let g_cylinderBuffer;
let g_cylinderVertexCount = 0;

let gAnimalGlobalXRotation = 0;
let gAnimalGlobalYRotation = 0;
let gMouseXRotation = -12;
let gMouseYRotation = -30;
let gIsDragging = false;
let gLastMouseX = 0;
let gLastMouseY = 0;

let gAnimationOn = false;
let gStartTime = 0;
let gSeconds = 0;
let gLastFrameTime = 0;
let gRenderMs = 0;
let gPokeStart = -100;

let gHeadAngle = 0;
let gTailAngle = 15;
let gFrontLeftUpperAngle = 10;
let gFrontLeftLowerAngle = -15;
let gFrontLeftHoofAngle = 8;
let gFrontRightUpperAngle = -10;
let gFrontRightLowerAngle = 15;
let gFrontRightHoofAngle = -8;
let gBackLeftUpperAngle = -10;
let gBackLeftLowerAngle = 15;
let gBackLeftHoofAngle = -8;
let gBackRightUpperAngle = 10;
let gBackRightLowerAngle = -15;
let gBackRightHoofAngle = 8;

const manualAngles = {
  head: 0,
  tail: 15,
  frontLeftUpper: 10,
  frontLeftLower: -15,
  frontLeftHoof: 8,
  frontRightUpper: -10,
  frontRightLower: 15,
  frontRightHoof: -8,
  backLeftUpper: -10,
  backLeftLower: 15,
  backLeftHoof: -8,
  backRightUpper: 10,
  backRightLower: -15,
  backRightHoof: 8
};

class Matrix4 {
  constructor(src) {
    if (src && src.elements) {
      this.elements = new Float32Array(src.elements);
    } else {
      this.elements = new Float32Array(16);
      this.setIdentity();
    }
  }

  setIdentity() {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0; e[3] = 0;
    e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
    e[8] = 0; e[9] = 0; e[10] = 1; e[11] = 0;
    e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
    return this;
  }

  clone() {
    return new Matrix4(this);
  }

  multiply(other) {
    const a = this.elements;
    const b = other.elements;
    const e = new Float32Array(16);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        e[col * 4 + row] =
          a[0 * 4 + row] * b[col * 4 + 0] +
          a[1 * 4 + row] * b[col * 4 + 1] +
          a[2 * 4 + row] * b[col * 4 + 2] +
          a[3 * 4 + row] * b[col * 4 + 3];
      }
    }

    this.elements = e;
    return this;
  }

  translate(x, y, z) {
    const t = new Matrix4();
    t.elements[12] = x;
    t.elements[13] = y;
    t.elements[14] = z;
    return this.multiply(t);
  }

  scale(x, y, z) {
    const s = new Matrix4();
    s.elements[0] = x;
    s.elements[5] = y;
    s.elements[10] = z;
    return this.multiply(s);
  }

  rotate(angle, x, y, z) {
    const r = new Matrix4();
    const rad = Math.PI * angle / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    if (x === 1 && y === 0 && z === 0) {
      r.elements[5] = c;
      r.elements[6] = s;
      r.elements[9] = -s;
      r.elements[10] = c;
    } else if (x === 0 && y === 1 && z === 0) {
      r.elements[0] = c;
      r.elements[2] = -s;
      r.elements[8] = s;
      r.elements[10] = c;
    } else if (x === 0 && y === 0 && z === 1) {
      r.elements[0] = c;
      r.elements[1] = s;
      r.elements[4] = -s;
      r.elements[5] = c;
    }

    return this.multiply(r);
  }

  setPerspective(fovy, aspect, near, far) {
    const e = this.elements;
    const rd = Math.PI * fovy / 180;
    const s = Math.sin(rd / 2);
    const ct = Math.cos(rd / 2) / s;

    e[0] = ct / aspect;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;

    e[4] = 0;
    e[5] = ct;
    e[6] = 0;
    e[7] = 0;

    e[8] = 0;
    e[9] = 0;
    e[10] = -(far + near) / (far - near);
    e[11] = -1;

    e[12] = 0;
    e[13] = 0;
    e[14] = -(2 * near * far) / (far - near);
    e[15] = 0;

    return this;
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initGeometryBuffers();
  addActionsForHtmlUI();

  gl.clearColor(0.62, 0.82, 0.95, 1.0);
  gStartTime = performance.now() / 1000;
  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    alert("WebGL is not available in this browser.");
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_Shade = gl.getAttribLocation(gl.program, "a_Shade");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_GlobalRotation = gl.getUniformLocation(gl.program, "u_GlobalRotation");
  u_ViewProjMatrix = gl.getUniformLocation(gl.program, "u_ViewProjMatrix");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
}

function initGeometryBuffers() {
  const cubeVertices = makeCubeVertices();
  g_cubeVertexCount = cubeVertices.length / 4;
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);

  const cylinderVertices = makeCylinderVertices(28);
  g_cylinderVertexCount = cylinderVertices.length / 4;
  g_cylinderBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinderVertices), gl.STATIC_DRAW);
}

function addActionsForHtmlUI() {
  document.getElementById("animationButton").onclick = function() {
    gAnimationOn = !gAnimationOn;
    this.textContent = gAnimationOn ? "Animation On" : "Animation Off";
    this.className = gAnimationOn ? "active" : "";
    restoreManualAngles();
  };

  document.getElementById("resetButton").onclick = function() {
    gAnimalGlobalXRotation = 0;
    gAnimalGlobalYRotation = 0;
    gMouseXRotation = -12;
    gMouseYRotation = -30;
    document.getElementById("globalXSlide").value = 0;
    document.getElementById("globalXValue").textContent = 0;
    document.getElementById("globalYSlide").value = 0;
    document.getElementById("globalYValue").textContent = 0;
    renderScene();
  };

  setSlider("globalXSlide", "globalXValue", function(value) {
    gAnimalGlobalXRotation = value;
  });

  setSlider("globalYSlide", "globalYValue", function(value) {
    gAnimalGlobalYRotation = value;
  });

  setSlider("headSlide", "headValue", function(value) {
    manualAngles.head = value;
    gHeadAngle = value;
  });

  setSlider("tailSlide", "tailValue", function(value) {
    manualAngles.tail = value;
    gTailAngle = value;
  });

  setSlider("frontLeftUpperSlide", "frontLeftUpperValue", function(value) {
    manualAngles.frontLeftUpper = value;
    gFrontLeftUpperAngle = value;
  });

  setSlider("frontLeftLowerSlide", "frontLeftLowerValue", function(value) {
    manualAngles.frontLeftLower = value;
    gFrontLeftLowerAngle = value;
  });

  setSlider("frontLeftHoofSlide", "frontLeftHoofValue", function(value) {
    manualAngles.frontLeftHoof = value;
    gFrontLeftHoofAngle = value;
  });

  setSlider("frontRightUpperSlide", "frontRightUpperValue", function(value) {
    manualAngles.frontRightUpper = value;
    gFrontRightUpperAngle = value;
  });

  setSlider("frontRightLowerSlide", "frontRightLowerValue", function(value) {
    manualAngles.frontRightLower = value;
    gFrontRightLowerAngle = value;
  });

  setSlider("frontRightHoofSlide", "frontRightHoofValue", function(value) {
    manualAngles.frontRightHoof = value;
    gFrontRightHoofAngle = value;
  });

  setSlider("backLeftUpperSlide", "backLeftUpperValue", function(value) {
    manualAngles.backLeftUpper = value;
    gBackLeftUpperAngle = value;
  });

  setSlider("backLeftLowerSlide", "backLeftLowerValue", function(value) {
    manualAngles.backLeftLower = value;
    gBackLeftLowerAngle = value;
  });

  setSlider("backLeftHoofSlide", "backLeftHoofValue", function(value) {
    manualAngles.backLeftHoof = value;
    gBackLeftHoofAngle = value;
  });

  setSlider("backRightUpperSlide", "backRightUpperValue", function(value) {
    manualAngles.backRightUpper = value;
    gBackRightUpperAngle = value;
  });

  setSlider("backRightLowerSlide", "backRightLowerValue", function(value) {
    manualAngles.backRightLower = value;
    gBackRightLowerAngle = value;
  });

  setSlider("backRightHoofSlide", "backRightHoofValue", function(value) {
    manualAngles.backRightHoof = value;
    gBackRightHoofAngle = value;
  });

  canvas.onmousedown = function(ev) {
    if (ev.shiftKey) {
      gPokeStart = performance.now() / 1000;
      return;
    }

    gIsDragging = true;
    gLastMouseX = ev.clientX;
    gLastMouseY = ev.clientY;
  };

  canvas.onmousemove = function(ev) {
    if (!gIsDragging) {
      return;
    }

    const dx = ev.clientX - gLastMouseX;
    const dy = ev.clientY - gLastMouseY;
    gMouseYRotation += dx * 0.6;
    gMouseXRotation += dy * 0.6;
    gLastMouseX = ev.clientX;
    gLastMouseY = ev.clientY;
  };

  window.onmouseup = function() {
    gIsDragging = false;
  };
}

function setSlider(sliderId, valueId, callback) {
  const slider = document.getElementById(sliderId);
  const valueText = document.getElementById(valueId);

  slider.oninput = function() {
    const value = Number(this.value);
    valueText.textContent = value;
    callback(value);
    renderScene();
  };
}

function restoreManualAngles() {
  if (gAnimationOn) {
    return;
  }

  gHeadAngle = manualAngles.head;
  gTailAngle = manualAngles.tail;
  gFrontLeftUpperAngle = manualAngles.frontLeftUpper;
  gFrontLeftLowerAngle = manualAngles.frontLeftLower;
  gFrontLeftHoofAngle = manualAngles.frontLeftHoof;
  gFrontRightUpperAngle = manualAngles.frontRightUpper;
  gFrontRightLowerAngle = manualAngles.frontRightLower;
  gFrontRightHoofAngle = manualAngles.frontRightHoof;
  gBackLeftUpperAngle = manualAngles.backLeftUpper;
  gBackLeftLowerAngle = manualAngles.backLeftLower;
  gBackLeftHoofAngle = manualAngles.backLeftHoof;
  gBackRightUpperAngle = manualAngles.backRightUpper;
  gBackRightLowerAngle = manualAngles.backRightLower;
  gBackRightHoofAngle = manualAngles.backRightHoof;
}

function tick(now) {
  const current = now / 1000;
  gSeconds = current - gStartTime;

  updateAnimationAngles();
  renderScene();

  const dt = gLastFrameTime === 0 ? 0 : now - gLastFrameTime;
  gLastFrameTime = now;
  const fps = dt > 0 ? Math.round(1000 / dt) : "--";
  document.getElementById("performanceText").textContent = "FPS: " + fps + " | Render: " + gRenderMs.toFixed(2) + " ms";

  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  restoreManualAngles();

  if (gAnimationOn) {
    const walk = Math.sin(gSeconds * 4.0);
    const walkOpposite = Math.sin(gSeconds * 4.0 + Math.PI);

    gHeadAngle = 6 * Math.sin(gSeconds * 2.0);
    gTailAngle = 20 * Math.sin(gSeconds * 5.0);
    gFrontLeftUpperAngle = 22 * walk;
    gFrontLeftLowerAngle = -20 + 18 * Math.max(0, -walk);
    gFrontLeftHoofAngle = 10 * Math.sin(gSeconds * 4.0 + 0.8);
    gBackRightUpperAngle = 22 * walk;
    gBackRightLowerAngle = -20 + 18 * Math.max(0, -walk);
    gBackRightHoofAngle = 10 * Math.sin(gSeconds * 4.0 + 0.8);

    gFrontRightUpperAngle = 22 * walkOpposite;
    gFrontRightLowerAngle = 20 - 18 * Math.max(0, -walkOpposite);
    gFrontRightHoofAngle = -10 * Math.sin(gSeconds * 4.0 + 0.8);
    gBackLeftUpperAngle = 22 * walkOpposite;
    gBackLeftLowerAngle = 20 - 18 * Math.max(0, -walkOpposite);
    gBackLeftHoofAngle = -10 * Math.sin(gSeconds * 4.0 + 0.8);
  }

  const pokeTime = performance.now() / 1000 - gPokeStart;
  if (pokeTime >= 0 && pokeTime < 1.6) {
    const shake = Math.sin(pokeTime * 35) * (1.6 - pokeTime);
    const jump = Math.sin(pokeTime * Math.PI / 1.6);
    gHeadAngle += 22 * shake;
    gTailAngle += 40 * shake;
    gFrontLeftUpperAngle -= 25 * jump;
    gFrontRightUpperAngle -= 25 * jump;
    gBackLeftUpperAngle += 25 * jump;
    gBackRightUpperAngle += 25 * jump;
    gFrontLeftLowerAngle += 20 * jump;
    gFrontRightLowerAngle += 20 * jump;
    gBackLeftLowerAngle -= 20 * jump;
    gBackRightLowerAngle -= 20 * jump;
  }
}

function renderScene() {
  const start = performance.now();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const viewProj = new Matrix4();
  viewProj.setPerspective(45, canvas.width / canvas.height, 0.1, 100);
  const view = new Matrix4();
  view.translate(0, -0.05, -3.4);
  viewProj.multiply(view);
  gl.uniformMatrix4fv(u_ViewProjMatrix, false, viewProj.elements);

  const globalRot = new Matrix4();
  globalRot.rotate(gAnimalGlobalXRotation + gMouseXRotation, 1, 0, 0);
  globalRot.rotate(gAnimalGlobalYRotation + gMouseYRotation, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRot.elements);

  drawGround();
  drawCow();

  gRenderMs = performance.now() - start;
}

function drawCow() {
  const pokeTime = performance.now() / 1000 - gPokeStart;
  const jump = pokeTime >= 0 && pokeTime < 1.6 ? 0.12 * Math.sin(pokeTime * Math.PI / 1.6) : 0;

  const base = new Matrix4();
  base.translate(-0.08, jump, 0);

  drawBody(base);
  drawHead(base);
  drawLeg(base, 0.24, 0.24, gFrontLeftUpperAngle, gFrontLeftLowerAngle, gFrontLeftHoofAngle, 1);
  drawLeg(base, 0.24, -0.24, gFrontRightUpperAngle, gFrontRightLowerAngle, gFrontRightHoofAngle, -1);
  drawLeg(base, -0.42, 0.24, gBackLeftUpperAngle, gBackLeftLowerAngle, gBackLeftHoofAngle, -1);
  drawLeg(base, -0.42, -0.24, gBackRightUpperAngle, gBackRightLowerAngle, gBackRightHoofAngle, 1);
  drawTail(base);
}

function drawBody(base) {
  const white = [0.96, 0.94, 0.88, 1];
  const black = [0.04, 0.035, 0.03, 1];
  const pink = [0.96, 0.52, 0.62, 1];

  let body = base.clone();
  body.translate(-0.10, 0.16, 0);
  body.scale(1.05, 0.55, 0.46);
  drawCube(body, white);

  let spot = base.clone();
  spot.translate(-0.33, 0.27, 0.245);
  spot.scale(0.32, 0.24, 0.03);
  drawCube(spot, black);

  spot = base.clone();
  spot.translate(0.07, 0.10, 0.246);
  spot.scale(0.28, 0.20, 0.03);
  drawCube(spot, black);

  spot = base.clone();
  spot.translate(-0.02, 0.29, -0.246);
  spot.scale(0.38, 0.20, 0.03);
  drawCube(spot, black);

  spot = base.clone();
  spot.translate(-0.47, 0.05, -0.246);
  spot.scale(0.24, 0.18, 0.03);
  drawCube(spot, black);

  let udder = base.clone();
  udder.translate(-0.18, -0.16, 0);
  udder.scale(0.25, 0.16, 0.20);
  drawCube(udder, pink);
}

function drawHead(base) {
  const white = [0.96, 0.94, 0.88, 1];
  const black = [0.04, 0.035, 0.03, 1];
  const pink = [0.92, 0.64, 0.58, 1];
  const horn = [0.86, 0.78, 0.58, 1];

  const neck = base.clone();
  neck.translate(0.43, 0.37, 0);
  neck.rotate(gHeadAngle * 0.3, 0, 0, 1);

  const neckDraw = neck.clone();
  neckDraw.scale(0.22, 0.30, 0.25);
  drawCube(neckDraw, white);

  const headBase = neck.clone();
  headBase.translate(0.19, 0.05, 0);
  headBase.rotate(gHeadAngle, 0, 0, 1);

  let head = headBase.clone();
  head.scale(0.38, 0.34, 0.34);
  drawCube(head, white);

  let muzzle = headBase.clone();
  muzzle.translate(0.24, -0.06, 0);
  muzzle.scale(0.28, 0.18, 0.26);
  drawCube(muzzle, pink);

  let nose = headBase.clone();
  nose.translate(0.39, -0.05, 0);
  nose.scale(0.035, 0.06, 0.18);
  drawCube(nose, black);

  let eye = headBase.clone();
  eye.translate(0.16, 0.07, 0.18);
  eye.scale(0.055, 0.055, 0.03);
  drawCube(eye, black);

  eye = headBase.clone();
  eye.translate(0.16, 0.07, -0.18);
  eye.scale(0.055, 0.055, 0.03);
  drawCube(eye, black);

  let ear = headBase.clone();
  ear.translate(0.02, 0.10, 0.26);
  ear.rotate(25, 1, 0, 0);
  ear.scale(0.10, 0.18, 0.06);
  drawCube(ear, white);

  ear = headBase.clone();
  ear.translate(0.02, 0.10, -0.26);
  ear.rotate(-25, 1, 0, 0);
  ear.scale(0.10, 0.18, 0.06);
  drawCube(ear, white);

  let hornM = headBase.clone();
  hornM.translate(0.02, 0.23, 0.12);
  hornM.rotate(-25, 0, 0, 1);
  hornM.scale(0.055, 0.24, 0.055);
  drawCylinder(hornM, horn);

  hornM = headBase.clone();
  hornM.translate(0.02, 0.23, -0.12);
  hornM.rotate(-25, 0, 0, 1);
  hornM.scale(0.055, 0.24, 0.055);
  drawCylinder(hornM, horn);
}

function drawTail(base) {
  const tailColor = [0.18, 0.12, 0.08, 1];
  const tuftColor = [0.03, 0.025, 0.02, 1];

  const tailBase = base.clone();
  tailBase.translate(-0.67, 0.27, 0);
  tailBase.rotate(115 + gTailAngle, 0, 0, 1);

  let tail = tailBase.clone();
  tail.translate(0, 0.17, 0);
  tail.scale(0.045, 0.38, 0.045);
  drawCylinder(tail, tailColor);

  let tuft = tailBase.clone();
  tuft.translate(0, 0.39, 0);
  tuft.scale(0.13, 0.13, 0.13);
  drawCube(tuft, tuftColor);
}

function drawLeg(base, rootX, rootZ, upperAngle, lowerAngle, hoofAngle, side) {
  const white = [0.96, 0.94, 0.88, 1];
  const black = [0.04, 0.035, 0.03, 1];
  const upperLen = 0.34;
  const lowerLen = 0.28;

  const upperJoint = base.clone();
  upperJoint.translate(rootX, -0.08, rootZ);
  upperJoint.rotate(upperAngle, 0, 0, 1);

  let upper = upperJoint.clone();
  upper.translate(0, -upperLen / 2, 0);
  upper.scale(0.16, upperLen, 0.16);
  drawCube(upper, white);

  const lowerJoint = upperJoint.clone();
  lowerJoint.translate(0, -upperLen, 0);
  lowerJoint.rotate(lowerAngle, 0, 0, 1);

  let lower = lowerJoint.clone();
  lower.translate(0, -lowerLen / 2, 0);
  lower.scale(0.14, lowerLen, 0.14);
  drawCube(lower, white);

  const hoofJoint = lowerJoint.clone();
  hoofJoint.translate(0, -lowerLen, 0);
  hoofJoint.rotate(hoofAngle, 0, 0, 1);

  let hoof = hoofJoint.clone();
  hoof.translate(0.04 * side, -0.065, 0);
  hoof.scale(0.22, 0.12, 0.18);
  drawCube(hoof, black);
}

function drawGround() {
  const ground = new Matrix4();
  ground.translate(0, -0.82, 0);
  ground.scale(1.9, 0.035, 1.4);
  drawCube(ground, [0.38, 0.70, 0.34, 1]);
}

function drawCube(matrix, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 16, 12);
  gl.enableVertexAttribArray(a_Shade);
  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}

function drawCylinder(matrix, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 16, 12);
  gl.enableVertexAttribArray(a_Shade);
  gl.drawArrays(gl.TRIANGLES, 0, g_cylinderVertexCount);
}

function pushV(arr, x, y, z, shade) {
  arr.push(x, y, z, shade);
}

function pushTri(arr, a, b, c, shade) {
  pushV(arr, a[0], a[1], a[2], shade);
  pushV(arr, b[0], b[1], b[2], shade);
  pushV(arr, c[0], c[1], c[2], shade);
}

function makeCubeVertices() {
  const v = [];

  const p000 = [-0.5, -0.5, -0.5];
  const p001 = [-0.5, -0.5, 0.5];
  const p010 = [-0.5, 0.5, -0.5];
  const p011 = [-0.5, 0.5, 0.5];
  const p100 = [0.5, -0.5, -0.5];
  const p101 = [0.5, -0.5, 0.5];
  const p110 = [0.5, 0.5, -0.5];
  const p111 = [0.5, 0.5, 0.5];

  pushTri(v, p001, p101, p111, 1.00);
  pushTri(v, p001, p111, p011, 1.00);

  pushTri(v, p100, p000, p010, 0.58);
  pushTri(v, p100, p010, p110, 0.58);

  pushTri(v, p011, p111, p110, 0.92);
  pushTri(v, p011, p110, p010, 0.92);

  pushTri(v, p000, p100, p101, 0.45);
  pushTri(v, p000, p101, p001, 0.45);

  pushTri(v, p101, p100, p110, 0.76);
  pushTri(v, p101, p110, p111, 0.76);

  pushTri(v, p000, p001, p011, 0.68);
  pushTri(v, p000, p011, p010, 0.68);

  return v;
}

function makeCylinderVertices(segments) {
  const vertices = [];
  const radius = 0.5;
  const yTop = 0.5;
  const yBottom = -0.5;

  for (let i = 0; i < segments; i++) {
    const a1 = i * 2 * Math.PI / segments;
    const a2 = (i + 1) * 2 * Math.PI / segments;
    const x1 = radius * Math.cos(a1);
    const z1 = radius * Math.sin(a1);
    const x2 = radius * Math.cos(a2);
    const z2 = radius * Math.sin(a2);
    const shade = 0.58 + 0.38 * Math.max(0, Math.cos((a1 + a2) / 2 - Math.PI / 4));

    pushV(vertices, x1, yBottom, z1, shade);
    pushV(vertices, x1, yTop, z1, shade);
    pushV(vertices, x2, yBottom, z2, shade);

    pushV(vertices, x1, yTop, z1, shade);
    pushV(vertices, x2, yTop, z2, shade);
    pushV(vertices, x2, yBottom, z2, shade);

    pushV(vertices, 0, yTop, 0, 1.0);
    pushV(vertices, x1, yTop, z1, 1.0);
    pushV(vertices, x2, yTop, z2, 1.0);

    pushV(vertices, 0, yBottom, 0, 0.45);
    pushV(vertices, x2, yBottom, z2, 0.45);
    pushV(vertices, x1, yBottom, z1, 0.45);
  }

  return vertices;
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

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log("Program link error: " + gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log("Shader compile error: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}