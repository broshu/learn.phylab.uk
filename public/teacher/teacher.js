// learn.phylab.uk — teacher view of the check-in: all answers overlaid, with counts.
import { arrow, charge, symbol } from "/assets/board.js";
import { LIMITS } from "/assets/checkin-judge.js";

const STORE = "learn.phylab.uk/checkin-trial/v1";
const GOOD = "#0d6b5f", BAD = "#c0392b", INK = "#1a2030", SOFT = "#8a93a6";
const $ = (id) => document.getElementById(id);
const rad = (d) => (d * Math.PI) / 180;

const QUESTIONS = [
  { id: "vectors", title: "Adding vectors", task: "Draw the sum of two vectors that start from the same point.",
    how: "Each answer is turned and scaled so that the correct sum is the green arrow. A dot is the tip of one student's arrow; the shaded patch is what counts as correct.", view: [-1.3, 2.9, -1.45, 1.45], paint: paintVectors },
  { id: "pointField", title: "The electric field of a point charge", task: "Draw the field at two points a distance r from a point charge and at one point twice as far away.",
    how: "Drawn as if the charge were positive for everyone. Arrow lengths are relative to each student's own arrow at point 1, so only the pattern matters. Dark green: the correct arrows.", view: [-2.1, 4.1, -2.3, 2.3], paint: paintPointField },
  { id: "coulomb", title: "Coulomb's law", task: "One sphere loses half its charge. Move it so that the force is the same as before.",
    how: "Each dot is where one student put the sphere, as a fraction of the original distance. The shaded band is what counts as correct.", view: [0.3, 1.32, -0.13, 0.4], paint: paintCoulomb },
  { id: "force", title: "Force on a charge in an electric field", task: "Draw the electric force on a proton and on an electron in the same field.",
    how: "Each answer is turned so that the field points to the right. Arrow lengths are relative to each student's own arrow on the proton.", view: [-3.2, 3.2, -1.7, 2.1], paint: paintForce },
];

// ---------- data ----------
const sample = await (await fetch("/teacher/checkin-sample.json")).json();
function mine() { try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; } }
function everyone() {
  return [
    ...sample.students.map((s) => ({ ...s, mine: false })),
    ...mine().map((s) => ({ ...s, mine: true })),
  ];
}

// ---------- a plot: canvas with a view window in question units ----------
function plot(canvas, view, painter) {
  const [x0, x1, y0, y1] = view;
  const render = () => {
    const w = canvas.clientWidth || 500, dpr = window.devicePixelRatio || 1;
    const scale = w / (x1 - x0), h = Math.round((y1 - y0) * scale);
    canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    const px = (x, y) => [(x - x0) * scale, (y1 - y) * scale];
    painter({ ctx, px, scale, w, h });
  };
  new ResizeObserver(render).observe(canvas);
  render();
}
const colour = (r, alpha) => (r.ok ? `rgba(13,107,95,${alpha})` : `rgba(192,57,43,${alpha})`);
function dot(ctx, x, y, r, a) {
  ctx.beginPath(); ctx.arc(x, y, 5, 0, 7);
  ctx.fillStyle = colour(r, 0.62); ctx.fill();
  if (a.mine) { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke(); }
}
function label(ctx, text, x, y, color = SOFT, align = "center", weight = "600") {
  ctx.fillStyle = color; ctx.font = `${weight} 12.5px -apple-system, "Segoe UI", Arial, sans-serif`; ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}
/** Thin arrow for one student's answer. */
function thin(ctx, from, to, r, a) {
  if (a.mine) arrow(ctx, ...from, ...to, INK, 4.5);
  arrow(ctx, ...from, ...to, colour(r, a.mine ? 1 : 0.42), a.mine ? 2.2 : 1.8);
}

