// <vv-halloween-login> — màn đăng nhập có công tắc ngày ↔ đêm Halloween.
//
//   Ban ngày : form đăng nhập bình thường, nút con mắt hiện/ẩn mật khẩu.
//   Ban đêm  : khung bí ngô, đèn lồng, phù thủy, dơi, sói hú, nhện treo tơ.
//              Nút con mắt thành ĐÈN PIN: luồng sáng xoay theo con trỏ; mật khẩu chỉ đọc
//              được ở chỗ đèn chiếu tới. Bí ngô bị chiếu thì sáng mặt, nhện sợ sáng thì leo lên.
//
// Thẻ KHÔNG dùng shadow DOM: form thật nằm trong trang để trình quản lý mật khẩu
// (tự điền / lưu mật khẩu) nhận ra. CSS được chèn vào <head> một lần, mọi lớp có tiền tố vvhl-.
//
// Đăng nhập thật qua thuộc tính `authenticator`. Thiếu → báo lỗi, không bao giờ "thành công".
// Không sự kiện nào chứa mật khẩu.

import { playSound } from '../core/sound.js';
import { prefersReducedMotion } from '../core/motion.js';
import { angleTo, inBeam, beamClipPath } from '../core/beam.js';
import { normalizeVerdict } from '../core/verifier.js';
import { fmt, pickLabels } from '../core/i18n.js';
import { LABELS } from './labels.js';
import { STYLES } from './styles.js';
import { SCENE_SVG, PUMPKIN_SVG, LANTERN_SVG, WITCH_SVG, BAT_SVG, SPIDER_SVG, VINE_SVG, ICONS } from './art.js';

const STYLE_ID = 'vv-halloween-login-style';
const SPREAD = (15 * Math.PI) / 180;
let uid = 0;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.append(style);
}

function nightByClock(date = new Date()) {
  const h = date.getHours();
  return h >= 18 || h < 6;
}

export class VvHalloweenLogin extends HTMLElement {
  static get observedAttributes() {
    return ['theme', 'identifier', 'lang', 'sound', 'disabled', 'forgot-href', 'signup-href'];
  }

  constructor() {
    super();
    this._authenticator = null;
    this._labelsOverride = {};
    this._built = false;
    this._reveal = false;
    this._busy = false;
    this._aim = null;
    this._spider = { drop: 46, target: 46, raf: 0 };
  }

  // ---------- API công khai ----------

  /** ({ identifier, password }) => Promise<boolean | {ok, message?}>. Ném lỗi = lỗi mạng. */
  get authenticator() { return this._authenticator; }
  set authenticator(fn) { this._authenticator = typeof fn === 'function' ? fn : null; }

  get labels() { return this._labels; }
  set labels(obj) { this._labelsOverride = obj || {}; if (this._built) this._renderTexts(); }

  /** Chủ đề đang hiển thị: 'day' | 'night'. */
  get theme() { return this._el?.stage.dataset.theme || 'day'; }
  set theme(t) { this.setAttribute('theme', t); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  /** Hiện lại form (sau màn thành công), xóa mật khẩu và thông báo. */
  reset() {
    if (!this._built) return;
    const e = this._el;
    this._setReveal(false);
    e.pw.value = '';
    e.success.hidden = true;
    e.form.hidden = false;
    this._setBusy(false);
    this._setMsg('');
  }

  focus() { this._el?.id.focus(); }

  // ---------- Vòng đời ----------

  connectedCallback() {
    injectStyles();
    if (!this._built) this._build();
    this._applyTheme(false);
    this._renderTexts();
    this._syncDisabled();
    if (!this._ro && typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._updateBeam());
      this._ro.observe(this._el.stage);
    }
    this._onVis = () => { if (document.hidden) this._setReveal(false); };
    document.addEventListener('visibilitychange', this._onVis);
    this._startSpider();
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    this._ro = null;
    document.removeEventListener('visibilitychange', this._onVis);
    this._stopSpider();
  }

  attributeChangedCallback(name) {
    if (!this._built) return;
    if (name === 'theme') this._applyTheme(true);
    else if (name === 'disabled') this._syncDisabled();
    else this._renderTexts();
  }

  get _labels() { return pickLabels(LABELS, this, this._labelsOverride); }
  get _soundOn() { return this.hasAttribute('sound'); }
  get _isUsername() { return this.getAttribute('identifier') === 'username'; }

  _sfx(n) { if (this._soundOn) playSound(n); }

