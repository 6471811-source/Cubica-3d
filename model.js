/* ============================================================
   CUBICA 3D — модель устройства кассетного потолка
   Версия: 1.1
   Лицензировано для домена cubica.by
   ============================================================ */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.160.0/examples/jsm/renderers/CSS2DRenderer.js';

/* ============================================================
   ЗАЩИТА ПО ДОМЕНУ
   ============================================================ */
const ALLOWED_DOMAINS = [
  'cubica.by',
  'www.cubica.by',
  'tilda.ws',
  'tilda.cc'
];

const currentHost = window.location.hostname;
const isLocal = currentHost === '' || currentHost === 'localhost' || currentHost === '127.0.0.1';
const isAllowed = isLocal
  || ALLOWED_DOMAINS.some(d => currentHost === d || currentHost.endsWith('.' + d));

if (!isAllowed) {
  console.warn('[Cubica 3D] Скрипт лицензирован только для домена cubica.by');
} else {
  startCubica3D();
}

/* ============================================================
   ОСНОВНАЯ ФУНКЦИЯ
   ============================================================ */
function startCubica3D() {
  const container = document.getElementById('cubica-3d');
  if (!container) {
    console.error('[Cubica 3D] Не найден элемент #cubica-3d на странице.');
    return;
  }

  /* ---------------- РАЗМЕРЫ ---------------- */
  const CELL = 0.6, COLS = 3, ROWS = 2;
  const W = COLS * CELL, D = ROWS * CELL;

  const FLANGE_W = 0.024, FLANGE_T = 0.0020;
  const WEB_H    = 0.038, WEB_T    = 0.0022;
  const BULB_R   = 0.0040;
  const BULB_TOP = FLANGE_T + WEB_H + 2 * BULB_R;
  const BULB_CY  = FLANGE_T + WEB_H + BULB_R;

  const PANEL_SIZE = 0.574, PANEL_T = 0.010;
  const DROP       = 0.012, EDGE_T  = 0.0018;
  const LEDGE_W    = 0.006, LEDGE_T = 0.0016;

  const MISSING = { r: ROWS - 1, c: COLS - 1 };

  /* ---------------- СЦЕНА / КАМЕРА / РЕНДЕР ---------------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f2ee);
  scene.fog = new THREE.Fog(0xf4f2ee, 7, 16);

  const camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(2.6, 1.35, 3.0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  container.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.45, 0);
  controls.minDistance = 1.8;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  /* ---------------- СВЕТ ---------------- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcac5be, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.65);
  key.position.set(3.5, -4.5, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left:-3.5, right:3.5, top:3.5, bottom:-3.5, near:0.1, far:20 });
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.003;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-4, 1.5, -3);
  scene.add(fill);

  /* ---------------- МАТЕРИАЛЫ ---------------- */
  const matFlange   = new THREE.MeshStandardMaterial({ color:0xf7f6f3, metalness:0.05, roughness:0.55 });
  const matGalv     = new THREE.MeshStandardMaterial({ color:0xc9ced3, metalness:0.82, roughness:0.30 });
  const matGalvDark = new THREE.MeshStandardMaterial({ color:0xa4aab0, metalness:0.78, roughness:0.36 });
  const matPanel    = new THREE.MeshStandardMaterial({ color:0xf6f4f0, metalness:0.08, roughness:0.62 });
  const matEdge     = new THREE.MeshStandardMaterial({ color:0xdedbd5, metalness:0.25, roughness:0.48 });
  const matWire     = new THREE.MeshStandardMaterial({ color:0xc6cacd, metalness:0.92, roughness:0.18 });
  const matAnchor   = new THREE.MeshStandardMaterial({ color:0x545a61, metalness:0.92, roughness:0.30 });
  const matSlot     = new THREE.MeshStandardMaterial({ color:0x33383d, metalness:0.6,  roughness:0.5  });
  const matSpring   = new THREE.MeshStandardMaterial({ color:0xb8bdc2, metalness:0.85, roughness:0.28, side:THREE.DoubleSide });
  const matClip     = new THREE.MeshStandardMaterial({ color:0x8f959b, metalness:0.90, roughness:0.25, side:THREE.DoubleSide });

  /* ---------------- РЕЕСТР АНИМИРУЕМЫХ ЧАСТЕЙ ---------------- */
  const animatables = [];
  function registerPart(obj, opts = {}) {
    animatables.push({
      obj,
      baseY: obj.position.y,
      offsetY: opts.offsetY ?? 0,
      delay: opts.delay ?? 0,
      span: opts.span ?? 0.7
    });
  }

  /* ---------------- Т-ПРОФИЛЬ ---------------- */
  function makeTRunner(len, opts = {}) {
    const { withSlots = false, withEndLocks = false, slotStep = 0.15 } = opts;
    const g = new THREE.Group();

    const flange = new THREE.Mesh(new THREE.BoxGeometry(len, FLANGE_T, FLANGE_W), matFlange);
    flange.position.y = FLANGE_T / 2;
    g.add(flange);

    const web = new THREE.Mesh(new THREE.BoxGeometry(len, WEB_H, WEB_T), matGalv);
    web.position.y = FLANGE_T + WEB_H / 2;
    g.add(web);

    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(BULB_R, BULB_R, len, 16), matGalv);
    bulb.rotation.z = Math.PI / 2;
    bulb.position.y = FLANGE_T + WEB_H + BULB_R;
    g.add(bulb);

    if (withSlots) {
      const count = Math.floor(len / slotStep);
      for (let i = 1; i < count; i++) {
        const x = -len / 2 + i * slotStep;
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.009, WEB_T + 0.0014), matSlot);
        slot.position.set(x, FLANGE_T + WEB_H * 0.70, 0);
        g.add(slot);
        const tab = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.0018, WEB_T + 0.0010), matGalvDark);
        tab.position.set(x, FLANGE_T + WEB_H * 0.70 + 0.0055, 0);
        g.add(tab);
      }
    }

    if (withEndLocks) {
      for (const sx of [-1, 1]) {
        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.0034), matGalvDark);
        lock.position.set(sx * (len/2 - 0.006), FLANGE_T + WEB_H * 0.55, 0);
        g.add(lock);
        const beak = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.004, 0.0030), matGalvDark);
        beak.position.set(sx * (len/2 - 0.001), FLANGE_T + WEB_H * 0.72, 0);
        g.add(beak);
        const notch = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.010, WEB_T + 0.0010), matSlot);
        notch.position.set(sx * (len/2 - 0.010), FLANGE_T + WEB_H * 0.55, 0);
        g.add(notch);
      }
    }

    g.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; }});
    return g;
  }

  const gridGroup = new THREE.Group();
  for (let r = 0; r <= ROWS; r++) {
    const m = makeTRunner(W + FLANGE_W, { withSlots:true, slotStep:0.15 });
    m.position.set(0, 0, -D/2 + r * CELL);
    gridGroup.add(m);
  }
  for (let c = 0; c <= COLS; c++) {
    const cr = makeTRunner(D + FLANGE_W, { withEndLocks:true });
    cr.rotation.y = Math.PI / 2;
    cr.position.set(-W/2 + c * CELL, 0, 0);
    gridGroup.add(cr);
  }
  scene.add(gridGroup);
  registerPart(gridGroup, { offsetY: 0.06, delay: 0.90, span: 0.10 });

  /* ---------------- КЛИПСА ФИКСАЦИИ ---------------- */
  function makeFixationClip() {
    const g = new THREE.Group();
    const clipW  = 0.014;
    const metalT = 0.0009;
    const ledgeTopY = FLANGE_T + LEDGE_T;

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(clipW, metalT, WEB_T + 0.010), matClip);
    bridge.position.set(0, BULB_TOP + metalT / 2, 0);
    g.add(bridge);

    for (const sz of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(clipW, BULB_TOP - FLANGE_T, metalT), matClip);
      wall.position.set(0, (BULB_TOP + FLANGE_T) / 2, sz * (WEB_T / 2 + metalT / 2 + 0.0012));
      g.add(wall);

      const tab = new THREE.Mesh(new THREE.BoxGeometry(clipW, metalT, 0.011), matClip);
      tab.position.set(0, ledgeTopY + metalT / 2 + 0.0002, sz * (WEB_T / 2 + 0.0075));
      g.add(tab);

      const curl = new THREE.Mesh(new THREE.CylinderGeometry(metalT * 1.2, metalT * 1.2, clipW, 8), matClip);
      curl.rotation.z = Math.PI / 2;
      curl.position.set(0, ledgeTopY - metalT, sz * (WEB_T / 2 + 0.0125));
      g.add(curl);

      const ear = new THREE.Mesh(new THREE.BoxGeometry(clipW, metalT, 0.0030), matClip);
      ear.position.set(0, BULB_TOP - 0.0012, sz * (WEB_T / 2 + 0.0055));
      ear.rotation.x = sz * 0.25;
      g.add(ear);
    }

    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  const clipsGroup = new THREE.Group();
  for (let r = 0; r <= ROWS; r++) {
    const z = -D/2 + r * CELL;
    for (let c = 0; c < COLS; c++) {
      const cellBelow = r < ROWS && !(r === MISSING.r && c === MISSING.c);
      const cellAbove = r > 0 && !(r - 1 === MISSING.r && c === MISSING.c);
      if (!cellBelow && !cellAbove) continue;

      const cx = -W/2 + CELL/2 + c * CELL;
      for (const x of [cx - CELL * 0.22, cx + CELL * 0.22]) {
        const clip = makeFixationClip();
        clip.position.set(x, 0, z);
        clipsGroup.add(clip);
      }
    }
  }
  scene.add(clipsGroup);
  registerPart(clipsGroup, { offsetY: 0.06, delay: 0.90, span: 0.10 });

  /* ---------------- ЕВРОПОДВЕС ---------------- */
  function makeEuropend() {
    const g = new THREE.Group();

    const plugTopY = 1.15;
    const plugH = 0.020;
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, plugH, 10), matAnchor);
    plug.position.y = plugTopY - plugH / 2;
    g.add(plug);

    const wireX_A = -0.00180;
    const wireR   = 0.00120;

    const loopY = plugTopY - plugH - 0.007;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.0068, wireR, 10, 24), matWire);
    loop.rotation.y = Math.PI / 2;
    loop.position.set(wireX_A, loopY, 0);
    g.add(loop);

    const loopNeck = new THREE.Mesh(new THREE.CylinderGeometry(wireR, wireR, 0.004, 8), matWire);
    loopNeck.position.set(wireX_A, loopY - 0.0068 - 0.002, 0);
    g.add(loopNeck);

    const wireA_top = loopY - 0.009;
    const wireA_bot = 0.335;
    const wireA = new THREE.Mesh(new THREE.CylinderGeometry(wireR, wireR, wireA_top - wireA_bot, 8), matWire);
    wireA.position.set(wireX_A, (wireA_top + wireA_bot) / 2, 0);
    g.add(wireA);

    const wireX_B = 0.00180;
    const wireB_top = 0.505;
    const wireB_bot = BULB_TOP + 0.045;
    const wireB = new THREE.Mesh(new THREE.CylinderGeometry(wireR, wireR, wireB_top - wireB_bot, 8), matWire);
    wireB.position.set(wireX_B, (wireB_top + wireB_bot) / 2, 0);
    g.add(wireB);

    const hookPoints = [
      new THREE.Vector3(wireX_B, wireB_bot + 0.001, 0),
      new THREE.Vector3(wireX_B, BULB_CY - 0.002, 0),
      new THREE.Vector3(wireX_B - 0.003, BULB_CY - BULB_R - 0.003, 0),
      new THREE.Vector3(wireX_B - 0.010, BULB_CY - BULB_R - 0.003, 0),
      new THREE.Vector3(wireX_B - 0.015, BULB_CY - BULB_R + 0.002, 0),
      new THREE.Vector3(wireX_B - 0.015, BULB_CY + BULB_R + 0.002, 0),
      new THREE.Vector3(wireX_B - 0.011, BULB_CY + BULB_R + 0.005, 0),
    ];
    const hookCurve = new THREE.CatmullRomCurve3(hookPoints);
    const hook = new THREE.Mesh(new THREE.TubeGeometry(hookCurve, 30, wireR, 8, false), matWire);
    g.add(hook);

    const bflyY = 0.420, bflyW = 0.020, bflyH = 0.026, bflyT = 0.0018, bflySpan = 0.014;

    const body = new THREE.Mesh(new THREE.BoxGeometry(bflyW, bflyH, bflyT), matSpring);
    body.position.set(0, bflyY, 0);
    g.add(body);

    for (const sx of [wireX_A, wireX_B]) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.0026, bflyH - 0.006, bflyT + 0.0006), matSlot);
      slot.position.set(sx, bflyY, 0);
      g.add(slot);
    }

    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(bflySpan, bflyH, bflyT), matSpring);
      wing.position.set(sx * (bflyW/2 + bflySpan/2), bflyY, 0.0012);
      wing.rotation.y = sx * 0.35;
      g.add(wing);

      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.0030, bflyH * 0.85, bflyT), matSpring);
      tip.position.set(sx * (bflyW/2 + bflySpan + 0.0008), bflyY, 0.0035);
      tip.rotation.y = sx * 0.85;
      g.add(tip);
    }

    const clipTop = new THREE.Mesh(new THREE.BoxGeometry(bflyW + 0.001, 0.0022, bflyT + 0.0006), matGalvDark);
    clipTop.position.set(0, bflyY + bflyH/2 - 0.001, 0);
    g.add(clipTop);

    const clipBot = new THREE.Mesh(new THREE.BoxGeometry(bflyW + 0.001, 0.0022, bflyT + 0.0006), matGalvDark);
    clipBot.position.set(0, bflyY - bflyH/2 + 0.001, 0);
    g.add(clipBot);

    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  const suspX = [-W/2 + CELL * 0.5, W/2 - CELL * 0.5];
  const suspList = [];
  for (let r = 0; r <= ROWS; r++) {
    const z = -D/2 + r * CELL;
    for (const x of suspX) {
      const e = makeEuropend();
      e.position.set(x, 0, z);
      scene.add(e);
      suspList.push(e);
    }
  }
  suspList.forEach((e, i) => {
    const delay = (i / suspList.length) * 0.40;
    registerPart(e, { offsetY: 0.95, delay, span: 0.35 });
  });

  /* ---------------- КАССЕТА TEGULAR ---------------- */
  function makeTegularCassette() {
    const g = new THREE.Group();
    const s = PANEL_SIZE;

    const panelTopY = -DROP;
    const flangeTopY = FLANGE_T;

    const panel = new THREE.Mesh(new THREE.BoxGeometry(s, PANEL_T, s), matPanel);
    panel.position.y = panelTopY - PANEL_T / 2;
    g.add(panel);

    const skirtH = flangeTopY - panelTopY;
    const skirtY = (panelTopY + flangeTopY) / 2;

    const mkSkirtZ = (z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, skirtH, EDGE_T), matEdge);
      m.position.set(0, skirtY, z);
      return m;
    };
    const mkSkirtX = (x) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(EDGE_T, skirtH, s), matEdge);
      m.position.set(x, skirtY, 0);
      return m;
    };
    g.add(mkSkirtZ(-s/2), mkSkirtZ(s/2), mkSkirtX(-s/2), mkSkirtX(s/2));

    const ledgeY = flangeTopY + LEDGE_T / 2;
    const ledgeLen = s + LEDGE_W * 2;

    const mkLedgeZ = (z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(ledgeLen, LEDGE_T, LEDGE_W), matEdge);
      m.position.set(0, ledgeY, z);
      return m;
    };
    const mkLedgeX = (x) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(LEDGE_W, LEDGE_T, ledgeLen), matEdge);
      m.position.set(x, ledgeY, 0);
      return m;
    };
    g.add(
      mkLedgeZ(-s/2 - LEDGE_W/2), mkLedgeZ(s/2 + LEDGE_W/2),
      mkLedgeX(-s/2 - LEDGE_W/2), mkLedgeX(s/2 + LEDGE_W/2)
    );

    g.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; }});
    return g;
  }

  let labelCassettePos = null;
  const cassettesList = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === MISSING.r && c === MISSING.c) continue;
      const cass = makeTegularCassette();
      const cx = -W/2 + CELL/2 + c * CELL;
      const cz = -D/2 + CELL/2 + r * CELL;
      cass.position.set(cx, 0, cz);
      scene.add(cass);

      cassettesList.push({ obj: cass, r, c });

      if (r === 0 && c === COLS - 1) {
        labelCassettePos = new THREE.Vector3(cx, -DROP, cz);
      }
    }
  }

  cassettesList.sort((a, b) => a.c !== b.c ? a.c - b.c : b.r - a.r);
  cassettesList.forEach((item, i) => {
    const delay = 0.35 + (i / cassettesList.length) * 0.40;
    registerPart(item.obj, { offsetY: -0.60, delay, span: 0.25 });
  });

  /* ---------------- ПОДПИСИ ---------------- */
  function addLabel(text, anchor, labelPos) {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([anchor.clone(), labelPos.clone()]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
      color:0x2a2f35, transparent:true, opacity:0.45
    }));
    scene.add(line);

    const div = document.createElement('div');
    div.className = 'label-3d';
    div.textContent = text;
    const obj = new CSS2DObject(div);
    obj.position.copy(labelPos);
    scene.add(obj);
  }

  if (labelCassettePos) {
    addLabel('Кассета · Tegular',
      new THREE.Vector3(labelCassettePos.x, -DROP * 0.6, labelCassettePos.z),
      new THREE.Vector3(labelCassettePos.x + 0.65, 0.45, labelCassettePos.z + 0.65));
  }

  addLabel('Т-профиль 24 мм',
    new THREE.Vector3(-W/2 + 2 * CELL, FLANGE_T + 0.0005, -D/2 + CELL * 0.5 + CELL),
    new THREE.Vector3(-0.55, 0.55, 0.55));

  addLabel('Европодвес',
    new THREE.Vector3(suspX[0], 0.42, -D/2),
    new THREE.Vector3(suspX[0] - 0.80, 0.42, -D/2 - 0.35));

  addLabel('Анкерный болт',
    new THREE.Vector3(suspX[1], 1.13, -D/2),
    new THREE.Vector3(suspX[1] + 0.75, 1.15, -D/2 - 0.25));

  const clipAnchor = new THREE.Vector3(
    -W/2 + CELL/2 + CELL * 2 - CELL * 0.22,
    BULB_TOP - 0.005,
    -D/2 + CELL
  );
  addLabel('Клипса фиксации кассеты',
    clipAnchor,
    new THREE.Vector3(clipAnchor.x + 0.65, 0.30, clipAnchor.z + 0.55));

  /* ---------------- АВТОЦИКЛ ---------------- */
  let explodeCurrent = 0;
  let cycleT = 0;

  const T_HOLD_ASM  = 3.0;
  const T_EXPLODE   = 3.5;
  const T_HOLD_EXP  = 2.5;
  const T_ASSEMBLE  = 3.5;
  const T_HOLD_END  = 1.5;
  const CYCLE_DUR = T_HOLD_ASM + T_EXPLODE + T_HOLD_EXP + T_ASSEMBLE + T_HOLD_END;

  function updateTimeline(dt) {
    cycleT = (cycleT + dt) % CYCLE_DUR;
    let target;
    if (cycleT < T_HOLD_ASM) {
      target = 0;
    } else if (cycleT < T_HOLD_ASM + T_EXPLODE) {
      target = (cycleT - T_HOLD_ASM) / T_EXPLODE;
    } else if (cycleT < T_HOLD_ASM + T_EXPLODE + T_HOLD_EXP) {
      target = 1;
    } else if (cycleT < T_HOLD_ASM + T_EXPLODE + T_HOLD_EXP + T_ASSEMBLE) {
      target = 1 - (cycleT - T_HOLD_ASM - T_EXPLODE - T_HOLD_EXP) / T_ASSEMBLE;
    } else {
      target = 0;
    }
    explodeCurrent = target;
  }

  const easeInOutCubic = t => t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------------- РЕСАЙЗ + ПАУЗА ---------------- */
  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  let inView = true;
  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
  }, { threshold: 0 });
  io.observe(container);

  /* ---------------- ЦИКЛ РЕНДЕРА ---------------- */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    if (!inView || document.hidden) {
      clock.getDelta();
      return;
    }

    const dt = clock.getDelta();
    updateTimeline(dt);

    for (const p of animatables) {
      const raw = (explodeCurrent - p.delay) / p.span;
      const t = Math.max(0, Math.min(1, raw));
      const eased = easeInOutCubic(t);
      p.obj.position.y = p.baseY + p.offsetY * eased;
    }

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  animate();
}
