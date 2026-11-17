// learn.phylab.uk — In class, step 3, part 1: explore the electric field in 3D.
// Point charges and the charge distributions of Knight, Physics for Scientists and Engineers, Chapter 23
// (charged plate = plane of charge, 23.4 and the parallel-plate capacitor, 23.5; charged rod, Example 23.3;
// charged ring, Example 23.4). No conductors: they come in the next chapter.
// One scene, three ways to look at it: in the browser (the default), AR (the camera view, e.g. on a headset with
// passthrough or an Android tablet) and VR (a headset). Everything the student does — taking an object from a
// tray, moving it, putting it back — happens inside the 3D scene, so it works the same way with a mouse, a finger,
// a controller or a hand. Sizes are in metres, so the scene is desk-sized in AR and at arm's length in VR.
// three.js is served from this site (public/vendor/three/), so it comes from the same nearby Cloudflare edge as the page.
import * as THREE from "/vendor/three/three.min.js";
const { OrbitControls } = THREE;

const TABLE = 0.3;            // half-width of the table: only objects above the table make the field
const Y0 = 0.03, Y1 = 0.4;    // lowest and highest an object can be held
const REACH = 0.8;            // how far from the centre an object can be carried
const TOP = 0.13;             // height of the trays: objects slide straight across onto the table
// point charges on round trays at the right; the charge distributions on square trays at the left
const RIGHT = { x: 0.42, half: 0.034, zs: [-0.18, -0.06, 0.06, 0.18], items: [["point", 2], ["point", 1], ["point", -1], ["point", -2]] };
const LEFT = { x: -0.47, half: 0.075, zs: [-0.27, -0.09, 0.09, 0.27], items: [["plate", 6], ["plate", -6], ["rod", 3], ["ring", 3]] };
const SIZE = { plate: 0.08, rod: 0.08, ring: 0.06 }; // half-side, half-length, radius
const CENTER = new THREE.Vector3(0, 0.15, 0);
const BOUND2 = 0.85 * 0.85;   // field lines stop this far from the centre
const SEED = 0.02;            // lines start this far from a point charge
const MAX_OBJECTS = 6;
const START = [{ kind: "point", q: 1, x: -0.09, y: 0.15, z: 0 }, { kind: "point", q: -1, x: 0.09, y: 0.15, z: 0 }];

const COLOR = { pos: 0xc0392b, neg: 0x1f5fbf, paper: 0xf7f5ef, vr: 0x1c2130 };
const LINE = { screen: 0x39415a, xr: 0xffd15c };
const radius = (q) => 0.012 + 0.004 * Math.abs(q);

// ---------- physics: the field and its lines (k = 1; only the shape of the field matters here) ----------
// Charges are in units of q. The number of lines on an object is proportional to its charge.
// Plate (horizontal square) and rod (along x) use the closed-form results of integrating the point-charge field
// over the plate or along the rod, the same integrals as in the chapter; the ring is summed from 40 small pieces.

/** ln(v + r) with r = √(v² + w2), accurate also when v is large and negative. */
const lnvr = (v, r, w2) => (v >= 0 ? Math.log(v + r) : Math.log(Math.max(w2, 1e-14) / (r - v)));

function prep(o) {
  if (o.kind === "ring") {
    o.sub = [];
    for (let k = 0; k < 40; k++) { const a = (2 * Math.PI * k) / 40; o.sub.push([o.x + SIZE.ring * Math.cos(a), o.y, o.z + SIZE.ring * Math.sin(a)]); }
  }
  return o;
}

