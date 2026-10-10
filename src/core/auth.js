// Trình đăng nhập gửi lên máy chủ.
// Hợp đồng chung của authenticator: ({ identifier, password }) => Promise<boolean | { ok, message? }>
//   - ok:false → sai thông tin (element giữ tên đăng nhập, xóa mật khẩu)
//   - ném lỗi  → lỗi mạng/máy chủ (element giữ nguyên, cho thử lại)

import { normalizeVerdict } from './verifier.js';

export class AuthHttpError extends Error {
  constructor(status, body) {
    super(`Máy chủ trả về lỗi ${status}`);
    this.name = 'AuthHttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * POST JSON { [identifierField]: identifier, [passwordField]: password }.
 * 2xx → { ok, message? } (thân rỗng = ok); 400/401/403/422 kèm { ok:false } → sai thông tin;
 * mã lỗi khác → ném AuthHttpError. Mặc định gửi kèm cookie cùng tên miền (phiên đăng nhập).
 */
export function jsonAuthenticator(url, opts = {}) {
  const {
    identifierField = 'email',
    passwordField = 'password',
    headers = {},
    extra = {},
    credentials = 'same-origin',
  } = opts;
  return async ({ identifier, password }) => {
    const res = await fetch(url, {
      method: 'POST',
      credentials,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ ...extra, [identifierField]: identifier, [passwordField]: password }),
    });
    let body = null;
    try { body = await res.json(); } catch { /* không phải JSON */ }
    if (res.ok) return normalizeVerdict(body ?? { ok: true });
    if ([400, 401, 403, 422].includes(res.status) && body && body.ok === false) return normalizeVerdict(body);
    throw new AuthHttpError(res.status, body);
  };
}
