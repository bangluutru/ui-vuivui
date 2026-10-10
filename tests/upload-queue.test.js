import { describe, it, expect, vi } from 'vitest';
import { UploadQueue, NoUploaderError, parseSize, matchesAccept, formatSize } from '../src/core/upload-queue.js';
import { quadPoint, arcControl } from '../src/core/motion.js';

const file = (name, size = 10, type = '') => new File([new Uint8Array(size)], name, { type });

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('tiện ích', () => {
  it('parseSize', () => {
    expect(parseSize('10MB')).toBe(10 * 1024 * 1024);
    expect(parseSize('512 kb')).toBe(512 * 1024);
    expect(parseSize(2048)).toBe(2048);
    expect(parseSize('')).toBe(Infinity);
    expect(parseSize('abc')).toBe(Infinity);
  });

  it('matchesAccept theo đuôi, MIME và MIME/*', () => {
    expect(matchesAccept(file('a.JPG', 1, 'image/jpeg'), 'image/*')).toBe(true);
    expect(matchesAccept(file('a.pdf', 1, 'application/pdf'), 'image/*')).toBe(false);
    expect(matchesAccept(file('a.pdf'), '.pdf, image/*')).toBe(true);
    expect(matchesAccept(file('a.txt', 1, 'text/plain'), 'text/plain')).toBe(true);
    expect(matchesAccept(file('a.txt'), '')).toBe(true);
  });

  it('formatSize', () => {
    expect(formatSize(500)).toBe('500 B');
    expect(formatSize(19251)).toBe('18.8 KB');
    expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('cung ném: đi qua hai đầu mút và đỉnh cao hơn đích', () => {
    const from = { x: 0, y: 300 };
    const to = { x: 200, y: 100 };
    const c = arcControl(from, to, 90);
    expect(quadPoint(from, c, to, 0)).toEqual(from);
    expect(quadPoint(from, c, to, 1)).toEqual(to);
    expect(c.y).toBeLessThan(to.y);
  });
});

describe('UploadQueue', () => {
  it('xử lý tuần tự, đúng thứ tự, chờ hoạt cảnh trước và sau', async () => {
    const order = [];
    const q = new UploadQueue({
      thumbnails: false,
      beforeUpload: async (i) => { order.push(`before:${i.name}`); },
      afterUpload: async (i) => { order.push(`after:${i.name}:${i.status}`); },
      uploader: async (f, { onProgress }) => {
        order.push(`up:${f.name}`);
        onProgress(0.5);
        return { url: `/f/${f.name}` };
      },
    });
    const uploaded = vi.fn();
    q.addEventListener('uploaded', uploaded);
    q.add([file('a'), file('b')]);
    await q.idle();
    expect(order).toEqual([
      'before:a', 'up:a', 'after:a:done',
      'before:b', 'up:b', 'after:b:done',
    ]);
    expect(uploaded).toHaveBeenCalledTimes(2);
    expect(q.doneCount).toBe(2);
    expect(q.items[0].result).toEqual({ url: '/f/a' });
  });

  it('chỉ một upload chạy cùng lúc', async () => {
    let active = 0;
    let maxActive = 0;
    const q = new UploadQueue({
      thumbnails: false,
      uploader: async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
      },
    });
    q.add([file('a'), file('b'), file('c')]);
    await q.idle();
    expect(maxActive).toBe(1);
  });

  it('không có uploader → lỗi NoUploaderError, không bao giờ báo thành công', async () => {
    const q = new UploadQueue({ thumbnails: false });
    const errors = [];
    q.addEventListener('error', (e) => errors.push(e.detail.error));
    q.add([file('a')]);
    await q.idle();
    expect(q.items[0].status).toBe('error');
    expect(errors[0]).toBeInstanceOf(NoUploaderError);
    expect(q.doneCount).toBe(0);
  });

  it('lỗi upload → error, retry → chạy lại và thành công', async () => {
    let calls = 0;
    const q = new UploadQueue({
      thumbnails: false,
      uploader: async () => {
        calls++;
        if (calls === 1) throw new Error('mạng hỏng');
        return 'ok';
      },
    });
    const [item] = q.add([file('a')]);
    await q.idle();
    expect(item.status).toBe('error');
    expect(item.error.message).toBe('mạng hỏng');
    expect(q.retry(item.id)).toBe(true);
    await q.idle();
    expect(item.status).toBe('done');
    expect(item.result).toBe('ok');
  });

  it('loại file sai loại / quá lớn bằng sự kiện reject', () => {
    const q = new UploadQueue({ thumbnails: false, accept: 'image/*', maxSize: '1kb', uploader: async () => {} });
    const rejects = [];
    q.addEventListener('reject', (e) => rejects.push(e.detail.reason));
    const added = q.add([file('a.pdf', 10, 'application/pdf'), file('big.png', 4096, 'image/png'), file('ok.png', 10, 'image/png')]);
    expect(rejects).toEqual(['type', 'size']);
    expect(added.map((i) => i.name)).toEqual(['ok.png']);
  });

  it('xóa item đang upload → hủy (abort), không phát uploaded/error, chạy tiếp item sau', async () => {
    const d = deferred();
    let signalSeen;
    const q = new UploadQueue({
      thumbnails: false,
      uploader: (f, { signal }) => {
        if (f.name === 'b') return Promise.resolve('b-ok');
        signalSeen = signal;
        signal.addEventListener('abort', () => d.reject(new Error('aborted')));
        return d.promise;
      },
    });
    const events = [];
    q.addEventListener('uploaded', (e) => events.push(`uploaded:${e.detail.item.name}`));
    q.addEventListener('error', (e) => events.push(`error:${e.detail.item.name}`));
    const [a, b] = q.add([file('a'), file('b')]);
    await new Promise((r) => setTimeout(r, 0));
    expect(a.status).toBe('uploading');
    q.remove(a.id);
    await q.idle();
    expect(signalSeen.aborted).toBe(true);
    expect(events).toEqual(['uploaded:b']);
    expect(b.status).toBe('done');
    expect(q.items.map((i) => i.name)).toEqual(['b']);
  });

  it('tạo và thu hồi ảnh xem trước', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const q = new UploadQueue({ uploader: () => new Promise(() => {}) });
    const [img, txt] = q.add([file('a.png', 1, 'image/png'), file('b.txt', 1, 'text/plain')]);
    expect(img.thumb).toBe('blob:x');
    expect(txt.thumb).toBeNull();
    q.remove(img.id);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    create.mockRestore();
    revoke.mockRestore();
  });

  it('lỗi trong hoạt cảnh không làm hỏng upload', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const q = new UploadQueue({
      thumbnails: false,
      beforeUpload: () => { throw new Error('anim'); },
      uploader: async () => 'ok',
    });
    const [item] = q.add([file('a')]);
    await q.idle();
    expect(item.status).toBe('done');
    spy.mockRestore();
  });

  it('tiến trình bị kẹp trong 0..1', async () => {
    const seen = [];
    const q = new UploadQueue({
      thumbnails: false,
      uploader: async (f, { onProgress }) => { onProgress(-1); onProgress(0.4); onProgress(7); },
    });
    q.addEventListener('progress', (e) => seen.push(e.detail.item.progress));
    q.add([file('a')]);
    await q.idle();
    expect(seen).toEqual([0, 0.4, 1]);
  });
});
