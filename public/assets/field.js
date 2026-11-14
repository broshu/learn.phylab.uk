// learn.phylab.uk — electric field of point charges: calculation, field lines, and an interactive canvas.
// Units: positions in centimetres, charges in nanocoulombs, field in newtons per coulomb.

/** Coulomb constant for these units: E = K q / r^2 with q in nC and r in cm gives N/C. */
export const K = 8.99e9 * 1e-9 / 1e-4; // 8.99e4

/** Net electric field (Ex, Ey) at a point: the vector sum of the fields of all the charges. */
export function fieldAt(charges, x, y) {
  let ex = 0, ey = 0;
  for (const c of charges) {
    const [cx, cy] = fieldOf(c, x, y);
    ex += cx; ey += cy;
  }
  return [ex, ey];
}

/** Field of one point charge at a point. */
export function fieldOf(c, x, y) {
  const dx = x - c.x, dy = y - c.y;
  const r2 = dx * dx + dy * dy;
  if (r2 < 1e-8) return [0, 0];
  const f = (K * c.q) / (r2 * Math.sqrt(r2));
  return [f * dx, f * dy];
}

const CAPTURE = 0.22; // cm: a line ends when it comes this close to a charge
const STEP = 0.04;    // cm: integration step along the line

function unitField(charges, x, y, dir) {
  const [ex, ey] = fieldAt(charges, x, y);
  const m = Math.hypot(ex, ey);
  if (m < 1e-9) return null;
  return [(dir * ex) / m, (dir * ey) / m];
}

/** Follow the field from a starting point. dir = +1 along the field, -1 against it. */
function trace(charges, x, y, dir, bounds) {
  const pts = [[x, y]];
  let end = -1;
  for (let i = 0; i < 6000; i++) {
    const k1 = unitField(charges, x, y, dir); if (!k1) break;
    const k2 = unitField(charges, x + (STEP / 2) * k1[0], y + (STEP / 2) * k1[1], dir); if (!k2) break;
    const k3 = unitField(charges, x + (STEP / 2) * k2[0], y + (STEP / 2) * k2[1], dir); if (!k3) break;
    const k4 = unitField(charges, x + STEP * k3[0], y + STEP * k3[1], dir); if (!k4) break;
    x += (STEP / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (STEP / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    pts.push([x, y]);
    if (x < bounds.x0 || x > bounds.x1 || y < bounds.y0 || y > bounds.y1) break;
    let hit = false;
    for (let j = 0; j < charges.length; j++) {
      const c = charges[j];
      // along the field a line can only end on a negative charge; against it, on a positive one
      if (c.q * dir < 0 && Math.hypot(x - c.x, y - c.y) < CAPTURE) { end = j; hit = true; break; }
    }
    if (hit) break;
  }
  return { pts, end };
}

/** Angles that fill the largest gaps between the angles already used. */
function fillGaps(used, n) {
  const out = [];
  const all = used.slice().sort((a, b) => a - b);
  for (let k = 0; k < n; k++) {
    if (all.length === 0) { all.push(0); out.push(0); continue; }
    let best = 0, bestGap = -1;
    for (let i = 0; i < all.length; i++) {
      const next = i + 1 < all.length ? all[i + 1] : all[0] + 2 * Math.PI;
      const gap = next - all[i];
      if (gap > bestGap) { bestGap = gap; best = i; }
    }
    let a = all[best] + bestGap / 2;
    if (a >= Math.PI) a -= 2 * Math.PI;
    out.push(a);
    all.push(a);
    all.sort((p, q) => p - q);
  }
  return out;
}

/**
 * Electric field lines for a set of point charges.
 * Lines start on positive charges and end on negative charges (or leave the picture).
 * Each returned line is a list of points ordered along the field direction.
 */
export function fieldLines(charges, bounds, perUnit = 12) {
  const wide = {
    x0: bounds.x0 - 12, x1: bounds.x1 + 12,
    y0: bounds.y0 - 12, y1: bounds.y1 + 12,
  };
  const lines = [];
  const arrivals = charges.map(() => []);

  charges.forEach((c) => {
    if (c.q <= 0) return;
    const n = Math.max(4, Math.round(perUnit * c.q));
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      const t = trace(charges, c.x + CAPTURE * Math.cos(a), c.y + CAPTURE * Math.sin(a), +1, wide);
      lines.push(t.pts);
      if (t.end >= 0) {
        const e = charges[t.end], p = t.pts[t.pts.length - 1];
        arrivals[t.end].push(Math.atan2(p[1] - e.y, p[0] - e.x));
      }
    }
  });

  charges.forEach((c, j) => {
    if (c.q >= 0) return;
    const need = Math.max(4, Math.round(perUnit * -c.q)) - arrivals[j].length;
    if (need <= 0) return;
    for (const a of fillGaps(arrivals[j], need)) {
      const t = trace(charges, c.x + CAPTURE * Math.cos(a), c.y + CAPTURE * Math.sin(a), -1, wide);
      lines.push(t.pts.reverse());
    }
  });
  return lines;
}

/** Format a field strength with two significant figures, e.g. 2.2 × 10⁴ N/C. */
export function formatField(e) {
  if (!isFinite(e) || e <= 0) return "0 N/C";
  const exp = Math.floor(Math.log10(e));
  const man = e / 10 ** exp;
  if (exp >= 0 && exp < 3) return `${Number(e.toPrecision(2))} N/C`;
  const sup = String(exp).replace(/[-0-9]/g, (d) => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(d)]);
  return `${man.toFixed(1)} × 10${sup} N/C`;
}

