// learn.phylab.uk — a small drawing board for questions answered by dragging arrows and objects.
// Coordinates are in board units, x to the right and y upward; the board is `w` units wide and `h` high.

export const INK = "#1a2030", SOFT = "#8a93a6", POS = "#c0392b", NEG = "#1f5fbf";
export const MINE = "#d98200";   // what the student draws
export const RIGHT = "#0d6b5f";  // the correct answer, shown only in a review

export function arrow(ctx, x0, y0, x1, y1, color, width = 3, dash = null) {
  const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
  const head = Math.min(13, Math.max(6, len * 0.45));
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - head * 0.6 * Math.cos(a), y1 - head * 0.6 * Math.sin(a)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a - 0.42), y1 - head * Math.sin(a - 0.42));
  ctx.lineTo(x1 - head * Math.cos(a + 0.42), y1 - head * Math.sin(a + 0.42));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Text in the style of a printed symbol. parts: [{t:"A", vec:true}, {t:" + "}, ...] */
export function symbol(ctx, parts, x, y, color = INK, size = 18) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  const font = (p) => `${p.plain ? "" : "italic "}${size}px Georgia, "Times New Roman", serif`;
  let total = 0;
  for (const p of parts) { ctx.font = font(p); total += ctx.measureText(p.t).width; }
  let cx = x - total / 2;
  for (const p of parts) {
    ctx.font = font(p);
    const w = ctx.measureText(p.t).width;
    ctx.fillText(p.t, cx, y);
    if (p.vec) { // a small arrow over the letter
      const ay = y - size * 0.86;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx, ay); ctx.lineTo(cx + w + 1, ay);
      ctx.moveTo(cx + w - 3, ay - 2.5); ctx.lineTo(cx + w + 1, ay); ctx.lineTo(cx + w - 3, ay + 2.5); ctx.stroke();
    }
    cx += w;
  }
  ctx.restore();
}

export function charge(ctx, px, py, sign, r = 14) {
  ctx.save();
  ctx.fillStyle = sign > 0 ? POS : NEG;
  ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(px - r * 0.45, py); ctx.lineTo(px + r * 0.45, py);
  if (sign > 0) { ctx.moveTo(px, py - r * 0.45); ctx.lineTo(px, py + r * 0.45); }
  ctx.stroke();
  ctx.restore();
}

export class Board {
  /** options: w, h (board units), grid (draw unit grid), paint(board, ctx), onChange(board) */
  constructor(canvas, options = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.wU = options.w || 12; this.hU = options.h || 7;
    this.grid = options.grid !== false;
    this.paint = options.paint || (() => {});
    this.onChange = options.onChange || (() => {});
    this.handles = []; this.locked = false; this._drag = null;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (e) => this._down(e));
    canvas.addEventListener("pointermove", (e) => this._move(e));
    canvas.addEventListener("pointerup", () => this._up());
    canvas.addEventListener("pointercancel", () => this._up());
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  /** A draggable point. spec: x, y, snap (grid step or 0), limit(x, y) -> [x, y], show (draw the grip) */
  addHandle(spec) {
    const h = { snap: 0, show: true, touched: false, limit: (x, y) => [x, y], ...spec };
    this.handles.push(h);
    return h;
  }

  resize() {
    const w = this.canvas.clientWidth || 640, dpr = window.devicePixelRatio || 1;
    const h = Math.round((w * this.hU) / this.wU);
    this.canvas.style.height = h + "px";
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.w = w; this.h = h; this.dpr = dpr; this.scale = w / this.wU;
    this.draw();
  }

  px(x, y) { return [x * this.scale, this.h - y * this.scale]; }
  units(px, py) { return [px / this.scale, (this.h - py) / this.scale]; }

  _point(e) { const r = this.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  _down(e) {
    if (this.locked) return;
    const [mx, my] = this._point(e);
    let best = null, bestD = e.pointerType === "touch" ? 46 : 34; // a finger needs a larger target than a mouse
    for (const h of this.handles) {
      const [hx, hy] = this.px(h.x, h.y);
      const d = Math.hypot(mx - hx, my - hy);
      if (d < bestD) { bestD = d; best = h; }
    }
    this._off = [0, 0];
    if (!best) { // a handle may also be grabbed anywhere on its shape (e.g. the whole platypus), keeping the grab point
      const [ux, uy] = this.units(mx, my);
      best = this.handles.find((h) => h.hit && h.hit(ux, uy)) || null;
      if (best) this._off = [best.x - ux, best.y - uy];
    }
    if (!best) return;
    this._drag = best; best.touched = true;
    this.canvas.setPointerCapture(e.pointerId); e.preventDefault();
    this.draw(); this.onChange(this);
  }

  _move(e) {
    const h = this._drag; if (!h) return;
    let [x, y] = this.units(...this._point(e));
    if (this._off) { x += this._off[0]; y += this._off[1]; }
    if (h.snap) { x = Math.round(x / h.snap) * h.snap; y = Math.round(y / h.snap) * h.snap; }
    x = Math.max(0.25, Math.min(this.wU - 0.25, x));
    y = Math.max(0.25, Math.min(this.hU - 0.25, y));
    [h.x, h.y] = h.limit(x, y);
    this.draw(); this.onChange(this);
  }

  _up() { if (this._drag) { this._drag = null; this.draw(); this.onChange(this, true); } }

  draw() {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    if (this.grid) {
      ctx.strokeStyle = "#e9ecf1"; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= this.wU; x++) { ctx.moveTo(x * this.scale, 0); ctx.lineTo(x * this.scale, h); }
      for (let y = 0; y <= this.hU; y++) { ctx.moveTo(0, h - y * this.scale); ctx.lineTo(w, h - y * this.scale); }
      ctx.stroke();
    }
    this.paint(this, ctx);
    if (!this.locked) {
      for (const hd of this.handles) {
        if (!hd.show) continue;
        const [x, y] = this.px(hd.x, hd.y);
        ctx.fillStyle = "rgba(217,130,0,0.16)"; ctx.strokeStyle = MINE; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, hd === this._drag ? 17 : 13, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      }
    }
  }
}
