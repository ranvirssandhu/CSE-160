const canvas = document.getElementById('scene');
const statusText = document.getElementById('statusText');
const toggleLights = document.getElementById('toggleLights');
const toggleMotion = document.getElementById('toggleMotion');
const lightHeight = document.getElementById('lightHeight');

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(16, 12, 16);

const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.enableZoom = true;
controls.zoomSpeed = 0.75;
controls.rotateSpeed = 0.65;
controls.minDistance = 7;
controls.maxDistance = 55;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = Math.PI / 2.05;
controls.target.set(0, 2.5, 0);

let ambientLight;
let hemisphereLight;
let directionalLight;
let pointLight;
let spotLight;
let pointLightMarker;
let pointLightGlow;
let pointLightPool;
let lightsOn = true;
let motionOn = true;
let collected = 0;
let player;
let shipModel;
let windmillRotor;
let frameCount = 0;
let lastFpsTime = 0;
let currentFps = 0;
const worldLimit = 22;
const keys = {};
const rings = [];
const hiddenRings = new Set();

resize();
createSkybox();
createLights();
createWorld();
createPlayer();
createRings();
setEvents();
updateStatus();
animate(0);

function createCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function textureFromCanvas(canvasObj, repeatX, repeatY) {
  const texture = new THREE.CanvasTexture(canvasObj);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function makeGroundTexture() {
  const c = createCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5fbf6a';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#4fac5b' : '#64bf70';
      ctx.fillRect(x * 16, y * 16, 16, 16);
      ctx.fillStyle = '#3e9b4c';
      ctx.beginPath();
      ctx.arc(x * 16 + 8, y * 16 + 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return textureFromCanvas(c, 10, 10);
}

function makeYardTexture() {
  const c = createCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cfcfc9';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const px = x * 32;
      const py = y * 32;
      ctx.fillStyle = (x + y) % 2 === 0 ? '#dddcd6' : '#c5c3bc';
      ctx.fillRect(px + 1, py + 1, 30, 30);
      ctx.strokeStyle = '#b2b0aa';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, 30, 30);
    }
  }

  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 1.4 + 0.4;
    ctx.fillStyle = 'rgba(120,120,120,0.14)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return textureFromCanvas(c, 4, 4);
}

function makeWoodTexture() {
  const c = createCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a5540';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = i % 2 === 0 ? '#5c3d2e' : '#8b6a55';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, i * 5 + (i % 3));
    ctx.lineTo(256, i * 5 + 2 + (i % 4));
    ctx.stroke();
  }

  return textureFromCanvas(c, 2, 2);
}

function makeHayTexture() {
  const c = createCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b9b0a2';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 120; i++) {
    ctx.strokeStyle = i % 2 === 0 ? '#8f877b' : '#d1c8ba';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.lineTo(Math.random() * 256, Math.random() * 256);
    ctx.stroke();
  }

  return textureFromCanvas(c, 2, 2);
}

function makeStoneTexture() {
  const c = createCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8c939d';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 5 + Math.random() * 18;
    ctx.fillStyle = i % 2 === 0 ? '#aab1ba' : '#747b84';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return textureFromCanvas(c, 2, 2);
}

function makeMetalTexture() {
  const c = createCanvas(256);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#5f6978');
  grad.addColorStop(0.5, '#a9b5c8');
  grad.addColorStop(1, '#5a6677');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, i * 14);
    ctx.lineTo(256, i * 14);
    ctx.stroke();
  }

  return textureFromCanvas(c, 1, 1);
}

function makeShipTextureURL() {
  const c = createCanvas(512);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#61b4ff');
  grad.addColorStop(0.45, '#2758cc');
  grad.addColorStop(1, '#132457');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#101a42';
  ctx.fillRect(0, 250, 512, 80);
  ctx.fillStyle = '#98ddff';

  for (let i = 0; i < 7; i++) {
    ctx.fillRect(36 + i * 64, 70, 36, 28);
  }

  ctx.fillStyle = '#d9f7ff';
  ctx.fillRect(170, 142, 172, 52);
  ctx.fillStyle = '#b8c9d8';
  ctx.fillRect(214, 366, 84, 36);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12;
  ctx.strokeRect(18, 18, 476, 476);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(38, 460);
  ctx.lineTo(474, 64);
  ctx.stroke();

  return c.toDataURL('image/png');
}

function makeSkyFace(topColor, bottomColor, starCount, warm) {
  const c = createCanvas(512);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 3 + 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
}

