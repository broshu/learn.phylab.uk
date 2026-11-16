// learn.phylab.uk — In class: 1 draw field lines (automatic check), 2 peer feedback, 3 3D match (AR on the tablet).
// Same demonstration layout as Before class: student on the left, teacher back end on the right.
import { openRecord } from "/assets/record.js";
import { startDraw } from "/in-class/draw.js";

const rec = openRecord("in-class");
const ORDER = ["draw", "peer", "ar"];
let state = rec.get("state");
if (!state || !ORDER.includes(state.step)) state = { step: "draw" };
const $ = (id) => document.getElementById(id);

function show(step, log = true) {
  state.step = step; rec.set("state", state);
  if (log) rec.event("step", { name: step });
  ORDER.forEach((s) => $("s-" + s).classList.toggle("on", s === step));
  const i = ORDER.indexOf(step);
  [...$("stepper").children].forEach((li, k) => { li.classList.toggle("done", k < i); li.classList.toggle("now", k === i); });
  window.scrollTo(0, 0);
}
document.addEventListener("visibilitychange", () => rec.event("step", { name: document.hidden ? "_away" : state.step }));
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => show(b.dataset.next)));
startDraw({ student: $("drawStudent"), teacher: $("drawTeacher"), rec });
show(state.step, true);
