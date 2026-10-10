// Hàng chờ upload dùng chung cho mọi "bộ da" upload (ném rổ, ...).
// Không phụ thuộc DOM: chỉ cần File/Blob, nên test được trong Node.
//
// Vòng đời một item: waiting → shooting → uploading → done | error
//   - shooting: bộ da đang diễn hoạt cảnh trước khi upload (hook beforeUpload)
//   - error có thể retry() để quay lại waiting.
// Các item được xử lý TUẦN TỰ, mỗi lúc một item.

let nextId = 1;

/** Chuyển "10MB", "512kb", 2048 → số byte. Trả về Infinity nếu rỗng. */
export function parseSize(value) {
  if (value == null || value === '') return Infinity;
  if (typeof value === 'number') return value;
  const m = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
  if (!m) return Infinity;
  const mult = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[(m[2] || 'b').toLowerCase()];
  return Math.round(parseFloat(m[1]) * mult);
}

/** Kiểm tra file theo cú pháp thuộc tính accept của <input type=file>. */
export function matchesAccept(file, accept) {
  if (!accept) return true;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export class NoUploaderError extends Error {
  constructor() {
    super('Chưa cấu hình uploader');
    this.name = 'NoUploaderError';
  }
}

export class UploadQueue extends EventTarget {
  /**
   * @param {object} opts
   * @param {(file: File, ctx: {onProgress:(p:number)=>void, signal:AbortSignal}) => Promise<any>} [opts.uploader]
   * @param {(item) => Promise<void>|void} [opts.beforeUpload] hoạt cảnh trước khi upload
   * @param {(item) => Promise<void>|void} [opts.afterUpload] hoạt cảnh sau khi có kết quả (done/error)
   * @param {string} [opts.accept]
   * @param {number|string} [opts.maxSize]
   * @param {boolean} [opts.thumbnails] tạo ảnh xem trước cho file ảnh
   */
  constructor(opts = {}) {
    super();
    this.uploader = opts.uploader ?? null;
    this.beforeUpload = opts.beforeUpload ?? null;
    this.afterUpload = opts.afterUpload ?? null;
    this.accept = opts.accept ?? '';
    this.maxSize = opts.maxSize ?? Infinity;
    this.thumbnails = opts.thumbnails ?? true;
    this._items = [];
    this._running = false;
  }

  get items() {
    return this._items.slice();
  }

  get waitingCount() {
    return this._items.filter((i) => i.status === 'waiting').length;
  }

  get doneCount() {
    return this._items.filter((i) => i.status === 'done').length;
  }

  get busy() {
    return this._running;
  }

  /**
   * Thêm file. Trả về các item được nhận; file bị loại phát sự kiện 'reject'.
   * `meta` là object gắn vào mọi item, hoặc hàm (file, index) => object.
   */
  add(files, meta = {}) {
    const added = [];
    for (const [index, file] of Array.from(files || []).entries()) {
      const reason = !matchesAccept(file, this.accept) ? 'type'
        : file.size > parseSize(this.maxSize) ? 'size' : null;
      if (reason) {
        this._emit('reject', { file, reason });
        continue;
      }
      const item = {
        id: nextId++,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'waiting',
        progress: 0,
        result: undefined,
        error: undefined,
        thumb: this.thumbnails && /^image\//.test(file.type) && typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file) : null,
        meta: { ...(typeof meta === 'function' ? meta(file, index) : meta) },
        _abort: null,
      };
      this._items.push(item);
      added.push(item);
    }
    if (added.length) {
      this._emit('add', { items: added });
      this._change();
      this._pump();
    }
    return added;
  }

  remove(id) {
    const idx = this._items.findIndex((i) => i.id === id);
    if (idx < 0) return null;
    const [item] = this._items.splice(idx, 1);
    item._abort?.abort();
    this._revoke(item);
    item.status = 'removed';
    this._emit('remove', { item });
    this._change();
    return item;
  }

  retry(id) {
    const item = this._items.find((i) => i.id === id);
    if (!item || item.status !== 'error') return false;
    item.status = 'waiting';
    item.progress = 0;
    item.error = undefined;
    this._change();
    this._pump();
    return true;
  }

  clear() {
    for (const item of this._items) {
      item._abort?.abort();
      this._revoke(item);
    }
    this._items = [];
    this._change();
  }

  /** Promise xong khi hàng chờ rỗng (tiện cho test). */
  idle() {
    if (!this._running && this.waitingCount === 0) return Promise.resolve();
    return new Promise((resolve) => this.addEventListener('drain', () => resolve(), { once: true }));
  }

  async _pump() {
    if (this._running) return;
    this._running = true;
    try {
      let item;
      while ((item = this._items.find((i) => i.status === 'waiting'))) {
        await this._process(item);
      }
    } finally {
      this._running = false;
    }
    this._emit('drain', {});
  }

  async _process(item) {
    item.status = 'shooting';
    this._change();
    await this._safeHook(this.beforeUpload, item);
    if (!this._items.includes(item)) return; // bị xóa trong lúc diễn hoạt cảnh

    item.status = 'uploading';
    const ctrl = new AbortController();
    item._abort = ctrl;
    this._change();
    try {
      if (!this.uploader) throw new NoUploaderError();
      const result = await this.uploader(item.file, {
        signal: ctrl.signal,
        onProgress: (p) => {
          if (item.status !== 'uploading') return;
          item.progress = Math.max(0, Math.min(1, p));
          this._emit('progress', { item });
        },
      });
      if (ctrl.signal.aborted) return;
      item.status = 'done';
      item.progress = 1;
      item.result = result;
      this._emit('uploaded', { item, result });
    } catch (error) {
      if (ctrl.signal.aborted) return;
      item.status = 'error';
      item.error = error;
      this._emit('error', { item, error });
    } finally {
      item._abort = null;
    }
    this._change();
    await this._safeHook(this.afterUpload, item);
  }

  async _safeHook(hook, item) {
    if (!hook) return;
    try {
      await hook(item);
    } catch (e) {
      // Lỗi hoạt cảnh không được làm hỏng việc upload.
      console.error('[ui-vuivui] lỗi hoạt cảnh:', e);
    }
  }

  _revoke(item) {
    if (item.thumb) {
      URL.revokeObjectURL(item.thumb);
      item.thumb = null;
    }
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  _change() {
    this._emit('change', { items: this.items });
  }
}
