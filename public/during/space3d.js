// learn.phylab.uk — In class, step 3, part 1: explore the field of point charges in 3D.
// One scene, three ways to look at it: in the browser (the default), AR (the camera view, e.g. on a headset with
// passthrough or an Android tablet) and VR (a headset). Everything the student does — taking a charge from the
// tray, moving it, putting it back — happens inside the 3D scene, so it works the same way with a mouse, a finger,
// a controller or a hand. Sizes are in metres, so the scene is desk-sized in AR and at arm's length in VR.
// three.js is served from this site (public/vendor/three/), so it comes from the same nearby Cloudflare edge as the page.
import * as THREE from "/vendor/three/three.min.js";
const { OrbitControls } = THREE;

const REGION = { x: 0.26, y0: 0.03, y1: 0.38, z: 0.26 };       // where charges may be placed
const TRAY = { x0: -0.25, x1: 0.25, z0: 0.31, z1: 0.41, top: 0.008 };
const CENTER = new THREE.Vector3(0, 0.15, 0);
const BOUND2 = 0.85 * 0.85;   // field lines stop this far from the centre
const SEED = 0.02;            // lines start this far from a positive charge
const CAPTURE = 0.016;        // a line ends this close to a negative charge
const MAX_CHARGES = 6;
const NEW_HEIGHT = 0.15;      // a charge taken from the tray rises to this height
const START = [{ q: 1, x: -0.09, y: 0.15, z: 0 }, { q: -1, x: 0.09, y: 0.15, z: 0 }];

const COLOR = { pos: 0xc0392b, neg: 0x1f5fbf, paper: 0xf7f5ef, vr: 0x1c2130 };
const LINE = { screen: 0x39415a, xr: 0xffd15c };
const radius = (q) => 0.012 + 0.004 * Math.abs(q);

// ---------- physics: the field and its lines (k = 1; only the shape of the field matters here) ----------

function unit(ch, x, y, z, dir) {
  let ex = 0, ey = 0, ez = 0;
  for (const c of ch) {
    const dx = x - c.x, dy = y - c.y, dz = z - c.z;
    const r2 = dx * dx + dy * dy + dz * dz;
    if (r2 < 1e-10) return null;
    const f = c.q / (r2 * Math.sqrt(r2));
    ex += f * dx; ey += f * dy; ez += f * dz;
  }
  const m = Math.hypot(ex, ey, ez);
  if (m < 1e-6) return null;
  return [(dir * ex) / m, (dir * ey) / m, (dir * ez) / m];
}

/** Follow the field (dir = +1) or against it (dir = −1) with fourth-order Runge–Kutta steps. */
function trace(ch, x, y, z, dir) {
  const pts = [x, y, z];
  let end = -1;
  for (let i = 0; i < 1600; i++) {
    let dmin = Infinity;
    for (const c of ch) dmin = Math.min(dmin, Math.hypot(x - c.x, y - c.y, z - c.z));
    const h = Math.min(0.012, Math.max(0.0015, 0.2 * dmin)); // small steps near a charge
    const k1 = unit(ch, x, y, z, dir); if (!k1) break;
    const k2 = unit(ch, x + h / 2 * k1[0], y + h / 2 * k1[1], z + h / 2 * k1[2], dir); if (!k2) break;
    const k3 = unit(ch, x + h / 2 * k2[0], y + h / 2 * k2[1], z + h / 2 * k2[2], dir); if (!k3) break;
    const k4 = unit(ch, x + h * k3[0], y + h * k3[1], z + h * k3[2], dir); if (!k4) break;
    x += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    pts.push(x, y, z);
    if ((x - CENTER.x) ** 2 + (y - CENTER.y) ** 2 + (z - CENTER.z) ** 2 > BOUND2) break;
    let hit = -1;
    ch.forEach((c, j) => { if (hit < 0 && c.q * dir < 0 && Math.hypot(x - c.x, y - c.y, z - c.z) < CAPTURE) hit = j; });
    if (hit >= 0) { end = hit; break; }
  }
  return { pts, end };
}

/** Evenly spread directions on a sphere (golden-angle spiral). */
function spread(n, turn) {
  const out = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), t = ga * i + turn;
    out.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
  }
  return out;
}

/** All field lines: the number of lines on each charge is proportional to its charge.
 *  Lines start on positive charges; a negative charge that receives fewer lines than it should gets
 *  the rest traced backwards from it, starting in the directions where no line arrives yet. */
