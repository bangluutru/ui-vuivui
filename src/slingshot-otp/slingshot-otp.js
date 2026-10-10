// <vv-slingshot-otp> — nhập mã OTP bằng cách bắn ná cao su.
//
//   Giữ một số → số nạp vào túi ná · kéo để căng dây và nhắm (đường chấm xanh = sẽ trúng ô)
//   Thả tay    → bắn; trúng ô nào thì điền ô đó (bắn đè để sửa) · trượt thì số quay về
//   Chạm nhẹ một số / gõ phím / dán / tự điền từ SMS → tự bắn vào ô đang chờ
//   Đủ số      → gọi verifier(code) MỘT lần cho cả mã
//
// Bảo mật: element KHÔNG biết mã đúng và không báo đúng/sai từng chữ số.
// Chỉ máy chủ kiểm tra, qua thuộc tính `verifier`. Thiếu verifier → báo lỗi, không bao giờ "thành công".

import { playSound } from '../core/sound.js';
import { tween, ease, wait, quadPoint, arcControl } from '../core/motion.js';
import { clampPull, launchVelocity, positionAt, resolveShot, samplePath } from '../core/ballistics.js';
import { normalizeVerdict } from '../core/verifier.js';
import { fmt, pickLabels } from '../core/i18n.js';
import { LABELS } from './labels.js';
import { STYLES } from './styles.js';
import { SLING_SVG, SLING_POINTS, ICONS } from './art.js';

const MAX_PULL = 95;   // px kéo dây tối đa
const GRAVITY = 1100;  // px/s²
const SLOWMO = 0.6;    // hoạt cảnh chạy chậm hơn mô phỏng cho dễ nhìn
const PROJ = 30;       // đường kính viên đạn (khớp CSS .proj)
const TAP_MS = 350;
const TAP_MOVE = 8;

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const template = document.createElement('template');
template.innerHTML = `
<style>${STYLES}</style>
<div class="card" part="card">
  <section class="panel" part="panel">
    <div class="top"><p class="kicker"></p><button class="sound" type="button" part="sound-button"></button></div>
    <h2 class="title"></h2>
    <p class="intro"></p>
    <div class="boxes" part="boxes">
      <input class="otp-input" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" enterkeyhint="done">
    </div>
    <div class="actions">
      <button class="submit" type="button" part="submit" disabled></button>
      <button class="erase" type="button" hidden>${ICONS.backspace}<span></span></button>
    </div>
    <p class="msg" aria-hidden="true"></p>
  </section>
  <div class="field" part="field">
    <div class="sling">${SLING_SVG}</div>
    <div class="chips" part="digits"></div>
    <p class="hint"></p>
  </div>
  <div class="fx" aria-hidden="true">
    <svg><path class="aim"/><path class="band band-l"/><path class="band band-r"/><path class="pouch"/></svg>
  </div>
  <div class="done" part="success" hidden>
    <div class="dialog" role="dialog" aria-modal="false" aria-labelledby="vv-done-title">
      <div class="badge">${ICONS.check}</div>
      <h3 id="vv-done-title"></h3>
      <p class="done-body"></p>
      <button class="continue" type="button" part="continue"></button>
    </div>
  </div>
  <div class="sr" aria-live="polite"></div>
</div>`;