/** Add the field of one object at (x, y, z) to E; false where the field is undefined (on a point charge). */
function addField(o, x, y, z, E) {
  if (o.kind === "point") {
    const dx = x - o.x, dy = y - o.y, dz = z - o.z, r2 = dx * dx + dy * dy + dz * dz;
    if (r2 < 1e-10) return false;
    const f = o.q / (r2 * Math.sqrt(r2));
    E[0] += f * dx; E[1] += f * dy; E[2] += f * dz;
  } else if (o.kind === "plate") {
    const a = SIZE.plate, eta = o.q / (4 * a * a);
    const X = x - o.x, Y = z - o.z;
    let Z = y - o.y; if (Math.abs(Z) < 1e-7) Z = Z < 0 ? -1e-7 : 1e-7;
    let ex = 0, ey = 0, ez = 0;
    for (const si of [1, -1]) for (const sj of [1, -1]) {
      const u = si * a - X, v = sj * a - Y, r = Math.sqrt(u * u + v * v + Z * Z), s = si * sj;
      ex += s * lnvr(v, r, u * u + Z * Z);
      ey += s * lnvr(u, r, v * v + Z * Z);
      ez += s * Math.atan((u * v) / (Z * r));
    }
    E[0] += eta * ex; E[2] += eta * ey; E[1] += eta * ez;
  } else if (o.kind === "rod") {
    const h = SIZE.rod, lam = o.q / (2 * h);
    const s = x - o.x, wy = y - o.y, wz = z - o.z, d = Math.max(Math.hypot(wy, wz), 1e-7);
    const s1 = -h - s, s2 = h - s, r1 = Math.hypot(d, s1), r2 = Math.hypot(d, s2);
    const ep = (lam / d) * (s2 / r2 - s1 / r1);
    E[0] += lam * (1 / r2 - 1 / r1); E[1] += (ep * wy) / d; E[2] += (ep * wz) / d;
  } else {
    const dq = o.q / o.sub.length;
    for (const p of o.sub) {
      const dx = x - p[0], dy = y - p[1], dz = z - p[2], r2 = dx * dx + dy * dy + dz * dz;
      if (r2 < 1e-10) return false;
      const f = dq / (r2 * Math.sqrt(r2));
      E[0] += f * dx; E[1] += f * dy; E[2] += f * dz;
    }
  }
  return true;
}

/** Distance from a point to an object (for the step size). */
function dist(o, x, y, z) {
  if (o.kind === "point") return Math.hypot(x - o.x, y - o.y, z - o.z);
  if (o.kind === "plate") return Math.hypot(Math.max(Math.abs(x - o.x) - SIZE.plate, 0), y - o.y, Math.max(Math.abs(z - o.z) - SIZE.plate, 0));
  if (o.kind === "rod") return Math.hypot(Math.max(Math.abs(x - o.x) - SIZE.rod, 0), y - o.y, z - o.z);
  return Math.hypot(Math.hypot(x - o.x, z - o.z) - SIZE.ring, y - o.y);
}
/** Is the point close enough to the object for a line to end on it? */
function near(o, x, y, z) {
  if (o.kind === "point") return dist(o, x, y, z) < 0.016;
  if (o.kind === "plate") return Math.abs(y - o.y) < 0.005 && Math.abs(x - o.x) < SIZE.plate && Math.abs(z - o.z) < SIZE.plate;
  return dist(o, x, y, z) < 0.007;
}

function unit(objs, x, y, z, dir) {
  const E = [0, 0, 0];
  for (const o of objs) if (!addField(o, x, y, z, E)) return null;
  const m = Math.hypot(E[0], E[1], E[2]);
  if (m < 1e-6) return null;
  return [(dir * E[0]) / m, (dir * E[1]) / m, (dir * E[2]) / m];
}

/** Follow the field (dir = +1) or against it (dir = −1) with fourth-order Runge–Kutta steps. */
function trace(objs, [x, y, z], dir) {
  const pts = [x, y, z];
  let end = -1;
  for (let i = 0; i < 1600; i++) {
    let dmin = Infinity;
    for (const o of objs) dmin = Math.min(dmin, dist(o, x, y, z));
    const h = Math.min(0.012, Math.max(0.0015, 0.2 * dmin)); // small steps near an object
    const k1 = unit(objs, x, y, z, dir); if (!k1) break;
    const k2 = unit(objs, x + h / 2 * k1[0], y + h / 2 * k1[1], z + h / 2 * k1[2], dir); if (!k2) break;
    const k3 = unit(objs, x + h / 2 * k2[0], y + h / 2 * k2[1], z + h / 2 * k2[2], dir); if (!k3) break;
    const k4 = unit(objs, x + h * k3[0], y + h * k3[1], z + h * k3[2], dir); if (!k4) break;
    x += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    pts.push(x, y, z);
    if ((x - CENTER.x) ** 2 + (y - CENTER.y) ** 2 + (z - CENTER.z) ** 2 > BOUND2) break;
    const hit = objs.findIndex((o) => o.q * dir < 0 && near(o, x, y, z));
    if (hit >= 0) { end = hit; break; }
  }
  return { pts, end };
}

