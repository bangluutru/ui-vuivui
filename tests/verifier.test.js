import { describe, it, expect, vi, afterEach } from 'vitest';
import { jsonVerifier, normalizeVerdict, VerifyHttpError } from '../src/core/verifier.js';

afterEach(() => vi.unstubAllGlobals());

const reply = (status, body) => vi.fn(async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => { if (body === undefined) throw new Error('no json'); return body; },
}));

describe('normalizeVerdict', () => {
  it('chấp nhận boolean và object', () => {
    expect(normalizeVerdict(true)).toEqual({ ok: true });
    expect(normalizeVerdict({ ok: false, message: 'sai' })).toEqual({ ok: false, message: 'sai' });
    expect(normalizeVerdict(undefined)).toEqual({ ok: false });
  });
});

describe('jsonVerifier', () => {
  it('gửi mã dạng chuỗi (giữ số 0 đầu) và trả ok', async () => {
    const f = reply(200, { ok: true });
    vi.stubGlobal('fetch', f);
    const v = await jsonVerifier('/api/otp', { extra: { phone: 'x' } })('012345');
    expect(v).toEqual({ ok: true, message: undefined });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/otp');
    expect(JSON.parse(init.body)).toEqual({ phone: 'x', code: '012345' });
  });

  it('401 + ok:false → mã sai (không ném lỗi)', async () => {
    vi.stubGlobal('fetch', reply(401, { ok: false, message: 'Mã hết hạn' }));
    await expect(jsonVerifier('/u')('111111')).resolves.toEqual({ ok: false, message: 'Mã hết hạn' });
  });

  it('500 → ném VerifyHttpError', async () => {
    vi.stubGlobal('fetch', reply(500, undefined));
    await expect(jsonVerifier('/u')('111111')).rejects.toBeInstanceOf(VerifyHttpError);
  });
});
