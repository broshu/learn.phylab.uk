// learn.phylab.uk — In class, step 3, part 2: the 3D match.
// Student side: a field is shown in orange; the student chooses objects from the trays and places them to make
// the same field, without seeing their own field lines until they check. Then their lines appear over the target
// and the check says what to fix. Teacher side: where every student put their objects, seen from above and
// overlaid, coloured by result, with how often each mistake happened.
import { startSpace3D } from "/during/space3d.js";
import { TARGET, TOL, KINDS, judgeMatch, axisOf } from "/during/match-judge.js";
import { rng } from "/during/lines-sample.js";
import * as THREE from "/vendor/three/three.min.js";

const OK = "#0d6b5f", BAD = "#c0392b", EXTRA = "#d98200";

// ---------- a simulated small class, judged by the same code as a real student ----------
// The 3D match is meant for headsets, so the class is small: 10 students, each with a typical result.
function makeClass() {
  const r = rng(2311), [P, N, L] = TARGET, jit = (s) => (r() - 0.5) * 2 * s;
  // what each student did: matched, or the one thing they got wrong (made-up but plausible)
  const plan = ["ok", "ok", "ok", "negSize", "negSize", "plateSign", "noNeg", "posSize", "plateFlat", "negFar"];
  const checksFor = [2, 3, 2, 3, 2, 3, 2, 2, 1, 2];
  return plan.map((what, i) => {
    const pos = { kind: "point", q: P.q, x: P.x + jit(0.02), y: P.y + jit(0.02), z: P.z + jit(0.02) };
    const neg = { kind: "point", q: N.q, x: N.x + jit(0.02), y: N.y + jit(0.02), z: N.z + jit(0.02) };
    const plate = { kind: "plate", q: L.q, x: L.x + jit(0.02), y: L.y + jit(0.015), z: L.z + jit(0.02) };
    let tilt = L.tilt + jit(10), turn = L.turn + jit(10);
    const placed = [pos, neg, plate];
    if (what === "negSize") neg.q = -2;                         // the most likely slip: −2q, without counting lines
    if (what === "posSize") pos.q = 1;
    if (what === "plateSign") plate.q = -L.q;
    if (what === "noNeg") placed.splice(1, 1);                  // missed that some lines end on a second charge
    if (what === "plateFlat") tilt = 0;
    if (what === "negFar") { neg.y -= 0.08; neg.x += 0.03; }
    plate.axis = axisOf("plate", tilt, turn);
    return { id: "Student " + (i + 1), placed, result: judgeMatch(placed), checks: checksFor[i] };
  });
}

