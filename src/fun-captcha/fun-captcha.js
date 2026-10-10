// <vv-fun-captcha> — "Tôi là người, không phải robot" kèm một trò kéo-thả nhỏ.
//
//   Bấm ô vuông → hiện trò chơi (cho mèo ăn cá / ném bóng vào rổ / đưa ong tới hoa)
//                 và ĐỒNG THỜI bắt đầu giải đề chống bot (solver) ở nền.
//   Xong cả hai → ✓ Đã xác minh; token được đưa vào form (như một ô nhập có name).
//
// AN NINH nằm ở `solver` + kiểm tra ở MÁY CHỦ, KHÔNG nằm ở trò chơi. Trò chơi chỉ để vui;
// chạm nhẹ / nhấn Enter là qua (cố ý, để ai cũng dùng được). Mặc định dùng powSolver
// (bằng chứng công việc, xem src/server/pow.js); có thể thay bằng ALTCHA, Cap, Turnstile...
//
// Thiếu solver → báo lỗi, không bao giờ "đã xác minh".

import { playSound } from '../core/sound.js';
import { tween, ease } from '../core/motion.js';
import { fmt, pickLabels } from '../core/i18n.js';
import { LABELS } from './labels.js';
import { STYLES } from './styles.js';
import { GAMES, ICONS } from './art.js';

const GAME_KEYS = Object.keys(GAMES);
const HIT_RADIUS = 44;
const EXPIRY_MARGIN = 5000; // hết hạn sớm 5s cho chắc
const SOUND_FOR = { cat: 'thunk', hoop: 'swish', bee: 'score' };

const LOGO = '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#ede7ff"/><circle cx="11" cy="13" r="2.4" fill="#7c4dff"/><circle cx="21" cy="13" r="2.4" fill="#7c4dff"/><path d="M9.5 19c3.5 4.5 9.5 4.5 13 0" stroke="#7c4dff" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';

const template = document.createElement('template');
template.innerHTML = `
<style>${STYLES}</style>
<div class="box" part="box" data-state="idle">
  <div class="row">
    <button class="check" type="button" role="checkbox" aria-checked="false" part="checkbox">${ICONS.tick}</button>
    <div class="label"><span class="l-main"></span><span class="l-sub" aria-live="polite"></span></div>
    <div class="brand" aria-hidden="true">${LOGO}<b>vuivui</b>PoW</div>
  </div>
  <div class="game" part="game" hidden>
    <p class="task"></p>
    <div class="area">
      <div class="target" aria-hidden="true"></div>
      <button class="item" type="button"></button>
      <div class="toast" aria-hidden="true"></div>
    </div>
    <p class="hint"></p>
  </div>
</div>`;

