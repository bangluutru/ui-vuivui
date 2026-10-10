// printHandler gửi file tới chương trình in trên máy (tools/print-agent.mjs) — in thẳng, không hộp thoại.
// Chỉ in được FILE (PDF/ảnh/văn bản). In cả trang / một phần trang vẫn dùng hộp thoại của trình duyệt.

export class PrintAgentError extends Error {
  constructor(status, body) {
    super(body?.message || `Chương trình in trả về lỗi ${status}${body?.reason ? ` (${body.reason})` : ''}`);
    this.name = 'PrintAgentError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {{ url?: string, token: string }} o url mặc định http://127.0.0.1:17777
 * @returns {(doc: { blob: Blob, kind: string, name: string }) => Promise<{ ok: true, kind: string, job: string }>}
 */
export function agentPrintHandler({ url = 'http://127.0.0.1:17777', token }) {
  const base = url.replace(/\/$/, '');
  const handler = async ({ blob, name }) => {
    let res;
    try {
      res = await fetch(`${base}/print`, {
        method: 'POST',
        headers: {
          'content-type': blob.type || 'application/octet-stream',
          'x-print-token': token,
          'x-file-name': encodeURIComponent(name || 'tai-lieu'),
        },
        body: blob,
      });
    } catch {
      throw new Error('Không kết nối được chương trình in trên máy (đã chạy chưa? trình duyệt có chặn không?)');
    }
    let body = null;
    try { body = await res.json(); } catch { /* bỏ qua */ }
    if (!res.ok || !body?.ok) throw new PrintAgentError(res.status, body);
    return body;
  };
  /** Kiểm tra kết nối + mã. */
  handler.check = async () => {
    const res = await fetch(`${base}/health`, { headers: { 'x-print-token': token } });
    return res.ok;
  };
  return handler;
}