// ---------- 1 · vectors ----------
function paintVectors(answers) {
  return ({ ctx, px, scale }) => {
    const L = LIMITS.vectors, [ox, oy] = px(0, 0);
    // what counts as correct
    ctx.fillStyle = "rgba(13,107,95,0.13)";
    ctx.beginPath(); ctx.arc(ox, oy, L.lengthHigh * scale, -rad(L.angle), rad(L.angle)); ctx.arc(ox, oy, L.lengthLow * scale, rad(L.angle), -rad(L.angle), true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#e3e6ec"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(ox, oy, scale, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    arrow(ctx, ox, oy, ...px(1, 0), GOOD, 3.5);
    label(ctx, "correct sum", ...((p) => [p[0], p[1] + 16])(px(0.5, 0)), GOOD);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ox, oy, 3.5, 0, 7); ctx.fill();
    // identical answers are spread in a small spiral so that every dot shows
    const seen = {};
    for (const a of answers) {
      const r = a.r, key = `${r.norm.u.toFixed(2)},${r.norm.v.toFixed(2)}`, k = (seen[key] = (seen[key] || 0) + 1) - 1;
      const [x, y] = px(r.norm.u, r.norm.v), s = 4.6 * Math.sqrt(k), t = k * 2.4;
      dot(ctx, x + s * Math.cos(t), y + s * Math.sin(t), r, a);
    }
  };
}

// ---------- 2 · field of a point charge ----------
function paintPointField(answers) {
  const P = [[0, 1], [2, 0], [0, -1]], out = [[0, 1], [1, 0], [0, -1]], unit = 0.8;
  return ({ ctx, px }) => {
    const [cx, cy] = px(0, 0);
    ctx.strokeStyle = "#d5dae3"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    for (const p of [P[0], P[1]]) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...px(...p)); ctx.stroke(); }
    ctx.setLineDash([]);
    symbol(ctx, [{ t: "r" }], ...((p) => [p[0] - 12, p[1] + 5])(px(0, 0.5)), SOFT, 15);
    symbol(ctx, [{ t: "2", plain: true }, { t: "r" }], ...((p) => [p[0], p[1] + 18])(px(1, 0)), SOFT, 15);
    for (const a of [...answers].sort((p, q) => p.mine - q.mine)) {
      a.r.norm.arrows.forEach((ar, i) => {
        const t = Math.atan2(out[i][1], out[i][0]) + rad(ar.a), l = Math.min(2.3, ar.l * unit);
        thin(ctx, px(...P[i]), px(P[i][0] + l * Math.cos(t), P[i][1] + l * Math.sin(t)), a.r, a);
      });
    }
    P.forEach((p, i) => {
      const l = unit * (i === 1 ? 0.25 : 1);
      arrow(ctx, ...px(...p), ...px(p[0] + out[i][0] * l, p[1] + out[i][1] * l), "#063f38", 3.2);
      const [x, y] = px(...p); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      label(ctx, String(i + 1), x + (i === 1 ? 0 : -15), y + (i === 1 ? 17 : 0), INK);
    });
    charge(ctx, cx, cy, 1, 13);
  };
}

// ---------- 3 · Coulomb's law ----------
function paintCoulomb(answers) {
  return ({ ctx, px, scale }) => {
    const L = LIMITS.coulomb, base = 0, bin = 0.02;
    const [bx0, by] = px(L.low, base), [bx1] = px(L.high, base), top = px(0, 0.385)[1];
    ctx.fillStyle = "rgba(13,107,95,0.13)"; ctx.fillRect(bx0, top, bx1 - bx0, by - top);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...px(0.34, base)); ctx.lineTo(...px(1.29, base)); ctx.stroke();
    for (const [x, text] of [[0.5, "half the distance"], [0.71, "correct"], [1, "not moved"]]) {
      const [tx, ty] = px(x, base);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + 7); ctx.stroke();
      label(ctx, x === 0.71 ? "0.71" : x.toFixed(1), tx, ty + 17, INK);
      label(ctx, text, tx, ty + 32, x === 0.71 ? GOOD : SOFT);
    }
    label(ctx, "distance chosen ÷ distance before", px(1.29, base)[0], top + 8, SOFT, "right", "400");
    const stack = {};
    for (const a of [...answers].sort((p, q) => p.mine - q.mine)) {
      const k = Math.round(a.r.norm.ratio / bin), n = (stack[k] = (stack[k] || 0) + 1);
      const [x] = px(k * bin, base);
      dot(ctx, x, by - 9 - (n - 1) * 11, a.r, a);
    }
  };
}

