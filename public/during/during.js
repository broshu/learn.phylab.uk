// learn.phylab.uk — In class (/during/): 1 draw field lines (automatic check), 2 peer feedback, 3 3D match (browser by default, AR and VR where the device supports them).
// Same demonstration layout as Before class: student on the left, teacher back end on the right.
import { openRecord, resetButtons } from "/assets/record.js";
import { startDraw } from "/during/draw.js";
import { startPeer } from "/during/peer.js";

const rec = openRecord("during");
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
  if (step === "ar") open3D();
}

// the 3D space (and three.js with it) loads only when step 3 is first opened
let space3d = null;
function open3D() {
  if (space3d) return;
  space3d = import("/during/space3d.js").then((m) => m.startSpace3D($("space3d"), { rec }))
    .catch((err) => { space3d = null; $("space3d").innerHTML = `<p class="card">The 3D space could not load (${err.message}). Reload the page to try again.</p>`; });
}
document.addEventListener("visibilitychange", () => rec.event("step", { name: document.hidden ? "_away" : state.step }));
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => show(b.dataset.next)));
startDraw({ student: $("drawStudent"), teacher: $("drawTeacher"), rec });
startPeer({ student: $("peerStudent"), teacher: $("peerTeacher"), rec });
show(state.step, true);
resetButtons(document.querySelectorAll(".reset-demo"));
