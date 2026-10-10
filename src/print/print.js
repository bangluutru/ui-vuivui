// <vv-print> — "máy in tham ăn": kéo tờ giấy vào miệng máy in → máy nhai → nhả trang in ra
// → mở HỘP THOẠI IN của trình duyệt (trình duyệt không bao giờ cho in im lặng).
//
// In cái gì (theo thuộc tính):
//   target="#phieu"   một phần của trang — in thẳng trang đang mở, ẩn mọi thứ khác bằng @media print
//                     (giữ nguyên chữ người dùng đã gõ, ảnh, canvas, shadow DOM)
//   src="/de/x.pdf"   một tài liệu (PDF, ảnh, văn bản, trang HTML tĩnh) — tải về, in trong iframe ẩn
//   (không có)        cả trang
//   accept-files      cho thả / chọn file PDF, ảnh, văn bản để in (KHÔNG nhận HTML thả vào)
//
// In thẳng không hộp thoại: gán `printHandler = agentPrintHandler({ token })` và chạy
// tools/print-agent.mjs trên máy. Chỉ áp dụng cho FILE; in trang vẫn dùng hộp thoại.
//
// Không biết được người dùng đã bấm In hay Hủy — sự kiện chỉ báo "hộp thoại đã đóng".

import { playSound } from '../core/sound.js';
import { tween, ease, prefersReducedMotion } from '../core/motion.js';
import { fmt, pickLabels } from '../core/i18n.js';
import { sniffKind, imagePage, textPage, withBase, expectedKind } from './doc.js';
import { LABELS } from './labels.js';
import { STYLES } from './styles.js';
import { PRINTER_SVG, PAPER_SVG, SLOT, ICONS } from './art.js';