  _fire(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  // ---------- Dựng DOM (một lần) ----------

  _build() {
    this._built = true;
    const n = ++uid;
    const idId = `vvhl-${n}-id`;
    const pwId = `vvhl-${n}-pw`;
    const msgId = `vvhl-${n}-msg`;
    this.innerHTML = `
<div class="vvhl-stage" data-theme="day">
  <div class="vvhl-deco vvhl-night" aria-hidden="true">
    <div class="vvhl-vine vvhl-vine-t">${VINE_SVG}</div>
    <div class="vvhl-vine vvhl-vine-b">${VINE_SVG}</div>
    <div class="vvhl-lantern vvhl-l-l">${LANTERN_SVG}</div>
    <div class="vvhl-lantern vvhl-l-r">${LANTERN_SVG}</div>
    <div class="vvhl-witch">${WITCH_SVG}</div>
    <div class="vvhl-bat vvhl-b1">${BAT_SVG}</div>
    <div class="vvhl-bat vvhl-b2">${BAT_SVG}</div>
    <div class="vvhl-bat vvhl-b3">${BAT_SVG}</div>
  </div>
  <div class="vvhl-card">
    <div class="vvhl-scene">
      ${SCENE_SVG}
      <button class="vvhl-switch" type="button" role="switch" aria-checked="false"><span class="vvhl-knob"></span></button>
      <div class="vvhl-scene-text"><h3></h3><p></p></div>
    </div>
    <div class="vvhl-main">
      <div class="vvhl-spider vvhl-night" aria-hidden="true"><i class="vvhl-thread"></i><div class="vvhl-bug">${SPIDER_SVG}</div></div>
      <div class="vvhl-tools"><button class="vvhl-sound" type="button"></button></div>
      <form class="vvhl-form" novalidate>
        <h2 class="vvhl-title"></h2>
        <label class="vvhl-sr vvhl-id-label" for="${idId}"></label>
        <input class="vvhl-input vvhl-id" id="${idId}" required aria-describedby="${msgId}">
        <label class="vvhl-sr vvhl-pw-label" for="${pwId}"></label>
        <div class="vvhl-pw">
          <input class="vvhl-input vvhl-pass" id="${pwId}" name="password" type="password" autocomplete="current-password"
                 autocapitalize="off" autocorrect="off" spellcheck="false" required aria-describedby="${msgId}">
          <button class="vvhl-eye" type="button" aria-controls="${pwId}" aria-pressed="false"></button>
        </div>
        <div class="vvhl-row vvhl-forgot-wrap"></div>
        <p class="vvhl-msg" id="${msgId}" aria-live="polite"></p>
        <button class="vvhl-submit" type="submit"><span></span>${ICONS.arrow}</button>
        <p class="vvhl-signup"><span></span> </p>
      </form>
      <div class="vvhl-success" role="status" hidden>
        <div class="vvhl-badge">${ICONS.check}</div>
        <h2></h2><p class="vvhl-who"></p><p class="vvhl-night vvhl-night-wish"></p>
      </div>
    </div>
  </div>
  <div class="vvhl-pumpkin vvhl-p-tl vvhl-night" aria-hidden="true">${PUMPKIN_SVG}</div>
  <div class="vvhl-pumpkin vvhl-p-tr vvhl-night" aria-hidden="true">${PUMPKIN_SVG}</div>
  <div class="vvhl-pumpkin vvhl-p-bl vvhl-night" aria-hidden="true">${PUMPKIN_SVG}</div>
  <div class="vvhl-pumpkin vvhl-p-br vvhl-night" aria-hidden="true">${PUMPKIN_SVG}</div>
  <div class="vvhl-beam" aria-hidden="true"></div>
</div>`;
    const $ = (s) => this.querySelector(s);
    this._el = {
      stage: $('.vvhl-stage'), card: $('.vvhl-card'), switch: $('.vvhl-switch'), knob: $('.vvhl-knob'),
      sceneTitle: $('.vvhl-scene-text h3'), sceneText: $('.vvhl-scene-text p'),
      sound: $('.vvhl-sound'), form: $('.vvhl-form'), title: $('.vvhl-title'),
      idLabel: $('.vvhl-id-label'), id: $('.vvhl-id'), pwLabel: $('.vvhl-pw-label'), pw: $('.vvhl-pass'),
      eye: $('.vvhl-eye'), forgotWrap: $('.vvhl-forgot-wrap'), msg: $('.vvhl-msg'),
      submit: $('.vvhl-submit'), submitText: $('.vvhl-submit span'), signup: $('.vvhl-signup'), signupText: $('.vvhl-signup span'),
      success: $('.vvhl-success'), successTitle: $('.vvhl-success h2'), who: $('.vvhl-who'), wish: $('.vvhl-night-wish'),
      beam: $('.vvhl-beam'), pumpkins: [...this.querySelectorAll('.vvhl-pumpkin')],
      spider: $('.vvhl-spider'), bug: $('.vvhl-bug'),
    };
    this._wire();
  }

  _wire() {
    const e = this._el;

    e.switch.addEventListener('click', () => {
      this.setAttribute('theme', this.theme === 'night' ? 'day' : 'night');
    });
    e.sound.addEventListener('click', () => {
      this.toggleAttribute('sound', !this._soundOn);
      if (this._soundOn) playSound('click');
    });
    e.eye.addEventListener('click', () => {
      this._setReveal(!this._reveal);
      this._sfx('click');
    });

    // Rời khỏi form sang một ô/nút khác ngoài thẻ → tắt đèn / ẩn mật khẩu.
    this.addEventListener('focusout', (ev) => {
      if (ev.relatedTarget && !this.contains(ev.relatedTarget)) this._setReveal(false);
    });
    e.pw.addEventListener('focus', () => { this._aim = null; this._updateBeam(); });

    // Nhắm đèn: chuột/bút di theo con trỏ; cảm ứng nhắm bằng cách chạm (không chặn cuộn trang).
    const aimAt = (ev) => {
      if (!this._reveal || this.theme !== 'night') return;
      const r = e.stage.getBoundingClientRect();
      this._aim = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      this._queueBeam();
    };
    e.stage.addEventListener('pointermove', (ev) => { if (ev.pointerType !== 'touch') aimAt(ev); });
    e.stage.addEventListener('pointerdown', aimAt);

    e.form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      this._setReveal(false); // trả về type=password TRƯỚC mọi việc khác
      this._submit();
    });
    e.forgotWrap.addEventListener('click', (ev) => {
      if (ev.target.closest('button.vvhl-link')) this._fire('vv-forgot', { identifier: e.id.value.trim() });
    });
    e.signup.addEventListener('click', (ev) => {
      if (ev.target.closest('button.vvhl-link')) this._fire('vv-signup', {});
    });
  }

  // ---------- Chủ đề ----------

  _applyTheme(animate) {
    const attr = this.getAttribute('theme') || 'day';
    const next = attr === 'auto' ? (nightByClock() ? 'night' : 'day') : (attr === 'night' ? 'night' : 'day');
    const e = this._el;
    const prev = e.stage.dataset.theme;
    if (prev === next && animate) return;
    this._setReveal(false);
    e.stage.dataset.theme = next;
    e.switch.setAttribute('aria-checked', String(next === 'night'));
    this._renderTexts();
    if (animate && prev !== next) {
      if (next === 'night') {
        this._sfx('howl');
        if (!prefersReducedMotion()) {
          e.stage.classList.remove('vvhl-howl');
          void e.stage.offsetWidth;
          e.stage.classList.add('vvhl-howl');
          setTimeout(() => e.stage.classList.remove('vvhl-howl'), 1900);
        }
      }
      this._fire('vv-theme', { theme: next });
    }
    this._startSpider();
  }

  // ---------- Hiện mật khẩu / đèn pin ----------

  _setReveal(on) {
    if (!this._built) return;
    const e = this._el;
    on = !!on && !this.disabled;
    this._reveal = on;
    // Giữ vị trí con trỏ gõ khi đổi type.
    const focused = document.activeElement === e.pw;
    const s = e.pw.selectionStart;
    const t = e.pw.selectionEnd;
    e.pw.type = on ? 'text' : 'password';
    if (focused && s != null) {
      try { e.pw.setSelectionRange(s, t); } catch { /* bỏ qua */ }
    }
    const night = this.theme === 'night';
    e.stage.classList.toggle('vvhl-torch', on && night);
    if (on && night) this._updateBeam();
    else e.pumpkins.forEach((p) => p.classList.remove('vvhl-lit'));
    this._renderEye();
  }

  _renderEye() {
    const L = this._labels;
    const e = this._el;
    const night = this.theme === 'night';
    e.eye.setAttribute('aria-pressed', String(this._reveal));
    const label = night ? (this._reveal ? L.torchOff : L.torchOn) : (this._reveal ? L.hidePassword : L.showPassword);
    e.eye.setAttribute('aria-label', label);
    e.eye.title = label;
    e.eye.innerHTML = night ? ICONS.torch : (this._reveal ? ICONS.eyeOff : ICONS.eye);
  }

  _queueBeam() {
    if (this._beamQueued) return;
    this._beamQueued = true;
    requestAnimationFrame(() => {
      this._beamQueued = false;
      this._updateBeam();
    });
  }

  _beamGeometry() {
    const e = this._el;
    const sr = e.stage.getBoundingClientRect();
    const br = e.eye.getBoundingClientRect();
    const origin = { x: br.left - sr.left + 8, y: br.top - sr.top + br.height / 2 };
    const angle = this._aim ? angleTo(origin, this._aim) : Math.PI; // mặc định chiếu dọc ô mật khẩu
    return { origin, angle, spread: SPREAD, length: Math.max(560, sr.width * 1.2) };
  }

  _updateBeam() {
    if (!this._built || !this._reveal || this.theme !== 'night') return;
    const e = this._el;
    const beam = this._beamGeometry();
    e.beam.style.clipPath = beamClipPath(beam, 8);
    e.beam.style.setProperty('--vvhl-ox', `${beam.origin.x}px`);
    e.beam.style.setProperty('--vvhl-oy', `${beam.origin.y}px`);
    const sr = e.stage.getBoundingClientRect();
    // Mặt nạ hình nón cho ô mật khẩu (tọa độ theo ô). Đỉnh nón lùi ra sau đèn 50px để
    // phần chữ sát đèn không bị cắt mất (nón ở gần đỉnh rất hẹp).
    const pr = e.pw.getBoundingClientRect();
    const back = { x: beam.origin.x - Math.cos(beam.angle) * 50, y: beam.origin.y - Math.sin(beam.angle) * 50 };
    const deg = (beam.angle * 180) / Math.PI + 90; // CSS conic: 0° = hướng lên, theo chiều kim đồng hồ
    const spreadDeg = (beam.spread * 180) / Math.PI;
    e.pw.style.setProperty('--vvhl-mx', `${(back.x - (pr.left - sr.left)).toFixed(1)}px`);
    e.pw.style.setProperty('--vvhl-my', `${(back.y - (pr.top - sr.top)).toFixed(1)}px`);
    e.pw.style.setProperty('--vvhl-from', `${(deg - spreadDeg).toFixed(2)}deg`);
    e.pw.style.setProperty('--vvhl-span', `${(2 * spreadDeg).toFixed(2)}deg`);
    for (const p of e.pumpkins) {
      const r = p.getBoundingClientRect();
      const c = { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
      p.classList.toggle('vvhl-lit', inBeam(c, beam, r.width / 2));
    }
  }

  // ---------- Con nhện (chỉ trang trí) ----------

  _startSpider() {
    if (this._spider.raf || !this.isConnected || this.theme !== 'night') return;
    const sp = this._spider;
    const t0 = performance.now();
    const frame = (now) => {
      if (!this.isConnected || this.theme !== 'night') { sp.raf = 0; return; }
      const e = this._el;
      let lit = false;
      if (this._reveal) {
        const sr = e.stage.getBoundingClientRect();
        const r = e.bug.getBoundingClientRect();
        lit = inBeam({ x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 }, this._beamGeometry(), 12);
      }
      sp.target = lit ? 6 : 46;           // sợ sáng: leo tít lên
      sp.drop += (sp.target - sp.drop) * (lit ? 0.18 : 0.02);
      const still = prefersReducedMotion();
      const swing = still ? 0 : Math.sin((now - t0) / 900) * (lit ? 2 : 6);
      e.spider.style.setProperty('--vvhl-drop', `${sp.drop.toFixed(1)}px`);
      e.spider.style.setProperty('--vvhl-swing', `${swing.toFixed(2)}deg`);
      sp.raf = requestAnimationFrame(frame);
    };
    sp.raf = requestAnimationFrame(frame);
  }

  _stopSpider() {
    cancelAnimationFrame(this._spider.raf);
    this._spider.raf = 0;
  }

  // ---------- Đăng nhập ----------

  _setMsg(text) { this._el.msg.textContent = text; }

  _setBusy(on) {
    const e = this._el;
    this._busy = on;
    e.id.readOnly = on;
    e.pw.readOnly = on;
    e.submit.disabled = on || this.disabled;
    e.submitText.textContent = on ? this._labels.submitting : this._labels.submit;
  }

  _syncDisabled() {
    const e = this._el;
    const d = this.disabled;
    e.id.disabled = d;
    e.pw.disabled = d;
    e.eye.disabled = d;
    e.submit.disabled = d || this._busy;
    if (d) this._setReveal(false);
  }

  async _submit() {
    if (this._busy || this.disabled) return;
    const e = this._el;
    const L = this._labels;
    const identifier = e.id.value.trim();
    const password = e.pw.value;
    const idName = this._isUsername ? L.username : L.email;
    if (!identifier) { this._setMsg(fmt(L.required, { field: idName.toLowerCase() })); e.id.focus(); return; }
    if (!this._isUsername && !e.id.checkValidity()) { this._setMsg(e.id.validationMessage); e.id.focus(); return; }
    if (!password) { this._setMsg(fmt(L.required, { field: L.password.toLowerCase() })); e.pw.focus(); return; }

    if (!this._authenticator) {
      console.warn('[ui-vuivui] <vv-halloween-login> chưa có authenticator. Gán element.authenticator = jsonAuthenticator(url) hoặc hàm của bạn.');
      this._sfx('buzz');
      this._setMsg(L.noAuthenticator);
      this._fire('vv-error', { identifier, error: new Error(L.noAuthenticator) });
      return;
    }

    this._setMsg('');
    this._setBusy(true);
    let verdict;
    try {
      verdict = normalizeVerdict(await this._authenticator({ identifier, password }));
    } catch (error) {
      this._setBusy(false);
      this._sfx('buzz');
      this._setMsg(fmt(L.netError, { reason: error?.message || '' }));
      this._fire('vv-error', { identifier, error });
      return;
    }
    this._setBusy(false);

    if (verdict.ok) {
      this._sfx('score');
      this._fire('vv-login', { identifier, verdict });
      e.successTitle.textContent = L.successTitle;
      e.who.textContent = fmt(L.successText, { who: identifier });
      e.wish.textContent = L.successNight;
      e.form.hidden = true; // form biến mất sau đăng nhập XHR: tín hiệu để trình duyệt đề nghị lưu mật khẩu
      e.success.hidden = false;
      return;
    }

    const text = verdict.message || L.wrong;
    this._sfx('buzz');
    this._setMsg(text);
    e.pw.value = '';
    e.pw.focus();
    if (!prefersReducedMotion()) {
      e.form.classList.remove('vvhl-shake');
      void e.form.offsetWidth;
      e.form.classList.add('vvhl-shake');
    }
    this._fire('vv-login-failed', { identifier, message: text });
  }

  // ---------- Chữ ----------

  _renderTexts() {
    if (!this._built) return;
    const L = this._labels;
    const e = this._el;
    const user = this._isUsername;
    e.sceneTitle.textContent = L.panelTitle;
    e.sceneText.textContent = L.panelText;
    e.title.textContent = L.title;
    e.idLabel.textContent = user ? L.username : L.email;
    e.id.type = user ? 'text' : 'email';
    e.id.name = user ? 'username' : 'email';
    e.id.autocomplete = 'username';
    e.id.inputMode = user ? 'text' : 'email';
    e.id.placeholder = user ? L.usernamePlaceholder : L.emailPlaceholder;
    e.id.autocapitalize = 'off';
    e.id.spellcheck = false;
    e.pwLabel.textContent = L.password;
    e.pw.placeholder = L.passwordPlaceholder;
    e.submitText.textContent = this._busy ? L.submitting : L.submit;
    const night = this.theme === 'night';
    e.switch.setAttribute('aria-label', night ? L.themeToDay : L.themeToNight);
    e.switch.title = night ? L.themeToDay : L.themeToNight;
    e.knob.innerHTML = night ? ICONS.moon : ICONS.sun;
    const on = this._soundOn;
    e.sound.setAttribute('aria-pressed', String(on));
    e.sound.setAttribute('aria-label', on ? L.soundOff : L.soundOn);
    e.sound.innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
    e.signupText.textContent = L.noAccount;
    this._renderLinks();
    this._renderEye();
  }

  _renderLinks() {
    const L = this._labels;
    const e = this._el;
    const make = (href, text) => {
      const el = href ? document.createElement('a') : document.createElement('button');
      el.className = 'vvhl-link';
      el.textContent = text;
      if (href) el.href = href;
      else el.type = 'button';
      return el;
    };
    e.forgotWrap.replaceChildren(make(this.getAttribute('forgot-href'), L.forgot));
    const old = e.signup.querySelector('.vvhl-link');
    const link = make(this.getAttribute('signup-href'), L.signup);
    if (old) old.replaceWith(link);
    else e.signup.append(link);
  }
}

if (!customElements.get('vv-halloween-login')) {
  customElements.define('vv-halloween-login', VvHalloweenLogin);
}
