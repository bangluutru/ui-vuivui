// Tiện ích chuyển động dùng chung: đường cong ném, tween theo requestAnimationFrame.

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Điểm trên đường cong Bezier bậc 2 tại t ∈ [0,1]. */
export function quadPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * Điểm điều khiển cho cú ném vòng cung từ `from` tới `to`.
 * Đỉnh cung luôn cao hơn điểm đích ít nhất `lift` px (trục y hướng xuống).
 */
export function arcControl(from, to, lift = 120) {
  const top = Math.min(from.y, to.y) - lift;
  // Đỉnh lệch về phía đích một chút để bóng "rơi" vào rổ chứ không lao ngang.
  return { x: from.x + (to.x - from.x) * 0.6, y: top };
}

/** Chuỗi lệnh path SVG cho cung ném. */
export function arcPath(from, to, lift) {
  const c = arcControl(from, to, lift);
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

/**
 * Chạy onUpdate(e) với e đi từ 0 → 1 trong `duration` ms.
 * Dừng sớm nếu signal bị hủy. Khi giảm chuyển động hoặc tab đang ẩn: nhảy thẳng tới cuối.
 *
 * Luôn xong đúng hạn: tab ẩn thì requestAnimationFrame ngừng chạy, nên có hẹn giờ
 * dự phòng — hoạt cảnh không bao giờ được chặn việc thật (vd. upload chờ cú ném).
 */
export function tween({ duration, easing = ease.linear, onUpdate, signal, reduced = prefersReducedMotion() }) {
  return new Promise((resolve) => {
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (reduced || hidden || duration <= 0 || typeof requestAnimationFrame !== 'function') {
      onUpdate(1, 1);
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!signal?.aborted) onUpdate(1, 1);
      resolve();
    };
    const timer = setTimeout(finish, duration + 120);
    const start = performance.now();
    const frame = (now) => {
      if (done) return;
      if (signal?.aborted) return finish();
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) return finish();
      onUpdate(easing(t), t);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
