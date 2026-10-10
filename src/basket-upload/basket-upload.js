// <vv-basket-upload> — upload file bằng cách "ném bóng vào rổ".
//
//   Kéo file vào thẻ  → hiện đường chấm vòng cung từ con trỏ tới rổ
//   Thả tay           → file thành quả bóng bay vào vành rổ
//   Đang upload       → bóng lăn quanh vành (lăn chậm dần theo tiến trình)
//   Thành công        → bóng lọt lưới, bảng điểm +1
//   Thất bại          → bóng bật vành văng ra ("Trượt rổ!"), có nút Ném lại
//
// Element KHÔNG tự giả lập upload: phải gán thuộc tính `uploader`
// (vd. xhrUploader('/api/upload')). Thiếu uploader → mọi cú ném đều "trượt".

import { UploadQueue, NoUploaderError, parseSize, formatSize } from '../core/upload-queue.js';
import { playSound } from '../core/sound.js';
import { tween, ease, wait, quadPoint, arcControl, arcPath, prefersReducedMotion } from '../core/motion.js';
import { LABELS, fmt } from './labels.js';
import { STYLES } from './styles.js';
import { BALL_SVG, HOOP_BACK_SVG, HOOP_FRONT_SVG, ICONS, RIM_CENTER } from './art.js';

const BALL = 34;          // đường kính bóng (px), khớp với CSS .ball
const REST_ABOVE_RIM = 15; // tâm bóng nằm trên tâm vành bao nhiêu px khi "lăn vành"

const extOf = (name) => (name.includes('.') ? name.split('.').pop().slice(0, 4).toUpperCase() : 'FILE');

const template = document.createElement('template');
template.innerHTML = `
<style>${STYLES}</style>
<div class="card" part="card">
  <header class="head" part="header">
    <div class="head-text">
      <h2 class="title"><span class="t-a"></span> <em class="t-b"></em></h2>
      <p class="sub"></p>
    </div>
    <button class="sound" type="button" part="sound-button"></button>
    <div class="board" role="img" part="scoreboard">
      <span class="board-label"></span>
      <span class="digits">00</span>
    </div>
  </header>
  <div class="court">
    <div class="zone" part="dropzone">
      <div class="zone-icon"></div>
      <p class="zone-title"></p>
      <p class="zone-sub"></p>
      <div class="bar"><i></i></div>
      <div class="tag">${ICONS.arrow}<span></span></div>
    </div>
    <div class="hoop">
      <div class="hoop-back">${HOOP_BACK_SVG}</div>
      <div class="hoop-front">${HOOP_FRONT_SVG}</div>
    </div>
    <section class="list" part="list" hidden>
      <div class="list-head"><span class="l-title"></span><span class="l-count"></span></div>
      <ul></ul>
    </section>
  </div>
  <div class="cta-wrap"><button class="cta" type="button" part="button"></button></div>
  <div class="fx" aria-hidden="true">
    <svg class="aim" style="display:none"><path d=""/><circle r="7"/></svg>
    <div class="ball">${BALL_SVG}</div>
  </div>
  <input class="picker" type="file" hidden>
  <div class="sr" aria-live="polite"></div>
</div>`;