const COLORS = { pos: "#c0392b", neg: "#1f5fbf", ink: "#1a2030", line: "#3d4863", grid: "#eef0f4", probe: "#e8a200" };

function arrow(ctx, x0, y0, x1, y1, color, width = 2, head = 7) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
  ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill();
}

/**
 * An interactive picture of charges and their field.
 * options: widthCm, aspect (height / width), charges, probe {x,y} or null,
 *          showLines, showVectors, showParts (the field of each charge at the probe),
 *          draggable ("all" | "probe" | "none"), onChange(view)
 */
export class FieldView {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.widthCm = options.widthCm || 16;
    this.aspect = options.aspect || 0.6;
    this.charges = (options.charges || []).map((c) => ({ ...c }));
    this.probe = options.probe ? { ...options.probe } : null;
    this.showLines = !!options.showLines;
    this.showVectors = !!options.showVectors;
    this.showParts = !!options.showParts;
    this.draggable = options.draggable || "all";
    this.onChange = options.onChange || (() => {});
    this.selected = -1;
    this._lines = null;
    this._drag = null;

    canvas.addEventListener("pointerdown", (e) => this._down(e));
    canvas.addEventListener("pointermove", (e) => this._move(e));
    canvas.addEventListener("pointerup", (e) => this._up(e));
    canvas.addEventListener("pointercancel", (e) => this._up(e));
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  get heightCm() { return this.widthCm * this.aspect; }
  get bounds() { return { x0: -this.widthCm / 2, x1: this.widthCm / 2, y0: -this.heightCm / 2, y1: this.heightCm / 2 }; }

  resize() {
    const w = this.canvas.clientWidth || 600;
    const h = Math.round(w * this.aspect);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.height = h + "px";
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w; this.h = h; this.dpr = dpr;
    this.scale = w / this.widthCm; // pixels per centimetre
    this.draw();
  }

  toPx(x, y) { return [this.w / 2 + x * this.scale, this.h / 2 - y * this.scale]; }
  toCm(px, py) { return [(px - this.w / 2) / this.scale, (this.h / 2 - py) / this.scale]; }

  changed() { this._lines = null; this.draw(); this.onChange(this); }

  addCharge(q) {
    if (this.charges.length >= 4) return false;
    const spots = [[-3, 0], [3, 0], [0, 2.5], [0, -2.5]];
    const free = spots.find(([x, y]) => !this.charges.some((c) => Math.hypot(c.x - x, c.y - y) < 1));
    const [x, y] = free || [0, 0];
    this.charges.push({ x, y, q });
    this.selected = this.charges.length - 1;
    this.changed();
    return true;
  }

  removeSelected() {
    if (this.selected < 0) return;
    this.charges.splice(this.selected, 1);
    this.selected = -1;
    this.changed();
  }

  clear() { this.charges = []; this.selected = -1; this.changed(); }