function fieldLines(ch, perQ) {
  const lines = [], arrive = ch.map(() => []);
  ch.forEach((c, i) => {
    if (c.q <= 0) return;
    for (const u of spread(Math.round(perQ * c.q), i)) {
      const t = trace(ch, c.x + u.x * SEED, c.y + u.y * SEED, c.z + u.z * SEED, 1);
      lines.push({ pts: t.pts, start: true, end: t.end >= 0 });
      if (t.end >= 0) {
        const e = ch[t.end], n = t.pts.length;
        arrive[t.end].push(new THREE.Vector3(t.pts[n - 3] - e.x, t.pts[n - 2] - e.y, t.pts[n - 1] - e.z).normalize());
      }
    }
  });
  ch.forEach((c, i) => {
    if (c.q >= 0) return;
    const seeds = spread(Math.round(perQ * -c.q), i);
    for (const a of arrive[i]) {
      if (!seeds.length) break;
      let best = 0, bd = -2;
      seeds.forEach((s, k) => { const d = s.dot(a); if (d > bd) { bd = d; best = k; } });
      seeds.splice(best, 1);
    }
    for (const u of seeds) {
      const t = trace(ch, c.x + u.x * SEED, c.y + u.y * SEED, c.z + u.z * SEED, -1);
      if (t.end >= 0) continue; // already drawn from that positive charge
      const p = [];
      for (let k = t.pts.length - 3; k >= 0; k -= 3) p.push(t.pts[k], t.pts[k + 1], t.pts[k + 2]);
      lines.push({ pts: p, start: false, end: true });
    }
  });
  return lines;
}

// ---------- labels ----------

/** A small label with a white background; parts with it: true are set in italic (the q). */
function label(parts, h = 0.016) {
  const cv = document.createElement("canvas"), g = cv.getContext("2d");
  const fs = 64, pad = 18;
  const font = (it) => `${it ? "italic " : ""}600 ${fs}px Georgia, "Times New Roman", serif`;
  let w = 0;
  for (const p of parts) { g.font = font(p.it); w += g.measureText(p.t).width; }
  cv.width = Math.ceil(w + pad * 2); cv.height = fs + pad;
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.beginPath(); g.roundRect(0, 0, cv.width, cv.height, 22); g.fill();
  g.fillStyle = "#1a2030"; g.textBaseline = "middle";
  let x = pad;
  for (const p of parts) { g.font = font(p.it); g.fillText(p.t, x, cv.height / 2 + 3); x += g.measureText(p.t).width; }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set((h * cv.width) / cv.height, h, 1);
  return s;
}
const qParts = (q) => [{ t: (q > 0 ? "+" : "−") + (Math.abs(q) === 1 ? "" : Math.abs(q)) }, { t: "q", it: true }];

// ---------- the explorer ----------

