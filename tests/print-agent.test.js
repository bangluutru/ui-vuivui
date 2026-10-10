import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createAgent } from '../tools/print-agent.mjs';

const ORIGIN = 'https://ui-vuivui.example';
const OUT = join(tmpdir(), `vv-fake-lp-${process.pid}.json`);
const FAKE = join(import.meta.dirname, 'fixtures', 'fake-lp.mjs');
let agent;
let base;

beforeAll(async () => {
  process.env.FAKE_LP_OUT = OUT;
  agent = createAgent({ origins: [ORIGIN], token: 'ma-thu', cmd: FAKE, maxBytes: 1024 });
  await new Promise((r) => agent.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${agent.server.address().port}`;
});
afterAll(() => new Promise((r) => agent.server.close(r)));
afterEach(() => { rmSync(OUT, { force: true }); delete process.env.FAKE_LP_FAIL; });

const PDF = new TextEncoder().encode('%PDF-1.4\n% thu\n');
const post = (body, headers = {}) => fetch(`${base}/print`, {
  method: 'POST',
  headers: { origin: ORIGIN, 'x-print-token': 'ma-thu', 'content-type': 'application/pdf', ...headers },
  body,
});

describe('print-agent', () => {
  it('preflight: đúng origin, cho private network', async () => {
    const r = await fetch(`${base}/print`, { method: 'OPTIONS', headers: { origin: ORIGIN } });
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(r.headers.get('access-control-allow-private-network')).toBe('true');
    expect(r.headers.get('access-control-allow-headers')).toContain('x-print-token');
  });

  it('in PDF: gọi lệnh in với đúng 1 tham số là file tạm, rồi xoá file', async () => {
    const r = await post(PDF);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, kind: 'pdf', job: expect.stringContaining('FakePrinter-42') });
    const seen = JSON.parse(readFileSync(OUT, 'utf8'));
    expect(seen.argv).toHaveLength(1);
    expect(seen.argv[0]).toMatch(/vv-print-[0-9a-f]{16}\.pdf$/);
    expect(seen.exists).toBe(true);
    expect(seen.size).toBe(PDF.length);
    await new Promise((res) => setTimeout(res, 50));
    expect(existsSync(seen.argv[0])).toBe(false);
  });

  it('thiếu / sai mã → 401, không in', async () => {
    expect((await post(PDF, { 'x-print-token': '' })).status).toBe(401);
    expect((await post(PDF, { 'x-print-token': 'ma-sai' })).status).toBe(401);
    expect(existsSync(OUT)).toBe(false);
  });

  it('origin lạ → 403', async () => {
    const r = await post(PDF, { origin: 'https://ke-gian.example' });
    expect(r.status).toBe(403);
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('quá dung lượng → 413; loại lạ (zip, HTML) → 415', async () => {
    expect((await post(new Uint8Array(2000).fill(65))).status).toBe(413);
    expect((await post(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2]), { 'content-type': 'application/pdf' })).status).toBe(415);
    const html = await post(new TextEncoder().encode('<!doctype html><script>x</script>'), { 'content-type': 'text/html' });
    expect(html.status).toBe(415);
    expect(existsSync(OUT)).toBe(false);
  });

  it('lệnh in lỗi → 500 kèm thông báo', async () => {
    process.env.FAKE_LP_FAIL = '1';
    const r = await post(PDF);
    expect(r.status).toBe(500);
    expect(await r.json()).toMatchObject({ ok: false, reason: 'print', message: 'máy in hết giấy' });
  });

  it('health cần mã', async () => {
    expect((await fetch(`${base}/health`, { headers: { origin: ORIGIN } })).status).toBe(401);
    expect((await fetch(`${base}/health`, { headers: { origin: ORIGIN, 'x-print-token': 'ma-thu' } })).status).toBe(200);
  });
});