// ---------- 4 · force in a field ----------
function paintForce(answers) {
  const spots = [{ x: -1.55, sign: 1, name: "proton", key: "proton" }, { x: 1.55, sign: -1, name: "electron", key: "electron" }], unit = 1.05;
  return ({ ctx, px }) => {
    arrow(ctx, ...px(-0.9, 1.55), ...px(0.9, 1.55), SOFT, 4);
    symbol(ctx, [{ t: "E", vec: true }], ...((p) => [p[0], p[1] - 9])(px(0, 1.55)), SOFT, 16);
    for (const s of spots) {
      for (const a of [...answers].sort((p, q) => p.mine - q.mine)) {
        const ar = a.r.norm[s.key], l = Math.min(1.5, ar.l * unit), t = rad(ar.a);
        thin(ctx, px(s.x, 0), px(s.x + l * Math.cos(t), l * Math.sin(t)), a.r, a);
      }
      arrow(ctx, ...px(s.x, 0), ...px(s.x + s.sign * unit, 0), "#063f38", 3.2);
      charge(ctx, ...px(s.x, 0), s.sign, 10);
      label(ctx, s.name, px(s.x, 0)[0], px(0, -1.45)[1], INK);
    }
  };
}

// ---------- the page ----------
function render() {
  const all = everyone(), own = all.filter((s) => s.mine).length, n = all.length;
  $("mineNote").textContent = own
    ? `${own} submission${own === 1 ? "" : "s"} made in this browser ${own === 1 ? "is" : "are"} added to them and outlined in black.`
    : "Answer the check-in yourself and your submission is added here, outlined in black.";
  $("clearMine").hidden = !own;

  const scores = all.map((s) => s.results.filter((r) => r.ok).length);
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const times = all.map((s) => s.seconds).filter((t) => t != null).sort((a, b) => a - b), median = times[Math.floor(times.length / 2)];
  const counts = [0, 1, 2, 3, 4].map((k) => scores.filter((s) => s === k).length), most = Math.max(...counts);
  const rate = (id) => all.filter((s) => s.results.find((r) => r.id === id).ok).length / n;
  const weakest = [...QUESTIONS].sort((a, b) => rate(a.id) - rate(b.id))[0];
  $("tiles").innerHTML = `
    <div class="card tile"><div class="big">${n}</div><div class="lab">students<br>${sample.students.length} simulated${own ? ` + ${own} from this browser` : ""}</div></div>
    <div class="card tile"><div class="big">${mean.toFixed(1)} <span style="font-size:1rem">of 4</span></div><div class="lab">average score</div></div>
    <div class="card tile"><div class="big">${Math.floor(median / 60)} min ${String(median % 60).padStart(2, "0")} s</div><div class="lab">median time on the check-in</div></div>
    <div class="card tile"><div class="lab">Students by number of correct answers</div>
      <div class="dist">${counts.map((c, k) => `<div><b>${c}</b><i style="height:${Math.round((c / most) * 44)}px"></i>${k} right</div>`).join("")}</div></div>`;

  $("questions").innerHTML = QUESTIONS.map((q, i) => {
    const rs = all.map((s) => s.results.find((r) => r.id === q.id));
    const right = rs.filter((r) => r.ok).length;
    const errors = {};
    rs.filter((r) => !r.ok).forEach((r) => { errors[r.error] = (errors[r.error] || 0) + 1; });
    const rows = [["Correct", right, true], ...Object.entries(errors).sort((a, b) => b[1] - a[1]).map(([e, c]) => [e, c, false])];
    return `
      <article class="card qcard">
        <div class="qhead"><h2>${i + 1}. ${q.title}${q === weakest ? ' <span class="tag" style="color:var(--pos);margin-left:8px">least secure</span>' : ""}</h2>
          <span class="pct">${Math.round((right / n) * 100)}% <small>correct · ${right} of ${n}</small></span></div>
        <p class="task">${q.task}</p>
        <div class="qbody">
          <div><div class="plot"><canvas id="plot-${q.id}"></canvas></div><p class="how">${q.how}</p></div>
          <table class="err">${rows.map(([text, c, ok]) => `<tr class="${ok ? "ok" : ""}"><td>${text}<div class="bar" style="width:${Math.max(2, (c / n) * 100)}%"></div></td><td class="n">${c} · ${Math.round((c / n) * 100)}%</td></tr>`).join("")}</table>
        </div>
      </article>`;
  }).join("");

  for (const q of QUESTIONS) {
    const answers = all.map((s) => ({ r: s.results.find((r) => r.id === q.id), mine: s.mine }));
    plot($("plot-" + q.id), q.view, q.paint(answers));
  }
}

$("clearMine").addEventListener("click", () => { localStorage.removeItem(STORE); render(); });
render();
