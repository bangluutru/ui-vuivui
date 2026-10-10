// <vv-basket-shot> — ném một quả bóng vào rổ để "xác nhận" một việc (vd. trước khi in).
//
//   Giữ bóng và di chuyển tự do trong sân. Cú ném LUÔN hướng lên và về phía rổ, chỉ phụ thuộc
//   CHỖ BÓNG ĐỨNG (như một cầu thủ ném cùng một động tác): đứng ở khoảng cách hợp lý → vào rổ;
//   gần quá → quá đà; xa quá → hụt; ngay dưới rổ → đập đáy vành. Đường chấm vẽ từ quả bóng
//   (xanh = sẽ vào). Thả tay → ném từ đúng chỗ đó.
//   Bóng phải RƠI XUỐNG qua vành: lọt lưới → sự kiện `vv-score`; còn lại → ném lại.
//   Chạm nhẹ quả bóng hoặc nhấn Enter/Space → ném chuẩn, luôn vào (ai cũng dùng được).
//
// Sự kiện: `vv-score` { method: 'throw'|'tap'|'keyboard', shots }, `vv-miss` { result, shots }.
// Phương thức: reset().

import { playSound } from '../core/sound.js';
import { tween, ease, prefersReducedMotion } from '../core/motion.js';
import { positionAt, timeToReachY, resolveHoopShot, samplePath } from '../core/ballistics.js';
import { pickLabels } from '../core/i18n.js';
import { BALL_SVG, HOOP_BACK_SVG, HOOP_FRONT_SVG, RIM_CENTER } from '../basket-upload/art.js';
import { LABELS } from './labels.js';

const BALL = 34;
const R = BALL / 2;
const GRAVITY = 1300;    // px/s²
// Vùng ném vào: khoảng cách từ bóng tới tâm vành, theo bề ngang sân (tối thiểu 380px).
const ZONE_MIN = 0.27;
const ZONE_MAX = 0.62;
const SLOWMO = 0.75;
const RIM_HALF = 34 / 160; // nửa độ rộng lòng vành / bề ngang hình rổ

const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18 6.3a8 8 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

const STYLES = `
:host {
  --vv-accent: #f26a1b; --vv-ink: #2b1a10; --vv-muted: #8a6a55;
  --vv-court-1: #fffaf4; --vv-court-2: #fde9d6; --vv-line: #f3c7a3;
  --vv-ok: #16a34a; --vv-radius: 18px;
  --vv-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  display: block; max-width: 400px; color: var(--vv-ink); font-family: var(--vv-font);
  -webkit-tap-highlight-color: transparent;
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; }
.card { position: relative; isolation: isolate; overflow: hidden; border-radius: var(--vv-radius);
  background: radial-gradient(80% 50% at 50% 0%, #fff, transparent 70%), linear-gradient(180deg, var(--vv-court-1), var(--vv-court-2)); }
.head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 0; }
.title { margin: 0; font-size: 1.05rem; font-weight: 800; }
.sound { width: 32px; height: 32px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center; background: transparent; color: var(--vv-muted); }
.sound[aria-pressed="true"] { color: var(--vv-accent); background: rgba(242,106,27,.12); }
.sound svg { width: 18px; height: 18px; }
.court { position: relative; height: 330px; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  background: radial-gradient(circle at 50% 125%, transparent 0 120px, var(--vv-line) 121px 123px, transparent 124px); }
.hoop { position: relative; width: 140px; aspect-ratio: 160 / 130; margin: 6px auto 0; }
.hoop-back, .hoop-front { position: absolute; inset: 0; }
.hoop-back { z-index: 1; }
.hoop-front { z-index: 3; color: rgba(255,255,255,.95); filter: drop-shadow(0 0 1px rgba(120,50,10,.9)); }
.hoop svg { width: 100%; height: 100%; display: block; overflow: visible; }
.net { transform-box: fill-box; transform-origin: 50% 0; }
.net.swish { animation: vv-swish .55s ease-out; }
@keyframes vv-swish { 30% { transform: scale(.82, 1.3); } 60% { transform: scale(1.05, .92); } }
.hoop.clank { animation: vv-clank .45s ease-out; }
@keyframes vv-clank { 20% { transform: rotate(-4deg); } 45% { transform: rotate(3deg); } 70% { transform: rotate(-1.5deg); } }
.fx { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.fx svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.aim { fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: .1 9; }
.aim.good { stroke: var(--vv-ok); } .aim.bad { stroke: rgba(43,26,16,.35); }
.ball { position: absolute; left: 0; top: 0; z-index: 2; width: ${BALL}px; height: ${BALL}px; padding: 0; border: 0; border-radius: 50%;
  background: transparent; cursor: grab; touch-action: none; will-change: transform; filter: drop-shadow(0 6px 6px rgba(90,30,0,.3)); }
.ball:active { cursor: grabbing; }
.ball svg { width: 100%; height: 100%; display: block; pointer-events: none; }
.ball:focus-visible { outline: 3px solid #2b6cff; outline-offset: 3px; }
.status { min-height: 2.8em; margin: 0; padding: 4px 14px 12px; text-align: center; font-size: .86rem; color: var(--vv-muted); }
.card[data-state="score"] .status { color: var(--vv-ok); font-weight: 700; font-size: 1rem; }
.card[data-state="miss"] .status { color: var(--vv-accent); font-weight: 600; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

const template = document.createElement('template');
template.innerHTML = `
<style>${STYLES}</style>
<div class="card" part="card" data-state="idle">
  <div class="head"><h3 class="title"></h3><button class="sound" type="button"></button></div>
  <div class="court">
    <div class="hoop"><div class="hoop-back">${HOOP_BACK_SVG}</div><div class="hoop-front">${HOOP_FRONT_SVG}</div></div>
    <div class="fx" aria-hidden="true"><svg><path class="aim"/></svg></div>
    <button class="ball" type="button">${BALL_SVG}</button>
  </div>
  <p class="status" aria-live="polite"></p>