/** Evenly spread directions on a sphere (golden-angle spiral). */
function spread(n, turn) {
  const out = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), t = ga * i + turn;
    out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return out;
}

/** Where the lines of an object start: spread evenly over it, about n of them. */
function seeds(o, n, turn) {
  const out = [], e = 0.004;
  if (o.kind === "point") for (const u of spread(n, turn)) out.push([o.x + u[0] * SEED, o.y + u[1] * SEED, o.z + u[2] * SEED]);
  else if (o.kind === "plate") {
    const g = Math.max(1, Math.round(Math.sqrt(n / 2))), a = SIZE.plate * 0.94;
    for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) for (const side of [1, -1])
      out.push([o.x + a * ((2 * i + 1) / g - 1), o.y + side * e, o.z + a * ((2 * j + 1) / g - 1)]);
  } else if (o.kind === "rod") {
    const rows = Math.max(1, Math.round(n / 6));
    for (let k = 0; k < rows; k++) for (let j = 0; j < 6; j++) {
      const f = (2 * Math.PI * j) / 6 + (k % 2) * (Math.PI / 6);
      out.push([o.x + SIZE.rod * ((2 * k + 1) / rows - 1), o.y + 0.008 * Math.cos(f), o.z + 0.008 * Math.sin(f)]);
    }
  } else {
    const m = Math.max(1, Math.round(n / 4));
    for (let k = 0; k < m; k++) for (let j = 0; j < 4; j++) {
      const a = (2 * Math.PI * k) / m + turn, f = Math.PI / 4 + (j * Math.PI) / 2, R = SIZE.ring + 0.008 * Math.cos(f);
      out.push([o.x + R * Math.cos(a), o.y + 0.008 * Math.sin(f), o.z + R * Math.sin(a)]);
    }
  }
  return out;
}

/** All field lines. Lines start on positive objects; a negative object that receives fewer lines than its
 *  charge calls for gets the rest traced backwards from it, from the places where no line arrives yet. */
