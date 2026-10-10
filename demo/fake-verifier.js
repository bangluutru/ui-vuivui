// Verifier GIẢ chỉ dùng cho trang demo — mã đúng hiện ngay trên trang.
// Trong app thật, mã do máy chủ sinh và kiểm tra (vd. jsonVerifier('/api/otp/verify')).

export function randomCode(len = 6) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
}

/**
 * @param {() => string} getCode mã đúng hiện tại
 * @param {{ delay?: number, mode?: 'ok'|'network' }} o
 */
export function fakeVerifier(getCode, { delay = 700, mode = 'ok' } = {}) {
  return (code) => new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mode === 'network') reject(new Error('mất kết nối (giả lập)'));
      else resolve(code === getCode() ? { ok: true } : { ok: false });
    }, delay);
  });
}