export function startMatch({ student, teacher, rec }) {
  // the full teacher page (no student side) shows the last check made in this tab; the student page starts afresh,
  // because the 3D space does not bring back the objects placed before a reload
  const prev = student ? null : rec.get("match");
  let live = prev && prev.result ? { id: "You", ...prev } : null, checks = 0;

  // ---------- student ---------- (none on the full teacher page)
  const fb = student ? (student.innerHTML = `<div id="mSpace"></div><div id="mFeedback" aria-live="polite" style="margin-top:12px"></div>`, student.querySelector("#mFeedback")) : null;
  if (student) startSpace3D(student.querySelector("#mSpace"), {
    rec, mode: "match", target: TARGET, judge: judgeMatch,
    onCheck(result, placed) {
      checks++;
      live = { id: "You", placed, result, checks };
      rec.set("match", { placed, result, checks });
      fb.innerHTML = feedback(result, placed);
      paintTeacher(true);
    },
  });

  function feedback(r, placed) {
    if (!placed.length) return `<p class="note warn" style="margin:0"><strong>The table is empty.</strong> Take objects from the trays and place them to make the orange field.</p>`;
    const head = r.ok
      ? `<p class="note" style="margin:0"><strong>Matched.</strong> Your objects were close enough, so they have been moved onto the exact places: now your field (dark lines) lies on the orange one. The orange field comes from a point charge +2<i>q</i>, a point charge &minus;<i>q</i> and a negatively charged plate: half of the lines from +2<i>q</i> end on &minus;<i>q</i>, the other half on the plate.</p>`
      : `<p class="note warn" style="margin:0"><strong>Not yet.</strong> Your field is drawn in dark lines over the orange one. Change your objects, then check again; your lines hide while you change them.</p>`;
    const items = r.items.filter((i) => !r.ok || i.status !== "ok").map((i) =>
      `<li><b style="color:${i.status === "ok" ? OK : i.status === "extra" ? EXTRA : BAD}">${i.status === "ok" ? "Right" : i.status === "extra" ? "Extra" : "Fix"}:</b> ${i.msg}</li>`);
    return `${head}${items.length ? `<ul class="tight" style="margin-top:12px">${items.join("")}</ul>` : ""}
      <p class="muted small" style="margin:6px 0 0">The check is forgiving: within ${TOL.cm} cm, and turned within ${TOL.deg}°.</p>`;
  }

  // ---------- teacher ----------
  const cls = makeClass();
  teacher.innerHTML = `
    <div class="qhead"><h3>3D match · class picture</h3><span class="pct" id="mPct"></span></div>
    <p class="task">Where everyone put their objects, in 3D: a small headset class of ${cls.length} students (simulated), see-through and laid over each other. Dark outlines: where the objects that make the field really are. Solid: the student on the left, once checked. Drag to turn the view.</p>
    <div id="mView" style="height:340px;position:relative;border:1px solid var(--rule);border-radius:8px;overflow:hidden"></div>
    <div class="key" style="margin:8px 0 12px"><span><i style="background:${OK}"></i>right</span><span><i style="background:${BAD}"></i>to fix</span><span><i style="background:${EXTRA}"></i>extra</span></div>
    <div id="mStats"></div>
    <h4 class="tsub">Each student</h4>
    <table class="blanks" id="mList"></table>`;
  const view = class3D(teacher.querySelector("#mView"));

  function paintTeacher(flash = false) {
    view.show(live ? [...cls, live] : cls, live);
    const all = live ? [...cls, live] : cls, n = all.length, pct = (v) => Math.round((100 * v) / n);
    const matched = all.filter((s) => s.result.ok).length;
    const by = Object.keys(KINDS).map((k) => [k, all.filter((s) => s.result.items.some((i) => i.status === k)).length]).sort((a, b) => b[1] - a[1]);
    const done = all.filter((s) => s.result.ok);
    const avg = done.length ? (done.reduce((a, s) => a + s.checks, 0) / done.length).toFixed(1) : "–";
    teacher.querySelector("#mPct").innerHTML = `${pct(matched)}% <small>matched</small>`;
    teacher.querySelector("#mStats").innerHTML = `
      ${live ? `<p class="livebar ${live.result.ok ? "ok" : "no"}">Student on the left: <b>${live.result.ok ? "matched" : "not yet"}</b> after ${live.checks} check${live.checks > 1 ? "s" : ""}.</p>` : ""}
      <table class="err">
        <tr class="ok"><td>Matched<div class="bar" style="width:${pct(matched)}%"></div></td><td class="n">${matched} / ${n}</td></tr>
        ${by.filter(([, v]) => v).map(([k, v]) => `<tr><td>${KINDS[k]}<div class="bar" style="width:${pct(v)}%"></div></td><td class="n">${v}</td></tr>`).join("")}
      </table>
      <p class="how">Each student's last check. Those who matched needed ${avg} checks on average.</p>`;
    // in a small class the teacher can follow each student: their result and how many checks it took
    const first = (st) => st.result.ok ? "Matched" : KINDS[st.result.items.find((i) => i.status !== "ok").status];
    teacher.querySelector("#mList").innerHTML = `<tr><th>Student</th><th>Last check</th><th class="n">Checks</th></tr>` +
      all.map((st) => `<tr${st === live ? ' style="font-weight:600"' : ""}><td>${st === live ? "Student on the left" : st.id}</td>
        <td style="color:${st.result.ok ? OK : BAD}">${first(st)}</td><td class="n">${st.checks}</td></tr>`).join("");
    if (flash) { teacher.classList.remove("flash"); void teacher.offsetWidth; teacher.classList.add("flash"); }
  }
  paintTeacher();
}