export class VvSlingshotOtp extends HTMLElement {
  static get observedAttributes() {
    return ['length', 'name', 'lang', 'sound', 'disabled'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    const $ = (s) => root.querySelector(s);
    this._el = {
      card: $('.card'), kicker: $('.kicker'), sound: $('.sound'), title: $('.title'), intro: $('.intro'),
      boxes: $('.boxes'), input: $('.otp-input'), submit: $('.submit'), erase: $('.erase'), eraseText: $('.erase span'),
      msg: $('.msg'), field: $('.field'), sling: $('.sling'), chips: $('.chips'), hint: $('.hint'),
      fx: $('.fx'), aim: $('.aim'), bandL: $('.band-l'), bandR: $('.band-r'), pouch: $('.pouch'),
      done: $('.done'), doneTitle: $('.done h3'), doneBody: $('.done-body'), cont: $('.continue'), sr: $('.sr'),
    };
    this._verifier = null;
    this._labelsOverride = {};
    this._len = 6;
    this._code = [];
    this._incoming = new Set();
    this._active = 0;
    this._inFlight = 0;
    this._busy = false;
    this._done = false;
    this._gesture = null;
    this._message = null;
    this._boxEls = [];
    this._epoch = 0;
    this._buildChips();
    this._wire();
  }

  // ---------- API công khai ----------

  /** (code: string) => Promise<boolean | {ok, message?}>. Ném lỗi = lỗi mạng (giữ mã để thử lại). */
  get verifier() { return this._verifier; }
  set verifier(fn) { this._verifier = typeof fn === 'function' ? fn : null; }

  get labels() { return this._labels; }
  set labels(obj) { this._labelsOverride = obj || {}; this._renderTexts(); }

  /** Mã hiện tại (chuỗi, ô trống bị bỏ qua). */
  get value() { return this._code.map((d) => d ?? '').join(''); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  /** Xóa hết, đóng màn hình thành công, cho nhập lại. */
  reset() {
    if (this._gesture) this._cancel(this._gesture);
    this._epoch++; // các viên đạn còn đang bay sẽ không ghi số vào ô nữa
    this._done = false;
    this._busy = false;
    this._el.done.hidden = true;
    this._clearCode();
    this._setMessage(null);
    this._render();
  }

  focus() { this._el.input.focus(); }

  // ---------- Vòng đời ----------

  connectedCallback() {
    this._applyLength();
    this._renderTexts();
    this._drawBands(this._rest());
    if (!this._ro && typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => { if (!this._gesture) this._drawBands(this._rest()); });
      this._ro.observe(this._el.card);
    }
    // Không tự focus trên máy cảm ứng: bàn phím ảo sẽ che mất cái ná.
    if (this.hasAttribute('autofocus') && !matchMedia('(pointer: coarse)').matches) {
      requestAnimationFrame(() => this._el.input.focus());
    }
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    this._ro = null;
    this._endGestureListeners();
  }

  attributeChangedCallback(name) {
    if (!this.isConnected) return;
    if (name === 'length') this._applyLength();
    this._renderTexts();
  }

  get _labels() { return pickLabels(LABELS, this, this._labelsOverride); }
  get _soundOn() { return this.hasAttribute('sound'); }
  get _locked() { return this._busy || this._done || this.disabled; }

  _sfx(name) { if (this._soundOn) playSound(name); }

  _fire(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  _announce(text) {
    this._el.sr.textContent = '';
    setTimeout(() => { this._el.sr.textContent = text; }, 30);
  }

  // ---------- Dựng DOM ----------

  _buildChips() {
    const wrap = this._el.chips;
    for (let d = 0; d <= 9; d++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = String(d);
      b.dataset.d = String(d);
      b.addEventListener('pointerdown', (e) => this._onChipDown(e, d, b));
      // Bàn phím (Enter/Space) tạo click không có pointerdown: bắn tự động.
      b.addEventListener('click', (e) => { if (e.detail === 0) this._typeDigit(d); });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      wrap.append(b);
    }
  }

  _applyLength() {
    const n = Math.max(4, Math.min(8, parseInt(this.getAttribute('length'), 10) || 6));
    if (n === this._len && this._boxEls.length === n) return;
    this._len = n;
    for (const el of this._boxEls) el.remove();
    this._boxEls = [];
    const input = this._el.input;
    for (let i = 0; i < n; i++) {
      const box = document.createElement('div');
      box.className = 'box';
      box.setAttribute('aria-hidden', 'true');
      this._el.boxes.insertBefore(box, input);
      this._boxEls.push(box);
    }
    input.maxLength = n;
    this._clearCode();
    this._render();
  }

  _clearCode() {
    this._code = Array(this._len).fill(null);
    this._incoming.clear();
    this._active = 0;
  }

  _wire() {
    const { input, submit, erase, sound, cont } = this._el;

    sound.addEventListener('click', () => {
      this.toggleAttribute('sound', !this._soundOn);
      if (this._soundOn) playSound('thunk');
    });

    // Ô nhập luôn được làm rỗng sau mỗi lần gõ; ta đọc số rồi "bắn".
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      input.value = '';
      if (!digits || this._locked) return;
      // Đủ cả mã (dán / tự điền từ SMS) → thay toàn bộ; ít hơn → điền tiếp từ ô đang chờ.
      if (digits.length >= this._len) this._fillAll(digits);
      else for (const ch of digits) this._typeDigit(+ch);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        this._backspace();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.key === 'ArrowLeft' ? -1 : 1;
        const base = this._active < 0 ? this._len - 1 : this._active;
        this._active = Math.max(0, Math.min(this._len - 1, base + step));
        this._render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._submit();
      }
    });
    // Bấm vào ô nào thì chọn ô đó làm ô đang chờ.
    input.addEventListener('pointerdown', (e) => {
      if (this._locked) return;
      const i = this._boxAt(e.clientX);
      if (i >= 0) {
        this._active = i;
        this._render();
      }
    });
    input.addEventListener('focus', () => this._render());
    input.addEventListener('blur', () => this._render());

