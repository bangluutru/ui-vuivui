// Uploader GIẢ chỉ dùng cho trang demo — không gửi file đi đâu cả.
// Thư viện thật không bao giờ tự giả lập upload.

/**
 * @param {object} o
 * @param {number} o.seconds thời gian "tải" mỗi file
 * @param {number} o.missRate xác suất thất bại 0..1
 */
export function fakeUploader({ seconds = 1.6, missRate = 0 } = {}) {
  return (file, { onProgress, signal }) => new Promise((resolve, reject) => {
    const fail = Math.random() < missRate;
    const failAt = 0.3 + Math.random() * 0.5;
    const start = performance.now();
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / (seconds * 1000));
      if (fail && p >= failAt) {
        clearInterval(timer);
        reject(new Error('Máy chủ demo cố tình báo lỗi'));
        return;
      }
      onProgress(p);
      if (p >= 1) {
        clearInterval(timer);
        resolve({ ok: true, name: file.name, size: file.size });
      }
    }, 80);
    signal.addEventListener('abort', () => {
      clearInterval(timer);
      reject(new DOMException('Đã hủy', 'AbortError'));
    });
  });
}
