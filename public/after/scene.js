// learn.phylab.uk — After class: drawing the river, the silt, the platypus bill, the shrimp and the bill's readings.
import { arrow, charge } from "/assets/board.js";
import { THRESH, ends } from "/after/model.js";

export const OK = "#0d6b5f", BAD = "#c0392b", READ = "#1a2030";

/** Length (cm on the board) of the arrow for a field strength: a compressed scale, because the field spans 1000 times. */
export const shown = (E) => (E < THRESH ? 0 : 0.5 + 0.55 * Math.log10(E / THRESH));
export const fmt = (E) => (E < THRESH ? "below 50 µV/cm, too weak to feel" : Number(E.toPrecision(3)).toLocaleString("en-AU") + " µV/cm");
export const num = (E) => Number(E.toPrecision(3)).toLocaleString("en-AU");

export function water(b, ctx, murky = true) {
  const g = ctx.createLinearGradient(0, 0, 0, b.h);
  g.addColorStop(0, murky ? "#d3dccf" : "#e9f1f0"); g.addColorStop(1, murky ? "#b4c0ae" : "#d5e4e2");
  ctx.fillStyle = g; ctx.fillRect(0, 0, b.w, b.h);
}

/** A patch of silt on the river bed, in board units. The shrimp hides somewhere in it. */
export function silt(b, ctx, x0, y0, x1, y1, label = "silt") {
  const [px0, py1] = b.px(x0, y0), [px1, py0] = b.px(x1, y1);
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(px0, py0, px1 - px0, py1 - py0, 0.5 * b.scale); else ctx.rect(px0, py0, px1 - px0, py1 - py0);
  ctx.fillStyle = "rgba(125,112,84,0.5)"; ctx.fill();
  ctx.save(); ctx.clip(); // specks, always in the same places
  let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = "rgba(74,64,44,0.35)";
  for (let i = 0; i < 260; i++) { const x = px0 + r() * (px1 - px0), y = py0 + r() * (py1 - py0); ctx.beginPath(); ctx.arc(x, y, 0.6 + r() * 1.4, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.setLineDash([6, 5]); ctx.strokeStyle = "rgba(74,64,44,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.setLineDash([]); ctx.fillStyle = "rgba(60,52,36,0.85)"; ctx.font = "600 12px -apple-system, 'Segoe UI', Arial, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  if (label) ctx.fillText(label, px0 + 8, py0 + 6);
  ctx.restore();
}

/** The platypus seen from above: bill tip at (x, y), facing the angle a. Only the head is drawn to scale. */
export function bill(b, ctx, x, y, a, alpha = 1) {
  const [px, py] = b.px(x, y), k = b.scale * 0.8;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(px, py); ctx.rotate(-a); ctx.scale(k, k);
  const body = ctx.createLinearGradient(-8, 0, -4, 0); body.addColorStop(0, "rgba(110,86,66,0)"); body.addColorStop(1, "rgba(110,86,66,0.9)");
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(-5.4, 0, 2.6, 1.3, 0, 0, 7); ctx.fill();   // shoulders, fading out
  ctx.fillStyle = "#6e5642"; ctx.beginPath(); ctx.ellipse(-3.25, 0, 1.3, 1.08, 0, 0, 7); ctx.fill(); // head
  ctx.fillStyle = "#3f3833"; ctx.beginPath(); // the bill: broad and flat, rounded at the tip
  ctx.moveTo(-2.6, -0.66); ctx.bezierCurveTo(-1.7, -0.98, -0.5, -1.0, -0.12, -0.58); ctx.quadraticCurveTo(0.14, 0, -0.12, 0.58);
  ctx.bezierCurveTo(-0.5, 1.0, -1.7, 0.98, -2.6, 0.66); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#17130f";
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-0.6, 0.17 * s, 0.1, 0.05, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-2.95, 0.62 * s, 0.09, 0, 7); ctx.fill(); }
  ctx.restore();
}

/**
 * A shrimp seen from above at (x, y) facing the angle a.
 * opt: color, alpha, dash (outline only, for a guess), charges (draw the + and − of the model).
 */