function createSkybox() {
  const images = [
    makeSkyFace('#547fbd', '#8ec3ff', 25, false),
    makeSkyFace('#547fbd', '#8ec3ff', 25, false),
    makeSkyFace('#466ca6', '#7fb5ec', 20, false),
    makeSkyFace('#8ec3ff', '#bfe4ff', 10, false),
    makeSkyFace('#547fbd', '#8ec3ff', 30, false),
    makeSkyFace('#547fbd', '#8ec3ff', 30, false)
  ];
  const cubeTexture = new THREE.CubeTexture(images);
  cubeTexture.encoding = THREE.sRGBEncoding;
  cubeTexture.needsUpdate = true;
  scene.background = cubeTexture;
}

function createLights() {
  ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  hemisphereLight = new THREE.HemisphereLight(0xb7d8ff, 0x35593b, 0.55);
  scene.add(hemisphereLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.65);
  directionalLight.position.set(10, 18, 8);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.left = -35;
  directionalLight.shadow.camera.right = 35;
  directionalLight.shadow.camera.top = 35;
  directionalLight.shadow.camera.bottom = -35;
  scene.add(directionalLight);

  pointLight = new THREE.PointLight(0xd8f2ff, 2.8, 17, 1.8);
  pointLight.position.set(-7, 8, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);

  pointLightMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0xd8f2ff })
  );
  pointLight.add(pointLightMarker);

  pointLightGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0xd8f2ff, transparent: true, opacity: 0.10 })
  );
  pointLight.add(pointLightGlow);

  pointLightPool = null;

  updatePointLightVisuals();

  spotLight = new THREE.SpotLight(0xd8f2ff, 0.25, 45, Math.PI / 6, 0.45, 1);
  spotLight.position.set(10, 14, 10);
  spotLight.target.position.set(0, 0, 0);
  spotLight.castShadow = true;
  scene.add(spotLight);
  scene.add(spotLight.target);
}

function createWorld() {
  const groundTex = makeGroundTexture();
  const yardTex = makeYardTexture();
  const woodTex = makeWoodTexture();
  const hayTex = makeHayTexture();
  const stoneTex = makeStoneTexture();
  const metalTex = makeMetalTexture();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({ map: yardTex, roughness: 1 })
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(0, 0.01, 0);
  yard.receiveShadow = true;
  scene.add(yard);

  const wallMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95 });
  addBox(49, 2.6, 0.9, 0, 1.3, -24.6, wallMat);
  addBox(49, 2.6, 0.9, 0, 1.3, 24.6, wallMat);
  addBox(0.9, 2.6, 49, -24.6, 1.3, 0, wallMat);
  addBox(0.9, 2.6, 49, 24.6, 1.3, 0, wallMat);

  const barnMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.86 });
  const barn = addBox(5.2, 3.3, 4.4, -18.2, 1.65, -2.8, barnMat);
  barn.rotation.y = 0.08;

  const barnRoof = new THREE.Mesh(
    new THREE.ConeGeometry(3.8, 2.1, 4),
    new THREE.MeshStandardMaterial({ color: 0xff5f5f, roughness: 0.8 })
  );
  barnRoof.position.set(-18.2, 4.25, -2.8);
  barnRoof.rotation.y = Math.PI / 4 + 0.08;
  barnRoof.castShadow = true;
  barnRoof.receiveShadow = true;
  scene.add(barnRoof);

  for (let i = 0; i < 5; i++) {
    addBox(1.55, 0.8, 1.0, -10.5 + i * 1.6, 0.4, -1.6, new THREE.MeshStandardMaterial({ map: hayTex, roughness: 0.9 }));
  }

  for (let i = 0; i < 3; i++) {
    addBox(1.2, 1.2, 1.2, -19 + i * 1.05, 0.6, 3 + i * 0.8, new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.88 }));
  }

  for (let i = 0; i < 6; i++) {
    makeTree(-10 + i * 3.2, -8.5 + (i % 2) * 1.3);
  }

  for (let i = 0; i < 5; i++) {
    makeRock(-12 + i * 3.8, 0.2 + (i % 2) * 0.9, stoneTex);
  }

  makeFenceSegment(-13.5, -6.1, -10.6, woodTex);
  makeFenceSegment(-13.5, -6.1, -5.4, woodTex);
  makeFenceSegment(6.2, 20.5, -10.8, woodTex);
  makeFenceSegment(11.3, 23.0, 7.2, woodTex, Math.PI / 2);
  makeFenceSegment(17.0, 23.0, 12.0, woodTex, Math.PI / 2);
  makeFenceSegment(7.5, 18.0, 13.8, woodTex);

  makeWell(14.5, 16.8, stoneTex, woodTex);
  makeWindmill(6.7, -2.5, woodTex);
  makeCropPatch(-7.5, 18.3);
  makeLantern(-2, 0, metalTex);
  makeLantern(4, -4, metalTex);
  makeLantern(8, 4, metalTex);
}

