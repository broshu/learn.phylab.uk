// learn.phylab.uk — After class (/after/): a young platypus learns to hunt.
// 1 the mother teaches (help allowed), 2 the hunt, without help: find the shrimp, get behind it, work out how far it is.
// Same demonstration layout as the other parts: student on the left, teacher back end on the right.
import { openRecord, resetButtons } from "/assets/record.js";
import { makeClass } from "/after/sample.js";
import { startTeach } from "/after/teach.js";
import { startHunt } from "/after/hunt.js";

const rec = openRecord("after");
const ORDER = ["teach", "hunt"];
let state = rec.get("state");
if (!state || !ORDER.includes(state.step)) state = { step: "teach" };
const $ = (id) => document.getElementById(id);

function show(step, log = true) {
  state.step = step; rec.set("state", state);
  if (log) rec.event("step", { name: step });
  ORDER.forEach((s) => $("s-" + s).classList.toggle("on", s === step));
  const i = ORDER.indexOf(step);
  [...$("stepper").children].forEach((li, k) => { li.classList.toggle("done", k < i); li.classList.toggle("now", k === i); });
  window.scrollTo(0, 0);
  window.dispatchEvent(new Event("resize")); // canvases in a step that was hidden take their size now
}
document.addEventListener("visibilitychange", () => rec.event("step", { name: document.hidden ? "_away" : state.step }));
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => show(b.dataset.next)));

const cls = makeClass();
startTeach({ student: $("teachStudent"), teacher: $("teachTeacher"), rec, cls });
startHunt({ student: $("huntStudent"), teacher: $("huntTeacher"), rec, cls });
show(state.step, true);
resetButtons(document.querySelectorAll(".reset-demo"));