export function shrimp(b, ctx, s, opt = {}) {
  const { color = "#7a4a2e", alpha = 1, dash = false, charges = false } = opt;
  const [px, py] = b.px(s.x, s.y), k = b.scale;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(px, py); ctx.rotate(-s.a); ctx.scale(k, k);
  ctx.lineWidth = 2 / k; ctx.strokeStyle = color; ctx.lineCap = ctx.lineJoin = "round";
  const paint = () => {
    if (dash) { ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill(); ctx.setLineDash([5 / k, 4 / k]); ctx.stroke(); ctx.setLineDash([]); }
    else { ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.25; ctx.fill(); ctx.globalAlpha = alpha; ctx.stroke(); }
  };
  ctx.lineWidth = 1.3 / k; ctx.beginPath(); // legs and the two long antennae, swept back
  for (const x of [0.55, 0.3, 0.05, -0.2, -0.45]) for (const s2 of [-1, 1]) { ctx.moveTo(x, 0.26 * s2); ctx.lineTo(x - 0.2, 0.58 * s2); }
  for (const s2 of [-1, 1]) { ctx.moveTo(1.1, 0.07 * s2); ctx.bezierCurveTo(1.9, 0.25 * s2, 1.5, 0.95 * s2, 0.5, 1.05 * s2); }
  ctx.stroke();
  ctx.lineWidth = 2 / k;
  ctx.beginPath(); // tail fan
  ctx.moveTo(-0.95, -0.1); ctx.lineTo(-1.32, -0.46); ctx.quadraticCurveTo(-1.72, 0, -1.32, 0.46); ctx.lineTo(-0.95, 0.1); ctx.closePath(); paint();
  ctx.beginPath(); // body: a pointed head, tapering to the tail
  ctx.moveTo(1.3, 0); ctx.bezierCurveTo(0.95, -0.34, 0.2, -0.36, -0.95, -0.12); ctx.lineTo(-0.95, 0.12);
  ctx.bezierCurveTo(0.2, 0.36, 0.95, 0.34, 1.3, 0); ctx.closePath(); paint();
  ctx.lineWidth = 1.2 / k; ctx.beginPath();
  for (const x of [-0.7, -0.4, -0.1, 0.2]) { const h = 0.16 + 0.14 * (x + 0.95); ctx.moveTo(x, -h); ctx.lineTo(x, h); }   // segments
  for (const t of [-0.26, 0, 0.26]) { ctx.moveTo(-1.0, t * 0.3); ctx.lineTo(-1.45, t); }                             // ribs of the fan
  ctx.stroke();
  ctx.fillStyle = color; for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.arc(0.95, 0.24 * s2, 0.07, 0, 7); ctx.fill(); }
  ctx.restore();
  if (charges) for (const c of ends(s)) { const [cx, cy] = b.px(c.x, c.y); ctx.save(); ctx.globalAlpha = alpha; charge(ctx, cx, cy, c.q, Math.max(6, 0.2 * k)); ctx.restore(); }
}

/** A reading of the bill: an arrow at (x, y) along the field e = [Ex, Ey], length on the compressed scale. */
export function reading(b, ctx, x, y, e, color = READ, width = 2.6) {
  const E = Math.hypot(e[0], e[1]), L = shown(E), [px, py] = b.px(x, y);
  ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 3, 0, 7); ctx.fill(); ctx.restore();
  if (!L) return;
  arrow(ctx, px, py, ...b.px(x + (L * e[0]) / E, y + (L * e[1]) / E), color, width);
}

export function label(ctx, text, px, py, color = "#1a2030", align = "center") {
  ctx.save(); ctx.font = "600 13px -apple-system, 'Segoe UI', Arial, sans-serif"; ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.strokeText(text, px, py); ctx.fillStyle = color; ctx.fillText(text, px, py); ctx.restore();
}

// MathML pieces, as on the rest of the site
export const M = (s) => `<math>${s}</math>`;
export const MD = (s) => `<math display="block">${s}</math>`;
export const fr = (a, b) => `<mfrac>${a}${b}</mfrac>`;
export const k4 = fr("<mn>1</mn>", "<mrow><mn>4</mn><mi>&#x3C0;</mi><msub><mi>&#x3B5;</mi><mn>0</mn></msub></mrow>");
export const r3 = "<msup><mi>r</mi><mn>3</mn></msup>";
export const inv = (n) => M(`<mn>1</mn><mo>/</mo><msup><mi>r</mi><mn>${n}</mn></msup>`);

/** What the mother says: the AI tutor's voice on this page. */
export const mum = (html, title = "Mother") => `<div class="mum"><span class="tag">${title}</span>${html}</div>`;
