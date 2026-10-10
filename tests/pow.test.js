import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPowChallenge, verifyPow, powExpiresAt, b64url, sha256Hex } from '../src/server/pow.js';
import { solvePowChallenge, powSolver } from '../src/core/pow-solver.js';

const secret = 'bi-mat-cua-may-chu';
const tamper = (token, patch) => b64url.encode(JSON.stringify({ ...JSON.parse(b64url.decode(token)), ...patch }));

afterEach(() => vi.unstubAllGlobals());

describe('vv-pow v1', () => {
  it('đề có đủ trường và chữ ký', async () => {
    const ch = await createPowChallenge({ secret, maxnumber: 500, now: 1_700_000_000_000 });
    expect(ch).toMatchObject({ v: 1, algorithm: 'SHA-256', maxnumber: 500 });
    expect(ch.challenge).toMatch(/^[0-9a-f]{64}$/);
    expect(ch.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(powExpiresAt(ch.salt)).toBe(1_700_000_000_000 + 600_000);
  });

  it('giải đề rồi kiểm tra: hợp lệ, trả id để chống dùng lại', async () => {
    const ch = await createPowChallenge({ secret, maxnumber: 800 });
    const progress = [];
    const { token, expiresAt, expiresIn } = await solvePowChallenge(ch, { worker: false, onProgress: (p) => progress.push(p) });
    expect(expiresIn).toBeGreaterThan(590_000);
    expect(expiresAt).toBe(powExpiresAt(ch.salt));
    const r = await verifyPow(token, { secret });
    expect(r).toEqual({ ok: true, id: ch.challenge, expiresAt });
    expect(progress.at(-1)).toBe(1);
  });

  it('hạn dùng tính theo đồng hồ máy chủ, không theo máy người dùng', async () => {
    const serverNow = Date.now() - 5 * 3600_000; // máy người dùng chạy nhanh 5 tiếng
    const ch = await createPowChallenge({ secret, maxnumber: 100, ttlSeconds: 600, now: serverNow });
    const { expiresIn } = await solvePowChallenge({ ...ch, serverTime: serverNow }, { worker: false });
    // hạn được làm tròn xuống theo giây nên lệch < 1s
    expect(expiresIn).toBeGreaterThan(599_000);
    expect(expiresIn).toBeLessThanOrEqual(600_000);
  });

  it('sai secret → signature', async () => {
    const ch = await createPowChallenge({ secret, maxnumber: 200 });
    const { token } = await solvePowChallenge(ch, { worker: false });
    expect(await verifyPow(token, { secret: 'khac' })).toEqual({ ok: false, reason: 'signature' });
  });

  it('sửa số → solution; sửa maxnumber → signature', async () => {
    const ch = await createPowChallenge({ secret, maxnumber: 200 });
    const { token } = await solvePowChallenge(ch, { worker: false });
    const { number } = JSON.parse(b64url.decode(token));
    expect(await verifyPow(tamper(token, { number: (number + 1) % 201 }), { secret })).toEqual({ ok: false, reason: 'solution' });
    expect(await verifyPow(tamper(token, { maxnumber: 5 }), { secret })).toEqual({ ok: false, reason: 'signature' });
  });

  it('hết hạn → expired', async () => {
    const now = Date.now();
    const ch = await createPowChallenge({ secret, maxnumber: 100, ttlSeconds: 60, now });
    const { token } = await solvePowChallenge(ch, { worker: false });
    expect(await verifyPow(token, { secret, now: now + 61_000 })).toEqual({ ok: false, reason: 'expired' });
  });

  it('rác → malformed', async () => {
    expect(await verifyPow('khong-phai-token', { secret })).toEqual({ ok: false, reason: 'malformed' });
    expect(await verifyPow(b64url.encode('{"v":2}'), { secret })).toEqual({ ok: false, reason: 'malformed' });
  });

  it('đề tự chế (không có number đúng) → không giải được', async () => {
    const fake = { v: 1, algorithm: 'SHA-256', salt: 'abc.9999999999', challenge: await sha256Hex('xyz'), maxnumber: 50, signature: '00' };
    await expect(solvePowChallenge(fake, { worker: false })).rejects.toThrow('Không giải được');
  });

  it('hủy giữa chừng → AbortError', async () => {
    const ch = await createPowChallenge({ secret, maxnumber: 200000 });
    const ctrl = new AbortController();
    const p = solvePowChallenge({ ...ch, challenge: await sha256Hex('khong-bao-gio') }, { worker: false, signal: ctrl.signal });
    setTimeout(() => ctrl.abort(), 5);
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('powSolver lấy đề qua fetch', async () => {
    const ch = await createPowChallenge({ secret, maxnumber: 100 });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ch })));
    const { token } = await powSolver('/api/pow/challenge', { worker: false })({});
    expect((await verifyPow(token, { secret })).ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/pow/challenge', expect.objectContaining({ cache: 'no-store' }));
  });
});
