// Hình học luồng sáng (đèn pin) — hàm thuần, không đụng DOM.
// Tọa độ màn hình: x sang phải, y xuống. Góc theo radian, 0 = sang phải, π/2 = xuống.

/** Góc từ origin tới target. */
export function angleTo(origin, target) {
  return Math.atan2(target.y - origin.y, target.x - origin.x);
}

/** Đưa góc về khoảng (−π, π]. */
export function normalizeAngle(a) {
  let x = a % (2 * Math.PI);
  if (x <= -Math.PI) x += 2 * Math.PI;
  if (x > Math.PI) x -= 2 * Math.PI;
  return x;
}

/** Chênh lệch góc ngắn nhất b − a, trong (−π, π]. */
export function angleDiff(a, b) {
  return normalizeAngle(b - a);
}

/**
 * Điểm có nằm trong hình nón sáng không.
 * @param {{x,y}} point
 * @param {{origin:{x,y}, angle:number, spread:number, length:number}} beam spread = nửa góc mở
 * @param {number} [radius=0] bán kính vật (vật to bị chạm mép vẫn tính là sáng)
 */
export function inBeam(point, { origin, angle, spread, length }, radius = 0) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= radius) return true;
  if (dist - radius > length) return false;
  const pad = Math.asin(Math.min(1, radius / dist));
  return Math.abs(angleDiff(angle, Math.atan2(dy, dx))) <= spread + pad;
}

/** Đa giác (tam giác bo cung) của luồng sáng, dùng cho clip-path. */
export function beamPolygon({ origin, angle, spread, length }, arcSteps = 6) {
  const pts = [{ x: origin.x, y: origin.y }];
  for (let i = 0; i <= arcSteps; i++) {
    const a = angle - spread + (2 * spread * i) / arcSteps;
    pts.push({ x: origin.x + Math.cos(a) * length, y: origin.y + Math.sin(a) * length });
  }
  return pts;
}

/** Chuỗi clip-path: polygon(...) theo px. */
export function beamClipPath(beam, arcSteps) {
  return `polygon(${beamPolygon(beam, arcSteps).map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(', ')})`;
}
