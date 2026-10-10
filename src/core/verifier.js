// Trình kiểm tra mã (OTP...) gửi lên máy chủ.
// Hợp đồng chung của verifier: (code: string) => Promise<boolean | { ok: boolean, message?: string }>
//   - trả ok:false  → mã SAI (element xóa ô, cho nhập lại)
//   - ném lỗi       → lỗi mạng/máy chủ (element giữ nguyên mã, cho thử lại)

export class VerifyHttpError extends Error {
  constructor(status, body) {
    super(`Máy chủ trả về lỗi ${status}`);
    this.name = 'VerifyHttpError';
    this.status = status;
    this.body = body;
  }
}

/** Chuẩn hóa kết quả verifier về { ok, message }. */
export function normalizeVerdict(v) {
  if (typeof v === 'boolean') return { ok: v };
  if (v && typeof v === 'object') return { ok: !!v.ok, message: v.message };
  return { ok: false };
}

/**
 * Verifier gửi JSON { [field]: code } bằng fetch.
 * Máy chủ trả 2xx kèm { ok: true|false, message? }.
 * 400/401/422 kèm { ok:false } được coi là mã sai; mã lỗi khác → ném VerifyHttpError.
 *
 * @param {string} url
 * @param {{ field?: string, headers?: Record<string,string>, extra?: Record<string,any>, credentials?: RequestCredentials }} [opts]
 */
export function jsonVerifier(url, opts = {}) {
  const { field = 'code', headers = {}, extra = {}, credentials = 'same-origin' } = opts;
  return async (code) => {
    const res = await fetch(url, {
      method: 'POST',
      credentials,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ ...extra, [field]: code }),
    });
    let body = null;
    try { body = await res.json(); } catch { /* không phải JSON */ }
    if (res.ok) return normalizeVerdict(body ?? { ok: true });
    if ([400, 401, 422].includes(res.status) && body && body.ok === false) return normalizeVerdict(body);
    throw new VerifyHttpError(res.status, body);
  };
}
