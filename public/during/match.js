// learn.phylab.uk — In class, step 3, part 2: the 3D match.
// Student side: a field is shown in orange; the student chooses objects from the trays and places them to make
// the same field, without seeing their own field lines until they check. Then their lines appear over the target
// and the check says what to fix. Teacher side: where every student put their objects, seen from above and
// overlaid, coloured by result, with how often each mistake happened.
import { startSpace3D } from "/during/space3d.js";
import { TARGET, TOL, KINDS, judgeMatch, axisOf, plateCorners } from "/during/match-judge.js";
import { rng } from "/during/lines-sample.js";

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
    plate.axis = axisOf("plate", tilt, turn); plate.corners = plateCorners(plate.x, plate.z, tilt, turn);
    return { id: "Student " + (i + 1), placed, result: judgeMatch(placed), checks: checksFor[i] };
  });
}

export function startMatch({ student, teacher, rec }) {
  // ---------- student ----------
  student.innerHTML = `<div id="mSpace"></div><div id="mFeedback" aria-live="polite" style="margin-top:12px"></div>`;
  const fb = student.querySelector("#mFeedback");
  let live = null, checks = 0;
  startSpace3D(student.querySelector("#mSpace"), {
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
      ? `<p class="note" style="margin:0"><strong>Matched.</strong> Your field (dark lines) lies on the orange one. The orange field comes from a point charge +2<i>q</i>, a point charge &minus;<i>q</i> and a negatively charged plate: half of the lines from +2<i>q</i> end on &minus;<i>q</i>, the other half on the plate.</p>`
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
    <p class="task">Where everyone put their objects, seen from above: a small headset class of ${cls.length} students (simulated). Dashed: where the objects that make the field really are. Thick: the student on the left, once checked.</p>
    <div class="plot"><canvas id="mTop" aria-label="Top view of the table with every student's objects"></canvas></div>
    <div class="key" style="margin:8px 0 12px"><span><i style="background:${OK}"></i>right</span><span><i style="background:${BAD}"></i>to fix</span><span><i style="background:${EXTRA}"></i>extra</span></div>
    <div id="mStats"></div>
    <h4 class="tsub">Each student</h4>
    <table class="blanks" id="mList"></table>`;
  const canvas = teacher.querySelector("#mTop"), ctx = canvas.getContext("2d");
  const HALF = 0.3; // the table is 60 cm square
  let W = 0, H = 0;
  const px = (x, z) => [((x + HALF) / (2 * HALF)) * W, ((z + HALF) / (2 * HALF)) * H];

  function shapeOf(o, color, width, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width;
    if (o.kind === "point") {
      const [x, y] = px(o.x, o.z); ctx.beginPath(); ctx.arc(x, y, 2.5 + 1.2 * Math.abs(o.q) + (width > 2 ? 2 : 0), 0, 7);
      o.q > 0 ? ctx.fill() : ctx.stroke();
    } else if (o.kind === "plate" && o.corners) {
      ctx.beginPath(); o.corners.forEach(([x, z], i) => { const [a, b] = px(x, z); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.closePath(); ctx.stroke();
    } else { const [x, y] = px(o.x, o.z); ctx.strokeRect(x - 5, y - 5, 10, 10); }
    ctx.restore();
  }
  function statusOf(st, o) {
    // the judged item for this object: the matched target of the same kind, or extra
    const item = st.result.items.find((i) => i.kind === o.kind && i.status !== "missing" && !i._used);
    if (item) item._used = true;
    return item ? item.status : "extra";
  }
  function paintTop() {
    const w = canvas.clientWidth || 320, dpr = window.devicePixelRatio || 1;
    W = w; H = w; canvas.style.height = H + "px"; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f3efe4"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#ddd6c4"; ctx.lineWidth = 1;
    for (let k = 1; k < 12; k++) { const a = (k / 12) * W; ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(a, H); ctx.moveTo(0, a); ctx.lineTo(W, a); ctx.stroke(); }
    const all = live ? [...cls, live] : cls;
    for (const st of all) {
      st.result.items.forEach((i) => delete i._used);
      const thick = st === live;
      for (const o of st.placed) {
        const s = statusOf(st, o);
        shapeOf(o, s === "ok" ? OK : s === "extra" ? EXTRA : BAD, thick ? 3 : 1.2, thick ? 1 : 0.35);
      }
    }
    // the truth, dashed on top
    ctx.save(); ctx.setLineDash([5, 4]);
    for (const t of TARGET) shapeOf(t.kind === "plate" ? { ...t, corners: plateCorners(t.x, t.z, t.tilt, t.turn) } : { ...t, q: -2 }, "#1a2030", 1.6, 0.9);
    ctx.restore();
  }

  function paintTeacher(flash = false) {
    paintTop();
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
  new ResizeObserver(() => paintTop()).observe(canvas);
  paintTeacher();
}