function addBox(w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function makeTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 2.3, 12),
    new THREE.MeshStandardMaterial({ color: 0x7c4a24, roughness: 0.9 })
  );
  trunk.position.set(x, 1.15, z);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 22, 18),
    new THREE.MeshStandardMaterial({ color: 0x50d46b, roughness: 0.7 })
  );
  leaves.position.set(x, 2.85, z);
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  scene.add(leaves);
}

function makeRock(x, z, texture) {
  const rock = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 18, 12),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 1 })
  );
  rock.scale.set(1.3, 0.58, 0.88);
  rock.position.set(x, 0.38, z);
  rock.rotation.y = x * 0.3;
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

function makeFenceSegment(x1, x2, z, woodTex, rotationY) {
  const length = Math.abs(x2 - x1);
  const centerX = rotationY === 0 || rotationY === undefined ? (x1 + x2) * 0.5 : x1;
  const centerZ = rotationY === 0 || rotationY === undefined ? z : (x1 + x2) * 0.5;
  const mat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });

  if (rotationY === 0 || rotationY === undefined) {
    for (let x = x1; x <= x2; x += 2.4) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.5, 10), mat);
      post.position.set(x, 0.75, z);
      post.castShadow = true;
      post.receiveShadow = true;
      scene.add(post);
    }
    addBox(length, 0.15, 0.14, centerX, 1.0, z, mat);
    addBox(length, 0.15, 0.14, centerX, 0.55, z, mat);
  } else {
    for (let v = x1; v <= x2; v += 2.4) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.5, 10), mat);
      post.position.set(z, 0.75, v);
      post.castShadow = true;
      post.receiveShadow = true;
      scene.add(post);
    }
    addBox(0.14, 0.15, length, z, 1.0, centerZ, mat);
    addBox(0.14, 0.15, length, z, 0.55, centerZ, mat);
  }
}

function makeWell(x, z, stoneTex, woodTex) {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.9, 28, 1, true),
    new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 1, side: THREE.DoubleSide })
  );
  base.position.set(x, 0.45, z);
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.7, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x67cfff, roughness: 0.15, metalness: 0.1 })
  );
  water.position.set(x, 0.18, z);
  scene.add(water);

  addBox(0.25, 2.5, 0.25, x - 1.1, 1.7, z, new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.82 }));
  addBox(0.25, 2.5, 0.25, x + 1.1, 1.7, z, new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.82 }));

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 1.4, 4),
    new THREE.MeshStandardMaterial({ color: 0xff6a6a, roughness: 0.78 })
  );
  roof.position.set(x, 3.1, z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  scene.add(roof);
}

function makeWindmill(x, z, woodTex) {
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.55, 6.4, 20),
    new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.86 })
  );
  tower.position.set(x, 3.2, z);
  tower.castShadow = true;
  tower.receiveShadow = true;
  scene.add(tower);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.3, 2.0),
    new THREE.MeshStandardMaterial({ color: 0xd4d9df, roughness: 0.75 })
  );
  head.position.set(x, 6.65, z);
  head.castShadow = true;
  head.receiveShadow = true;
  scene.add(head);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.7, 1.0, 4),
    new THREE.MeshStandardMaterial({ color: 0xff6868, roughness: 0.78 })
  );
  roof.position.set(x, 7.8, z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);

  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.23, 0.75, 18),
    new THREE.MeshStandardMaterial({ color: 0x8f99a3, roughness: 0.6 })
  );
  nose.position.set(x, 6.65, z + 1.38);
  nose.rotation.x = Math.PI / 2;
  nose.castShadow = true;
  scene.add(nose);

  windmillRotor = new THREE.Group();
  windmillRotor.position.set(x, 6.65, z + 1.82);
  scene.add(windmillRotor);

  const armMat = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.75 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf3f6f8, roughness: 0.7, transparent: true, opacity: 0.92 });

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    blade.rotation.z = i * Math.PI / 2;

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 0.1), armMat);
    arm.position.y = 1.35;
    arm.castShadow = true;
    blade.add(arm);

    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.25, 0.055), sailMat);
    sail.position.set(0.25, 2.05, 0);
    sail.rotation.z = -0.08;
    sail.castShadow = true;
    blade.add(sail);

    windmillRotor.add(blade);
  }

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.28, 20),
    new THREE.MeshStandardMaterial({ color: 0x8f99a3, roughness: 0.7 })
  );
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  windmillRotor.add(hub);
}