  /** Field at the probe: [Ex, Ey, magnitude]. */
  probeField() {
    if (!this.probe) return [0, 0, 0];
    const [ex, ey] = fieldAt(this.charges, this.probe.x, this.probe.y);
    return [ex, ey, Math.hypot(ex, ey)];
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  _down(e) {
    if (this.draggable === "none") return;
    const [px, py] = this._pos(e);
    const near = (x, y, rad) => { const [cx, cy] = this.toPx(x, y); return Math.hypot(px - cx, py - cy) < rad; };
    if (this.probe && near(this.probe.x, this.probe.y, 26)) {
      this._drag = { what: "probe" };
    } else if (this.draggable === "all") {
      const i = this.charges.findIndex((c) => near(c.x, c.y, 24));
      this.selected = i;
      if (i >= 0) this._drag = { what: "charge", i };
      this.draw(); this.onChange(this);
    }
    if (!this._drag && this.probe) {
      // tapping empty space moves the sensor there
      const [x, y] = this.toCm(px, py);
      this.probe.x = x; this.probe.y = y;
      this._drag = { what: "probe" };
      this.draw(); this.onChange(this);
    }
    if (this._drag) { this.canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
  }

  _move(e) {
    if (!this._drag) return;
    const [px, py] = this._pos(e);
    let [x, y] = this.toCm(px, py);
    const b = this.bounds, pad = 0.4;
    x = Math.max(b.x0 + pad, Math.min(b.x1 - pad, x));
    y = Math.max(b.y0 + pad, Math.min(b.y1 - pad, y));
    if (this._drag.what === "probe") {
      this.probe.x = x; this.probe.y = y;
      this.draw(); this.onChange(this);
    } else {
      const c = this.charges[this._drag.i];
      c.x = x; c.y = y;
      this.changed();
    }
  }

  _up(e) {
    if (this._drag) { this._drag = null; this.onChange(this, true); }
  }

  draw() {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);

    // 1 cm grid
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(this.bounds.x0); x <= this.bounds.x1; x++) { const [px] = this.toPx(x, 0); ctx.moveTo(px, 0); ctx.lineTo(px, h); }
    for (let y = Math.ceil(this.bounds.y0); y <= this.bounds.y1; y++) { const [, py] = this.toPx(0, y); ctx.moveTo(0, py); ctx.lineTo(w, py); }
    ctx.stroke();

    if (this.showVectors && this.charges.length) this._drawVectors();
    if (this.showLines && this.charges.length) this._drawLines();
    if (this.overlay) this.overlay(this, ctx);
    this._drawCharges();
    if (this.probe) this._drawProbe();

    // scale bar
    const [sx, sy] = [14, h - 14];
    ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + this.scale, sy); ctx.stroke();
    ctx.fillStyle = COLORS.ink; ctx.font = "12px -apple-system, Arial, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("1 cm", sx, sy - 4);
  }

  _len(e) { return Math.min(90, 16 + 26 * Math.log10(1 + e / 500)); }

  _drawVectors() {
    const { ctx } = this;
    const b = this.bounds;
    for (let x = Math.ceil(b.x0) + 0.5; x < b.x1; x += 1) {
      for (let y = Math.ceil(b.y0) + 0.5; y < b.y1; y += 1) {
        if (this.charges.some((c) => Math.hypot(c.x - x, c.y - y) < 0.55)) continue;
        const [ex, ey] = fieldAt(this.charges, x, y);
        const m = Math.hypot(ex, ey); if (m < 1) continue;
        const L = Math.min(this.scale * 0.82, this._len(m) * 0.42);
        const [px, py] = this.toPx(x, y);
        const ux = ex / m, uy = -ey / m;
        const alpha = Math.max(0.18, Math.min(0.9, 0.2 + 0.25 * Math.log10(1 + m / 500)));
        arrow(ctx, px - (ux * L) / 2, py - (uy * L) / 2, px + (ux * L) / 2, py + (uy * L) / 2, `rgba(61,72,99,${alpha})`, 1.4, 5);
      }
    }
  }

  _drawLines() {
    const { ctx } = this;
    if (!this._lines) this._lines = fieldLines(this.charges, this.bounds);
    ctx.strokeStyle = COLORS.line; ctx.lineWidth = 1.5; ctx.lineJoin = "round";
    for (const pts of this._lines) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => { const [px, py] = this.toPx(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
      // one arrowhead, on the visible part of the line
      const vis = [];
      pts.forEach(([x, y], i) => { const [px, py] = this.toPx(x, y); if (px > 8 && px < this.w - 8 && py > 8 && py < this.h - 8) vis.push(i); });
      if (vis.length > 12) {
        const i = vis[Math.floor(vis.length * 0.5)];
        const [ax, ay] = this.toPx(...pts[Math.max(0, i - 3)]);
        const [bx, by] = this.toPx(...pts[i]);
        const a = Math.atan2(by - ay, bx - ax);
        ctx.fillStyle = COLORS.line;
        ctx.beginPath();
        ctx.moveTo(bx + 5 * Math.cos(a), by + 5 * Math.sin(a));
        ctx.lineTo(bx - 6 * Math.cos(a - 0.5), by - 6 * Math.sin(a - 0.5));
        ctx.lineTo(bx - 6 * Math.cos(a + 0.5), by - 6 * Math.sin(a + 0.5));
        ctx.closePath(); ctx.fill();
      }
    }
  }

  _drawCharges() {
    const { ctx } = this;
    this.charges.forEach((c, i) => {
      const [px, py] = this.toPx(c.x, c.y);
      const r = 13;
      if (i === this.selected && this.draggable === "all") {
        ctx.strokeStyle = COLORS.probe; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, r + 5, 0, 2 * Math.PI); ctx.stroke();
      }
      ctx.fillStyle = c.q > 0 ? COLORS.pos : COLORS.neg;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px + 6, py);
      if (c.q > 0) { ctx.moveTo(px, py - 6); ctx.lineTo(px, py + 6); }
      ctx.stroke();
    });
  }

  _drawProbe() {
    const { ctx } = this;
    const [px, py] = this.toPx(this.probe.x, this.probe.y);
    if (this.showParts) {
      for (const c of this.charges) {
        const [ex, ey] = fieldOf(c, this.probe.x, this.probe.y);
        const m = Math.hypot(ex, ey); if (m < 1) continue;
        const L = this._len(m);
        arrow(ctx, px, py, px + (ex / m) * L, py - (ey / m) * L, c.q > 0 ? COLORS.pos : COLORS.neg, 2.2, 8);
      }
    }
    const [ex, ey, m] = this.probeField();
    if (m >= 1) {
      const L = this._len(m);
      arrow(ctx, px, py, px + (ex / m) * L, py - (ey / m) * L, COLORS.ink, 3, 10);
    }
    ctx.fillStyle = "#fff"; ctx.strokeStyle = COLORS.probe; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  }
}
