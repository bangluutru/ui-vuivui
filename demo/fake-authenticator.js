// Authenticator GIẢ chỉ dùng cho trang demo — tài khoản demo hiện ngay trên trang.
// App thật: element.authenticator = jsonAuthenticator('/api/login').

export const DEMO_ACCOUNT = { identifier: 'demo@vuivui.vn', username: 'demo', password: 'bi-ngo-2026' };

/** @param {{ delay?: number, mode?: 'ok'|'network' }} o */
export function fakeAuthenticator({ delay = 800, mode = 'ok' } = {}) {
  return ({ identifier, password }) => new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mode === 'network') return reject(new Error('mất kết nối (giả lập)'));
      const idOk = identifier === DEMO_ACCOUNT.identifier || identifier === DEMO_ACCOUNT.username;
      resolve(idOk && password === DEMO_ACCOUNT.password ? { ok: true } : { ok: false });
    }, delay);
  });
}
