import { describe, it, expect, vi } from 'vitest';
import worker from '../worker/index.js';
import { solvePowChallenge } from '../src/core/pow-solver.js';

const env = { POW_SECRET: 'test-secret', ASSETS: { fetch: vi.fn(async () => new Response('static')) } };
const call = (path, init) => worker.fetch(new Request(`https://demo.test${path}`, init), env);
const post = (path, body) => call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('worker /api/pow', () => {
  it('trang tĩnh đi qua ASSETS', async () => {
    const r = await call('/index.html');
    expect(await r.text()).toBe('static');
  });

  it('đề có đủ trường, không lộ secret, không cache', async () => {
    const r = await call('/api/pow/challenge');
    expect(r.headers.get('cache-control')).toBe('no-store');
    const ch = await r.json();
    expect(ch).toMatchObject({ v: 1, algorithm: 'SHA-256', maxnumber: 50000 });
    expect(typeof ch.serverTime).toBe('number');
    expect(JSON.stringify(ch)).not.toContain('test-secret');
  });

  it('giải → verify ok → dùng lại bị từ chối', async () => {
    const ch = await (await call('/api/pow/challenge')).json();
    const { token } = await solvePowChallenge(ch, { worker: false });
    const r1 = await post('/api/pow/verify', { token });
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ ok: true });
    const r2 = await post('/api/pow/verify', { token });
    expect(await r2.json()).toEqual({ ok: false, reason: 'reused' });
  }, 30000);

  it('rác → malformed; sai phương thức → 405; đường lạ → 404', async () => {
    expect(await (await post('/api/pow/verify', { token: 'rac' })).json()).toEqual({ ok: false, reason: 'malformed' });
    expect(await (await post('/api/pow/verify', 'khong-phai-json')).json()).toEqual({ ok: false, reason: 'malformed' });
    expect((await call('/api/pow/verify')).status).toBe(405);
    expect((await call('/api/khong-co')).status).toBe(404);
  });

  it('thiếu secret → 500, không tạo đề', async () => {
    const r = await worker.fetch(new Request('https://demo.test/api/pow/challenge'), { ASSETS: env.ASSETS });
    expect(r.status).toBe(500);
  });
});
