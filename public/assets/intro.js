// learn.phylab.uk — the opening animation on the bare address (learn.phylab.uk).
// About two seconds: the path of the lesson (before class → in class → after class) with the teacher view under all
// three, then it fades out by itself. It never blocks the page: clicks pass straight through to the check-in below.
// It plays once per tab, and not at all for visitors who ask for reduced motion.
import { PREFIX } from "/assets/store.js";

const KEY = PREFIX + "intro";
const seen = (() => { try { return sessionStorage.getItem(KEY); } catch { return "1"; } })();
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (location.pathname === "/" && !seen && !still) {
  try { sessionStorage.setItem(KEY, "1"); } catch { /* not kept: it may play again */ }

  const css = document.createElement("style");
  css.textContent = `
  .intro-ov { position: fixed; inset: 0; z-index: 50; pointer-events: none; display: grid; place-items: center;
    background: rgba(247, 245, 239, 0.82); animation: introOut 0.55s ease-in 1.85s forwards; }
  .intro-ov * { pointer-events: none; }
  .intro-box { width: min(760px, 92vw); text-align: center; }
  .intro-box h2 { font-size: clamp(1.25rem, 3.2vw, 1.7rem); margin: 0 0 18px; opacity: 0; animation: introIn 0.35s ease-out 0s forwards; }
  .intro-path { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: center; gap: 10px; }
  .intro-stage { background: #fff; border: 2px solid var(--rule); border-radius: 10px; padding: 14px 8px; font-weight: 600;
    font-size: clamp(0.85rem, 2.4vw, 1.05rem); opacity: 0; transform: translateY(8px); animation: introIn 0.35s ease-out forwards; }
  .intro-stage small { display: block; font-weight: 400; color: var(--ink-soft); font-size: 0.8em; margin-top: 2px; }
  .intro-stage.here { border-color: var(--accent); color: var(--accent); }
  .intro-arrow { color: var(--ink-soft); font-size: 1.3rem; opacity: 0; animation: introIn 0.25s ease-out forwards; }
  .intro-teacher { margin-top: 12px; border: 2px dashed #9aa3b5; border-radius: 10px; padding: 9px; color: var(--ink-soft);
    font-size: clamp(0.8rem, 2.2vw, 0.95rem); opacity: 0; transform: scaleX(0.2); animation: introBar 0.45s ease-out 1.05s forwards; }
  @keyframes introIn { to { opacity: 1; transform: none; } }
  @keyframes introBar { to { opacity: 1; transform: none; } }
  @keyframes introOut { to { opacity: 0; } }`;
  document.head.appendChild(css);

  const ov = document.createElement("div");
  ov.className = "intro-ov";
  ov.setAttribute("aria-hidden", "true");
  ov.innerHTML = `<div class="intro-box">
    <h2>One lesson, the whole way through</h2>
    <div class="intro-path">
      <div class="intro-stage here" style="animation-delay:.15s">Before class<small>starts here</small></div>
      <span class="intro-arrow" style="animation-delay:.4s">&rarr;</span>
      <div class="intro-stage" style="animation-delay:.45s">In class<small>&nbsp;</small></div>
      <span class="intro-arrow" style="animation-delay:.7s">&rarr;</span>
      <div class="intro-stage" style="animation-delay:.75s">After class<small>&nbsp;</small></div>
    </div>
    <div class="intro-teacher">Teacher view, beside every step</div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener("animationend", (e) => { if (e.animationName === "introOut") ov.remove(); });
  setTimeout(() => ov.remove(), 3000); // in case animation events do not fire
}
