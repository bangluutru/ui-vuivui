import { describe, it, expect, vi, afterEach } from 'vitest';
import { angleTo, normalizeAngle, angleDiff, inBeam, beamPolygon } from '../src/core/beam.js';
import { jsonAuthenticator, AuthHttpError } from '../src/core/auth.js';

const deg = (d) => (d * Math.PI) / 180;
const O = { x: 0, y: 0 };

describe('góc', () => {
  it('normalizeAngle về (−π, π]', () => {
    expect(normalizeAngle(deg(190))).toBeCloseTo(deg(-170));
    expect(normalizeAngle(deg(-190))).toBeCloseTo(deg(170));
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
  });
  it('angleDiff qua chỗ đổi dấu ±180°', () => {
    expect(angleDiff(deg(179), deg(-179))).toBeCloseTo(deg(2));
    expect(angleDiff(deg(-179), deg(179))).toBeCloseTo(deg(-2));
  });
  it('angleTo: sang trái = π', () => {
    expect(Math.abs(angleTo(O, { x: -10, y: 0 }))).toBeCloseTo(Math.PI);
  });
});

describe('inBeam', () => {
  const left = { origin: O, angle: deg(179), spread: deg(10), length: 300 };

  it('luồng chĩa sang trái chiếu tới vật hơi phía trên (−179°)', () => {
    const p = { x: Math.cos(deg(-179)) * 100, y: Math.sin(deg(-179)) * 100 };
    expect(inBeam(p, left)).toBe(true);
  });
  it('ngoài góc mở → tối', () => {
    const p = { x: Math.cos(deg(150)) * 100, y: Math.sin(deg(150)) * 100 };
    expect(inBeam(p, left)).toBe(false);
  });
  it('mép góc mở: vừa trong / vừa ngoài', () => {
    const at = (a) => ({ x: Math.cos(deg(a)) * 100, y: Math.sin(deg(a)) * 100 });
    expect(inBeam(at(169.5), left)).toBe(true);
    expect(inBeam(at(168), left)).toBe(false);
  });
  it('xa quá chiều dài → tối; vật to chạm mép xa vẫn sáng', () => {
    const p = { x: -320, y: 0 };
    expect(inBeam(p, left)).toBe(false);
    expect(inBeam(p, left, 30)).toBe(true);
  });
  it('vật to chạm mép góc vẫn sáng', () => {
    const p = { x: Math.cos(deg(160)) * 100, y: Math.sin(deg(160)) * 100 }; // lệch 19° > 10°
    expect(inBeam(p, left, 0)).toBe(false);
    expect(inBeam(p, left, 20)).toBe(true); // asin(20/100) ≈ 11.5°
  });
});

describe('beamPolygon', () => {
  it('bắt đầu ở gốc và có arcSteps+1 điểm trên cung', () => {
    const pts = beamPolygon({ origin: { x: 5, y: 5 }, angle: 0, spread: deg(10), length: 100 }, 4);
    expect(pts).toHaveLength(6);
    expect(pts[0]).toEqual({ x: 5, y: 5 });
    for (const p of pts.slice(1)) expect(Math.hypot(p.x - 5, p.y - 5)).toBeCloseTo(100);
  });
});

describe('jsonAuthenticator', () => {
  afterEach(() => vi.unstubAllGlobals());
  const reply = (status, body) => vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => { if (body === undefined) throw new Error('no json'); return body; },
  }));

  it('gửi đúng trường, 2xx → ok', async () => {
    const f = reply(200, { ok: true });
    vi.stubGlobal('fetch', f);
    const v = await jsonAuthenticator('/login', { identifierField: 'username' })({ identifier: 'lan', password: 'p@ss' });
    expect(v.ok).toBe(true);
    const [, init] = f.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ username: 'lan', password: 'p@ss' });
    expect(init.credentials).toBe('same-origin');
  });
  it('401 + ok:false → sai thông tin', async () => {
    vi.stubGlobal('fetch', reply(401, { ok: false, message: 'Sai mật khẩu' }));
    await expect(jsonAuthenticator('/login')({ identifier: 'a', password: 'b' })).resolves.toEqual({ ok: false, message: 'Sai mật khẩu' });
  });
  it('503 → ném AuthHttpError', async () => {
    vi.stubGlobal('fetch', reply(503, undefined));
    await expect(jsonAuthenticator('/login')({ identifier: 'a', password: 'b' })).rejects.toBeInstanceOf(AuthHttpError);
  });
});
