import { describe, it, expect, vi, afterEach } from 'vitest';
import { tween } from '../src/core/motion.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('tween', () => {
  it('vẫn kết thúc đúng hạn khi requestAnimationFrame không bao giờ chạy (tab bị ẩn)', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', () => 0); // khung hình không bao giờ tới
    const onUpdate = vi.fn();
    let resolved = false;
    tween({ duration: 500, onUpdate, reduced: false }).then(() => { resolved = true; });
    await vi.advanceTimersByTimeAsync(700);
    expect(resolved).toBe(true);
    expect(onUpdate).toHaveBeenLastCalledWith(1, 1);
  });

  it('giảm chuyển động → nhảy thẳng tới cuối', async () => {
    const onUpdate = vi.fn();
    await tween({ duration: 500, onUpdate, reduced: true });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(1, 1);
  });
});