function makeCropPatch(x, z) {
  const cropMat = new THREE.MeshStandardMaterial({ color: 0x4cd86d, roughness: 0.82 });

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const crop = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 8), cropMat);
      crop.position.set(x + col * 0.72, 0.35, z + row * 0.78);
      crop.castShadow = true;
      crop.receiveShadow = true;
      scene.add(crop);
    }
  }
}

function makeLantern(x, z, metalTex) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 2.8, 10),
    new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.7, metalness: 0.45 })
  );
  pole.position.set(x, 1.4, z);
  pole.castShadow = true;
  pole.receiveShadow = true;
  scene.add(pole);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8f2ff, emissive: 0x82cfff, emissiveIntensity: 0.8 })
  );
  bulb.position.set(x, 2.65, z);
  scene.add(bulb);
}

function createPlayer() {
  player = new THREE.Group();
  player.position.set(0, 1.1, 2);
  scene.add(player);

  const shipTextureUrl = makeShipTextureURL();
  const shipMtl = `
newmtl ShipPaint
Ka 1.000 1.000 1.000
Kd 1.000 1.000 1.000
Ks 0.200 0.200 0.200
Ns 40.000
illum 2
map_Kd ${shipTextureUrl}
`;

  const shipObj = `
mtllib ship.mtl
usemtl ShipPaint
v 0.0000 0.0000 1.8500
v -0.8000 0.0000 -0.6000
v 0.8000 0.0000 -0.6000
v 0.0000 0.4400 -0.0300
v 0.0000 -0.2800 -0.1200
v -1.2500 0.0000 0.1200
v 1.2500 0.0000 0.1200
v 0.0000 0.2400 -1.1500
v -0.2600 0.2800 0.1700
v 0.2600 0.2800 0.1700
v -0.1800 0.6600 -0.3000
v 0.1800 0.6600 -0.3000
vt 0.5000 1.0000
vt 0.0000 0.0000
vt 1.0000 0.0000
vt 0.5000 0.6500
vt 0.5000 0.3500
vt 0.0000 0.5000
vt 1.0000 0.5000
vt 0.5000 0.0000
vt 0.3500 0.7500
vt 0.6500 0.7500
vt 0.3800 0.5200
vt 0.6200 0.5200
f 1/1 2/2 4/4
f 1/1 4/4 3/3
f 1/1 5/5 2/2
f 1/1 3/3 5/5
f 2/2 5/5 8/8
f 5/5 3/3 8/8
f 2/2 6/6 4/4
f 3/3 4/4 7/7
f 6/6 5/5 2/2
f 7/7 3/3 5/5
f 8/8 4/4 6/6
f 8/8 7/7 4/4
f 9/9 10/10 11/11
f 10/10 12/12 11/11
f 9/9 11/11 4/4
f 10/10 4/4 12/12
`;

  const materials = new THREE.MTLLoader().parse(shipMtl, '');
  materials.preload();

  const loader = new THREE.OBJLoader();
  loader.setMaterials(materials);
  shipModel = loader.parse(shipObj);
  shipModel.scale.set(1.1, 1.1, 1.1);
  shipModel.rotation.y = Math.PI;

  shipModel.traverse(function(child) {
    if (child.isMesh) {
      child.geometry.computeVertexNormals();
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  player.add(shipModel);
}

function createRings() {
  const positions = [
    [0, 2.0, -5],
    [7, 2.2, 6],
    [-8, 2.2, 6],
    [12, 2.4, -8],
    [-13, 2.4, -10],
    [16, 2.2, 15]
  ];

  for (let i = 0; i < positions.length; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.14, 16, 28),
      new THREE.MeshStandardMaterial({
        color: 0xf2cf58,
        emissive: 0x6f5200,
        emissiveIntensity: 0.38,
        roughness: 0.35
      })
    );
    ring.position.set(positions[i][0], positions[i][1], positions[i][2]);
    ring.castShadow = true;
    scene.add(ring);
    rings.push(ring);
  }
}

function setEvents() {
  window.addEventListener('resize', resize);

  window.addEventListener('keydown', function(e) {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'r') {
      player.position.set(0, 1.1, 2);
      player.rotation.y = 0;
      controls.target.set(0, 2.5, 0);
    }
  });

  window.addEventListener('keyup', function(e) {
    keys[e.key.toLowerCase()] = false;
  });

  toggleLights.addEventListener('click', function() {
    lightsOn = !lightsOn;
    toggleLights.textContent = lightsOn ? 'Lights On' : 'Lights Off';
    ambientLight.visible = lightsOn;
    hemisphereLight.visible = lightsOn;
    directionalLight.visible = lightsOn;
    pointLight.visible = lightsOn;
    if (pointLightMarker) pointLightMarker.visible = lightsOn;
    if (pointLightGlow) pointLightGlow.visible = lightsOn;
    spotLight.visible = lightsOn;
  });

  toggleMotion.addEventListener('click', function() {
    motionOn = !motionOn;
    toggleMotion.textContent = motionOn ? 'Motion On' : 'Motion Off';
  });

  lightHeight.addEventListener('input', function() {
    pointLight.position.y = Number(lightHeight.value);
    updatePointLightVisuals();
  });

}