export function startSpace3D(root, { rec } = {}) {
  root.classList.add("v3");
  root.innerHTML = `
    <div class="v3-tabs" role="tablist" aria-label="How to view the 3D space">
      <button type="button" role="tab" data-mode="browser" class="on" aria-selected="true">Browser</button>
      <button type="button" role="tab" data-mode="ar">AR</button>
      <button type="button" role="tab" data-mode="vr">VR</button>
    </div>
    <div class="v3-note" hidden></div>
    <div class="v3-stage">
      <div class="v3-xr" hidden><button type="button" class="btn v3-exit">Exit AR</button></div>
      <p class="v3-flash" hidden></p>
    </div>
    <div class="v3-bar">
      <p class="v3-hint">Drag a charge from the tray into the space. Drag a charge to move it sideways; drag the grey handle above it to move it up or down. Drag it back onto the tray to remove it. Drag empty space to turn the view; scroll or pinch to zoom.</p>
      <div class="v3-tools">
        <label>Lines per <i>q</i> <select class="v3-density"><option value="8">8</option><option value="12" selected>12</option><option value="20">20</option></select></label>
        <button type="button" class="btn ghost v3-view">Reset view</button>
      </div>
    </div>`;
  const stage = root.querySelector(".v3-stage"), note = root.querySelector(".v3-note");
  const xrBar = root.querySelector(".v3-xr"), flashEl = root.querySelector(".v3-flash");
  const log = (action, d = {}) => rec && rec.event("space3d", { action, ...d });

  // renderer, camera, scene
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");
  stage.prepend(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(42, 1.6, 0.01, 20);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR.paper);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8576, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(0.4, 1, 0.6); scene.add(sun);
  const world = new THREE.Group(); scene.add(world);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.minDistance = 0.3; controls.maxDistance = 2.2;
  controls.maxPolarAngle = Math.PI * 0.47; // never below the floor
  const resetView = () => { camera.position.set(0, 0.5, 1.02); controls.target.set(0, 0.12, 0.07); controls.update(); };
  resetView();

  // floor of the space: a light square with a grid, so heights and shadows can be read
  const floorMat = new THREE.MeshBasicMaterial({ color: 0xece7da, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), floorMat);
  floor.rotation.x = -Math.PI / 2; world.add(floor);
  const grid = new THREE.GridHelper(0.6, 12, 0xbdb6a4, 0xd6d0c0); grid.position.y = 0.0005; world.add(grid);

  // the tray: charges to take, and a Clear button
  const pickables = [];
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(TRAY.x1 - TRAY.x0, 0.012, TRAY.z1 - TRAY.z0),
    new THREE.MeshStandardMaterial({ color: 0xe2dccb, roughness: 0.8 }));
  tray.position.set(0, TRAY.top - 0.006, (TRAY.z0 + TRAY.z1) / 2); world.add(tray);
  const trayZ = (TRAY.z0 + TRAY.z1) / 2 - 0.008;
  [2, 1, -1, -2].forEach((q, k) => {
    const x = -0.19 + k * 0.09, r = radius(q);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), new THREE.MeshStandardMaterial({ color: q > 0 ? COLOR.pos : COLOR.neg, roughness: 0.45 }));
    m.position.set(x, TRAY.top + r, trayZ); world.add(m);
    const lb = label(qParts(q), 0.018); lb.position.set(x + r + 0.019, TRAY.top + r, trayZ); world.add(lb);
    const p = new THREE.Mesh(new THREE.SphereGeometry(r + 0.012, 8, 6), proxyMat);
    p.position.copy(m.position); p.userData = { kind: "token", q }; world.add(p); pickables.push(p);
  });
  const clearBtn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
  clearBtn.position.set(0.2, TRAY.top + 0.006, trayZ); clearBtn.userData = { kind: "clear" }; world.add(clearBtn); pickables.push(clearBtn);
  const clearLb = label([{ t: "Clear" }], 0.014); clearLb.position.set(0.2, TRAY.top + 0.024, trayZ); world.add(clearLb);
  const trayLb = label([{ t: "Take charges from here · put them back to remove" }], 0.011);
  trayLb.position.set(0, TRAY.top + 0.004, TRAY.z1 + 0.012); world.add(trayLb);

  // field lines and their arrows
  const lineMat = new THREE.LineBasicMaterial({ color: LINE.screen });
  const lineObj = new THREE.LineSegments(new THREE.BufferGeometry(), lineMat); world.add(lineObj);
  const arrowMat = new THREE.MeshBasicMaterial({ color: LINE.screen });
  const arrows = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0045, 0.014, 10), arrowMat, 800);
  arrows.count = 0; world.add(arrows);

  // charges in the space
  const charges = [];
  let perQ = 12, dirty = true;
  const dropMat = new THREE.LineDashedMaterial({ color: 0x8a8f9c, dashSize: 0.008, gapSize: 0.006 });
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x9aa0ad, roughness: 0.5 });

  function addCharge(q, x, y, z) {
    const r = radius(q), g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: q > 0 ? COLOR.pos : COLOR.neg, roughness: 0.45, transparent: true });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat); g.add(ball);
    const lb = label(qParts(q), 0.022); lb.position.set(r + 0.024, 0, 0); g.add(lb);
    const handle = new THREE.Mesh(new THREE.OctahedronGeometry(0.008), handleMat);
    handle.scale.set(0.8, 1.5, 0.8); handle.position.y = r + 0.022; g.add(handle);
    world.add(g);
    const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), dropMat);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(r, 24), shadowMat); shadow.rotation.x = -Math.PI / 2;
    world.add(drop, shadow);
    const c = { q, x, y, z, r, g, mat, drop, shadow, proxies: [] };
    const pb = new THREE.Mesh(new THREE.SphereGeometry(r + 0.01, 8, 6), proxyMat); pb.userData = { kind: "charge", c };
    const ph = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), proxyMat); ph.position.y = r + 0.022; ph.userData = { kind: "handle", c };
    g.add(pb, ph); c.proxies = [pb, ph]; pickables.push(pb, ph);
    charges.push(c); place(c);
    return c;
  }
  function place(c) {
    c.g.position.set(c.x, c.y, c.z);
    const a = c.drop.geometry.attributes.position;
    a.setXYZ(0, c.x, c.y - c.r, c.z); a.setXYZ(1, c.x, 0.001, c.z); a.needsUpdate = true;
    c.drop.computeLineDistances();
    c.shadow.position.set(c.x, 0.0012, c.z);
    dirty = true;
  }
  function removeCharge(c) {
    world.remove(c.g, c.drop, c.shadow);
    c.proxies.forEach((p) => pickables.splice(pickables.indexOf(p), 1));
    charges.splice(charges.indexOf(c), 1);
    dirty = true;
  }
  function clearAll() { [...charges].forEach(removeCharge); log("clear"); }
  START.forEach((s) => addCharge(s.q, s.x, s.y, s.z));

  const up = new THREE.Vector3(0, 1, 0), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

  function rebuild() {
    dirty = false;
    const ch = charges.filter((c) => !c.leaving).map((c) => ({ q: c.q, x: c.x, y: c.y, z: c.z }));
    const lines = ch.length ? fieldLines(ch, perQ) : [];
    const seg = [];
    let n = 0;
    for (const L of lines) {
      const p = L.pts, len = [0];
      for (let k = 3; k < p.length; k += 3) {
        seg.push(p[k - 3], p[k - 2], p[k - 1], p[k], p[k + 1], p[k + 2]);
        len.push(len[len.length - 1] + Math.hypot(p[k] - p[k - 3], p[k + 1] - p[k - 2], p[k + 2] - p[k - 1]));
      }
      const total = len[len.length - 1];
      if (total < 0.025 || n >= arrows.instanceMatrix.count) continue;
      // one arrow per line: in the middle of a line between two charges, otherwise near its charge
      const s = L.start && L.end ? total / 2 : L.start ? Math.min(total / 2, 0.08) : total - Math.min(total / 2, 0.08);
      let k = 1; while (k < len.length - 1 && len[k] < s) k++;
      const i = 3 * k;
      tmpT.set(p[i] - p[i - 3], p[i + 1] - p[i - 2], p[i + 2] - p[i - 1]).normalize();
      tmpP.set(p[i], p[i + 1], p[i + 2]);
      tmpQ.setFromUnitVectors(up, tmpT);
      arrows.setMatrixAt(n++, tmpM.compose(tmpP, tmpQ, one));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
    lineObj.geometry.dispose(); lineObj.geometry = geo;
    arrows.count = n; arrows.instanceMatrix.needsUpdate = true;
  }

  // ---------- dragging: one set of rules for mouse, finger, controller and hand ----------
  const ray = new THREE.Raycaster();
  const inTray = (p) => p.x > TRAY.x0 && p.x < TRAY.x1 && p.z > TRAY.z0 - 0.01 && p.z < TRAY.z1;
  const clampTo = (v, a, b) => Math.min(b, Math.max(a, v));
  function flash(msg) {
    flashEl.textContent = msg; flashEl.hidden = false;
    clearTimeout(flash.t); flash.t = setTimeout(() => { flashEl.hidden = true; }, 2200);
  }

  /** Start a drag from whatever the ray hits; returns the drag, or null if it hit nothing to drag. */
  function grab(hit, mode) {
    const u = hit.object.userData;
    if (u.kind === "clear") { clearAll(); return null; }
    if (u.kind === "token") {
      if (charges.length >= MAX_CHARGES) { flash(`At most ${MAX_CHARGES} charges at a time.`); return null; }
      const p = world.worldToLocal(hit.point.clone());
      const c = addCharge(u.q, p.x, TRAY.top + radius(u.q), p.z);
      c.leaving = true; c.mat.opacity = 0.55;
      return { c, mode, h: NEW_HEIGHT, dist: hit.distance, isNew: true, del: true };
    }
    const c = u.c;
    if (mode === "screen" && u.kind === "handle") {
      const n = new THREE.Vector3().subVectors(camera.position, c.g.position).setY(0).normalize();
      return { c, mode: "lift", plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, c.g.position.clone()) };
    }
    return { c, mode, h: c.y, dist: hit.distance };
  }

  /** Move the dragged charge along a ray given in the scene's own coordinates. */
  function follow(d, o, dir) {
    const c = d.c;
    let x = c.x, y = c.y, z = c.z, del = false;
    if (d.mode === "lift") {
      const p = new THREE.Ray(o, dir).intersectPlane(d.plane, new THREE.Vector3());
      if (!p) return;
      y = clampTo(p.y, REGION.y0, REGION.y1);
    } else if (d.mode === "screen") {
      const t0 = (TRAY.top - o.y) / dir.y;
      const p0 = t0 > 0 ? o.clone().addScaledVector(dir, t0) : null;
      if (p0 && inTray(p0)) { x = p0.x; z = p0.z; y = TRAY.top + c.r; del = true; }
      else {
        const t = (d.h - o.y) / dir.y; if (!(t > 0)) return;
        const p = o.clone().addScaledVector(dir, t);
        x = clampTo(p.x, -REGION.x, REGION.x); z = clampTo(p.z, -REGION.z, REGION.z); y = d.h;
      }
    } else { // controller or hand: the charge stays at the same distance along the ray, so it moves freely in 3D
      const p = o.clone().addScaledVector(dir, d.dist);
      if (inTray(p) && p.y < 0.07) { x = p.x; z = p.z; y = TRAY.top + c.r; del = true; }
      else { x = clampTo(p.x, -REGION.x, REGION.x); y = clampTo(p.y, REGION.y0, REGION.y1); z = clampTo(p.z, -REGION.z, REGION.z); }
    }
    d.del = del; c.leaving = del; c.mat.opacity = del ? 0.45 : 1;
    c.x = x; c.y = y; c.z = z; place(c);
  }
  function drop(d) {
    if (d.del) { removeCharge(d.c); if (!d.isNew) log("remove", { q: d.c.q }); }
    else { d.c.leaving = false; d.c.mat.opacity = 1; dirty = true; log(d.isNew ? "add" : "move", { q: d.c.q, at: [d.c.x, d.c.y, d.c.z].map((v) => +v.toFixed(3)) }); }
  }
  const toLocal = (o, dir) => [world.worldToLocal(o.clone()), dir.clone()]; // the scene is only moved, never turned

  // mouse and touch on the page
  const ndc = new THREE.Vector2();
  let sDrag = null;
  function screenRay(e) {
    const b = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (renderer.xr.isPresenting) return;
    screenRay(e);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (!hit) return;                         // empty space: the view turns
    e.stopImmediatePropagation();             // keep the view still while dragging a charge
    const d = grab(hit, "screen");
    if (d) { sDrag = d; renderer.domElement.setPointerCapture(e.pointerId); follow(d, ...toLocal(ray.ray.origin, ray.ray.direction)); }
  }, { capture: true });
  renderer.domElement.addEventListener("pointermove", (e) => {
    screenRay(e);
    if (sDrag) { follow(sDrag, ...toLocal(ray.ray.origin, ray.ray.direction)); return; }
    renderer.domElement.style.cursor = ray.intersectObjects(pickables, false)[0] ? "grab" : "";
  });
  const endScreen = () => { if (sDrag) { drop(sDrag); sDrag = null; } };
  renderer.domElement.addEventListener("pointerup", endScreen);
  renderer.domElement.addEventListener("pointercancel", endScreen);

  // controllers, hands and screen taps inside AR / VR
  const ctrls = [0, 1].map((i) => {
    const c = renderer.xr.getController(i);
    const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    beam.scale.z = 0.6; beam.visible = false; c.add(beam);
    c.addEventListener("connected", (e) => { beam.visible = e.data.targetRayMode === "tracked-pointer"; });
    c.addEventListener("disconnected", () => { beam.visible = false; if (c.userData.drag) { drop(c.userData.drag); c.userData.drag = null; } });
    c.addEventListener("selectstart", () => {
      ctrlRay(c);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) c.userData.drag = grab(hit, "xr");
    });
    c.addEventListener("selectend", () => { if (c.userData.drag) { drop(c.userData.drag); c.userData.drag = null; } });
    scene.add(c);
    return c;
  });
  function ctrlRay(c) {
    tmpM.identity().extractRotation(c.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
    ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpM);
  }

  // ---------- Browser / AR / VR ----------
  const support = { ar: false, vr: false };
  const checked = (navigator.xr ? Promise.all(["ar", "vr"].map((m) =>
    navigator.xr.isSessionSupported("immersive-" + m).then((ok) => { support[m] = ok; }).catch(() => {}))) : Promise.resolve());
  const tabs = [...root.querySelectorAll(".v3-tabs button")];
  let mode = "browser";
  checked.then(() => tabs.forEach((b) => { if (b.dataset.mode !== "browser" && !support[b.dataset.mode]) b.classList.add("na"); }));

  const NOTE = {
    ar: {
      yes: "<b>AR</b> puts this space on the desk in front of you, in the camera view. Point at a charge and pinch, press the trigger or touch the screen to take it and move it.",
      no: "<b>AR</b> needs a headset browser with passthrough (for example Meta Quest) or Chrome on an Android phone or tablet. This browser cannot open it, so the view below stays in the browser. Safari on iPad and iPhone does not support AR on web pages yet.",
    },
    vr: {
      yes: "<b>VR</b> puts this space in front of you in the headset. Point at a charge and pinch or press the trigger to take it; it moves freely in 3D with your hand.",
      no: "<b>VR</b> needs the browser of a VR headset (for example Meta Quest or Apple Vision Pro). This browser cannot open it, so the view below stays in the browser.",
    },
  };
  function setTab(m) {
    mode = m;
    tabs.forEach((b) => { const on = b.dataset.mode === m; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    if (m === "browser") { note.hidden = true; return; }
    checked.then(() => {
      if (mode !== m) return;
      const ok = support[m];
      note.innerHTML = `<p>${ok ? NOTE[m].yes : NOTE[m].no}</p>` + (ok ? `<button type="button" class="btn v3-enter">Start ${m.toUpperCase()}</button>` : "");
      note.hidden = false;
      const b = note.querySelector(".v3-enter");
      if (b) b.addEventListener("click", () => enter(m));
    });
    log("tab", { mode: m });
  }
  tabs.forEach((b) => b.addEventListener("click", () => setTab(b.dataset.mode)));

  let xrMode = null;
  async function enter(m) {
    const opts = m === "ar"
      ? { optionalFeatures: ["dom-overlay", "hand-tracking"], domOverlay: { root: xrBar } }
      : { optionalFeatures: ["hand-tracking"] };
    try {
      const session = await navigator.xr.requestSession("immersive-" + m, opts);
      xrMode = m;
      await renderer.xr.setSession(session);
      log("enter", { mode: m });
    } catch (err) {
      xrMode = null;
      flash(`Could not start ${m.toUpperCase()}: ${err.message || err}`);
    }
  }
  xrBar.querySelector(".v3-exit").addEventListener("beforexrselect", (e) => e.preventDefault());
  xrBar.querySelector(".v3-exit").addEventListener("click", () => renderer.xr.getSession()?.end());

  renderer.xr.addEventListener("sessionstart", () => {
    world.position.set(0, -0.42, -0.6);                // the space sits a little below the eyes, at arm's length
    scene.background = xrMode === "vr" ? new THREE.Color(COLOR.vr) : null;
    floorMat.opacity = xrMode === "vr" ? 0.12 : 0.35;
    lineMat.color.setHex(LINE.xr); arrowMat.color.setHex(LINE.xr);
    xrBar.hidden = xrMode !== "ar";
    controls.enabled = false;
  });
  renderer.xr.addEventListener("sessionend", () => {
    ctrls.forEach((c) => { if (c.userData.drag) { drop(c.userData.drag); c.userData.drag = null; } });
    world.position.set(0, 0, 0);
    scene.background = new THREE.Color(COLOR.paper);
    floorMat.opacity = 1;
    lineMat.color.setHex(LINE.screen); arrowMat.color.setHex(LINE.screen);
    xrBar.hidden = true; controls.enabled = true; xrMode = null;
    log("exit");
  });

  // ---------- size and drawing ----------
  function resize() {
    if (renderer.xr.isPresenting) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // on a narrow (phone) screen widen the view, so the whole tray still fits from side to side
    const half = Math.atan(Math.tan((21 * Math.PI) / 180) * Math.max(1, 1.3 / camera.aspect));
    camera.fov = (2 * half * 180) / Math.PI;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  root.querySelector(".v3-density").addEventListener("change", (e) => { perQ = +e.target.value; dirty = true; log("density", { perQ }); });
  root.querySelector(".v3-view").addEventListener("click", resetView);

  renderer.setAnimationLoop(() => {
    const xr = renderer.xr.isPresenting;
    if (!xr && !stage.offsetParent) return;           // step not on screen: nothing to draw
    if (xr) ctrls.forEach((c) => { if (c.userData.drag) { ctrlRay(c); follow(c.userData.drag, ...toLocal(ray.ray.origin, ray.ray.direction)); } });
    if (dirty) rebuild();
    if (!xr) controls.update();
    renderer.render(scene, camera);
  });
}
