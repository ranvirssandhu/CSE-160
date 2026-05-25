const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;
uniform mat4 u_ModelMatrix;
uniform mat4 u_NormalMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;
void main() {
  vec4 worldPos = u_ModelMatrix * a_Position;
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
  v_UV = a_UV;
  v_WorldPos = vec3(worldPos);
  v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
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
uniform vec3 u_LightPos;
uniform vec3 u_LightColor;
uniform vec3 u_CameraPos;
uniform vec3 u_SpotPos;
uniform vec3 u_SpotDir;
uniform int u_LightingOn;
uniform int u_NormalOn;
uniform int u_PointLightOn;
uniform int u_SpotLightOn;
uniform int u_IgnoreLighting;
varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;
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

  vec4 base = mix(u_FragColor, texColor, u_TextureWeight);

  if (u_IgnoreLighting == 1) {
    gl_FragColor = base;
    return;
  }

  vec3 n = normalize(v_Normal);

  if (u_NormalOn == 1) {
    gl_FragColor = vec4(n * 0.5 + 0.5, base.a);
    return;
  }

  if (u_LightingOn == 0) {
    gl_FragColor = base;
    return;
  }

  vec3 v = normalize(u_CameraPos - v_WorldPos);
  vec3 color = base.rgb * 0.20;

  if (u_PointLightOn == 1) {
    vec3 l = normalize(u_LightPos - v_WorldPos);
    float d = distance(u_LightPos, v_WorldPos);
    float diffuse = max(dot(n, l), 0.0);
    vec3 r = reflect(-l, n);
    float specular = pow(max(dot(v, r), 0.0), 32.0);
    float att = 1.0 / (1.0 + 0.035 * d + 0.003 * d * d);
    color += (base.rgb * diffuse + vec3(specular * 0.70)) * u_LightColor * att;
  }

  if (u_SpotLightOn == 1) {
    vec3 l2 = normalize(u_SpotPos - v_WorldPos);
    float theta = dot(normalize(-l2), normalize(u_SpotDir));
    float amount = clamp((theta - 0.82) / 0.10, 0.0, 1.0);
    float diffuse2 = max(dot(n, l2), 0.0);
    vec3 r2 = reflect(-l2, n);
    float specular2 = pow(max(dot(v, r2), 0.0), 24.0);
    color += (base.rgb * diffuse2 + vec3(specular2 * 0.45)) * vec3(1.0, 0.96, 0.82) * amount;
  }

  gl_FragColor = vec4(color, base.a);
}
`;

let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal;
let u_ModelMatrix;
let u_NormalMatrix;
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
let u_LightPos;
let u_LightColor;
let u_CameraPos;
let u_SpotPos;
let u_SpotDir;
let u_LightingOn;
let u_NormalOn;
let u_PointLightOn;
let u_SpotLightOn;
let u_IgnoreLighting;

let g_cubeBuffer;
let g_cubeVertexCount = 0;
let g_cylinderBuffer;
let g_cylinderVertexCount = 0;
let g_sphereBuffer;
let g_sphereVertexCount = 0;
let g_model;
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
let g_lightingOn = true;
let g_normalOn = false;
let g_pointLightOn = true;
let g_spotLightOn = true;
let g_lightX = 0;
let g_lightY = 5;
let g_lightZ = 0;
let g_lightPos = [0, 5, 0];
let g_lightColor = [1.0, 0.80, 0.62];

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
  [4,0,0,3,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,4],
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

  setInverseOf(other) {
    const s = other.elements;
    const d = new Float32Array(16);
    const inv = new Float32Array(16);

    inv[0] = s[5] * s[10] * s[15] - s[5] * s[11] * s[14] - s[9] * s[6] * s[15] + s[9] * s[7] * s[14] + s[13] * s[6] * s[11] - s[13] * s[7] * s[10];
    inv[4] = -s[4] * s[10] * s[15] + s[4] * s[11] * s[14] + s[8] * s[6] * s[15] - s[8] * s[7] * s[14] - s[12] * s[6] * s[11] + s[12] * s[7] * s[10];
    inv[8] = s[4] * s[9] * s[15] - s[4] * s[11] * s[13] - s[8] * s[5] * s[15] + s[8] * s[7] * s[13] + s[12] * s[5] * s[11] - s[12] * s[7] * s[9];
    inv[12] = -s[4] * s[9] * s[14] + s[4] * s[10] * s[13] + s[8] * s[5] * s[14] - s[8] * s[6] * s[13] - s[12] * s[5] * s[10] + s[12] * s[6] * s[9];
    inv[1] = -s[1] * s[10] * s[15] + s[1] * s[11] * s[14] + s[9] * s[2] * s[15] - s[9] * s[3] * s[14] - s[13] * s[2] * s[11] + s[13] * s[3] * s[10];
    inv[5] = s[0] * s[10] * s[15] - s[0] * s[11] * s[14] - s[8] * s[2] * s[15] + s[8] * s[3] * s[14] + s[12] * s[2] * s[11] - s[12] * s[3] * s[10];
    inv[9] = -s[0] * s[9] * s[15] + s[0] * s[11] * s[13] + s[8] * s[1] * s[15] - s[8] * s[3] * s[13] - s[12] * s[1] * s[11] + s[12] * s[3] * s[9];
    inv[13] = s[0] * s[9] * s[14] - s[0] * s[10] * s[13] - s[8] * s[1] * s[14] + s[8] * s[2] * s[13] + s[12] * s[1] * s[10] - s[12] * s[2] * s[9];
    inv[2] = s[1] * s[6] * s[15] - s[1] * s[7] * s[14] - s[5] * s[2] * s[15] + s[5] * s[3] * s[14] + s[13] * s[2] * s[7] - s[13] * s[3] * s[6];
    inv[6] = -s[0] * s[6] * s[15] + s[0] * s[7] * s[14] + s[4] * s[2] * s[15] - s[4] * s[3] * s[14] - s[12] * s[2] * s[7] + s[12] * s[3] * s[6];
    inv[10] = s[0] * s[5] * s[15] - s[0] * s[7] * s[13] - s[4] * s[1] * s[15] + s[4] * s[3] * s[13] + s[12] * s[1] * s[7] - s[12] * s[3] * s[5];
    inv[14] = -s[0] * s[5] * s[14] + s[0] * s[6] * s[13] + s[4] * s[1] * s[14] - s[4] * s[2] * s[13] - s[12] * s[1] * s[6] + s[12] * s[2] * s[5];
    inv[3] = -s[1] * s[6] * s[11] + s[1] * s[7] * s[10] + s[5] * s[2] * s[11] - s[5] * s[3] * s[10] - s[9] * s[2] * s[7] + s[9] * s[3] * s[6];
    inv[7] = s[0] * s[6] * s[11] - s[0] * s[7] * s[10] - s[4] * s[2] * s[11] + s[4] * s[3] * s[10] + s[8] * s[2] * s[7] - s[8] * s[3] * s[6];
    inv[11] = -s[0] * s[5] * s[11] + s[0] * s[7] * s[9] + s[4] * s[1] * s[11] - s[4] * s[3] * s[9] - s[8] * s[1] * s[7] + s[8] * s[3] * s[5];
    inv[15] = s[0] * s[5] * s[10] - s[0] * s[6] * s[9] - s[4] * s[1] * s[10] + s[4] * s[2] * s[9] + s[8] * s[1] * s[6] - s[8] * s[2] * s[5];

    let det = s[0] * inv[0] + s[1] * inv[4] + s[2] * inv[8] + s[3] * inv[12];

    if (det === 0) {
      this.setIdentity();
      return this;
    }

    det = 1 / det;

    for (let i = 0; i < 16; i++) {
      d[i] = inv[i] * det;
    }

    this.elements = d;
    return this;
  }

  transpose() {
    const e = this.elements;
    let t;

    t = e[1]; e[1] = e[4]; e[4] = t;
    t = e[2]; e[2] = e[8]; e[8] = t;
    t = e[3]; e[3] = e[12]; e[12] = t;
    t = e[6]; e[6] = e[9]; e[9] = t;
    t = e[7]; e[7] = e[13]; e[13] = t;
    t = e[11]; e[11] = e[14]; e[14] = t;

    return this;
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initGeometryBuffers();
  initTextures();
  initModel();
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
  a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_NormalMatrix = gl.getUniformLocation(gl.program, "u_NormalMatrix");
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
  u_LightPos = gl.getUniformLocation(gl.program, "u_LightPos");
  u_LightColor = gl.getUniformLocation(gl.program, "u_LightColor");
  u_CameraPos = gl.getUniformLocation(gl.program, "u_CameraPos");
  u_SpotPos = gl.getUniformLocation(gl.program, "u_SpotPos");
  u_SpotDir = gl.getUniformLocation(gl.program, "u_SpotDir");
  u_LightingOn = gl.getUniformLocation(gl.program, "u_LightingOn");
  u_NormalOn = gl.getUniformLocation(gl.program, "u_NormalOn");
  u_PointLightOn = gl.getUniformLocation(gl.program, "u_PointLightOn");
  u_SpotLightOn = gl.getUniformLocation(gl.program, "u_SpotLightOn");
  u_IgnoreLighting = gl.getUniformLocation(gl.program, "u_IgnoreLighting");
}

function initGeometryBuffers() {
  const cubeVertices = makeCubeVertices();
  g_cubeVertexCount = cubeVertices.length / 8;
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);

  const cylinderVertices = makeCylinderVertices(28);
  g_cylinderVertexCount = cylinderVertices.length / 8;
  g_cylinderBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cylinderVertices), gl.STATIC_DRAW);

  const sphereVertices = makeSphereVertices(20, 28);
  g_sphereVertexCount = sphereVertices.length / 8;
  g_sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertices), gl.STATIC_DRAW);
}

function initModel() {
  g_model = new Model("assets/ship.obj");
  g_model.load();
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

  addToggle("lightingButton", function() {
    g_lightingOn = !g_lightingOn;
  });

  addToggle("normalButton", function() {
    g_normalOn = !g_normalOn;
  });

  addToggle("pointButton", function() {
    g_pointLightOn = !g_pointLightOn;
  });

  addToggle("spotButton", function() {
    g_spotLightOn = !g_spotLightOn;
  });

  document.getElementById("lightXSlide").addEventListener("input", function() {
    g_lightX = Number(this.value);
    setLightPosition();
    updateLightText();
  });

  document.getElementById("lightYSlide").addEventListener("input", function() {
    g_lightY = Number(this.value);
    setLightPosition();
    updateLightText();
  });

  document.getElementById("lightZSlide").addEventListener("input", function() {
    g_lightZ = Number(this.value);
    setLightPosition();
    updateLightText();
  });

  document.getElementById("lightRSlide").addEventListener("input", function() {
    g_lightColor[0] = Number(this.value) / 100;
    updateLightText();
  });

  document.getElementById("lightGSlide").addEventListener("input", function() {
    g_lightColor[1] = Number(this.value) / 100;
    updateLightText();
  });

  document.getElementById("lightBSlide").addEventListener("input", function() {
    g_lightColor[2] = Number(this.value) / 100;
    updateLightText();
  });

  setLightPosition();
  updateLightText();
}

function addToggle(id, changeFunction) {
  const button = document.getElementById(id);

  button.addEventListener("click", function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    changeFunction();
    updateLightText();
  });
}

function setLightPosition() {
  g_lightPos[0] = g_lightX;
  g_lightPos[1] = g_lightY;
  g_lightPos[2] = g_lightZ;
}

function updateLightText() {
  document.getElementById("lightingButton").textContent = g_lightingOn ? "Lighting On" : "Lighting Off";
  document.getElementById("normalButton").textContent = g_normalOn ? "Normals On" : "Normals Off";
  document.getElementById("pointButton").textContent = g_pointLightOn ? "Point Light On" : "Point Light Off";
  document.getElementById("spotButton").textContent = g_spotLightOn ? "Spot Light On" : "Spot Light Off";
  document.getElementById("lightText").textContent =
    "Point light: (" + g_lightPos[0].toFixed(1) + ", " + g_lightPos[1].toFixed(1) + ", " + g_lightPos[2].toFixed(1) + ") | Color: " +
    Math.round(g_lightColor[0] * 100) + ", " + Math.round(g_lightColor[1] * 100) + ", " + Math.round(g_lightColor[2] * 100);
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

function getCameraDir() {
  let x = g_camera.at[0] - g_camera.eye[0];
  let y = g_camera.at[1] - g_camera.eye[1];
  let z = g_camera.at[2] - g_camera.eye[2];
  const len = Math.sqrt(x * x + y * y + z * z);

  if (len === 0) {
    return [0, 0, -1];
  }

  return [x / len, y / len, z / len];
}

function renderScene() {
  const start = performance.now();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const spotDir = getCameraDir();
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_CameraPos, g_camera.eye[0], g_camera.eye[1], g_camera.eye[2]);
  gl.uniform3f(u_SpotPos, g_camera.eye[0], g_camera.eye[1], g_camera.eye[2]);
  gl.uniform3f(u_SpotDir, spotDir[0], spotDir[1], spotDir[2]);
  gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
  gl.uniform1i(u_NormalOn, g_normalOn ? 1 : 0);
  gl.uniform1i(u_PointLightOn, g_pointLightOn ? 1 : 0);
  gl.uniform1i(u_SpotLightOn, g_spotLightOn ? 1 : 0);

  drawSky();
  drawGround();
  drawMap();
  drawHayBlock();
  drawFarmStuff();
  drawSpheres();
  drawObjModel();
  drawCow();
  drawLightMarker();

  g_renderMs = performance.now() - start;
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

function drawSky() {
  const sky = new Matrix4();
  sky.translate(0, 30, 0);
  sky.scale(160, 160, 160);
  drawCube(sky, [0.55, 0.66, 1.0, 1], 4, 0.85, true);
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

function drawSpheres() {
  let sphere = new Matrix4();
  sphere.translate(-8.0, 1.0, 3.5);
  sphere.scale(1.7, 1.7, 1.7);
  drawSphere(sphere, [0.95, 0.12, 0.08, 1]);

  sphere = new Matrix4();
  sphere.translate(6.5, 0.9, 4.5);
  sphere.scale(1.4, 1.4, 1.4);
  drawSphere(sphere, [0.20, 0.35, 0.95, 1]);

  sphere = new Matrix4();
  sphere.translate(0.0, 0.65, 7.0);
  sphere.scale(1.0, 1.0, 1.0);
  drawSphere(sphere, [0.92, 0.82, 0.45, 1]);
}

function drawObjModel() {
  const modelMatrix = new Matrix4();
  modelMatrix.translate(10.5, 0.7, -10.5);
  modelMatrix.rotate(25, 0, 1, 0);
  modelMatrix.scale(1.2, 1.2, 1.2);
  g_model.render(modelMatrix, [0.65, 0.68, 0.72, 1]);
}

function drawLightMarker() {
  const marker = new Matrix4();
  marker.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  marker.scale(0.35, 0.35, 0.35);
  drawCube(marker, [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1], -1, 0, true);
}

function drawCube(matrix, color, textureNum, textureWeight, ignoreLighting) {
  drawBuffer(g_cubeBuffer, g_cubeVertexCount, matrix, color, textureNum, textureWeight, ignoreLighting ? 1 : 0);
}

function drawCylinder(matrix, color) {
  drawBuffer(g_cylinderBuffer, g_cylinderVertexCount, matrix, color, -1, 0, 0);
}

function drawSphere(matrix, color) {
  drawBuffer(g_sphereBuffer, g_sphereVertexCount, matrix, color, -1, 0, 0);
}

function drawBuffer(buffer, count, matrix, color, textureNum, textureWeight, ignoreLighting) {
  const normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(matrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_WhichTexture, textureNum);
  gl.uniform1f(u_TextureWeight, textureWeight);
  gl.uniform1i(u_IgnoreLighting, ignoreLighting);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(a_UV);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 32, 20);
  gl.enableVertexAttribArray(a_Normal);
  gl.drawArrays(gl.TRIANGLES, 0, count);
}

function pushV(arr, x, y, z, u, v, nx, ny, nz) {
  arr.push(x, y, z, u, v, nx, ny, nz);
}

function pushTri(arr, a, b, c, normal) {
  pushV(arr, a[0], a[1], a[2], a[3], a[4], normal[0], normal[1], normal[2]);
  pushV(arr, b[0], b[1], b[2], b[3], b[4], normal[0], normal[1], normal[2]);
  pushV(arr, c[0], c[1], c[2], c[3], c[4], normal[0], normal[1], normal[2]);
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

  addFace(v, p001, p101, p111, p011, [0, 0, 1]);
  addFace(v, p100, p000, p010, p110, [0, 0, -1]);
  addFace(v, p011, p111, p110, p010, [0, 1, 0]);
  addFace(v, p000, p100, p101, p001, [0, -1, 0]);
  addFace(v, p101, p100, p110, p111, [1, 0, 0]);
  addFace(v, p000, p001, p011, p010, [-1, 0, 0]);

  return v;
}

function addFace(arr, p1, p2, p3, p4, normal) {
  const a = [p1[0], p1[1], p1[2], 0, 0];
  const b = [p2[0], p2[1], p2[2], 1, 0];
  const c = [p3[0], p3[1], p3[2], 1, 1];
  const d = [p4[0], p4[1], p4[2], 0, 1];

  pushTri(arr, a, b, c, normal);
  pushTri(arr, a, c, d, normal);
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
    const n1 = [Math.cos(a1), 0, Math.sin(a1)];
    const n2 = [Math.cos(a2), 0, Math.sin(a2)];

    pushV(vertices, x1, yBottom, z1, 0, 0, n1[0], n1[1], n1[2]);
    pushV(vertices, x1, yTop, z1, 0, 1, n1[0], n1[1], n1[2]);
    pushV(vertices, x2, yBottom, z2, 1, 0, n2[0], n2[1], n2[2]);

    pushV(vertices, x1, yTop, z1, 0, 1, n1[0], n1[1], n1[2]);
    pushV(vertices, x2, yTop, z2, 1, 1, n2[0], n2[1], n2[2]);
    pushV(vertices, x2, yBottom, z2, 1, 0, n2[0], n2[1], n2[2]);

    pushV(vertices, 0, yTop, 0, 0.5, 0.5, 0, 1, 0);
    pushV(vertices, x1, yTop, z1, 0, 0, 0, 1, 0);
    pushV(vertices, x2, yTop, z2, 1, 0, 0, 1, 0);

    pushV(vertices, 0, yBottom, 0, 0.5, 0.5, 0, -1, 0);
    pushV(vertices, x2, yBottom, z2, 1, 0, 0, -1, 0);
    pushV(vertices, x1, yBottom, z1, 0, 0, 0, -1, 0);
  }

  return vertices;
}

function makeSphereVertices(latSteps, lonSteps) {
  const vertices = [];
  const radius = 0.5;

  for (let lat = 0; lat < latSteps; lat++) {
    const t1 = lat * Math.PI / latSteps;
    const t2 = (lat + 1) * Math.PI / latSteps;

    for (let lon = 0; lon < lonSteps; lon++) {
      const p1 = lon * 2 * Math.PI / lonSteps;
      const p2 = (lon + 1) * 2 * Math.PI / lonSteps;
      const a = spherePoint(t1, p1, radius, lon / lonSteps, lat / latSteps);
      const b = spherePoint(t2, p1, radius, lon / lonSteps, (lat + 1) / latSteps);
      const c = spherePoint(t2, p2, radius, (lon + 1) / lonSteps, (lat + 1) / latSteps);
      const d = spherePoint(t1, p2, radius, (lon + 1) / lonSteps, lat / latSteps);

      addSphereTri(vertices, a, b, c);
      addSphereTri(vertices, a, c, d);
    }
  }

  return vertices;
}

function spherePoint(theta, phi, radius, u, v) {
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.cos(theta);
  const z = Math.sin(theta) * Math.sin(phi);

  return [x * radius, y * radius, z * radius, u, v, x, y, z];
}

function addSphereTri(arr, a, b, c) {
  pushV(arr, a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]);
  pushV(arr, b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]);
  pushV(arr, c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7]);
}

class Model {
  constructor(filePath) {
    this.filePath = filePath;
    this.buffer = null;
    this.vertexCount = 0;
    this.ready = false;
  }

  async load() {
    try {
      const response = await fetch(this.filePath);
      if (!response.ok) {
        throw new Error("bad file");
      }
      const text = await response.text();
      this.parseModel(text);
    } catch (e) {
      this.parseModel(getFallbackObj());
    }
  }

  parseModel(text) {
    const positions = [];
    const normals = [];
    const data = [];
    const rows = text.split("\n");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].trim();

      if (row.length === 0) {
        continue;
      }

      const parts = row.split(/\s+/);

      if (parts[0] === "v") {
        positions.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
      } else if (parts[0] === "vn") {
        normals.push(normalizeVec([Number(parts[1]), Number(parts[2]), Number(parts[3])]));
      } else if (parts[0] === "f") {
        for (let j = 2; j < parts.length - 1; j++) {
          this.addObjTri(data, parts[1], parts[j], parts[j + 1], positions, normals);
        }
      }
    }

    this.vertexCount = data.length / 8;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    this.ready = true;
  }

  addObjTri(data, s1, s2, s3, positions, normals) {
    const a = parseObjVertex(s1, positions, normals);
    const b = parseObjVertex(s2, positions, normals);
    const c = parseObjVertex(s3, positions, normals);
    let faceNormal = cross(subtractVec(b.p, a.p), subtractVec(c.p, a.p));
    faceNormal = normalizeVec(faceNormal);

    if (!a.n) {
      a.n = faceNormal;
    }

    if (!b.n) {
      b.n = faceNormal;
    }

    if (!c.n) {
      c.n = faceNormal;
    }

    pushV(data, a.p[0], a.p[1], a.p[2], 0, 0, a.n[0], a.n[1], a.n[2]);
    pushV(data, b.p[0], b.p[1], b.p[2], 0, 0, b.n[0], b.n[1], b.n[2]);
    pushV(data, c.p[0], c.p[1], c.p[2], 0, 0, c.n[0], c.n[1], c.n[2]);
  }

  render(matrix, color) {
    if (!this.ready) {
      const temp = matrix.clone();
      temp.scale(1.0, 0.5, 1.0);
      drawCube(temp, color, -1, 0);
      return;
    }

    drawBuffer(this.buffer, this.vertexCount, matrix, color, -1, 0, 0);
  }
}

function parseObjVertex(token, positions, normals) {
  const pieces = token.split("/");
  let vi = Number(pieces[0]);
  let ni = pieces.length > 2 && pieces[2] !== "" ? Number(pieces[2]) : null;

  if (vi < 0) {
    vi = positions.length + vi + 1;
  }

  if (ni !== null && ni < 0) {
    ni = normals.length + ni + 1;
  }

  return {
    p: positions[vi - 1],
    n: ni === null ? null : normals[ni - 1]
  };
}

function subtractVec(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function normalizeVec(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

  if (len === 0) {
    return [0, 1, 0];
  }

  return [v[0] / len, v[1] / len, v[2] / len];
}

function getFallbackObj() {
  return [
    "v 0 0 1.6",
    "v -0.8 0 -0.8",
    "v 0.8 0 -0.8",
    "v 0 0.45 -0.2",
    "v 0 -0.35 -0.25",
    "v -1.2 0.05 -0.15",
    "v 1.2 0.05 -0.15",
    "v 0 0.18 -1.2",
    "f 1 2 4",
    "f 1 4 3",
    "f 1 5 2",
    "f 1 3 5",
    "f 2 5 8",
    "f 5 3 8",
    "f 2 8 4",
    "f 4 8 3",
    "f 6 2 4",
    "f 3 7 4",
    "f 2 6 5",
    "f 7 3 5"
  ].join("\n");
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