function updatePointLightVisuals() {
  if (pointLightPool) {
    pointLightPool.position.x = pointLight.position.x;
    pointLightPool.position.z = pointLight.position.z;
    const scale = THREE.MathUtils.clamp(pointLight.position.y / 8, 0.65, 1.7);
    pointLightPool.scale.set(scale, scale, scale);
  }

}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}


function updatePlayer(dt) {
  const moveSpeed = 7.2;
  const turnSpeed = 2.5;
  let forward = 0;
  let turn = 0;

  if (keys.w) forward += 1;
  if (keys.s) forward -= 1;
  if (keys.a) turn += 1;
  if (keys.d) turn -= 1;

  player.rotation.y += turn * turnSpeed * dt;

  const dir = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
  const nextX = player.position.x + dir.x * forward * moveSpeed * dt;
  const nextZ = player.position.z + dir.z * forward * moveSpeed * dt;

  player.position.x = THREE.MathUtils.clamp(nextX, -worldLimit, worldLimit);
  player.position.z = THREE.MathUtils.clamp(nextZ, -worldLimit, worldLimit);

  if (shipModel) {
    shipModel.position.y = Math.sin(clock.elapsedTime * 3.2) * 0.08;
  }
}

function checkRings() {
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    if (!hiddenRings.has(i) && ring.position.distanceTo(player.position) < 1.45) {
      ring.visible = false;
      hiddenRings.add(i);
      collected += 1;
      updateStatus();
    }
  }
}

function updateStatus() {
  const ending = currentFps > 0 ? ' FPS: ' + currentFps : '';
  if (collected >= rings.length) {
    statusText.textContent = 'Fuel rings: ' + collected + ' / ' + rings.length + '. You collected them all.' + ending;
  } else {
    statusText.textContent = 'Fuel rings: ' + collected + ' / ' + rings.length + ending;
  }
}

function animate(time) {
  const dt = clock.getDelta();

  updatePlayer(dt);

  if (motionOn) {
    if (windmillRotor) {
      windmillRotor.rotation.z -= dt * 1.7;
    }

    pointLight.position.x = Math.sin(clock.elapsedTime * 0.7) * 9;
    pointLight.position.z = Math.cos(clock.elapsedTime * 0.7) * 9;
    updatePointLightVisuals();
    if (pointLightGlow) {
      const glowScale = 1 + Math.sin(clock.elapsedTime * 4) * 0.08;
      pointLightGlow.scale.set(glowScale, glowScale, glowScale);
    }

    for (let i = 0; i < rings.length; i++) {
      if (rings[i].visible) {
        rings[i].rotation.x += dt * 1.7;
        rings[i].rotation.y += dt * 2.3;
        rings[i].position.y += Math.sin(clock.elapsedTime * 2 + i) * 0.003;
      }
    }
  }

  checkRings();
  controls.update();
  renderer.render(scene, camera);

  frameCount += 1;
  if (time - lastFpsTime > 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsTime = time;
    updateStatus();
  }

  requestAnimationFrame(animate);
}
