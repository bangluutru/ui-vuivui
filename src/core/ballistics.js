// Đường bay ném xiên (ná cao su, ...) — hàm thuần, không đụng DOM.
// Hệ tọa độ màn hình: x sang phải, y hướng XUỐNG; trọng lực g > 0 kéo y tăng.

/** Kẹp vector kéo dây trong bán kính maxPull. */
export function clampPull(dx, dy, maxPull) {
  const len = Math.hypot(dx, dy);
  if (len <= maxPull || len === 0) return { dx, dy, len, power: len / maxPull };
  const k = maxPull / len;
  return { dx: dx * k, dy: dy * k, len: maxPull, power: 1 };
}

/**
 * Vận tốc bắn từ vector kéo (ná: bắn NGƯỢC chiều kéo).
 * @returns {{vx:number, vy:number}} px/giây
 */
export function launchVelocity(pull, maxPull, maxSpeed) {
  const c = clampPull(pull.dx, pull.dy, maxPull);
  const k = c.len === 0 ? 0 : (maxSpeed * c.power) / c.len;
  return { vx: -c.dx * k, vy: -c.dy * k };
}

export function positionAt(start, vel, g, t) {
  return { x: start.x + vel.vx * t, y: start.y + vel.vy * t + 0.5 * g * t * t };
}

/**
 * Thời điểm SỚM NHẤT (t > 0) viên đạn chạm độ cao y = targetY.
 * null nếu không bao giờ tới (bắn yếu / bắn xuống).
 */
export function timeToReachY(start, vel, g, targetY) {
  // 0.5 g t² + vy t + (y0 - targetY) = 0
  const a = 0.5 * g;
  const b = vel.vy;
  const c = start.y - targetY;
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-9) return null;
    const t = -c / b;
    return t > 0 ? t : null;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const roots = [(-b - s) / (2 * a), (-b + s) / (2 * a)].filter((t) => t > 1e-6).sort((p, q) => p - q);
  return roots.length ? roots[0] : null;
}

/**
 * Xác định viên đạn trúng ô nào trong một hàng ô nằm ngang.
 * @param {{x:number,y:number}} start
 * @param {{vx:number,vy:number}} vel
 * @param {number} g
 * @param {{rowY:number, boxes:{left:number,right:number}[], tolerance?:number}} target
 * @returns {{hit:true, index:number, t:number, point:{x:number,y:number}} | {hit:false, t:number|null, point:{x:number,y:number}|null}}
 */
export function resolveShot(start, vel, g, { rowY, boxes, tolerance = 0 }) {
  const t = timeToReachY(start, vel, g, rowY);
  if (t == null) return { hit: false, t: null, point: null };
  const point = positionAt(start, vel, g, t);
  const index = boxes.findIndex((b) => point.x >= b.left - tolerance && point.x <= b.right + tolerance);
  if (index < 0) return { hit: false, t, point };
  return { hit: true, index, t, point };
}

/** Các điểm trên quỹ đạo dự đoán, dừng ở tUntil hoặc khi ra khỏi khung. */
export function samplePath(start, vel, g, { tUntil = 1.2, step = 1 / 60, bounds } = {}) {
  const pts = [];
  for (let t = 0; t <= tUntil + 1e-9; t += step) {
    const p = positionAt(start, vel, g, t);
    if (bounds && (p.x < bounds.left || p.x > bounds.right || p.y < bounds.top || p.y > bounds.bottom)) break;
    pts.push(p);
  }
  return pts;
}