export class VvFunCaptcha extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['game', 'lang', 'required', 'disabled'];
  }

  constructor() {
    super();
    this._internals = typeof this.attachInternals === 'function' ? this.attachInternals() : null;
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.appendChild(template.content.cloneNode(true));
    const $ = (s) => root.querySelector(s);
    this._el = {
      box: $('.box'), check: $('.check'), main: $('.l-main'), sub: $('.l-sub'),
      game: $('.game'), task: $('.task'), area: $('.area'), target: $('.target'), item: $('.item'),
      toast: $('.toast'), hint: $('.hint'),
    };
    this._solver = null;
    this._labelsOverride = {};
    this._state = 'idle';
    this._token = null;
    this._gameDone = false;
    this._solve = null;     // { ctrl, promise, result, error, progress }
    this._expiryTimer = 0;
    this._gesture = null;
    this._gameKey = null;
    this._wire();
  }

  // ---------- API công khai ----------

  /** ({ signal, onProgress }) => Promise<{ token, expiresIn?, receivedAt? } | string> */
  get solver() { return this._solver; }
  set solver(fn) {
    this._solver = typeof fn === 'function' ? fn : null;
    // Đổi solver: bỏ kết quả cũ; `prefetch` thì giải trước luôn.
    if (this._state === 'idle') {
      this._solve?.ctrl.abort();
      this._solve = null;
      if (this.isConnected && this._solver && this.hasAttribute('prefetch')) this._startSolve();
    }
  }

  get labels() { return this._labels; }
  set labels(obj) { this._labelsOverride = obj || {}; this._render(); }

  /** Token sau khi xác minh (chuỗi rỗng nếu chưa). Gửi token này lên máy chủ để kiểm tra. */
  get value() { return this._token || ''; }
  get verified() { return this._state === 'verified'; }
  get name() { return this.getAttribute('name'); }
  get form() { return this._internals?.form ?? null; }
  get validity() { return this._internals?.validity; }
  get validationMessage() { return this._internals?.validationMessage ?? ''; }
  checkValidity() { return this._internals ? this._internals.checkValidity() : true; }
  reportValidity() { return this._internals ? this._internals.reportValidity() : true; }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  /** Về lại trạng thái ban đầu (token chỉ dùng được MỘT lần — gọi sau mỗi lần gửi form). */
  reset(message = '') {
    this._solve?.ctrl.abort();
    this._solve = null;
    this._cancelGesture();
    clearTimeout(this._expiryTimer);
    this._token = null;
    this._gameDone = false;
    this._resetMessage = message;
    this._setState('idle');
    this._el.game.hidden = true;
    this._syncForm();
    if (this.hasAttribute('prefetch') && this._solver) this._startSolve();
  }

  // Form: nút reset của form → làm lại; khôi phục trạng thái (back/forward, tự điền) → bỏ qua token cũ.
  formResetCallback() { this.reset(); }
  formStateRestoreCallback() { this.reset(); }
  formDisabledCallback(d) { this._el.check.disabled = d; }

  // ---------- Vòng đời ----------

  connectedCallback() {
    this._render();
    this._syncForm();
    if (this.hasAttribute('prefetch') && this._solver && !this._solve && this._state === 'idle') this._startSolve();
  }

  disconnectedCallback() {
    this._cancelGesture();
  }

  attributeChangedCallback(name) {
    if (name === 'disabled') this._el.check.disabled = this.disabled;
    this._render();
    this._syncForm();
  }

  get _labels() { return pickLabels(LABELS, this, this._labelsOverride); }
  _sfx(n) { if (this.hasAttribute('sound')) playSound(n); }
  _fire(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true })); }

  _syncForm() {
    const i = this._internals;
    if (!i) return;
    i.setFormValue(this._token || null);
    if (this.hasAttribute('required') && !this._token) {
      i.setValidity({ valueMissing: true }, this._labels.required, this._el.check);
    } else {
      i.setValidity({});
    }
  }

  // ---------- Trạng thái ----------

  _setState(s) {
    this._state = s;
    this._el.box.dataset.state = s;
    this._render();
  }

  _render() {
    const L = this._labels;
    const e = this._el;
    e.main.textContent = L.main;
    e.check.setAttribute('aria-label', L.main);
    e.check.setAttribute('aria-checked', String(this._state === 'verified'));
    e.check.setAttribute('aria-disabled', String(this._state === 'verified' || this._state === 'checking'));
    let sub = '';
    switch (this._state) {
      case 'idle': sub = this._resetMessage || L.idle; break;
      case 'playing': sub = L.playing; break;
      case 'checking': sub = fmt(L.checking, { p: Math.round((this._solve?.progress || 0) * 100) }); break;
      case 'verified': sub = L.verified; break;
      case 'error': sub = this._errorText || ''; break;
      default: break;
    }
    e.sub.textContent = sub;
    e.box.style.setProperty('--p', String(this._solve?.progress || 0));
    if (this._gameKey) {
      const G = L[this._gameKey];
      e.task.textContent = G.task;
      e.item.setAttribute('aria-label', G.itemAria);
      e.hint.textContent = fmt(L.hint, { item: G.item });
    }
  }

  // ---------- Bắt đầu ----------

  _wire() {
    const e = this._el;
    e.check.addEventListener('click', (ev) => {
      if (this.disabled || this._state === 'verified' || this._state === 'checking') return;
      this._start(ev.detail === 0);
    });
    e.item.addEventListener('pointerdown', (ev) => this._onDown(ev));
    e.item.addEventListener('click', (ev) => { if (ev.detail === 0) this._autoComplete(); }); // Enter / Space
    e.item.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  _start(fromKeyboard) {
    this._resetMessage = '';
    if (this._state === 'error' && this._gameDone) {
      // Trò đã xong, chỉ cần giải lại đề.
      this._startSolve(true);
      this._setState('checking');
      return;
    }
    if (!this._gameDone) this._setupGame();
    this._setState('playing');
    this._startSolve(this._state === 'error');
    if (fromKeyboard) requestAnimationFrame(() => this._el.item.focus());
  }

  _startSolve(force = false) {
    if (this._solve && !force && !this._solve.error) return;
    this._solve?.ctrl.abort();
    const ctrl = new AbortController();
    const job = { ctrl, progress: 0, result: null, error: null };
    this._solve = job;
    if (!this._solver) {
      console.warn('[ui-vuivui] <vv-fun-captcha> chưa có solver. Gán element.solver = powSolver(url) hoặc ALTCHA/Cap/Turnstile của bạn.');
      job.error = new Error(this._labels.noSolver);
      job.noSolver = true;
      queueMicrotask(() => this._maybeFinish());
      return;
    }
    job.promise = Promise.resolve()
      .then(() => this._solver({
        signal: ctrl.signal,
        onProgress: (p) => {
          if (this._solve !== job) return;
          job.progress = Math.max(0, Math.min(1, p));
          if (this._state === 'checking') this._render();
        },
      }))
      .then((r) => {
        if (this._solve !== job) return;
        job.result = typeof r === 'string' ? { token: r } : r;
        job.progress = 1;
        this._maybeFinish();
      })
      .catch((err) => {
        if (this._solve !== job || err?.name === 'AbortError') return;
        job.error = err;
        this._maybeFinish();
      });
  }

  _maybeFinish() {
    const job = this._solve;
    if (!job) return;
    if (job.error && (this._gameDone || job.noSolver)) {
      const L = this._labels;
      this._errorText = job.noSolver ? L.noSolver : fmt(L.error, { reason: job.error.message || '' });
      this._sfx('buzz');
      this._setState('error');
      this._fire('vv-error', { error: job.error });
      return;
    }
    if (!this._gameDone) return;
    if (!job.result) {
      this._setState('checking');
      return;
    }
    // Xong cả trò lẫn đề.
    const { token, expiresIn, receivedAt } = job.result;
    this._token = token;
    this._setState('verified');
    this._syncForm();
    this._sfx('score');
    this._fire('vv-verified', { token });
    setTimeout(() => { if (this._state === 'verified') this._el.game.hidden = true; }, 900);
    clearTimeout(this._expiryTimer);
    if (Number.isFinite(expiresIn)) {
      const deadline = (receivedAt ?? Date.now()) + expiresIn - EXPIRY_MARGIN;
      this._expiryTimer = setTimeout(() => this._expire(), Math.max(0, deadline - Date.now()));
    }
  }

  _expire() {
    if (this._state !== 'verified') return;
    this.reset(this._labels.expired);
    this._fire('vv-expired', {});
  }

  // ---------- Trò chơi ----------

  _setupGame() {
    const attr = this.getAttribute('game');
    this._gameKey = GAME_KEYS.includes(attr) ? attr : GAME_KEYS[Math.floor(Math.random() * GAME_KEYS.length)];
    const G = GAMES[this._gameKey];
    const e = this._el;
    this._pos = null;
    e.target.innerHTML = G.target;
    e.target.className = 'target';
    e.item.innerHTML = G.item;
    e.item.className = 'item';
    e.item.style.transform = '';
    e.toast.className = 'toast';
    e.game.hidden = false;
    this._render();
    // Đặt vị trí ngẫu nhiên sau khi khung hiện ra (cần kích thước thật).
    requestAnimationFrame(() => this._placeRandom());
    this._placeRandom();
  }

  _placeRandom() {
    const { area, target, item } = this._el;
    const W = area.clientWidth || 300;
    const H = area.clientHeight || 150;
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (!this._pos || this._pos.W !== W) {
      this._pos = {
        W,
        t: { x: rnd(W * 0.55, W - 78 - 8), y: rnd(8, H - 78 - 8) },
        i: { x: rnd(8, W * 0.3), y: rnd(10, H - 46 - 10) },
      };
    }
    const { t, i } = this._pos;
    target.style.left = `${t.x}px`;
    target.style.top = `${t.y}px`;
    item.style.left = `${i.x}px`;
    item.style.top = `${i.y}px`;
  }

  _centers() {
    const { target, item } = this._el;
    const tr = target.getBoundingClientRect();
    const ir = item.getBoundingClientRect();
    return {
      t: { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 },
      i: { x: ir.left + ir.width / 2, y: ir.top + ir.height / 2 },
    };
  }

  _onDown(ev) {
    if (this._gameDone || this.disabled) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ev.preventDefault();
    if (this._gesture) this._cancelGesture();
    const item = this._el.item;
    try { item.setPointerCapture(ev.pointerId); } catch { /* sự kiện giả lập */ }
    const g = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, dx: 0, dy: 0, t0: performance.now(), moved: false, ended: false };
    this._gesture = g;
    item.classList.add('dragging');
    g.onMove = (e2) => {
      if (e2.pointerId !== g.id) return;
      if (e2.pointerType === 'mouse' && e2.buttons === 0) { this._cancelGesture(); return; }
      g.dx = e2.clientX - g.x0;
      g.dy = e2.clientY - g.y0;
      if (Math.hypot(g.dx, g.dy) > 6) g.moved = true;
      item.style.transform = `translate(${g.dx}px, ${g.dy}px) rotate(${Math.max(-15, Math.min(15, g.dx / 8))}deg)`;
      const c = this._centers();
      this._el.target.classList.toggle('near', Math.hypot(c.i.x - c.t.x, c.i.y - c.t.y) < HIT_RADIUS * 1.6);
    };
    g.onUp = (e2) => { if (e2.pointerId === g.id) this._release(g); };
    g.onCancel = (e2) => { if (e2.pointerId === g.id) this._cancelGesture(); };
    g.onLost = () => setTimeout(() => { if (this._gesture === g) this._cancelGesture(); }, 0);
    window.addEventListener('pointermove', g.onMove);
    window.addEventListener('pointerup', g.onUp);
    window.addEventListener('pointercancel', g.onCancel);
    item.addEventListener('lostpointercapture', g.onLost);
  }

  _endGesture(g) {
    g.ended = true;
    window.removeEventListener('pointermove', g.onMove);
    window.removeEventListener('pointerup', g.onUp);
    window.removeEventListener('pointercancel', g.onCancel);
    this._el.item.removeEventListener('lostpointercapture', g.onLost);
    this._el.item.classList.remove('dragging');
    if (this._gesture === g) this._gesture = null;
  }

  _cancelGesture() {
    const g = this._gesture;
    if (!g || g.ended) return;
    this._endGesture(g);
    this._snapBack(g);
  }

  _release(g) {
    if (g.ended) return;
    this._endGesture(g);
    this._el.target.classList.remove('near');
    // Không kéo đi đâu = chạm nhẹ → tự hoàn thành (giữ lâu cũng vậy; trò chơi không phải lớp an ninh).
    if (!g.moved) { this._autoComplete(); return; }
    const c = this._centers();
    if (Math.hypot(c.i.x - c.t.x, c.i.y - c.t.y) < HIT_RADIUS) this._win(g.dx, g.dy);
    else {
      this._toast(this._labels.almost);
      this._snapBack(g);
    }
  }

  _snapBack(g) {
    const item = this._el.item;
    const fx = g.dx;
    const fy = g.dy;
    tween({
      duration: 260,
      easing: ease.outBack,
      onUpdate: (k) => { item.style.transform = `translate(${fx * (1 - k)}px, ${fy * (1 - k)}px)`; },
    });
  }

  _autoComplete() {
    if (this._gameDone || this.disabled) return;
    const c = this._centers();
    this._win(0, 0, { x: c.t.x - c.i.x, y: c.t.y - c.i.y });
  }

  async _win(fromX, fromY, to) {
    if (this._gameDone) return;
    this._gameDone = true;
    const { item, target } = this._el;
    const c = this._centers();
    const dest = to || { x: fromX + (c.t.x - c.i.x), y: fromY + (c.t.y - c.i.y) };
    await tween({
      duration: 280,
      easing: ease.inOutQuad,
      onUpdate: (k) => {
        const x = fromX + (dest.x - fromX) * k;
        const y = fromY + (dest.y - fromY) * k - Math.sin(k * Math.PI) * 24;
        item.style.transform = `translate(${x}px, ${y}px) scale(${1 - 0.5 * k})`;
      },
    });
    item.classList.add('gone');
    target.classList.remove('happy');
    void target.offsetWidth;
    target.classList.add('happy');
    this._sfx(SOUND_FOR[this._gameKey] || 'score');
    this._toast(this._labels.good, true);
    this._maybeFinish();
    if (this._state !== 'verified') this._el.check.focus({ preventScroll: true });
  }

  _toast(text, good = false) {
    const t = this._el.toast;
    t.textContent = text;
    t.className = `toast show${good ? ' good' : ''}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.className = 'toast'; }, 1200);
  }
}

if (!customElements.get('vv-fun-captcha')) {
  customElements.define('vv-fun-captcha', VvFunCaptcha);
}
