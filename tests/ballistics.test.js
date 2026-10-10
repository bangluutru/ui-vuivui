import { describe, it, expect } from 'vitest';
import { clampPull, launchVelocity, timeToReachY, resolveShot, positionAt, samplePath, resolveHoopShot } from '../src/core/ballistics.js';

const G = 1000;
const boxes = [0, 1, 2, 3, 4, 5].map((i) => ({ left: 40 + i * 50, right: 80 + i * 50 })); // ô rộng 40, cách 10

describe('clampPull', () => {
  it('giữ nguyên khi chưa vượt giới hạn', () => {
    expect(clampPull(30, 40, 100)).toEqual({ dx: 30, dy: 40, len: 50, power: 0.5 });
  });
  it('kẹp về bán kính tối đa, giữ hướng', () => {
    const c = clampPull(300, 400, 100);
    expect(c.len).toBe(100);
    expect(c.power).toBe(1);
    expect(c.dx).toBeCloseTo(60);
    expect(c.dy).toBeCloseTo(80);
  });
});

describe('launchVelocity', () => {
  it('bắn ngược chiều kéo, tốc độ tỉ lệ lực kéo', () => {
    const v = launchVelocity({ dx: 0, dy: 50 }, 100, 1000); // kéo xuống một nửa
    expect(v.vx).toBeCloseTo(0);
    expect(v.vy).toBeCloseTo(-500);
  });
  it('kéo quá giới hạn thì tốc độ tối đa', () => {
    const v = launchVelocity({ dx: 0, dy: 999 }, 100, 1000);
    expect(v.vy).toBeCloseTo(-1000);
  });
  it('không kéo thì không bay', () => {
    expect(launchVelocity({ dx: 0, dy: 0 }, 100, 1000)).toEqual({ vx: -0, vy: -0 });
  });
});

describe('timeToReachY', () => {
  it('lấy nghiệm sớm nhất khi đi lên', () => {
    const start = { x: 0, y: 400 };
    const vel = { vx: 0, vy: -1000 };
    const t = timeToReachY(start, vel, G, 100);
    expect(positionAt(start, vel, G, t).y).toBeCloseTo(100);
    // nghiệm sớm: đang đi lên (vy + g t < 0)
    expect(vel.vy + G * t).toBeLessThan(0);
  });
  it('bắn yếu không tới → null', () => {
    // đỉnh = v²/2g = 200²/2000 = 20px < 300px
    expect(timeToReachY({ x: 0, y: 400 }, { vx: 0, vy: -200 }, G, 100)).toBeNull();
  });
});

describe('resolveShot', () => {
  const start = { x: 210, y: 400 };

  it('bắn thẳng lên trúng ô ở giữa (index 3: 190..230)', () => {
    const r = resolveShot(start, { vx: 0, vy: -1000 }, G, { rowY: 100, boxes });
    expect(r.hit).toBe(true);
    expect(r.index).toBe(3);
  });

  it('bắn xiên trái trúng ô đầu (index 0)', () => {
    // cần x tại lúc chạm y=100 nằm trong 40..80
    const vel = { vx: -400, vy: -1000 };
    const r = resolveShot(start, vel, G, { rowY: 100, boxes });
    expect(r.hit).toBe(true);
    expect(r.index).toBe(0);
  });

  it('không tới hàng ô → trượt, không có điểm chạm', () => {
    const r = resolveShot(start, { vx: 0, vy: -300 }, G, { rowY: 100, boxes });
    expect(r).toEqual({ hit: false, t: null, point: null });
  });

  it('cắt hàng ô ở khe giữa hai ô → trượt', () => {
    // khe giữa ô 3 (190..230) và ô 4 (240..280): x = 235
    const r = resolveShot({ x: 235, y: 400 }, { vx: 0, vy: -1000 }, G, { rowY: 100, boxes });
    expect(r.hit).toBe(false);
    expect(r.point.x).toBeCloseTo(235);
  });

  it('cắt hàng ô ngoài mép → trượt; có dung sai thì trúng ô gần', () => {
    const far = resolveShot({ x: 20, y: 400 }, { vx: 0, vy: -1000 }, G, { rowY: 100, boxes });
    expect(far.hit).toBe(false);
    const tol = resolveShot({ x: 34, y: 400 }, { vx: 0, vy: -1000 }, G, { rowY: 100, boxes, tolerance: 8 });
    expect(tol.hit).toBe(true);
    expect(tol.index).toBe(0);
  });
});

describe('samplePath', () => {
  it('dừng khi ra khỏi khung', () => {
    const pts = samplePath({ x: 100, y: 100 }, { vx: 0, vy: -1000 }, G, { tUntil: 2, bounds: { left: 0, right: 200, top: 0, bottom: 400 } });
    expect(pts.length).toBeGreaterThan(1);
    expect(pts.every((p) => p.y >= 0)).toBe(true);
  });
});

describe('resolveHoopShot', () => {
  const rim = { x: 200, y: 100, half: 30 };
  const start = { x: 200, y: 400 };
  // Ném thẳng lên đủ cao rồi rơi lại đúng tâm vành
  it('lọt lưới khi rơi xuống qua tâm vành', () => {
    const r = resolveHoopShot(start, { vx: 0, vy: -900 }, G, rim, 14);
    expect(r.result).toBe('swish');
    expect(r.point.x).toBeCloseTo(200);
    // chọn lần chạm khi đang rơi (sau đỉnh), không phải lúc bay lên
    expect(-900 + G * r.t).toBeGreaterThan(0);
  });
  it('lệch vừa phải → chạm vành; lệch xa → trượt; yếu → không tới', () => {
    expect(resolveHoopShot({ x: 228, y: 400 }, { vx: 0, vy: -900 }, G, rim, 14).result).toBe('rim');
    expect(resolveHoopShot({ x: 300, y: 400 }, { vx: 0, vy: -900 }, G, rim, 14).result).toBe('air');
    expect(resolveHoopShot(start, { vx: 0, vy: -500 }, G, rim, 14).result).toBe('short'); // đỉnh 125px < 300px
  });
  it('timeToReachY descending chọn nghiệm sau', () => {
    const up = timeToReachY(start, { vx: 0, vy: -900 }, G, 100);
    const down = timeToReachY(start, { vx: 0, vy: -900 }, G, 100, { descending: true });
    expect(down).toBeGreaterThan(up);
  });
});