</div>`;

export class VvBasketShot extends HTMLElement {
  static get observedAttributes() { return ['lang', 'sound', 'disabled']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.appendChild(template.content.cloneNode(true));
    const $ = (s) => root.querySelector(s);
    this._el = { card: $('.card'), title: $('.title'), sound: $('.sound'), court: $('.court'), hoop: $('.hoop'), net: $('.net'), aim: $('.aim'), ball: $('.ball'), status: $('.status') };
    this._labelsOverride = {};
    this._busy = false;
    this._scored = false;
    this._shots = 0;
    this._gesture = null;
    this._home = null;
    this._wire();
  }

  get labels() { return this._labels; }
  set labels(obj) { this._labelsOverride = obj || {}; this._render(); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }
  get scored() { return this._scored; }

  /** Đặt lại bóng ở vị trí mới, cho ném lại. */
  reset() {
    this._cancelGesture();
    this._busy = false;
    this._scored = false;
    this._shots = 0;
    this._home = null;
    this._setState('idle', '');
    this._placeHome(true);
  }

  connectedCallback() {
    this._render();
    this._placeHome(true); // đặt ngay nếu sân đã có kích thước (tab nền: khung hình kế tiếp có thể rất lâu mới tới)
    requestAnimationFrame(() => { if (!this._pos) this._placeHome(true); });
    if (!this._ro && typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => { if (!this._busy && !this._gesture) this._placeHome(false); });
      this._ro.observe(this._el.court);
    }
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    this._ro = null;
    this._cancelGesture();
  }

  attributeChangedCallback() { this._render(); }

  get _labels() { return pickLabels(LABELS, this, this._labelsOverride); }
  _sfx(n) { if (this.hasAttribute('sound')) playSound(n); }
  _fire(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true })); }

  _render() {
    const L = this._labels;
    const e = this._el;
    e.title.textContent = L.title;
    e.ball.setAttribute('aria-label', L.ball);
    e.ball.disabled = this.disabled;
    if (e.card.dataset.state === 'idle') e.status.textContent = L.hint;
    const on = this.hasAttribute('sound');
    e.sound.setAttribute('aria-pressed', String(on));
    e.sound.setAttribute('aria-label', on ? L.soundOff : L.soundOn);
    e.sound.innerHTML = on ? ICON_ON : ICON_OFF;
  }

  _setState(s, text) {
    this._el.card.dataset.state = s;
    this._el.status.textContent = s === 'idle' ? this._labels.hint : text;
  }

  // ---------- Hình học ----------

  _rim() {
    const c = this._el.court.getBoundingClientRect();
    const h = this._el.hoop.getBoundingClientRect();
    return { x: h.left - c.left + h.width * RIM_CENTER.x, y: h.top - c.top + h.height * RIM_CENTER.y, half: h.width * RIM_HALF };
  }

  _toCourt(cx, cy) {
    const c = this._el.court.getBoundingClientRect();
    return { x: cx - c.left, y: cy - c.top };
  }

  _placeHome(randomize) {
    const court = this._el.court;
    const W = court.clientWidth;
    const H = court.clientHeight;
    if (!W) return;
    if (randomize || !this._home) {
      // Chỗ đứng ban đầu: lệch sang trái hoặc phải rổ (không bao giờ ngay dưới rổ → chạm nhẹ luôn vào).
      const off = Math.min(W / 2 - R - 6, 85 + Math.random() * 45); // ≥ 85px khỏi tâm rổ theo chiều ngang
      const x = W / 2 + (Math.random() < 0.5 ? -off : off);
      this._home = { fx: x / W, y: H - R - 18 };
    }
    this._place({ x: this._home.fx * W, y: this._home.y });
    this._el.ball.style.opacity = '1';
  }

  _homePoint() {
    // Có thể bị gọi trước khi sân có kích thước (vd. đang ẩn) → đặt lại vị trí, vẫn trả về điểm hợp lệ.
    if (!this._home) this._placeHome(true);
    const W = this._el.court.clientWidth || 300;
    const home = this._home || { fx: 0.5, y: (this._el.court.clientHeight || 290) - R - 18 };
    return { x: home.fx * W, y: home.y };
  }

  _place(p, rot = 0, scale = 1) {
    this._pos = p;
    this._el.ball.style.transform = `translate(${p.x - R}px, ${p.y - R}px) rotate(${rot}deg) scale(${scale})`;
  }

  _bounds() {
    const c = this._el.court;
    return { left: -60, right: c.clientWidth + 60, top: -400, bottom: c.clientHeight + 60 };
  }


  /**
   * Cú ném từ vị trí `start`: cùng một động tác (cung chuẩn vào tâm vành) nhưng lực lệch theo
   * khoảng cách — gần hơn vùng hợp lý thì mạnh quá (quá đà), xa hơn thì yếu (hụt).
   * @returns {{ vel: {vx,vy}, zone: 'ok'|'close'|'far' }}
   */
  _aimVelocity(start, rim) {
    // Sân hẹp (điện thoại) vẫn cao như sân rộng → tính vùng theo bề ngang nhưng không nhỏ hơn 380px.
    const W = Math.max(380, this._el.court.clientWidth || 0);
    const d = Math.hypot(rim.x - start.x, rim.y - start.y);
    const lo = W * ZONE_MIN;
    const hi = W * ZONE_MAX;
    // Điểm rơi lệch khỏi tâm vành: 0 trong vùng hợp lý; ra ngoài thì lệch ≥ 28px (chạm vành)
    // và lệch thêm khi càng xa vùng (trượt hẳn). Gần quá → rơi QUÁ ra sau vành; xa quá → rơi TRƯỚC vành.
    let err = 0;
    let zone = 'ok';
    if (d < lo) { err = 28 + 140 * (lo - d) / lo; zone = 'close'; }
    else if (d > hi) { err = -(28 + 200 * Math.min(1, (d - hi) / hi)); zone = 'far'; }
    const away = start.x <= rim.x ? 1 : -1; // hướng từ chỗ đứng đi qua rổ
    return { vel: this._perfectVelocity(start, rim, rim.x + away * err), zone };
  }

  /** Cú ném chuẩn: đỉnh cung cao hơn vành ~80px, rơi xuống ở x = tx (mặc định tâm vành). */
  _perfectVelocity(start, rim, tx = rim.x) {
    const apexY = Math.min(rim.y - 80, start.y - 60);
    const vy = -Math.sqrt(2 * GRAVITY * (start.y - apexY));
    const t = timeToReachY(start, { vx: 0, vy }, GRAVITY, rim.y, { descending: true });
    return { vx: (tx - start.x) / t, vy };
  }

  // ---------- Kéo – thả ----------

  _wire() {
    const e = this._el;
    e.sound.addEventListener('click', () => {
      this.toggleAttribute('sound', !this.hasAttribute('sound'));
      if (this.hasAttribute('sound')) playSound('swish');
    });
    e.ball.addEventListener('pointerdown', (ev) => this._onDown(ev));
    e.ball.addEventListener('click', (ev) => { if (ev.detail === 0) this._shoot(this._perfectVelocity(this._homePoint(), this._rim()), 'keyboard'); });
    e.ball.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  _onDown(ev) {
    if (this._busy || this._scored || this.disabled) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ev.preventDefault();
    if (this._gesture) this._cancelGesture();
    try { this._el.ball.setPointerCapture(ev.pointerId); } catch { /* sự kiện giả lập */ }
    const home = this._homePoint();
    this._place(home); // chắc chắn bóng đang ở đúng chỗ trước khi kéo
    const p0 = this._toCourt(ev.clientX, ev.clientY);
    // grab: chỗ ngón tay so với tâm bóng → bóng không "nhảy" về dưới ngón tay
    const g = { id: ev.pointerId, start: p0, grab: { x: p0.x - home.x, y: p0.y - home.y }, origin: home, cur: home, dx: 0, dy: 0, moved: false, ended: false };
    this._gesture = g;
    g.onMove = (e2) => {
      if (e2.pointerId !== g.id) return;
      if (e2.pointerType === 'mouse' && e2.buttons === 0) { this._cancelGesture(); return; }
      const p = this._toCourt(e2.clientX, e2.clientY);
      if (Math.hypot(p.x - g.start.x, p.y - g.start.y) > 8) g.moved = true;
      if (!g.moved) return;
      g.cur = this._clampBall({ x: p.x - g.grab.x, y: p.y - g.grab.y });
      g.dx = g.cur.x - g.origin.x;
      this._place(g.cur, g.dx / 4);
      this._drawAim(g);
    };
    g.onUp = (e2) => { if (e2.pointerId === g.id) this._release(g); };
    g.onCancel = (e2) => { if (e2.pointerId === g.id) this._cancelGesture(); };
    g.onLost = () => setTimeout(() => { if (this._gesture === g) this._cancelGesture(); }, 0);
    window.addEventListener('pointermove', g.onMove);
    window.addEventListener('pointerup', g.onUp);
    window.addEventListener('pointercancel', g.onCancel);
    this._el.ball.addEventListener('lostpointercapture', g.onLost);
  }

  _endGesture(g) {
    g.ended = true;
    window.removeEventListener('pointermove', g.onMove);
    window.removeEventListener('pointerup', g.onUp);
    window.removeEventListener('pointercancel', g.onCancel);
    this._el.ball.removeEventListener('lostpointercapture', g.onLost);
    if (this._gesture === g) this._gesture = null;
    this._el.aim.setAttribute('d', '');
  }

  _cancelGesture() {
    const g = this._gesture;
    if (!g || g.ended) return;
    this._endGesture(g);
    this._returnHome(g.cur);
  }

  /** Bóng chỉ được kéo trong sân, và không lên cao quá gần vành (không "đặt" bóng vào rổ được). */
  _clampBall(p) {
    const c = this._el.court;
    const rim = this._rim();
    const W = c.clientWidth;
    const H = c.clientHeight;
    return {
      x: Math.max(R + 2, Math.min(W - R - 2, p.x)),
      y: Math.max(Math.min(rim.y + 45, H - R - 2), Math.min(H - R - 2, p.y)),
    };
  }

  _returnHome(from) {
    const to = this._homePoint();
    if (!from || (from.x === to.x && from.y === to.y)) { this._place(to); return; }
    tween({ duration: 220, easing: ease.outQuad, onUpdate: (k) => this._place({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }) });
  }

  _drawAim(g) {
    const start = g.cur;
    const rim = this._rim();
    const aim = this._el.aim;
    if (!g.moved) { aim.setAttribute('d', ''); return; }
    const { vel, zone } = this._aimVelocity(start, rim);
    const res = resolveHoopShot(start, vel, GRAVITY, rim, R);
    const pts = samplePath(start, vel, GRAVITY, { tUntil: res.t ?? 1.6, bounds: this._bounds() });
    aim.setAttribute('d', pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' '));
    aim.setAttribute('class', `aim ${res.result === 'swish' ? 'good' : 'bad'}`);
    this._el.status.textContent = this._advice(res.result, zone);
  }

  /** Lời khuyên theo kết quả dự đoán và vị trí. */
  _advice(result, zone) {
    const L = this._labels;
    if (result === 'swish') return L.aimGood;
    if (result === 'block') return L.under;
    if (zone === 'close') return L.tooClose;
    if (zone === 'far') return L.tooFar;
    return L.aim;
  }

  _release(g) {
    if (g.ended) return;
    this._endGesture(g);
    const rim = this._rim();
    // Không kéo = chạm nhẹ → ném chuẩn từ chỗ bóng đang nằm.
    if (!g.moved) { this._shoot(this._perfectVelocity(g.origin, rim), 'tap'); return; }
    this._shoot(this._aimVelocity(g.cur, rim).vel, 'throw', g.cur);
  }

  // ---------- Bay ----------

  async _shoot(vel, method, from) {
    if (this._busy || this._scored || this.disabled) return;
    this._busy = true;
    this._shots++;
    const start = from || this._homePoint();
    const rim = this._rim();
    const res = resolveHoopShot(start, vel, GRAVITY, rim, R);
    this._sfx('whoosh');
    const fly = (tEnd, fade = false) => tween({
      duration: (tEnd * 1000) / SLOWMO,
      onUpdate: (k) => {
        const p = positionAt(start, vel, GRAVITY, k * tEnd);
        this._place(p, k * 400, 1 - 0.18 * Math.min(1, k * 1.4));
        if (fade) this._el.ball.style.opacity = String(k > 0.7 ? (1 - k) / 0.3 : 1);
      },
    });

    if (res.result === 'swish') {
      await fly(res.t);
      const net = this._el.net;
      net.classList.remove('swish'); void net.getBoundingClientRect(); net.classList.add('swish');
      this._sfx('swish');
      const from = this._pos;
      await tween({ duration: 380, easing: ease.inQuad, onUpdate: (k) => { this._place({ x: from.x + (rim.x - from.x) * k, y: from.y + 70 * k }, 380, 0.82); this._el.ball.style.opacity = String(k > 0.6 ? (1 - k) / 0.4 : 1); } });
      this._sfx('score');
      this._scored = true;
      this._setState('score', this._labels.swish);
      this._fire('vv-score', { method, shots: this._shots });
      this._busy = false;
      return;
    }

    if (res.result === 'rim' || res.result === 'block') {
      await fly(res.t);
      const hoop = this._el.hoop;
      hoop.classList.remove('clank'); void hoop.getBoundingClientRect(); hoop.classList.add('clank');
      this._sfx('rim');
      const from = this._pos;
      const side = from.x >= rim.x ? 1 : -1;
      const v2 = res.result === 'block' ? { vx: side * 120, vy: 120 } : { vx: side * 220, vy: -320 };
      const tOut = 0.8;
      await tween({ duration: tOut * 1000 / SLOWMO, onUpdate: (k) => { const p = positionAt(from, v2, GRAVITY, k * tOut); this._place(p, -k * 300, 0.82); this._el.ball.style.opacity = String(k > 0.7 ? (1 - k) / 0.3 : 1); } });
      this._sfx('bounce');
      this._missed(res.result, res.result === 'block' ? this._labels.under : this._labels.rim);
      return;
    }

    // Trượt hẳn / không tới: bay tiếp cho tới khi ra khỏi sân.
    const pts = samplePath(start, vel, GRAVITY, { tUntil: 2.2, bounds: this._bounds() });
    await fly(Math.max(0.3, pts.length / 60), true);
    this._missed(res.result, res.result === 'short' ? this._labels.short : this._labels.miss);
  }

  _missed(result, text) {
    this._setState('miss', text);
    this._fire('vv-miss', { result, shots: this._shots });
    this._busy = false;
    this._placeHome(true);
    if (!prefersReducedMotion()) {
      const b = this._el.ball;
      b.style.opacity = '0';
      tween({ duration: 250, onUpdate: (k) => { b.style.opacity = String(k); } });
    }
  }
}

if (!customElements.get('vv-basket-shot')) {
  customElements.define('vv-basket-shot', VvBasketShot);
}
