const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute float a_Shade;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
varying vec2 v_UV;
varying float v_Shade;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
  v_Shade = a_Shade;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
uniform float u_TextureWeight;
uniform int u_WhichTexture;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;
varying vec2 v_UV;
varying float v_Shade;
void main() {
  vec4 texColor;
  if (u_WhichTexture == 0) {
    texColor = texture2D(u_Sampler0, v_UV);
  } else if (u_WhichTexture == 1) {
    texColor = texture2D(u_Sampler1, v_UV);
  } else if (u_WhichTexture == 2) {
    texColor = texture2D(u_Sampler2, v_UV);
  } else if (u_WhichTexture == 3) {
    texColor = texture2D(u_Sampler3, v_UV);
  } else if (u_WhichTexture == 4) {
    texColor = texture2D(u_Sampler4, v_UV);
  } else {
    texColor = u_FragColor;
  }
  vec4 mixedColor = mix(u_FragColor, texColor, u_TextureWeight);
  gl_FragColor = vec4(mixedColor.rgb * v_Shade, mixedColor.a);
}
`;

let canvas;
let gl;
let a_Position;
let a_UV;
let a_Shade;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_FragColor;
let u_TextureWeight;
let u_WhichTexture;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;
let u_Sampler4;

let g_cubeBuffer;
let g_cubeVertexCount = 0;
let g_cylinderBuffer;
let g_cylinderVertexCount = 0;
let g_camera;
let g_keyState = {};
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_worldBlocks = [];
let g_lastFrameTime = 0;
let g_renderMs = 0;
let g_seconds = 0;
let g_startTime = 0;
let g_foundHay = false;
let g_cowX = -1.5;
let g_cowZ = 13.2;
let g_cowAngle = 0;
let g_cowMoving = false;

const g_hayPos = { x: -8, y: 0, z: -8 };

const g_map = [
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,4],
  [4,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,4],
  [4,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,4],
  [4,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,4],
  [4,0,0,0,2,2,2,2,0,0,2,2,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,1,1,1,0,1,1,1,1,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,4],
  [4,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4]
];

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
    let len = Math.sqrt(x * x + y * y + z * z);

    if (len === 0) {
      return this;
    }

    x /= len;
    y /= len;
    z /= len;

    const rad = Math.PI * angle / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const nc = 1 - c;
    const e = r.elements;

    e[0] = x * x * nc + c;
    e[1] = y * x * nc + z * s;
    e[2] = z * x * nc - y * s;
    e[3] = 0;
    e[4] = x * y * nc - z * s;
    e[5] = y * y * nc + c;
    e[6] = z * y * nc + x * s;
    e[7] = 0;
    e[8] = x * z * nc + y * s;
    e[9] = y * z * nc - x * s;
    e[10] = z * z * nc + c;
    e[11] = 0;
    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;

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

  setLookAt(ex, ey, ez, ax, ay, az, ux, uy, uz) {
    let fx = ax - ex;
    let fy = ay - ey;
    let fz = az - ez;
    let rlf = 1 / Math.sqrt(fx * fx + fy * fy + fz * fz);

    fx *= rlf;
    fy *= rlf;
    fz *= rlf;

    let sx = fy * uz - fz * uy;
    let sy = fz * ux - fx * uz;
    let sz = fx * uy - fy * ux;
    let rls = 1 / Math.sqrt(sx * sx + sy * sy + sz * sz);

    sx *= rls;
    sy *= rls;
    sz *= rls;

    const ux2 = sy * fz - sz * fy;
    const uy2 = sz * fx - sx * fz;
    const uz2 = sx * fy - sy * fx;
    const e = this.elements;

    e[0] = sx;
    e[1] = ux2;
    e[2] = -fx;
    e[3] = 0;
    e[4] = sy;
    e[5] = uy2;
    e[6] = -fy;
    e[7] = 0;
    e[8] = sz;
    e[9] = uz2;
    e[10] = -fz;
    e[11] = 0;
    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;

    return this.translate(-ex, -ey, -ez);
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initGeometryBuffers();
  initTextures();
  g_camera = new Camera(canvas.width, canvas.height, canMoveTo);
  buildWorldBlocks();
  addActionsForHtmlUI();

  gl.clearColor(0.62, 0.82, 0.95, 1.0);
  g_startTime = performance.now() / 1000;
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
  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  a_Shade = gl.getAttribLocation(gl.program, "a_Shade");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_TextureWeight = gl.getUniformLocation(gl.program, "u_TextureWeight");
  u_WhichTexture = gl.getUniformLocation(gl.program, "u_WhichTexture");
  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
  u_Sampler2 = gl.getUniformLocation(gl.program, "u_Sampler2");
  u_Sampler3 = gl.getUniformLocation(gl.program, "u_Sampler3");
  u_Sampler4 = gl.getUniformLocation(gl.program, "u_Sampler4");
}

function initGeometryBuffers() {
  const cubeVertices = makeCubeVertices();
  g_cubeVertexCount = cubeVertices.length / 6;
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);

  const cylinderVertices = makeCylinderVertices(28);
  g_cylinderVertexCount = cylinderVertices.length / 6;
  g_cylinderBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinderVertices), gl.STATIC_DRAW);
}

function initTextures() {
  loadTexture(0, "textures/grass.png", makeTextureCanvas("grass"));
  loadTexture(1, "textures/dirt.png", makeTextureCanvas("dirt"));
  loadTexture(2, "textures/stone.png", makeTextureCanvas("stone"));
  loadTexture(3, "textures/hay.png", makeTextureCanvas("hay"));
  loadTexture(4, "textures/sky.png", makeTextureCanvas("sky"));
  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
  gl.uniform1i(u_Sampler3, 3);
  gl.uniform1i(u_Sampler4, 4);
}

function loadTexture(index, url, fallback) {
  const texture = gl.createTexture();
  setTextureSource(index, texture, fallback);

  const image = new Image();
  image.onload = function() {
    setTextureSource(index, texture, image);
  };
  image.src = url;
}

function setTextureSource(index, texture, source) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

function makeTextureCanvas(type) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");

  if (type === "grass") {
    ctx.fillStyle = "#84bb46";
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#6aa83b" : "#9ccc58";
      ctx.fillRect((i * 17) % 64, (i * 29) % 64, 5, 5);
    }
  } else if (type === "dirt") {
    ctx.fillStyle = "#9a7651";
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#6f553c" : i % 3 === 1 ? "#b48a61" : "#8e8b7b";
      ctx.fillRect((i * 13) % 64, (i * 23) % 64, 7, 7);
    }
  } else if (type === "stone") {
    ctx.fillStyle = "#777777";
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#686868" : "#929292";
      ctx.fillRect((i * 19) % 64, (i * 11) % 64, 8, 6);
    }
  } else if (type === "hay") {
    ctx.fillStyle = "#d8a91f";
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) {
      ctx.fillStyle = y % 16 === 0 ? "#f0cc4b" : "#b78313";
      ctx.fillRect(0, y, 64, 3);
    }
  } else {
    ctx.fillStyle = "#6177d4";
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = "#7690ef";
      ctx.fillRect((i * 31) % 64, (i * 17) % 64, 10, 3);
    }
  }

  return c;
}

function addActionsForHtmlUI() {
  document.onkeydown = function(ev) {
    g_keyState[ev.key.toLowerCase()] = true;

    if (ev.key.toLowerCase() === "f") {
      addBlock();
    }

    if (ev.key.toLowerCase() === "g") {
      deleteBlock();
    }
  };

  document.onkeyup = function(ev) {
    g_keyState[ev.key.toLowerCase()] = false;
  };

  canvas.onclick = function() {
    if (canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  };

  canvas.onmousedown = function(ev) {
    g_isDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  canvas.onmousemove = function(ev) {
    if (document.pointerLockElement === canvas) {
      g_camera.pan(ev.movementX * 0.18);
      g_camera.tilt(-ev.movementY * 0.18);
      return;
    }

    if (!g_isDragging) {
      return;
    }

    const dx = ev.clientX - g_lastMouseX;
    const dy = ev.clientY - g_lastMouseY;
    g_camera.pan(dx * 0.25);
    g_camera.tilt(-dy * 0.25);
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  window.onmouseup = function() {
    g_isDragging = false;
  };
}

function tick(now) {
  const current = now / 1000;
  g_seconds = current - g_startTime;
  updateCamera();
  updateCow();
  updateGameText();
  renderScene();

  const dt = g_lastFrameTime === 0 ? 0 : now - g_lastFrameTime;
  g_lastFrameTime = now;
  const fps = dt > 0 ? Math.round(1000 / dt) : "--";
  document.getElementById("performanceText").textContent = "FPS: " + fps + " | Render: " + g_renderMs.toFixed(2) + " ms";

  requestAnimationFrame(tick);
}

function updateCamera() {
  if (g_keyState["w"]) {
    g_camera.moveForward();
  }

  if (g_keyState["s"]) {
    g_camera.moveBackwards();
  }

  if (g_keyState["a"]) {
    g_camera.moveLeft();
  }

  if (g_keyState["d"]) {
    g_camera.moveRight();
  }

  if (g_keyState["q"]) {
    g_camera.panLeft();
  }

  if (g_keyState["e"]) {
    g_camera.panRight();
  }
}

function updateCow() {
  let targetX;
  let targetZ;

  if (g_foundHay) {
    targetX = g_hayPos.x - 1.2;
    targetZ = g_hayPos.z;
  } else {
    const f = g_camera.getForward();
    targetX = g_camera.eye[0] - f[0] * 1.8;
    targetZ = g_camera.eye[2] - f[2] * 1.8;
  }

  const dx = targetX - g_cowX;
  const dz = targetZ - g_cowZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  g_cowMoving = false;

  if (dist > 0.12) {
    const speed = g_foundHay ? 0.05 : 0.04;
    const moveX = dx / dist * speed;
    const moveZ = dz / dist * speed;

    if (canMoveTo(g_cowX + moveX, g_cowZ)) {
      g_cowX += moveX;
      g_cowMoving = true;
    }

    if (canMoveTo(g_cowX, g_cowZ + moveZ)) {
      g_cowZ += moveZ;
      g_cowMoving = true;
    }

    g_cowAngle = Math.atan2(-dz, dx) * 180 / Math.PI;
  }
}

function canMoveTo(x, z) {
  const r = 0.28;
  return !isBlocked(x - r, z - r) &&
         !isBlocked(x + r, z - r) &&
         !isBlocked(x - r, z + r) &&
         !isBlocked(x + r, z + r);
}

function isBlocked(worldX, worldZ) {
  const x = Math.floor(worldX + 16 + 0.5);
  const z = Math.floor(worldZ + 16 + 0.5);

  if (x < 0 || x >= 32 || z < 0 || z >= 32) {
    return true;
  }

  return g_map[z][x] > 0;
}

function updateGameText() {
  const playerDx = g_camera.eye[0] - g_hayPos.x;
  const playerDz = g_camera.eye[2] - g_hayPos.z;
  const playerDist = Math.sqrt(playerDx * playerDx + playerDz * playerDz);
  const cowDx = g_cowX - g_hayPos.x;
  const cowDz = g_cowZ - g_hayPos.z;
  const cowDist = Math.sqrt(cowDx * cowDx + cowDz * cowDz);

  if (playerDist < 2.2) {
    g_foundHay = true;
  }

  const text = document.getElementById("gameText");

  if (g_foundHay && cowDist < 1.6) {
    text.textContent = "The cow reached the golden hay block.";
  } else if (g_foundHay) {
    text.textContent = "The cow found the hay and is walking over to it.";
  } else {
    text.textContent = "Lead the cow to the golden hay block. It will follow you around the farm.";
  }
}

function buildWorldBlocks() {
  g_worldBlocks = [];

  for (let z = 0; z < 32; z++) {
    for (let x = 0; x < 32; x++) {
      const height = g_map[z][x];

      for (let y = 0; y < height; y++) {
        const matrix = new Matrix4();
        matrix.translate(x - 16, y, z - 16);
        let tex = height >= 4 || y >= 2 ? 2 : 1;

        if (height === 1) {
          tex = 1;
        }

        g_worldBlocks.push({ matrix: matrix, texture: tex });
      }
    }
  }
}

function getMapSpotInFront() {
  const f = g_camera.getForward();
  const worldX = g_camera.eye[0] + f[0] * 2.0;
  const worldZ = g_camera.eye[2] + f[2] * 2.0;
  const x = Math.floor(worldX + 16 + 0.5);
  const z = Math.floor(worldZ + 16 + 0.5);

  return { x: x, z: z };
}

function addBlock() {
  const pos = getMapSpotInFront();

  if (pos.x < 1 || pos.x > 30 || pos.z < 1 || pos.z > 30) {
    return;
  }

  if (g_map[pos.z][pos.x] < 4) {
    g_map[pos.z][pos.x]++;
    buildWorldBlocks();
  }
}

function deleteBlock() {
  const pos = getMapSpotInFront();

  if (pos.x < 1 || pos.x > 30 || pos.z < 1 || pos.z > 30) {
    return;
  }

  if (g_map[pos.z][pos.x] > 0) {
    g_map[pos.z][pos.x]--;
    buildWorldBlocks();
  }
}

function renderScene() {
  const start = performance.now();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

  drawSky();
  drawGround();
  drawMap();
  drawHayBlock();
  drawFarmStuff();
  drawCow();

  g_renderMs = performance.now() - start;
}

function drawSky() {
  const sky = new Matrix4();
  sky.translate(0, 30, 0);
  sky.scale(160, 160, 160);
  drawCube(sky, [0.55, 0.66, 1.0, 1], 4, 0.85);
}

function drawGround() {
  const ground = new Matrix4();
  ground.translate(0, -0.55, 0);
  ground.scale(32, 0.10, 32);
  drawCube(ground, [0.65, 0.82, 0.32, 1], 0, 1);
}

function drawMap() {
  for (let i = 0; i < g_worldBlocks.length; i++) {
    const block = g_worldBlocks[i];
    drawCube(block.matrix, [1, 1, 1, 1], block.texture, 1);
  }
}

function drawHayBlock() {
  const hay = new Matrix4();
  hay.translate(g_hayPos.x, g_hayPos.y + 0.35 + Math.sin(g_seconds * 3) * 0.08, g_hayPos.z);
  hay.rotate(g_seconds * 40, 0, 1, 0);
  hay.scale(0.8, 0.8, 0.8);
  drawCube(hay, [1, 0.86, 0.2, 1], 3, 1);
}

function drawFarmStuff() {
  drawTree(-10, -9);
  drawTree(9, -8);
  drawTree(-11, 9);
  drawTree(12, 12);
  drawSmallFence(-7, 6, 8);
  drawSmallFence(2, -11, 7);
}

function drawTree(x, z) {
  let trunk = new Matrix4();
  trunk.translate(x, 0.6, z);
  trunk.scale(0.45, 2.2, 0.45);
  drawCube(trunk, [0.45, 0.27, 0.11, 1], -1, 0);

  let leaves = new Matrix4();
  leaves.translate(x, 2.25, z);
  leaves.scale(1.8, 1.5, 1.8);
  drawCube(leaves, [0.18, 0.50, 0.17, 1], -1, 0);
}

function drawSmallFence(x, z, length) {
  for (let i = 0; i < length; i++) {
    let post = new Matrix4();
    post.translate(x + i, 0.25, z);
    post.scale(0.16, 0.9, 0.16);
    drawCube(post, [0.55, 0.33, 0.17, 1], -1, 0);
  }

  let rail = new Matrix4();
  rail.translate(x + length / 2 - 0.5, 0.5, z);
  rail.scale(length, 0.16, 0.16);
  drawCube(rail, [0.58, 0.36, 0.18, 1], -1, 0);
}

function drawCow() {
  const walk = g_cowMoving ? Math.sin(g_seconds * 6.5) : 0;
  const base = new Matrix4();
  base.translate(g_cowX, -0.05, g_cowZ);
  base.rotate(g_cowAngle, 0, 1, 0);
  base.scale(1.4, 1.4, 1.4);

  drawBody(base);
  drawHead(base, 5 * Math.sin(g_seconds * 2));
  drawLeg(base, 0.24, 0.24, 16 * walk, -12 + 8 * Math.max(0, -walk), 1);
  drawLeg(base, 0.24, -0.24, -16 * walk, 12 - 8 * Math.max(0, walk), -1);
  drawLeg(base, -0.42, 0.24, -16 * walk, 12 - 8 * Math.max(0, walk), -1);
  drawLeg(base, -0.42, -0.24, 16 * walk, -12 + 8 * Math.max(0, -walk), 1);
  drawTail(base, 18 * Math.sin(g_seconds * 4));
}

function drawBody(base) {
  const white = [0.96, 0.94, 0.88, 1];
  const black = [0.04, 0.035, 0.03, 1];
  const pink = [0.96, 0.52, 0.62, 1];

  let body = base.clone();
  body.translate(-0.10, 0.16, 0);
  body.scale(1.05, 0.55, 0.46);
  drawCube(body, white, -1, 0);

  let spot = base.clone();
  spot.translate(-0.33, 0.27, 0.245);
  spot.scale(0.32, 0.24, 0.03);
  drawCube(spot, black, -1, 0);

  spot = base.clone();
  spot.translate(0.07, 0.10, 0.246);
  spot.scale(0.28, 0.20, 0.03);
  drawCube(spot, black, -1, 0);

  spot = base.clone();
  spot.translate(-0.02, 0.29, -0.246);
  spot.scale(0.38, 0.20, 0.03);
  drawCube(spot, black, -1, 0);

  spot = base.clone();
  spot.translate(-0.47, 0.05, -0.246);
  spot.scale(0.24, 0.18, 0.03);
  drawCube(spot, black, -1, 0);

  let udder = base.clone();
  udder.translate(-0.18, -0.16, 0);
  udder.scale(0.25, 0.16, 0.20);
  drawCube(udder, pink, -1, 0);
}

function drawHead(base, headAngle) {
  const white = [0.96, 0.94, 0.88, 1];
  const black = [0.04, 0.035, 0.03, 1];
  const pink = [0.92, 0.64, 0.58, 1];
  const horn = [0.86, 0.78, 0.58, 1];

  const neck = base.clone();
  neck.translate(0.43, 0.37, 0);
  neck.rotate(headAngle * 0.3, 0, 0, 1);

  const neckDraw = neck.clone();
  neckDraw.scale(0.22, 0.30, 0.25);
  drawCube(neckDraw, white, -1, 0);

  const headBase = neck.clone();
  headBase.translate(0.19, 0.05, 0);
  headBase.rotate(headAngle, 0, 0, 1);

  let head = headBase.clone();
  head.scale(0.38, 0.34, 0.34);
  drawCube(head, white, -1, 0);

  let muzzle = headBase.clone();
  muzzle.translate(0.24, -0.06, 0);
  muzzle.scale(0.28, 0.18, 0.26);
  drawCube(muzzle, pink, -1, 0);

  let nose = headBase.clone();
  nose.translate(0.39, -0.05, 0);
  nose.scale(0.035, 0.06, 0.18);
  drawCube(nose, black, -1, 0);

  let eye = headBase.clone();
  eye.translate(0.16, 0.07, 0.18);
  eye.scale(0.055, 0.055, 0.03);
  drawCube(eye, black, -1, 0);

  eye = headBase.clone();
  eye.translate(0.16, 0.07, -0.18);
  eye.scale(0.055, 0.055, 0.03);
  drawCube(eye, black, -1, 0);

  let ear = headBase.clone();
  ear.translate(0.02, 0.10, 0.26);
  ear.rotate(25, 1, 0, 0);
  ear.scale(0.10, 0.18, 0.06);
  drawCube(ear, white, -1, 0);

  ear = headBase.clone();
  ear.translate(0.02, 0.10, -0.26);
  ear.rotate(-25, 1, 0, 0);
  ear.scale(0.10, 0.18, 0.06);
  drawCube(ear, white, -1, 0);

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

function drawTail(base, tailAngle) {
  const tailColor = [0.18, 0.12, 0.08, 1];
  const tuftColor = [0.03, 0.025, 0.02, 1];

  const tailBase = base.clone();
  tailBase.translate(-0.67, 0.27, 0);
  tailBase.rotate(115 + tailAngle, 0, 0, 1);

  let tail = tailBase.clone();
  tail.translate(0, 0.17, 0);
  tail.scale(0.045, 0.38, 0.045);
  drawCylinder(tail, tailColor);

  let tuft = tailBase.clone();
  tuft.translate(0, 0.39, 0);
  tuft.scale(0.13, 0.13, 0.13);
  drawCube(tuft, tuftColor, -1, 0);
}

function drawLeg(base, rootX, rootZ, upperAngle, lowerAngle, side) {
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
  drawCube(upper, white, -1, 0);

  const lowerJoint = upperJoint.clone();
  lowerJoint.translate(0, -upperLen, 0);
  lowerJoint.rotate(lowerAngle, 0, 0, 1);

  let lower = lowerJoint.clone();
  lower.translate(0, -lowerLen / 2, 0);
  lower.scale(0.14, lowerLen, 0.14);
  drawCube(lower, white, -1, 0);

  let hoof = lowerJoint.clone();
  hoof.translate(0.04 * side, -lowerLen - 0.065, 0);
  hoof.scale(0.22, 0.12, 0.18);
  drawCube(hoof, black, -1, 0);
}

function drawCube(matrix, color, textureNum, textureWeight) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_WhichTexture, textureNum);
  gl.uniform1f(u_TextureWeight, textureWeight);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 24, 12);
  gl.enableVertexAttribArray(a_UV);
  gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 24, 20);
  gl.enableVertexAttribArray(a_Shade);
  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}

function drawCylinder(matrix, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_WhichTexture, -1);
  gl.uniform1f(u_TextureWeight, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 24, 12);
  gl.enableVertexAttribArray(a_UV);
  gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 24, 20);
  gl.enableVertexAttribArray(a_Shade);
  gl.drawArrays(gl.TRIANGLES, 0, g_cylinderVertexCount);
}

function pushV(arr, x, y, z, u, v, shade) {
  arr.push(x, y, z, u, v, shade);
}

function pushTri(arr, a, b, c, shade) {
  pushV(arr, a[0], a[1], a[2], a[3], a[4], shade);
  pushV(arr, b[0], b[1], b[2], b[3], b[4], shade);
  pushV(arr, c[0], c[1], c[2], c[3], c[4], shade);
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

  addFace(v, p001, p101, p111, p011, 1.00);
  addFace(v, p100, p000, p010, p110, 0.58);
  addFace(v, p011, p111, p110, p010, 0.92);
  addFace(v, p000, p100, p101, p001, 0.45);
  addFace(v, p101, p100, p110, p111, 0.76);
  addFace(v, p000, p001, p011, p010, 0.68);

  return v;
}

function addFace(arr, p1, p2, p3, p4, shade) {
  const a = [p1[0], p1[1], p1[2], 0, 0];
  const b = [p2[0], p2[1], p2[2], 1, 0];
  const c = [p3[0], p3[1], p3[2], 1, 1];
  const d = [p4[0], p4[1], p4[2], 0, 1];

  pushTri(arr, a, b, c, shade);
  pushTri(arr, a, c, d, shade);
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

    pushV(vertices, x1, yBottom, z1, 0, 0, shade);
    pushV(vertices, x1, yTop, z1, 0, 1, shade);
    pushV(vertices, x2, yBottom, z2, 1, 0, shade);

    pushV(vertices, x1, yTop, z1, 0, 1, shade);
    pushV(vertices, x2, yTop, z2, 1, 1, shade);
    pushV(vertices, x2, yBottom, z2, 1, 0, shade);

    pushV(vertices, 0, yTop, 0, 0.5, 0.5, 1.0);
    pushV(vertices, x1, yTop, z1, 0, 0, 1.0);
    pushV(vertices, x2, yTop, z2, 1, 0, 1.0);

    pushV(vertices, 0, yBottom, 0, 0.5, 0.5, 0.45);
    pushV(vertices, x2, yBottom, z2, 1, 0, 0.45);
    pushV(vertices, x1, yBottom, z1, 0, 0, 0.45);
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