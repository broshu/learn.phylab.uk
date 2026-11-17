// learn.phylab.uk — where this browser keeps a visitor's answers.
// Everything lives in sessionStorage: it survives a page refresh and moving between /before/, /during/ and /after/,
// and is gone when the tab is closed. A reviewer who comes back later starts a clean demonstration.
// Real student data for research will go to a server, not here.

export const PREFIX = "learn.phylab.uk/";
export const CHECKIN_KEY = PREFIX + "checkin";
export const RECORD_KEY = PREFIX + "record";
export const KEEP = 3; // check-in submissions kept; older ones are dropped

/**
 * Version of each check-in question. When a question changes the shape of its answer, add one to its number:
 * answers saved under the old number are then ignored instead of being drawn wrongly.
 */
export const VERSIONS = { vectors: 1, pointField: 1, coulomb: 1, force: 2, rod: 1 };

const box = (() => { try { return window.sessionStorage; } catch { return null; } })();

export function load(key, fallback) {
  try { return JSON.parse(box.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function save(key, value) {
  try { box.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: the page still works, nothing is kept */ }
}

/** Remove everything this site saved in this browser, in this tab and from older versions of the site. */
export function clearAll() {
  for (const s of [box, (() => { try { return window.localStorage; } catch { return null; } })()]) {
    try { Object.keys(s).filter((k) => k.startsWith(PREFIX)).forEach((k) => s.removeItem(k)); } catch { /* nothing to clear */ }
  }
}

// Older versions of the site kept answers in localStorage for ever; remove them once.
try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch { /* nothing to clear */ }