    submit.addEventListener('click', () => this._submit());
    erase.addEventListener('click', () => this._backspace());
    cont.addEventListener('click', () => this._fire('vv-continue', { code: this.value }));
  }

  // ---------- Tọa độ ----------

  _toCard(cx, cy) {
    const r = this._el.card.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  }

  _slingPoint(frac) {
    const c = this._el.card.getBoundingClientRect();
    const s = this._el.sling.getBoundingClientRect();
    return { x: s.left - c.left + s.width * frac.x, y: s.top - c.top + s.height * frac.y };
  }

  _rest() { return this._slingPoint(SLING_POINTS.rest); }

  _boxRects() {
    const c = this._el.card.getBoundingClientRect();
    return this._boxEls.map((b) => {
      const r = b.getBoundingClientRect();
      const left = r.left - c.left;
      const top = r.top - c.top;
      return { left, right: left + r.width, top, bottom: top + r.height, cx: left + r.width / 2, cy: top + r.height / 2 };
    });
  }

  _boxAt(clientX) {
    const x = this._toCard(clientX, 0).x;
    const rects = this._boxRects();
    let best = -1;
    let dist = Infinity;
    rects.forEach((r, i) => {
      const d = Math.abs(r.cx - x);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }

  _bounds() {
    const c = this._el.card;
    return { left: -40, right: c.clientWidth + 40, top: -60, bottom: c.clientHeight + 40 };
  }

  /** Tốc độ tối đa để kéo ~70% là bắn thẳng tới hàng ô. */
  _maxSpeed(start, rowY) {
    const h = Math.max(120, start.y - rowY);
    return Math.sqrt(2 * GRAVITY * h * 2.1);
  }

  // ---------- Vẽ ná ----------

  _drawBands(p) {
    const L = this._slingPoint(SLING_POINTS.tipL);
    const R = this._slingPoint(SLING_POINTS.tipR);
    const { bandL, bandR, pouch } = this._el;
    bandL.setAttribute('d', `M${L.x} ${L.y} L${p.x} ${p.y}`);
    bandR.setAttribute('d', `M${R.x} ${R.y} L${p.x} ${p.y}`);
    pouch.setAttribute('d', `M${p.x - 10} ${p.y + 2} Q${p.x} ${p.y + 13} ${p.x + 10} ${p.y + 2}`);
  }

  _springBack(from) {
    const rest = this._rest();
    return tween({
      duration: 280,
      easing: ease.outBack,
      onUpdate: (e) => this._drawBands(lerp(from, rest, e)),
    });
  }

  _makeProj(d, at) {
    const el = document.createElement('div');
    el.className = 'proj';
    el.textContent = String(d);
    this._el.fx.append(el);
    this._place(el, at);
    return el;
  }

  _place(el, p, rot = 0, scale = 1) {
    el.style.transform = `translate(${p.x - PROJ / 2}px, ${p.y - PROJ / 2}px) rotate(${rot}deg) scale(${scale})`;
  }

  _clearAim() {
    this._el.aim.setAttribute('d', '');
    this._boxEls.forEach((b) => b.classList.remove('target'));
  }

  // ---------- Kéo – thả ná ----------

  _onChipDown(e, d, chip) {
    if (this._locked) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Lần kéo trước bị kẹt (mất sự kiện nhả tay): trả số về chỗ cũ rồi nhận lần bấm mới.
    if (this._gesture) this._cancel(this._gesture);
    e.preventDefault();
    try { chip.setPointerCapture(e.pointerId); } catch { /* sự kiện giả lập: bỏ qua */ }

    const start = this._toCard(e.clientX, e.clientY);
    const cr = chip.getBoundingClientRect();
    const from = this._toCard(cr.left + cr.width / 2, cr.top + cr.height / 2);
    const g = {
      d, chip, pointerId: e.pointerId, start, pos: start,
      t0: performance.now(), moved: false, loaded: false, stretched: false,
      pull: { dx: 0, dy: 0, len: 0, power: 0 },
      from,
    };
    this._gesture = g;
    chip.classList.add('loaded');
    g.proj = this._makeProj(d, from);

    g.onMove = (ev) => {
      if (ev.pointerId !== g.pointerId) return;
      // Chuột đã nhả mà không có pointerup (vd. nhả ngoài cửa sổ): hủy, không bắn.
      if (ev.pointerType === 'mouse' && ev.buttons === 0) { this._cancel(g); return; }
      g.pos = this._toCard(ev.clientX, ev.clientY);
      if (Math.hypot(g.pos.x - g.start.x, g.pos.y - g.start.y) > TAP_MOVE) g.moved = true;
      if (g.loaded) this._updatePull(g);
    };
    g.onUp = (ev) => { if (ev.pointerId === g.pointerId) this._release(g); };
    g.onCancel = (ev) => { if (ev.pointerId === g.pointerId) this._cancel(g); };
    // Mất "giữ con trỏ" mà chưa nhả: chờ một nhịp xem pointerup có tới không, rồi mới hủy.
    g.onLost = () => setTimeout(() => { if (this._gesture === g) this._cancel(g); }, 0);
    chip.addEventListener('lostpointercapture', g.onLost);
    window.addEventListener('pointermove', g.onMove);
    window.addEventListener('pointerup', g.onUp);
    window.addEventListener('pointercancel', g.onCancel);

    const rest = this._rest();
    tween({
      duration: 140,
      easing: ease.outQuad,
      onUpdate: (k) => { if (this._gesture === g) this._place(g.proj, lerp(from, rest, k)); },
    })
      .then(() => {
        if (this._gesture !== g) return;
        g.loaded = true;
        if (g.moved) this._updatePull(g);
      });
  }

  _endGestureListeners(g = this._gesture) {
    if (!g) return;
    g.chip.removeEventListener('lostpointercapture', g.onLost);
    window.removeEventListener('pointermove', g.onMove);
    window.removeEventListener('pointerup', g.onUp);
    window.removeEventListener('pointercancel', g.onCancel);
  }

  _updatePull(g) {
    const rest = this._rest();
    const c = clampPull(g.pos.x - rest.x, g.pos.y - rest.y, MAX_PULL);
    g.pull = c;
    if (!g.stretched && c.len > 14) {
      g.stretched = true;
      this._sfx('stretch');
    }
    const p = { x: rest.x + c.dx, y: rest.y + c.dy };
    this._drawBands(p);
    this._place(g.proj, p);

    // Đường ngắm dự đoán: xanh nếu sẽ trúng một ô.
    const boxes = this._boxRects();
    const rowY = boxes[0].cy;
    const vel = launchVelocity(c, MAX_PULL, this._maxSpeed(p, rowY));
    const res = resolveShot(p, vel, GRAVITY, { rowY, boxes, tolerance: 6 });
    const pts = samplePath(p, vel, GRAVITY, { tUntil: res.t ?? 1.2, bounds: this._bounds() });
    const aim = this._el.aim;
    aim.setAttribute('d', c.len < 14 ? '' : pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' '));
    aim.setAttribute('class', `aim ${res.hit ? 'hit' : 'miss'}`);
    this._boxEls.forEach((b, i) => b.classList.toggle('target', res.hit && i === res.index));
  }

  _release(g) {
    if (g.ended) return;
    g.ended = true;
    this._endGestureListeners(g);
    if (this._gesture === g) this._gesture = null;
    this._clearAim();
    const tap = !g.moved && performance.now() - g.t0 < TAP_MS;
    const rest = this._rest();
    // Vẩy nhanh hơn lúc số kịp nạp vào túi ná: vẫn tính lực kéo theo chỗ thả tay.
    if (!g.loaded && g.moved) g.pull = clampPull(g.pos.x - rest.x, g.pos.y - rest.y, MAX_PULL);
    const at = { x: rest.x + g.pull.dx, y: rest.y + g.pull.dy };
    if (tap) {
      this._springBack(at);
      this._autoShot(g.d, { proj: g.proj, chip: g.chip });
      return;
    }
    if (g.pull.len < 14) {
      this._returnToChip(g, at);
      return;
    }
    this._physicsShot(g, at);
  }

  _cancel(g) {
    if (g.ended) return;
    g.ended = true;
    this._endGestureListeners(g);
    if (this._gesture === g) this._gesture = null;
    this._clearAim();
    const rest = this._rest();
    this._returnToChip(g, { x: rest.x + g.pull.dx, y: rest.y + g.pull.dy });
  }

  async _returnToChip(g, at) {
    this._springBack(at);
    const from = this._projPos(g.proj) || at;
    await tween({ duration: 200, easing: ease.inOutQuad, onUpdate: (k) => this._place(g.proj, lerp(from, g.from, k)) });
    g.proj.remove();
    g.chip.classList.remove('loaded');
  }

  _projPos(el) {
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform);
    return m ? { x: +m[1] + PROJ / 2, y: +m[2] + PROJ / 2 } : null;
  }

  async _physicsShot(g, start) {
    const epoch = this._epoch;
    const boxes = this._boxRects();
    const rowY = boxes[0].cy;
    const vel = launchVelocity(g.pull, MAX_PULL, this._maxSpeed(start, rowY));
    const res = resolveShot(start, vel, GRAVITY, { rowY, boxes, tolerance: 6 });
    this._sfx('twang');
    this._springBack(start);
    this._inFlight++;
    try {
      if (res.hit) {
        await this._fly(g.proj, start, vel, res.t);
        this._land(res.index, g.d, g.proj, { aimed: true, epoch });
      } else {
        const pts = samplePath(start, vel, GRAVITY, { tUntil: 1.6, bounds: this._bounds() });
        await this._fly(g.proj, start, vel, Math.max(0.2, pts.length / 60), true);
        g.proj.remove();
        this._sfx('buzz');
        this._setMessage({ kind: 'info', text: this._labels.miss });
        this._announce(this._labels.srMiss);
      }
    } finally {
      g.chip.classList.remove('loaded');
      this._inFlight--;
      this._maybeSubmit();
    }
  }

  _fly(el, start, vel, tEnd, fade = false) {
    return tween({
      duration: (tEnd * 1000) / SLOWMO,
      easing: ease.linear,
      onUpdate: (k) => {
        const p = positionAt(start, vel, GRAVITY, k * tEnd);
        this._place(el, p, k * 360, 1 - 0.12 * k);
        if (fade) el.style.opacity = String(k > 0.7 ? (1 - k) / 0.3 : 1);
      },
    });
  }

  // ---------- Bắn tự động (chạm nhẹ, gõ phím, dán) ----------

  _nextActive(from) {
    for (let k = 0; k < this._len; k++) {
      const i = (from + k) % this._len;
      if (this._code[i] == null && !this._incoming.has(i)) return i;
    }
    return -1;
  }

  _typeDigit(d) {
    if (this._locked) return;
    this._autoShot(d, {});
  }

  _fillAll(digits) {
    this._clearCode();
    this._setMessage(null);
    this._render();
    const epoch = this._epoch;
    digits.slice(0, this._len).split('').forEach((ch, i) => {
      setTimeout(() => { if (epoch === this._epoch) this._autoShot(+ch, { target: i }); }, i * 90);
    });
  }

  async _autoShot(d, { proj, chip, target }) {
    const epoch = this._epoch;
    let i = target ?? this._active;
    if (i < 0 || i == null) i = this._nextActive(0);
    if (i < 0) i = this._len - 1; // đầy rồi: bắn đè ô cuối
    this._incoming.add(i);
    if (this._active === i || target != null) this._active = this._nextActive(i + 1);
    this._render();

    const rest = this._rest();
    const el = proj || this._makeProj(d, rest);
    const from = this._projPos(el) || rest;
    const box = this._boxRects()[i];
    const to = { x: box.cx, y: box.cy };
    const ctrl = arcControl(from, to, 50);
    this._sfx('twang');
    this._inFlight++;
    try {
      await tween({
        duration: 420,
        easing: ease.inOutQuad,
        onUpdate: (k) => this._place(el, quadPoint(from, ctrl, to, k), k * 360, 1 - 0.12 * k),
      });
      this._land(i, d, el, { epoch });
    } finally {
      chip?.classList.remove('loaded');
      this._inFlight--;
      this._maybeSubmit();
    }
  }

  _land(i, d, el, { aimed, epoch }) {
    el.remove();
    if (epoch !== this._epoch) return; // đã reset() trong lúc đạn bay
    this._incoming.delete(i);
    if (this._locked) return;
    this._code[i] = d;
    if (aimed && (this._active === i || this._active < 0)) this._active = this._nextActive(i + 1);
    if (this._message?.kind === 'info') this._setMessage(null);
    const box = this._boxEls[i];
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
    this._sfx('thunk');
    this._announce(fmt(this._labels.srFilled, { i: i + 1, d }));
    this._render();
  }

  _backspace() {
    if (this._locked) return;
    let i = this._active;
    if (!(i >= 0 && this._code[i] != null)) {
      const before = i < 0 ? this._len : i;
      i = -1;
      for (let k = before - 1; k >= 0; k--) {
        if (this._code[k] != null) { i = k; break; }
      }
    }
    if (i < 0) return;
    this._code[i] = null;
    this._active = i;
    this._setMessage(null);
    this._announce(fmt(this._labels.srCleared, { i: i + 1 }));
    this._render();
  }

  // ---------- Gửi kiểm tra ----------

  get _complete() { return this._code.every((d) => d != null); }

  _maybeSubmit() {
    if (this._inFlight > 0 || this._incoming.size > 0 || !this._complete || this._locked) return;
    this._render();
    if (!this.hasAttribute('no-auto-submit')) this._submit();
  }

  async _submit() {
    if (this._locked || !this._complete || this._inFlight > 0) return;
    const code = this.value;
    const L = this._labels;
    this._fire('vv-complete', { code });
    if (!this._verifier) {
      console.warn('[ui-vuivui] <vv-slingshot-otp> chưa có verifier. Gán element.verifier = jsonVerifier(url) hoặc hàm của bạn.');
      this._sfx('buzz');
      this._setMessage({ kind: 'bad', text: L.noVerifier, retry: true });
      this._fire('vv-error', { code, error: new Error(L.noVerifier) });
      return;
    }
    this._busy = true;
    this._setMessage(null);
    this._render();
    let verdict;
    try {
      verdict = normalizeVerdict(await this._verifier(code));
    } catch (error) {
      this._busy = false;
      this._sfx('buzz');
      this._setMessage({ kind: 'bad', text: fmt(L.netError, { reason: error?.message || '' }), retry: true });
      this._announce(fmt(L.netError, { reason: error?.message || '' }));
      this._fire('vv-error', { code, error });
      this._render();
      return;
    }
    if (verdict.ok) {
      this._busy = false;
      this._done = true;
      this._sfx('score');
      this._render();
      this._showDone(code);
      this._fire('vv-verified', { code, verdict });
      return;
    }
    // Mã sai: rung, báo, xóa để nhập lại.
    const text = verdict.message || L.wrong;
    this._sfx('buzz');
    this._setMessage({ kind: 'bad', text });
    this._announce(text);
    this._fire('vv-rejected', { code, message: text });
    const boxes = this._el.boxes;
    boxes.classList.add('wrong', 'shake');
    await wait(750);
    boxes.classList.remove('wrong', 'shake');
    this._busy = false;
    this._clearCode();
    this._render();
  }

  _showDone(code) {
    const L = this._labels;
    const { done, doneTitle, doneBody, cont } = this._el;
    doneTitle.textContent = L.successTitle;
    const [a, b] = L.successBody.split('{code}');
    const strong = document.createElement('b');
    strong.textContent = code;
    doneBody.replaceChildren(a, strong, b || '');
    cont.textContent = L.continue;
    done.hidden = false;
    this._announce(`${L.successTitle} ${a}${code}${b || ''}`);
    cont.focus({ preventScroll: true });
  }

  // ---------- Vẽ giao diện ----------

  _setMessage(m) {
    this._message = m;
    const el = this._el.msg;
    el.replaceChildren();
    if (m) {
      const span = document.createElement('span');
      span.className = m.kind;
      span.textContent = m.text;
      el.append(span);
    }
    this._render();
  }

  _renderTexts() {
    const L = this._labels;
    const e = this._el;
    e.kicker.textContent = L.kicker;
    e.title.textContent = L.title;
    const name = this.getAttribute('name');
    e.intro.replaceChildren();
    if (name) {
      const b = document.createElement('b');
      b.textContent = fmt(L.hello, { name });
      e.intro.append(b, ' ');
    }
    e.intro.append(fmt(L.intro, { n: this._len }));
    e.hint.textContent = L.hint;
    e.input.setAttribute('aria-label', fmt(L.inputAria, { n: this._len }));
    e.eraseText.textContent = L.clearDigit;
    e.erase.setAttribute('aria-label', L.clearDigit);
    for (const chip of e.chips.children) chip.setAttribute('aria-label', fmt(L.digitAria, { d: chip.dataset.d }));
    const on = this._soundOn;
    e.sound.setAttribute('aria-pressed', String(on));
    e.sound.setAttribute('aria-label', on ? L.soundOff : L.soundOn);
    e.sound.innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
    this._render();
  }

  _render() {
    const L = this._labels;
    const e = this._el;
    this._boxEls.forEach((box, i) => {
      const d = this._code[i];
      box.textContent = d == null ? '' : String(d);
      box.classList.toggle('filled', d != null);
      box.classList.toggle('active', !this._locked && i === this._active);
    });
    e.boxes.classList.toggle('busy', this._busy);
    e.input.disabled = this._busy || this._done || this.disabled;
    for (const chip of e.chips.children) chip.disabled = this._locked;

    const retry = this._message?.retry;
    e.submit.textContent = this._busy ? L.verifying : retry ? L.retry : L.submit;
    e.submit.disabled = this._locked || !this._complete || this._inFlight > 0 || this._incoming.size > 0;
    e.erase.hidden = this._locked || this._code.every((d) => d == null);
  }
}

if (!customElements.get('vv-slingshot-otp')) {
  customElements.define('vv-slingshot-otp', VvSlingshotOtp);
}