const IMAGE_KINDS = ['png', 'jpeg', 'webp', 'gif', 'svg'];
const MIME = { pdf: 'application/pdf', png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', text: 'text/plain;charset=utf-8', html: 'text/html;charset=utf-8' };
const TARGET_STYLE_ID = 'vv-print-target-style';
const CLEANUP_MS = 60000;

const template = document.createElement('template');
template.innerHTML = `
<style>${STYLES}</style>
<div class="card" part="card" data-state="idle">
  <div class="head"><h3 class="title"></h3><button class="sound" type="button"></button></div>
  <div class="stage">
    <div class="stack" aria-hidden="true"></div>
    <div class="out-wrap" aria-hidden="true"><div class="out">${PAPER_SVG}</div></div>
    <div class="printer" aria-hidden="true">${PRINTER_SVG}</div>
    <button class="paper" type="button">${PAPER_SVG}<span class="tag"></span></button>
  </div>
  <p class="status" aria-live="polite"></p>
  <div class="actions">
    <button class="go" type="button" part="button">${ICONS.printer}<span></span></button>
    <button class="ghost pick" type="button" hidden></button>
    <a class="ghost open" target="_blank" rel="noopener" hidden></a>
  </div>
  <input class="picker" type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,image/svg+xml,text/plain">
</div>`;

export class VvPrint extends HTMLElement {
  /** Mọi lệnh in đều đi qua đây (test thay hàm này để không mở hộp thoại thật). */
  static printWindow = (win) => win.print();

  static get observedAttributes() {
    return ['src', 'target', 'lang', 'sound', 'disabled', 'accept-files', 'doc-title'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    const $ = (s) => root.querySelector(s);
    this._el = {
      card: $('.card'), title: $('.title'), sound: $('.sound'), stage: $('.stage'), printer: $('.printer'),
      paper: $('.paper'), tag: $('.tag'), outWrap: $('.out-wrap'), out: $('.out'),
      status: $('.status'), go: $('.go'), goText: $('.go span'), pick: $('.pick'), open: $('.open'), picker: $('.picker'),
    };
    this.printHandler = null;
    this._labelsOverride = {};
    this._state = 'idle';
    this._busy = false;
    this._gesture = null;
    this._file = null;
    this._wire();
  }

  // ---------- API công khai ----------

  get labels() { return this._labels; }
  set labels(obj) { this._labelsOverride = obj || {}; this._render(); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  /**
   * In. Gọi từ một thao tác của người dùng (bấm/chạm) để trình duyệt cho mở hộp thoại.
   * @param {{type:'page'}|{type:'target', selector:string}|{type:'url', url:string}|{type:'file', file:File}} [source]
   */
  print(source = this._defaultSource()) { return this._run(source); }

  connectedCallback() { this._render(); this._layoutOut(); }

  attributeChangedCallback(name) {
    // Đổi nguồn in → quên file đã thả trước đó.
    if ((name === 'src' || name === 'target') && this._file) {
      this._file = null;
      this._el.tag.textContent = '';
    }
    this._render();
  }

  get _labels() { return pickLabels(LABELS, this, this._labelsOverride); }
  _sfx(n) { if (this.hasAttribute('sound')) playSound(n); }
  _fire(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true })); }

  _defaultSource() {
    if (this._file) return { type: 'file', file: this._file };
    const src = this.getAttribute('src');
    if (src) return { type: 'url', url: src };
    const target = this.getAttribute('target');
    if (target) return { type: 'target', selector: target };
    return { type: 'page' };
  }

  // ---------- Giao diện ----------

  _wire() {
    const e = this._el;
    e.sound.addEventListener('click', () => {
      this.toggleAttribute('sound', !this.hasAttribute('sound'));
      if (this.hasAttribute('sound')) playSound('thunk');
    });
    e.go.addEventListener('click', () => this.print());
    e.pick.addEventListener('click', () => e.picker.click());
    e.picker.addEventListener('change', () => {
      const f = e.picker.files?.[0];
      e.picker.value = '';
      if (f) this._takeFile(f);
    });
    e.paper.addEventListener('pointerdown', (ev) => this._onDown(ev));
    e.paper.addEventListener('click', (ev) => { if (ev.detail === 0) this.print(); }); // Enter / Space
    e.paper.addEventListener('contextmenu', (ev) => ev.preventDefault());

    // Thả file vào máy in (khi có accept-files).
    const hasFiles = (ev) => [...(ev.dataTransfer?.types || [])].includes('Files');
    let depth = 0;
    this.addEventListener('dragenter', (ev) => {
      if (!hasFiles(ev) || !this.hasAttribute('accept-files') || this._busy) return;
      ev.preventDefault();
      if (++depth === 1) { e.card.classList.add('dropping'); e.printer.classList.add('hungry'); }
    });
    this.addEventListener('dragover', (ev) => {
      if (!hasFiles(ev) || !this.hasAttribute('accept-files')) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'copy';
    });
    this.addEventListener('dragleave', (ev) => {
      if (!hasFiles(ev)) return;
      if (--depth <= 0) { depth = 0; e.card.classList.remove('dropping'); e.printer.classList.remove('hungry'); }
    });
    this.addEventListener('drop', (ev) => {
      if (!hasFiles(ev)) return;
      ev.preventDefault();
      depth = 0;
      e.card.classList.remove('dropping');
      e.printer.classList.remove('hungry');
      const f = ev.dataTransfer.files?.[0];
      if (f && this.hasAttribute('accept-files') && !this._busy) this._takeFile(f, true);
    });
  }

  _takeFile(file, andPrint = true) {
    this._file = file;
    this._el.tag.textContent = file.name;
    if (andPrint) this.print({ type: 'file', file });
  }

  _setState(s, text = '') {
    this._state = s;
    this._el.card.dataset.state = s;
    this._statusText = text;
    this._render();
  }

  _render() {
    const L = this._labels;
    const e = this._el;
    const files = this.hasAttribute('accept-files');
    e.title.textContent = L.title;
    e.goText.textContent = this._busy ? L.buttonBusy : L.button;
    e.go.disabled = this._busy || this.disabled;
    e.paper.disabled = this.disabled;
    e.paper.setAttribute('aria-label', L.paper);
    e.pick.hidden = !files;
    e.pick.textContent = L.pick;
    e.status.textContent = this._state === 'idle' ? (files ? L.idleFiles : L.idle) : this._statusText;
    e.open.textContent = L.openTab;
    const on = this.hasAttribute('sound');
    e.sound.setAttribute('aria-pressed', String(on));
    e.sound.setAttribute('aria-label', on ? L.soundOff : L.soundOn);
    e.sound.innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
  }

  /** Đặt khung "giấy in ra" ngay dưới khay của máy in. */
  _layoutOut() {
    const { stage, printer, outWrap } = this._el;
    const s = stage.getBoundingClientRect();
    const p = printer.getBoundingClientRect();
    if (!p.width) return;
    const w = p.width * 0.5;
    outWrap.style.left = `${p.left - s.left + (p.width - w) / 2}px`;
    outWrap.style.top = `${p.top - s.top + p.height * (138 / 170)}px`;
    outWrap.style.width = `${w}px`;
    outWrap.style.height = `${w * 76 / 60}px`;
  }

  // ---------- Kéo tờ giấy ----------

  _onDown(ev) {
    if (this._busy || this.disabled) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ev.preventDefault();
    if (this._gesture) this._cancelGesture();
    const paper = this._el.paper;
    try { paper.setPointerCapture(ev.pointerId); } catch { /* sự kiện giả lập */ }
    const g = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, dx: 0, dy: 0, moved: false, ended: false };
    this._gesture = g;
    this._el.printer.classList.add('hungry');
    g.onMove = (e2) => {
      if (e2.pointerId !== g.id) return;
      if (e2.pointerType === 'mouse' && e2.buttons === 0) { this._cancelGesture(); return; }
      g.dx = e2.clientX - g.x0;
      g.dy = e2.clientY - g.y0;
      if (Math.hypot(g.dx, g.dy) > 6) g.moved = true;
      paper.style.transform = `translate(${g.dx}px, ${g.dy}px) rotate(${Math.max(-12, Math.min(12, g.dx / 10))}deg)`;
    };
    g.onUp = (e2) => { if (e2.pointerId === g.id) this._release(g); };
    g.onCancel = (e2) => { if (e2.pointerId === g.id) this._cancelGesture(); };
    g.onLost = () => setTimeout(() => { if (this._gesture === g) this._cancelGesture(); }, 0);
    window.addEventListener('pointermove', g.onMove);
    window.addEventListener('pointerup', g.onUp);
    window.addEventListener('pointercancel', g.onCancel);
    paper.addEventListener('lostpointercapture', g.onLost);
  }

  _endGesture(g) {
    g.ended = true;
    window.removeEventListener('pointermove', g.onMove);
    window.removeEventListener('pointerup', g.onUp);
    window.removeEventListener('pointercancel', g.onCancel);
    this._el.paper.removeEventListener('lostpointercapture', g.onLost);
    if (this._gesture === g) this._gesture = null;
    this._el.printer.classList.remove('hungry');
  }

  _cancelGesture() {
    const g = this._gesture;
    if (!g || g.ended) return;
    this._endGesture(g);
    this._snapBack(g.dx, g.dy);
  }

  _release(g) {
    if (g.ended) return;
    this._endGesture(g);
    // Không kéo đi đâu = chạm nhẹ → in luôn. Kéo tới gần miệng máy in → in. Còn lại → trả giấy về.
    if (!g.moved || this._nearMouth()) {
      this._dragOffset = { x: g.dx, y: g.dy };
      this.print();
    } else {
      this._snapBack(g.dx, g.dy);
    }
  }

  _nearMouth() {
    const { paper, printer } = this._el;
    const a = paper.getBoundingClientRect();
    const p = printer.getBoundingClientRect();
    const mouth = { x: p.left + p.width * SLOT.x, y: p.top + p.height * SLOT.y };
    return Math.hypot(a.left + a.width / 2 - mouth.x, a.top + a.height / 2 - mouth.y) < Math.max(70, p.width * 0.4);
  }

  _snapBack(fx, fy) {
    const paper = this._el.paper;
    return tween({ duration: 260, easing: ease.outBack, onUpdate: (k) => { paper.style.transform = `translate(${fx * (1 - k)}px, ${fy * (1 - k)}px)`; } });
  }

  // ---------- Hoạt cảnh (≈1 giây, chạy song song với việc chuẩn bị tài liệu) ----------

  async _animate() {
    const { paper, printer, out, stage } = this._el;
    if (prefersReducedMotion()) return;
    const start = this._dragOffset || { x: 0, y: 0 };
    this._dragOffset = null;
    const s = stage.getBoundingClientRect();
    const pr = paper.getBoundingClientRect();
    const p = printer.getBoundingClientRect();
    const mouth = { x: p.left + p.width * SLOT.x, y: p.top + p.height * SLOT.y };
    const base = { x: pr.left - start.x + pr.width / 2, y: pr.top - start.y + pr.height / 2 };
    const to = { x: mouth.x - base.x, y: mouth.y - base.y - pr.height * 0.45 };
    void s;
    this._sfx('whoosh');
    await tween({
      duration: 300,
      easing: ease.inOutQuad,
      onUpdate: (k) => {
        const x = start.x + (to.x - start.x) * k;
        const y = start.y + (to.y - start.y) * k - Math.sin(k * Math.PI) * 30;
        paper.style.transform = `translate(${x}px, ${y}px) rotate(${(1 - k) * -8}deg)`;
      },
    });
    printer.classList.add('eating');
    this._sfx('thunk');
    await tween({
      duration: 240,
      easing: ease.inQuad,
      onUpdate: (k) => {
        paper.style.transformOrigin = '50% 100%';
        paper.style.transform = `translate(${to.x}px, ${to.y + pr.height * 0.45 * k}px) scale(${1 - 0.25 * k}, ${1 - k})`;
      },
    });
    paper.classList.add('gone');
    printer.classList.remove('eating');
    printer.classList.add('busy');
    this._sfx('printer');
    this._layoutOut();
    await tween({ duration: 480, easing: ease.outQuad, onUpdate: (k) => { out.style.transform = `translateY(${-100 + 100 * k}%)`; } });
    printer.classList.remove('busy');
    printer.classList.add('happy');
  }

  _resetArt() {
    const { paper, printer, out } = this._el;
    printer.classList.remove('busy', 'eating', 'hungry', 'happy');
    paper.classList.remove('gone');
    paper.style.transform = '';
    paper.style.transformOrigin = '';
    out.style.transform = '';
  }

  // ---------- Chạy ----------

  async _run(source) {
    if (this._busy || this.disabled) return;
    const L = this._labels;
    this._busy = true;
    this._el.open.hidden = true;
    this._setState('feeding', L.feeding);
    const prep = this._prepare(source);
    prep.catch(() => {}); // lỗi xử lý bên dưới, sau khi hoạt cảnh xong
    let doc = null;
    try {
      await this._animate();
      doc = await prep;
      if (this.printHandler && doc.kind === 'frame') {
        const result = await this.printHandler({ blob: doc.blob, kind: doc.docKind, name: doc.name });
        doc.cleanup();
        this._setState('sent', fmt(L.sent, { job: result?.job || 'OK' }));
        this._fire('vv-print-sent', { source: this._describe(source), result });
      } else {
        this._setState('dialog', L.dialog);
        this._fire('vv-print-dialog', { source: this._describe(source) });
        await this._openDialog(doc);
        this._setState('closed', L.closed);
        this._fire('vv-print-closed', { source: this._describe(source) });
        if (doc.docKind === 'pdf' && doc.openUrl) this._showOpen(doc.openUrl);
      }
    } catch (error) {
      doc?.cleanup();
      const reason = error?.badType ? fmt(L.badType, { name: error.name || '' }) : (error?.message || '');
      this._setState('error', error?.badType ? reason : fmt(L.error, { reason }));
      if (error?.openUrl) this._showOpen(error.openUrl);
      this._sfx('buzz');
      this._fire('vv-print-error', { source: this._describe(source), error });
    } finally {
      this._busy = false;
      setTimeout(() => this._resetArt(), prefersReducedMotion() ? 0 : 900);
      this._render();
    }
  }

  _describe(source) {
    if (source.type === 'url') return { type: 'url', url: source.url };
    if (source.type === 'file') return { type: 'file', name: source.file.name };
    if (source.type === 'target') return { type: 'target', selector: source.selector };
    return { type: 'page' };
  }

  _showOpen(url) {
    const a = this._el.open;
    a.href = url;
    a.hidden = false;
  }

  /** Chuẩn bị tài liệu: trả về { kind:'page'|'target'|'frame', ... , cleanup() }. */
  async _prepare(source) {
    if (source.type === 'page') return { kind: 'page', cleanup() {} };
    if (source.type === 'target') {
      const el = document.querySelector(source.selector);
      if (!el) throw new Error(`Không tìm thấy phần cần in: ${source.selector}`);
      return { kind: 'target', el, cleanup() {} };
    }
    if (source.type === 'file') return this._prepareBlob(source.file, source.file.name, { allowHtml: false });
    // url
    const abs = new URL(source.url, document.baseURI).href;
    let res;
    try {
      res = await fetch(abs, { credentials: 'same-origin' });
    } catch {
      throw Object.assign(new Error('không tải được tài liệu (mạng hoặc CORS)'), { openUrl: abs });
    }
    if (!res.ok) throw Object.assign(new Error(`máy chủ trả về lỗi ${res.status}`), { openUrl: abs });
    const blob = await res.blob();
    const name = decodeURIComponent(new URL(res.url || abs).pathname.split('/').pop() || 'tai-lieu');
    // Máy chủ kiểu "app một trang" trả trang chủ (200) cho đường dẫn sai: đuôi .pdf mà nội dung là HTML → báo lỗi.
    const want = expectedKind(abs);
    if (want) {
      const got = sniffKind(new Uint8Array(await blob.slice(0, 4096).arrayBuffer()), blob.type);
      if (got !== want) throw Object.assign(new Error(`tài liệu không phải ${want.toUpperCase()} như đường dẫn (có thể đường dẫn sai)`), { openUrl: abs });
    }
    const doc = await this._prepareBlob(blob, name, { allowHtml: true, baseHref: res.url || abs });
    doc.openUrl = abs;
    return doc;
  }

  async _prepareBlob(blob, name, { allowHtml, baseHref }) {
    const head = new Uint8Array(await blob.slice(0, 4096).arrayBuffer());
    const kind = sniffKind(head, blob.type);
    if (!kind || (kind === 'html' && !allowHtml)) throw Object.assign(new Error('bad type'), { badType: true, name });
    const urls = [];
    const make = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
    const typed = new Blob([blob], { type: MIME[kind] });
    const title = this.getAttribute('doc-title') || name;
    let frameUrl;
    let sandbox = true;
    if (kind === 'pdf') {
      frameUrl = make(typed);
      sandbox = false; // trình xem PDF không chạy trong iframe sandbox; PDF không chạy mã của trang
    } else if (IMAGE_KINDS.includes(kind)) {
      frameUrl = make(new Blob([imagePage(make(typed), title)], { type: MIME.html }));
    } else if (kind === 'text') {
      frameUrl = make(new Blob([textPage(await blob.text(), title)], { type: MIME.html }));
    } else {
      frameUrl = make(new Blob([withBase(await blob.text(), baseHref)], { type: MIME.html }));
    }
    const frame = await this._loadFrame(frameUrl, sandbox, kind);
    let cleaned = false;
    return {
      kind: 'frame', docKind: kind, blob: typed, name, frame,
      cleanup() {
        if (cleaned) return;
        cleaned = true;
        frame.remove();
        urls.forEach((u) => URL.revokeObjectURL(u));
      },
    };
  }

  _loadFrame(url, sandbox, kind) {
    return new Promise((resolve, reject) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      f.title = 'vv-print';
      // 1×1, trong suốt — KHÔNG display:none (một số trình duyệt in ra trang trắng)
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none;';
      // Không bao giờ allow-scripts: HTML/SVG tải về không được chạy mã với quyền của trang.
      if (sandbox) f.setAttribute('sandbox', 'allow-same-origin allow-modals');
      const timer = setTimeout(() => { f.remove(); reject(new Error('tài liệu tải quá lâu')); }, 20000);
      f.addEventListener('load', async () => {
        clearTimeout(timer);
        try {
          const d = f.contentDocument;
          if (d) {
            await Promise.race([d.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
            await Promise.all([...d.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
          }
          if (kind === 'pdf') await new Promise((r) => setTimeout(r, 400)); // chờ trình xem PDF dựng xong
        } catch { /* bỏ qua */ }
        resolve(f);
      }, { once: true });
      f.src = url;
      document.body.append(f);
    });
  }

  /** Mở hộp thoại in; xong khi trình duyệt báo afterprint (hoặc hết thời gian chờ). */
  _openDialog(doc) {
    return new Promise((resolve) => {
      let done = false;
      let restore = () => {};
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        restore();
        doc.cleanup();
        resolve();
      };
      const timer = setTimeout(finish, CLEANUP_MS);
      const win = doc.kind === 'frame' ? doc.frame.contentWindow : window;
      win.addEventListener('afterprint', finish, { once: true });
      if (doc.kind === 'target') restore = this._isolateTarget(doc.el);
      try {
        VvPrint.printWindow(win);
      } catch (e) {
        finish();
        throw e;
      }
      // Trình duyệt chặn (Chrome) thì print() chỉ trả về sau khi đóng hộp thoại; afterprint thường đã tới.
    });
  }

  /** Chỉ in phần `el` của trang đang mở: ẩn mọi thứ khác bằng @media print. Trả về hàm dọn dẹp. */
  _isolateTarget(el) {
    if (!document.getElementById(TARGET_STYLE_ID)) {
      const st = document.createElement('style');
      st.id = TARGET_STYLE_ID;
      st.textContent = '@media print{html.vv-printing body *{visibility:hidden!important}'
        + 'html.vv-printing [data-vv-print-target],html.vv-printing [data-vv-print-target] *{visibility:visible!important}'
        + 'html.vv-printing [data-vv-print-target]{position:absolute!important;left:0!important;top:0!important;width:100%!important;margin:0!important}}';
      document.head.append(st);
    }
    el.setAttribute('data-vv-print-target', '');
    document.documentElement.classList.add('vv-printing');
    return () => {
      el.removeAttribute('data-vv-print-target');
      document.documentElement.classList.remove('vv-printing');
    };
  }
}

if (!customElements.get('vv-print')) {
  customElements.define('vv-print', VvPrint);
}