function fieldLines(objs, perQ) {
  const lines = [], arrive = objs.map(() => []);
  objs.forEach((o, i) => {
    if (o.q <= 0) return;
    for (const p of seeds(o, Math.round(perQ * o.q), i)) {
      const t = trace(objs, p, 1);
      lines.push({ pts: t.pts, start: true, end: t.end >= 0 });
      if (t.end >= 0) { const n = t.pts.length; arrive[t.end].push([t.pts[n - 3], t.pts[n - 2], t.pts[n - 1]]); }
    }
  });
  objs.forEach((o, i) => {
    if (o.q >= 0) return;
    const ss = seeds(o, Math.round(perQ * -o.q), i);
    for (const a of arrive[i]) {
      if (!ss.length) break;
      let best = 0, bd = Infinity;
      ss.forEach((s, k) => { const d = (s[0] - a[0]) ** 2 + (s[1] - a[1]) ** 2 + (s[2] - a[2]) ** 2; if (d < bd) { bd = d; best = k; } });
      ss.splice(best, 1);
    }
    for (const p0 of ss) {
      const t = trace(objs, p0, -1);
      if (t.end >= 0) continue; // already drawn from that positive object
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
const sign = (q) => (q > 0 ? "+" : "\u2212");
const qParts = (q) => [{ t: sign(q) + (Math.abs(q) === 1 ? "" : Math.abs(q)) }, { t: "q", it: true }];
/** Labels use the symbols of the textbook: η for surface charge density, λ for linear charge density. */
const partsOf = (kind, q) => kind === "point" ? qParts(q)
  : [{ t: sign(q) }, { t: kind === "plate" ? "\u03b7" : kind === "rod" ? "\u03bb" : "Q", it: true }];

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
      <p class="v3-hint">Slide an object from a tray onto the table: point charges on the right; a charged plate, rod and ring on the left. A new one appears on the tray. Only objects above the table make the field. Let go of an object anywhere else and it falls and is gone, unless you put it back on a tray. Drag an object to move it sideways; drag the grey handle above it to move it up or down. Drag empty space to turn the view; scroll or pinch to zoom.</p>
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
  const resetView = () => { camera.position.set(-0.02, 0.5, 1.05); controls.target.set(-0.02, 0.11, 0.02); controls.update(); };
  resetView();

  // floor of the space: a light square with a grid, so heights and shadows can be read
  const floorMat = new THREE.MeshBasicMaterial({ color: 0xece7da, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), floorMat);
  floor.rotation.x = -Math.PI / 2; world.add(floor);
  const grid = new THREE.GridHelper(0.6, 12, 0xbdb6a4, 0xd6d0c0); grid.position.y = 0.0005; world.add(grid);

  // what each kind of object looks like
  const pickables = [];
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  /** Visible body of an object, how far it reaches below its centre, a larger invisible shape that is easy
   *  to grab, its footprint for the shadow, and where its label goes. */
  function shape(kind, q, mat) {
    if (kind === "point") {
      const r = radius(q);
      return { body: new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat), r,
        proxy: new THREE.SphereGeometry(r + 0.01, 8, 6), foot: new THREE.CircleGeometry(r, 24), lx: r + 0.024 };
    }
    if (kind === "plate") {
      const a = SIZE.plate;
      return { body: new THREE.Mesh(new THREE.BoxGeometry(2 * a, 0.004, 2 * a), mat), r: 0.002,
        proxy: new THREE.BoxGeometry(2 * a + 0.01, 0.02, 2 * a + 0.01), foot: new THREE.PlaneGeometry(2 * a, 2 * a), lx: a + 0.026 };
    }
    if (kind === "rod") {
      const h = SIZE.rod, g = new THREE.CylinderGeometry(0.004, 0.004, 2 * h, 14); g.rotateZ(Math.PI / 2);
      const pg = new THREE.BoxGeometry(2 * h + 0.01, 0.022, 0.022);
      return { body: new THREE.Mesh(g, mat), r: 0.004, proxy: pg, foot: new THREE.PlaneGeometry(2 * h, 0.008), lx: h + 0.026 };
    }
    const R = SIZE.ring, g = new THREE.TorusGeometry(R, 0.004, 10, 72); g.rotateX(Math.PI / 2);
    const pg = new THREE.TorusGeometry(R, 0.014, 6, 36); pg.rotateX(Math.PI / 2);
    return { body: new THREE.Mesh(g, mat), r: 0.004, proxy: pg, foot: new THREE.RingGeometry(R - 0.004, R + 0.004, 48), lx: R + 0.026 };
  }
  const bodyMat = (q, opacity = 1) => new THREE.MeshStandardMaterial({ color: q > 0 ? COLOR.pos : COLOR.neg, roughness: 0.45, transparent: true, opacity });

  // the trays, at the height the objects are used: taking an object off a tray hatches a new one in its place
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xe2dccb, roughness: 0.8 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0xb3ad9d, roughness: 0.6 });
  const trays = [];
  for (const col of [RIGHT, LEFT]) col.items.forEach(([kind, q], k) => {
    const x = col.x, z = col.zs[k], round = kind === "point";
    const top = round ? new THREE.CylinderGeometry(col.half, col.half * 0.85, 0.006, 32) : new THREE.BoxGeometry(2 * col.half, 0.006, 2 * col.half);
    const dish = new THREE.Mesh(top, trayMat); dish.position.set(x, TOP - 0.003, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, TOP - 0.006, 8), postMat); post.position.set(x, (TOP - 0.006) / 2, z);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.003, 20), postMat); foot.position.set(x, 0.0015, z);
    const sh = shape(kind, q, bodyMat(q, kind === "plate" ? 0.85 : 1));
    const m = sh.body; m.position.set(x, TOP + sh.r, z);
    const lb = label(partsOf(kind, q), 0.018);
    // labels sit on the outer side of each column, away from the table
    lb.position.set(col === RIGHT ? x + col.half + 0.022 : x - col.half - 0.022, TOP + sh.r + 0.004, z);
    const t = { kind, q, x, z, half: col.half, mesh: m, grow: 1 };
    const pr = new THREE.Mesh(sh.proxy, proxyMat); pr.position.copy(m.position); pr.userData = { kind: "token", t };
    world.add(dish, post, foot, m, lb, pr); pickables.push(pr); trays.push(t);
  });
  const clearBtn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
  clearBtn.position.set(RIGHT.x, 0.006, 0.3); clearBtn.userData = { kind: "clear" }; world.add(clearBtn); pickables.push(clearBtn);
  const clearLb = label([{ t: "Clear" }], 0.014); clearLb.position.set(RIGHT.x, 0.024, 0.3); world.add(clearLb);

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

  function addObject(kind, q, x, y, z) {
    const g = new THREE.Group(), mat = bodyMat(q, kind === "plate" ? 0.85 : 1), sh = shape(kind, q, mat);
    g.add(sh.body);
    const lb = label(partsOf(kind, q), 0.022); lb.position.set(sh.lx, 0, 0); g.add(lb);
    const handle = new THREE.Mesh(new THREE.OctahedronGeometry(0.008), handleMat);
    handle.scale.set(0.8, 1.5, 0.8); handle.position.y = sh.r + 0.022; g.add(handle);
    world.add(g);
    const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), dropMat);
    const shadow = new THREE.Mesh(sh.foot, shadowMat); shadow.rotation.x = -Math.PI / 2;
    world.add(drop, shadow);
    const c = { kind, q, x, y, z, r: sh.r, g, mat, drop, shadow, proxies: [], out: false, solid: kind === "plate" ? 0.85 : 1 };
    const pb = new THREE.Mesh(sh.proxy, proxyMat); pb.userData = { kind: "charge", c };
    const ph = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), proxyMat); ph.position.y = sh.r + 0.022; ph.userData = { kind: "handle", c };
    g.add(pb, ph); c.proxies = [pb, ph]; pickables.push(pb, ph);
    charges.push(c); place(c); setOut(c);
    return c;
  }
  function place(c) {
    c.g.position.set(c.x, c.y, c.z);
    const a = c.drop.geometry.attributes.position;
    a.setXYZ(0, c.x, c.y - c.r, c.z); a.setXYZ(1, c.x, 0.001, c.z); a.needsUpdate = true;
    c.drop.computeLineDistances();
    c.shadow.position.set(c.x, 0.0012, c.z);
    if (!c.out) dirty = true;
  }
  /** Only a charge above the table makes the field; anywhere else it is shown faded and left out. */
  function setOut(c) {
    const out = !(Math.abs(c.x) < TABLE && Math.abs(c.z) < TABLE);
    if (out !== c.out) dirty = true;
    c.out = out; c.mat.opacity = out ? 0.45 : c.solid; c.drop.visible = c.shadow.visible = !out;
  }
  function removeCharge(c) {
    world.remove(c.g, c.drop, c.shadow);
    c.proxies.forEach((p) => pickables.splice(pickables.indexOf(p), 1));
    charges.splice(charges.indexOf(c), 1);
    dirty = true;
  }
  function clearAll() { [...charges].forEach(removeCharge); log("clear"); }
  START.forEach((s) => addObject(s.kind, s.q, s.x, s.y, s.z));
  // for checking the field lines: /during/?debug3d exposes a way to place objects from the console
  if (new URLSearchParams(location.search).has("debug3d"))
    window.space3d = { add: (kind, q, x, y, z) => addObject(kind, q, x, y, z), clear: () => [...charges].forEach(removeCharge), camera, controls };

  const up = new THREE.Vector3(0, 1, 0), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

  function rebuild() {
    dirty = false;
    const ch = charges.filter((c) => !c.out && !c.falling).map((c) => prep({ kind: c.kind, q: c.q, x: c.x, y: c.y, z: c.z }));
    // while something is being dragged, half the lines keep the view smooth (a headset is slower than a computer);
    // the full set is drawn as soon as it is let go
    const moving = sDrag || ctrls.some((c) => c.userData.drag);
    const lines = ch.length ? fieldLines(ch, moving ? Math.max(4, perQ / 2) : perQ) : [];
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
      if (charges.filter((c) => !c.falling).length >= MAX_OBJECTS) { flash(`At most ${MAX_OBJECTS} objects at a time.`); return null; }
      const t = u.t;
      const c = addObject(t.kind, t.q, t.x, t.mesh.position.y, t.z);
      t.mesh.scale.setScalar(0.01); t.grow = 0;          // a new one hatches on the tray
      return { c, mode, h: c.y, dist: hit.distance, isNew: true };
    }
    const c = u.c;
    if (c.falling) return null;
    if (mode === "screen" && u.kind === "handle") {
      const n = new THREE.Vector3().subVectors(camera.position, c.g.position).setY(0).normalize();
      return { c, mode: "lift", plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, c.g.position.clone()) };
    }
    return { c, mode, h: c.y, dist: hit.distance };
  }

  /** Move the dragged charge along a ray given in the scene's own coordinates. */
  function follow(d, o, dir) {
    const c = d.c;
    if (c.falling) return;
    if (d.mode === "lift") {
      const p = new THREE.Ray(o, dir).intersectPlane(d.plane, new THREE.Vector3());
      if (!p) return;
      c.y = clampTo(p.y, Y0, Y1);
    } else if (d.mode === "screen") {                  // slide at the charge's own height
      const t = (d.h - o.y) / dir.y; if (!(t > 0)) return;
      const p = o.clone().addScaledVector(dir, t);
      c.x = clampTo(p.x, -REACH, REACH); c.z = clampTo(p.z, -REACH, REACH);
    } else {                                           // controller or hand: same distance along the ray, so free 3D
      const p = o.clone().addScaledVector(dir, d.dist);
      c.x = clampTo(p.x, -REACH, REACH); c.y = clampTo(p.y, Y0, Y1); c.z = clampTo(p.z, -REACH, REACH);
    }
    place(c); setOut(c);
  }
  /** Let go: above the table the charge stays; back on a tray it is put away; anywhere else it falls and is gone. */
  function drop(d) {
    const c = d.c;
    const at = [c.x, c.y, c.z].map((v) => +v.toFixed(3));
    dirty = true;
    if (!c.out) { log(d.isNew ? "add" : "move", { kind: c.kind, q: c.q, at }); return; }
    const onTray = trays.some((t) => Math.abs(c.x - t.x) < t.half + 0.012 && Math.abs(c.z - t.z) < t.half + 0.012 && Math.abs(c.y - TOP) < 0.06);
    if (onTray) removeCharge(c);
    else { c.falling = true; c.vy = 0; }
    if (!d.isNew) log(onTray ? "put back" : "drop off table", { kind: c.kind, q: c.q });
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
    world.position.set(0.02, -0.42, -0.65);               // the space sits a little below the eyes, at arm's length
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

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const xr = renderer.xr.isPresenting;
    if (!xr && !stage.offsetParent) return;           // step not on screen: nothing to draw
    for (const c of [...charges]) if (c.falling) {
      c.vy -= 4 * dt; c.y += c.vy * dt; place(c);
      if (c.y < -0.6) removeCharge(c);
    }
    for (const t of trays) if (t.grow < 1) { t.grow = Math.min(1, t.grow + dt / 0.35); t.mesh.scale.setScalar(Math.max(0.01, t.grow)); }
    if (xr) ctrls.forEach((c) => { if (c.userData.drag) { ctrlRay(c); follow(c.userData.drag, ...toLocal(ray.ray.origin, ray.ray.direction)); } });
    if (dirty) rebuild();
    if (!xr) controls.update();
    renderer.render(scene, camera);
  });
}