// ---------- the teacher's 3D picture: every student's objects, see-through, over the outline of the answer ----------
// No field lines: eleven fields on top of each other would be unreadable; the teacher needs to see where things were put.
// Heights show here, which a view from above would hide (a −q put 8 cm too low looks right from above).
function class3D(box) {
  const SIZE = { plate: 0.08, rod: 0.08, ring: 0.06 }, radius = (q) => 0.012 + 0.004 * Math.abs(q);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  box.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf7f5ef);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8576, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(0.4, 1, 0.6); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10);
  camera.position.set(0.26, 0.36, 0.5);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(-0.01, 0.15, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.25; controls.maxDistance = 1.6;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.8;           // turns slowly until the teacher takes it
  controls.addEventListener("start", () => { controls.autoRotate = false; });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xece7da })); // the grid marks the 60 cm table
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grid = new THREE.GridHelper(0.6, 12, 0xbdb6a4, 0xd6d0c0); grid.position.y = 0.0005; scene.add(grid);

  const geomOf = (o) => o.kind === "point" ? new THREE.SphereGeometry(radius(o.q), 24, 16)
    : o.kind === "plate" ? new THREE.BoxGeometry(2 * SIZE.plate, 0.004, 2 * SIZE.plate)
    : o.kind === "rod" ? new THREE.CylinderGeometry(0.004, 0.004, 2 * SIZE.rod, 12).rotateZ(Math.PI / 2)
    : new THREE.TorusGeometry(SIZE.ring, 0.004, 8, 48).rotateX(Math.PI / 2);
  /** Place a mesh like the object: at its position, turned so its own axis (y for plate and ring, x for rod) is o.axis. */
  function put(m, o) {
    m.position.set(o.x, o.y, o.z);
    if (o.axis) m.quaternion.setFromUnitVectors(new THREE.Vector3(o.kind === "rod" ? 1 : 0, o.kind === "rod" ? 0 : 1, 0), new THREE.Vector3(...o.axis).normalize());
    return m;
  }
  // the answer as dark outlines
  for (const t of TARGET) {
    const o = { ...t, axis: axisOf(t.kind, t.tilt, t.turn) };
    const g = geomOf(o);
    const edges = new THREE.LineSegments(o.kind === "point" ? new THREE.WireframeGeometry(new THREE.SphereGeometry(radius(o.q), 10, 6)) : new THREE.EdgesGeometry(g),
      new THREE.LineBasicMaterial({ color: 0x1a2030 }));
    scene.add(put(edges, o));
  }
  const students = new THREE.Group(); scene.add(students);
  const COL = { ok: 0x0d6b5f, bad: 0xc0392b, extra: 0xd98200 };

  function show(all, live) {
    students.children.forEach((m) => m.geometry.dispose());
    students.clear();
    for (const st of all) for (const o of st.placed) {
      const item = st.result.items.find((i) => i.obj === o);
      const status = !item || item.status === "extra" ? "extra" : item.status === "ok" ? "ok" : "bad";
      const solid = st === live;
      const mat = new THREE.MeshStandardMaterial({ color: COL[status], roughness: 0.5, transparent: !solid, opacity: solid ? 1 : 0.28, depthWrite: solid });
      students.add(put(new THREE.Mesh(geomOf(o), mat), o));
    }
  }
  let onScreen = false;
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; }).observe(box);
  const draw = () => { controls.update(); renderer.render(scene, camera); };
  const resize = () => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw(); };
  new ResizeObserver(resize).observe(box); resize();
  renderer.setAnimationLoop(() => { if (onScreen && box.offsetParent) draw(); });
  return { show: (all, live) => { show(all, live); if (box.offsetParent) draw(); } };
}