export class VvBasketUpload extends HTMLElement {
  static get observedAttributes() {
    return ['accept', 'multiple', 'max-size', 'lang', 'sound', 'disabled'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    const $ = (s) => root.querySelector(s);
    this._el = {
      card: $('.card'), tA: $('.t-a'), tB: $('.t-b'), sub: $('.sub'),
      sound: $('.sound'), board: $('.board'), boardLabel: $('.board-label'), digits: $('.digits'),
      zone: $('.zone'), zoneIcon: $('.zone-icon'), zoneTitle: $('.zone-title'), zoneSub: $('.zone-sub'),
      bar: $('.bar > i'), tag: $('.tag span'),
      hoop: $('.hoop'), net: $('.net'),
      list: $('.list'), lTitle: $('.l-title'), lCount: $('.l-count'), ul: $('ul'),
      cta: $('.cta'), aim: $('.aim'), aimPath: $('.aim path'), aimDot: $('.aim circle'),
      ball: $('.ball'), picker: $('.picker'), sr: $('.sr'),
    };

    this._labelsOverride = {};
    this._status = { kind: 'idle' };
    this._dragDepth = 0;
    this._dragPos = null;
    this._ballPos = null;
    this._roll = null;
    this._rows = new Map();
    this._current = null;
    this._pendingScore = null;

    this._queue = new UploadQueue({
      beforeUpload: (item) => this._shoot(item),
      afterUpload: (item) => this._land(item),
    });
    this._wireQueue();
    this._wireUi();
  }

  // ---------- API công khai ----------

  /** Hàm upload: (file, {onProgress, signal}) => Promise<kết quả>. */
  get uploader() { return this._queue.uploader; }
  set uploader(fn) { this._queue.uploader = typeof fn === 'function' ? fn : null; }

  /** Ghi đè chuỗi giao diện, vd. { cta: 'Ném hồ sơ' }. */
  get labels() { return this._labels; }
  set labels(obj) { this._labelsOverride = obj || {}; this._renderTexts(); }

  /** Bản sao danh sách item hiện tại. */
  get files() { return this._queue.items; }

  /** Thêm file bằng code (vd. dán từ clipboard). */
  addFiles(files) { return this._addFiles(files, null); }
  removeFile(id) { return this._queue.remove(id); }
  retry(id) { return this._queue.retry(id); }
  clear() {
    this._queue.clear();
    this._current = null;
    this._pendingScore = null;
    this._stopRoll();
    this._hideBall();
    this._setStatus({ kind: 'idle' });
    this._renderScore(false);
  }
  /** Mở hộp chọn file của hệ điều hành. */
  openPicker() { if (!this.disabled) this._el.picker.click(); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  // ---------- Vòng đời ----------

  connectedCallback() {
    this._syncAttrs();
    this._renderTexts();
  }

  disconnectedCallback() {
    this._stopRoll();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this._syncAttrs();
      this._renderTexts();
    }
  }

  get _labels() {
    const lang = (this.getAttribute('lang') || document.documentElement.lang || 'vi').slice(0, 2);
    return { ...(LABELS[lang] || LABELS.vi), ...this._labelsOverride };
  }

  get _soundOn() { return this.hasAttribute('sound'); }

  _syncAttrs() {
    const q = this._queue;
    q.accept = this.getAttribute('accept') || '';
    q.maxSize = this.getAttribute('max-size') || Infinity;
    const p = this._el.picker;
    p.accept = q.accept;
    p.multiple = this.hasAttribute('multiple');
    this._el.cta.disabled = this.disabled;
  }

  // ---------- Kết nối hàng chờ ----------

  _wireQueue() {
    const q = this._queue;
    q.addEventListener('change', () => {
      this._renderList();
      const cur = this._current;
      if (cur && cur.status === 'uploading' && this._status.kind === 'shooting') {
        this._announce(fmt(this._labels.srUploading, { name: cur.name }));
        this._setStatus({ kind: 'uploading', item: cur });
      }
    });
    q.addEventListener('progress', (e) => {
      const { item } = e.detail;
      this._updateRow(item);
      if (this._current === item) this._setStatus({ kind: 'uploading', item });
    });
    q.addEventListener('add', (e) => this._fire('vv-select', { items: e.detail.items }));
    q.addEventListener('uploaded', (e) => {
      // Chưa cộng điểm cho tới khi bóng lọt lưới (xem _land).
      this._pendingScore = e.detail.item;
      this._announce(fmt(this._labels.srDone, { name: e.detail.item.name }));
      this._fire('vv-uploaded', e.detail);
    });
    q.addEventListener('error', (e) => {
      const { item, error } = e.detail;
      if (error instanceof NoUploaderError) {
        console.warn('[ui-vuivui] <vv-basket-upload> chưa có uploader. Gán element.uploader = xhrUploader(url) hoặc hàm của bạn.');
      }
      this._announce(fmt(this._labels.srError, { name: item.name, reason: this._reason(error) }));
      this._fire('vv-error', e.detail);
    });
    q.addEventListener('reject', (e) => {
      const { file, reason } = e.detail;
      const L = this._labels;
      const msg = reason === 'size'
        ? fmt(L.rejectSize, { name: file.name, max: formatSize(parseSize(q.maxSize)) })
        : fmt(L.rejectType, { name: file.name });
      this._sfx('buzz');
      this._setStatus({ kind: 'reject', message: msg });
      this._announce(msg);
      this._fire('vv-reject', e.detail);
    });
    q.addEventListener('remove', (e) => {
      const { item } = e.detail;
      if (item === this._pendingScore) this._pendingScore = null;
      if (item === this._current) {
        this._current = null;
        this._stopRoll();
        this._hideBall();
        this._setStatus({ kind: 'idle' });
      }
      this._fire('vv-remove', e.detail);
    });
    q.addEventListener('drain', () => {
      this._renderCta();
      this._fire('vv-drain', { items: q.items });
    });
  }

  _wireUi() {
    const { sound, zone, cta, picker, card } = this._el;

    sound.addEventListener('click', () => {
      this.toggleAttribute('sound', !this._soundOn);
      if (this._soundOn) playSound('score');
    });
    cta.addEventListener('click', () => this.openPicker());
    zone.addEventListener('click', () => this.openPicker());
    picker.addEventListener('change', () => {
      this._addFiles(picker.files, null);
      picker.value = '';
    });

    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

    this.addEventListener('dragenter', (e) => {
      if (!hasFiles(e) || this.disabled) return;
      e.preventDefault();
      this._dragDepth++;
      if (this._dragDepth === 1) {
        card.classList.add('dragging');
        this._renderStatus();
        this._renderCta();
      }
    });
    this.addEventListener('dragover', (e) => {
      if (!hasFiles(e) || this.disabled) return;
      e.preventDefault(); // bắt buộc, nếu không sự kiện drop sẽ không xảy ra
      e.dataTransfer.dropEffect = 'copy';
      this._dragPos = this._toCard(e.clientX, e.clientY);
      this._drawAim();
    });
    this.addEventListener('dragleave', (e) => {
      if (!hasFiles(e)) return;
      this._dragDepth = Math.max(0, this._dragDepth - 1);
      if (this._dragDepth === 0) this._endDrag();
    });
    this.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      const origin = this._toCard(e.clientX, e.clientY);
      this._endDrag();
      if (this.disabled) return;
      this._addFiles(e.dataTransfer.files, origin);
    });
  }

  _endDrag() {
    this._dragDepth = 0;
    this._dragPos = null;
    this._el.card.classList.remove('dragging');
    this._el.aim.style.display = 'none';
    this._renderStatus();
    this._renderCta();
  }

  _addFiles(files, origin) {
    let list = Array.from(files || []);
    if (!this.hasAttribute('multiple')) list = list.slice(0, 1);
    // Quả đầu tiên bay từ chỗ thả; các quả chờ sau bay từ nút (nơi hiện bóng chờ).
    return this._queue.add(list, (file, i) => ({ origin: i === 0 ? origin : null }));
  }

  _fire(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  _sfx(name) {
    if (this._soundOn) playSound(name);
  }

  _announce(text) {
    this._el.sr.textContent = '';
    // Gán lại sau một nhịp để trình đọc màn hình đọc cả khi nội dung trùng.
    setTimeout(() => { this._el.sr.textContent = text; }, 30);
  }

  _reason(error) {
    if (error instanceof NoUploaderError) return this._labels.noUploader;
    return error?.message || this._labels.errorGeneric;
  }

  // ---------- Tọa độ ----------

  _toCard(clientX, clientY) {
    const r = this._el.card.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  _rim() {
    const c = this._el.card.getBoundingClientRect();
    const h = this._el.hoop.getBoundingClientRect();
    return { x: h.left - c.left + h.width * RIM_CENTER.x, y: h.top - c.top + h.height * RIM_CENTER.y };
  }

  _ctaPoint() {
    const c = this._el.card.getBoundingClientRect();
    const b = this._el.cta.getBoundingClientRect();
    return { x: b.left - c.left + b.width / 2, y: b.top - c.top + b.height / 2 };
  }

  _drawAim() {
    if (!this._dragPos || this._aimQueued) return;
    this._aimQueued = true;
    requestAnimationFrame(() => {
      this._aimQueued = false;
      if (!this._dragPos) return;
      const { aim, aimPath, aimDot, card } = this._el;
      const rim = this._rim();
      const to = { x: rim.x, y: rim.y - REST_ABOVE_RIM };
      aim.setAttribute('viewBox', `0 0 ${card.clientWidth} ${card.clientHeight}`);
      aimPath.setAttribute('d', arcPath(this._dragPos, to, 90));
      aimDot.setAttribute('cx', this._dragPos.x);
      aimDot.setAttribute('cy', this._dragPos.y);
      aim.style.display = '';
    });
  }

  // ---------- Quả bóng ----------

  _placeBall(x, y, rot = 0, scale = 1, opacity = 1) {
    this._ballPos = { x, y };
    const b = this._el.ball;
    b.style.opacity = String(opacity);
    b.style.transform = `translate(${x - BALL / 2}px, ${y - BALL / 2}px) rotate(${rot}deg) scale(${scale})`;
  }

  _hideBall() {
    this._el.ball.style.opacity = '0';
  }

  _startRoll(item) {
    this._stopRoll();
    const rim = this._rim();
    const t0 = performance.now();
    let stopped = false;
    const frame = (now) => {
      if (stopped) return;
      const t = (now - t0) / 1000;
      // Lăn quanh vành: biên độ nhỏ dần khi tiến trình tăng (bóng "lắng" vào rổ).
      const amp = 13 * (1 - item.progress) + 2;
      const x = rim.x + Math.sin(t * 4.2) * amp;
      const y = rim.y - REST_ABOVE_RIM - Math.abs(Math.cos(t * 4.2)) * 2.5;
      this._placeBall(x, y, Math.sin(t * 4.2) * 70, 0.92);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    this._roll = () => { stopped = true; };
  }

  _stopRoll() {
    this._roll?.();
    this._roll = null;
  }

  // Hook chạy trước khi upload: bay vào vành rồi lăn vành.
  async _shoot(item) {
    this._current = item;
    this._setStatus({ kind: 'shooting', item });
    this._renderCta();
    if (prefersReducedMotion()) return;

    const from = item.meta.origin || this._ctaPoint();
    const rim = this._rim();
    const to = { x: rim.x, y: rim.y - REST_ABOVE_RIM };
    const ctrl = arcControl(from, to, 90);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    this._sfx('whoosh');
    await tween({
      duration: Math.min(950, 450 + dist * 1.1),
      easing: ease.linear,
      onUpdate: (e) => {
        const p = quadPoint(from, ctrl, to, e);
        this._placeBall(p.x, p.y, e * 540, 1.18 - 0.26 * e);
      },
    });
    if (item.status === 'removed') {
      this._hideBall();
      return;
    }
    this._startRoll(item);
  }

  // Hook chạy sau khi có kết quả: lọt lưới hoặc bật vành.
  async _land(item) {
    this._stopRoll();
    const reduced = prefersReducedMotion();
    const rim = this._rim();
    const from = this._ballPos || { x: rim.x, y: rim.y - REST_ABOVE_RIM };

    if (item.status === 'done') {
      if (!reduced) {
        const net = this._el.net;
        net.classList.remove('swish');
        void net.getBoundingClientRect();
        net.classList.add('swish');
        this._sfx('swish');
        await tween({
          duration: 430,
          easing: ease.inQuad,
          onUpdate: (e) => this._placeBall(
            from.x + (rim.x - from.x) * Math.min(1, e * 2),
            from.y + (rim.y + 62 - from.y) * e,
            e * 120, 0.92 - e * 0.1, e > 0.7 ? (1 - e) / 0.3 : 1,
          ),
        });
      }
      this._hideBall();
      this._sfx('score');
      if (this._pendingScore === item) this._pendingScore = null;
      this._renderScore(true);
      this._setStatus({ kind: 'success', item });
      await wait(reduced ? 250 : 650);
    } else {
      if (!reduced) {
        const hoop = this._el.hoop;
        hoop.classList.remove('clank');
        void hoop.getBoundingClientRect();
        hoop.classList.add('clank');
        this._sfx('rim');
        const side = from.x >= rim.x ? 1 : -1;
        const to = { x: rim.x + side * 125, y: rim.y + 170 };
        const ctrl = { x: rim.x + side * 70, y: rim.y - 70 };
        await tween({
          duration: 720,
          easing: ease.linear,
          onUpdate: (e) => {
            const p = quadPoint(from, ctrl, to, e);
            this._placeBall(p.x, p.y, -e * 420, 0.92, e > 0.75 ? (1 - e) / 0.25 : 1);
          },
        });
        this._sfx('bounce');
      }
      this._hideBall();
      this._setStatus({ kind: 'miss', item });
      await wait(reduced ? 250 : 800);
    }
    if (this._current === item) this._current = null;
  }

  // ---------- Vẽ giao diện ----------

  _setStatus(status) {
    this._status = status;
    this._renderStatus();
  }

  _renderStatus() {
    const L = this._labels;
    const { zone, zoneIcon, zoneTitle, zoneSub, bar } = this._el;
    const dragging = this._dragDepth > 0;
    const s = dragging ? { kind: 'drag' } : this._status;
    const item = s.item;
    let icon = ICONS.upload;
    let title = L.idleTitle;
    let sub = L.idleSub;
    let progress = 0;

    switch (s.kind) {
      case 'drag': title = L.dragTitle; sub = L.dragSub; break;
      case 'shooting': icon = ICONS.ball; title = L.shootingTitle; sub = item.name; break;
      case 'uploading':
        icon = ICONS.ball;
        progress = item.progress;
        title = fmt(L.uploadingTitle, { p: Math.round(progress * 100) });
        sub = fmt(L.uploadingSub, { name: item.name });
        break;
      case 'success': icon = ICONS.check; title = L.successTitle; sub = L.successSub; progress = 1; break;
      case 'miss': icon = ICONS.miss; title = L.missTitle; sub = `${item.name} — ${this._reason(item.error)}`; break;
      case 'reject': icon = ICONS.miss; title = L.rejectTitle; sub = s.message; break;
      default: break;
    }
    zone.dataset.kind = s.kind;
    if (zoneIcon.dataset.icon !== icon) {
      zoneIcon.innerHTML = icon;
      zoneIcon.dataset.icon = icon;
    }
    zoneTitle.textContent = title;
    zoneSub.textContent = sub;
    bar.style.width = `${Math.round(progress * 100)}%`;
  }

  _renderTexts() {
    const L = this._labels;
    const e = this._el;
    e.tA.textContent = L.titleA;
    e.tB.textContent = L.titleB;
    e.sub.textContent = L.subtitle;
    e.boardLabel.textContent = L.board;
    e.lTitle.textContent = L.listTitle;
    const [a, b] = L.tag.split('|');
    e.tag.innerHTML = '';
    e.tag.append(a, document.createElement('br'), b || '');
    const on = this._soundOn;
    e.sound.setAttribute('aria-pressed', String(on));
    e.sound.setAttribute('aria-label', on ? L.soundOff : L.soundOn);
    e.sound.title = on ? L.soundOff : L.soundOn;
    e.sound.innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
    this._renderScore(false);
    this._renderStatus();
    this._renderCta();
    for (const item of this._queue.items) this._updateRow(item);
    this._renderListHead();
  }

  _renderScore(bump) {
    const pending = this._pendingScore && this._pendingScore.status === 'done' ? 1 : 0;
    const n = this._queue.doneCount - pending;
    const { digits, board } = this._el;
    digits.textContent = String(n).padStart(2, '0');
    board.setAttribute('aria-label', fmt(this._labels.boardAria, { n }));
    if (bump) {
      digits.classList.remove('bump');
      void digits.offsetWidth;
      digits.classList.add('bump');
    }
  }

  _renderCta() {
    const L = this._labels;
    const cta = this._el.cta;
    const waiting = this._queue.waitingCount;
    cta.innerHTML = '';
    if (this._dragDepth > 0) {
      cta.insertAdjacentHTML('beforeend', ICONS.ball);
      cta.append(L.ctaDrag);
    } else if (waiting > 0) {
      cta.append(L.ctaWaiting);
      const balls = document.createElement('span');
      balls.className = 'balls';
      balls.innerHTML = ICONS.ball.repeat(Math.min(waiting, 5));
      cta.append(balls);
      if (waiting > 5) cta.append(`+${waiting - 5}`);
    } else if (this._queue.busy && this._current) {
      cta.insertAdjacentHTML('beforeend', ICONS.ball);
      cta.append(L.ctaBusy);
    } else {
      cta.insertAdjacentHTML('beforeend', ICONS.ball);
      cta.append(L.cta);
    }
  }

  _renderListHead() {
    const n = this._queue.items.length;
    this._el.lCount.textContent = fmt(this._labels.count, { n });
    this._el.list.hidden = n === 0;
  }

  _renderList() {
    const items = this._queue.items;
    const ids = new Set(items.map((i) => i.id));
    for (const [id, li] of this._rows) {
      if (!ids.has(id)) {
        li.remove();
        this._rows.delete(id);
      }
    }
    // Mới nhất lên đầu, như trong video.
    const ul = this._el.ul;
    items.slice().reverse().forEach((item, idx) => {
      let li = this._rows.get(item.id);
      if (!li) {
        li = this._createRow(item);
        this._rows.set(item.id, li);
      }
      if (ul.children[idx] !== li) ul.insertBefore(li, ul.children[idx] || null);
      this._updateRow(item);
    });
    this._renderListHead();
    this._renderScore(false);
    this._renderCta();
  }

  _createRow(item) {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="thumb"></div>
      <div class="info"><p class="name"></p><p class="meta"></p></div>
      <span class="state"></span>
      <button class="icon-btn retry" type="button" hidden>${ICONS.retry}</button>
      <button class="icon-btn del" type="button">${ICONS.trash}</button>`;
    const thumb = li.querySelector('.thumb');
    if (item.thumb) {
      const img = document.createElement('img');
      img.alt = '';
      img.addEventListener('error', () => { thumb.textContent = extOf(item.name); }, { once: true });
      img.src = item.thumb;
      thumb.append(img);
    } else {
      thumb.textContent = extOf(item.name);
    }
    li.querySelector('.name').textContent = item.name;
    li.querySelector('.retry').addEventListener('click', () => this._queue.retry(item.id));
    li.querySelector('.del').addEventListener('click', () => this._queue.remove(item.id));
    return li;
  }

  _updateRow(item) {
    const li = this._rows.get(item.id);
    if (!li) return;
    const L = this._labels;
    li.dataset.status = item.status;
    li.style.setProperty('--p', item.progress.toFixed(3));
    const base = `${extOf(item.name)} · ${formatSize(item.size)}`;
    let meta = base;
    if (item.status === 'waiting' || item.status === 'shooting') meta = `${base} · ${L.waiting}`;
    else if (item.status === 'uploading') meta = `${base} · ${Math.round(item.progress * 100)}%`;
    else if (item.status === 'error') meta = this._reason(item.error);
    li.querySelector('.meta').textContent = meta;

    const state = li.querySelector('.state');
    const icon = { done: ICONS.done, error: ICONS.miss, waiting: ICONS.ball, shooting: ICONS.ball }[item.status] || '';
    if (state.dataset.icon !== item.status) {
      state.innerHTML = icon;
      state.dataset.icon = item.status;
    }
    const retry = li.querySelector('.retry');
    retry.hidden = item.status !== 'error';
    retry.setAttribute('aria-label', `${L.retry}: ${item.name}`);
    retry.title = L.retry;
    const del = li.querySelector('.del');
    del.setAttribute('aria-label', fmt(L.remove, { name: item.name }));
    del.title = fmt(L.remove, { name: '' }).trim();
  }
}

if (!customElements.get('vv-basket-upload')) {
  customElements.define('vv-basket-upload', VvBasketUpload);
}
