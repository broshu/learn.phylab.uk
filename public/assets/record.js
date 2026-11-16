// learn.phylab.uk — what each page records about a student's work.
// For now the record lives in this browser only (localStorage).
// When the database is added, send() below is the single place that posts it to /api.

const KEY = "learn.phylab.uk/record/v1";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

let cleared = false; // after a reset nothing more is written, so the page cannot put old answers back while it reloads

function write(all) {
  if (cleared) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: the page still works, nothing is kept */
  }
}

/** One record per part of the lesson ("before", "during", "after"). */
export function openRecord(part) {
  const all = read();
  const rec = all[part] || { part, startedAt: Date.now(), events: [], data: {} };
  all[part] = rec;
  write(all);

  const save = () => {
    const now = read();
    now[part] = rec;
    write(now);
  };

  return {
    /** Append a timestamped event, e.g. event("step", { name: "explore" }). */
    event(type, detail = {}) {
      rec.events.push({ t: Date.now(), type, ...detail });
      save();
    },
    /** Store a named result, e.g. set("prediction", strokes). */
    set(name, value) {
      rec.data[name] = value;
      save();
    },
    get(name) {
      return rec.data[name];
    },
    /** Seconds spent on each step, from the "step" events. */
    timeOnSteps() {
      const steps = rec.events.filter((e) => e.type === "step");
      const out = {};
      steps.forEach((e, i) => {
        const end = i + 1 < steps.length ? steps[i + 1].t : rec.finishedAt || Date.now();
        out[e.name] = (out[e.name] || 0) + Math.round((end - e.t) / 1000);
      });
      return out;
    },
    finish() {
      rec.finishedAt = Date.now();
      save();
    },
    reset() {
      rec.startedAt = Date.now();
      rec.finishedAt = undefined;
      rec.events = [];
      rec.data = {};
      save();
    },
    raw: rec,
  };
}

/** Remove everything this site saved in this browser (all parts of the lesson). */
export function clearAll() {
  cleared = true;
  try { Object.keys(localStorage).filter((k) => k.startsWith("learn.phylab.uk/")).forEach((k) => localStorage.removeItem(k)); } catch { /* nothing to clear */ }
}

/**
 * Reset buttons for the demonstration, at the bottom of the teacher side. The first click asks, the second clears
 * this browser's answers and reloads the page at its first step.
 */
export function resetButtons(buttons) {
  buttons.forEach((btn) => {
    let armed = null;
    btn.addEventListener("click", () => {
      if (!armed) {
        btn.textContent = "Click again to reset"; btn.classList.add("armed");
        armed = setTimeout(() => { armed = null; btn.textContent = "Reset demo"; btn.classList.remove("armed"); }, 3000);
        return;
      }
      clearTimeout(armed);
      clearAll();
      location.reload();
    });
  });
}
