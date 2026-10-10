import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { xhrUploader, UploadHttpError } from '../src/core/xhr-uploader.js';

// XHR giả đủ dùng: ghi lại request, test tự điều khiển tiến trình/kết quả.
class FakeXHR {
  static last = null;
  constructor() {
    this.headers = {};
    this.upload = {};
    this.status = 0;
    this.responseText = '';
    this.aborted = false;
    FakeXHR.last = this;
  }
  open(method, url) { this.method = method; this.url = url; }
  setRequestHeader(k, v) { this.headers[k] = v; }
  send(body) { this.body = body; }
  abort() { this.aborted = true; this.onabort?.(); }
  // điều khiển từ test
  progress(loaded, total) { this.upload.onprogress?.({ lengthComputable: true, loaded, total }); }
  respond(status, text) { this.status = status; this.responseText = text; this.onload?.(); }
}

const file = () => new File(['abc'], 'a.txt', { type: 'text/plain' });

beforeEach(() => vi.stubGlobal('XMLHttpRequest', FakeXHR));
afterEach(() => vi.unstubAllGlobals());

describe('xhrUploader', () => {
  it('gửi multipart, báo tiến trình, trả JSON khi 2xx', async () => {
    const onProgress = vi.fn();
    const up = xhrUploader('/api/up', { fieldName: 'doc', fields: { lop: '6' }, headers: { 'X-Token': 't' } });
    const p = up(file(), { onProgress, signal: new AbortController().signal });
    const x = FakeXHR.last;
    expect(x.method).toBe('POST');
    expect(x.url).toBe('/api/up');
    expect(x.headers['X-Token']).toBe('t');
    expect(x.body).toBeInstanceOf(FormData);
    expect(x.body.get('lop')).toBe('6');
    expect(x.body.get('doc').name).toBe('a.txt');
    x.progress(1, 4);
    x.respond(201, '{"id":7}');
    await expect(p).resolves.toEqual({ id: 7 });
    expect(onProgress).toHaveBeenCalledWith(0.25);
  });

  it('trả text khi phản hồi không phải JSON', async () => {
    const p = xhrUploader('/u')(file(), {});
    FakeXHR.last.respond(200, 'ok');
    await expect(p).resolves.toBe('ok');
  });

  it('non-2xx → UploadHttpError có status', async () => {
    const p = xhrUploader('/u')(file(), {});
    FakeXHR.last.respond(413, '{"error":"quá lớn"}');
    const err = await p.catch((e) => e);
    expect(err).toBeInstanceOf(UploadHttpError);
    expect(err.status).toBe(413);
    expect(err.body).toEqual({ error: 'quá lớn' });
  });

  it('hủy giữa chừng → AbortError, request bị abort', async () => {
    const ctrl = new AbortController();
    const p = xhrUploader('/u')(file(), { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeXHR.last.aborted).toBe(true);
  });

  it('signal đã hủy từ trước → reject ngay, không mở request', async () => {
    FakeXHR.last = null;
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(xhrUploader('/u')(file(), { signal: ctrl.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeXHR.last).toBeNull();
  });

  it('chế độ raw gửi thẳng file với Content-Type, url dạng hàm', async () => {
    const p = xhrUploader((f) => `/r2/${f.name}`, { method: 'PUT', body: 'raw' })(file(), {});
    const x = FakeXHR.last;
    expect(x.url).toBe('/r2/a.txt');
    expect(x.method).toBe('PUT');
    expect(x.body).toBeInstanceOf(File);
    expect(x.headers['Content-Type']).toBe('text/plain');
    x.respond(200, '');
    await p;
  });
});
