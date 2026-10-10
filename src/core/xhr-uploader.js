// Uploader thật gửi file lên máy chủ bằng XMLHttpRequest.
// Dùng XHR (không phải fetch) vì chỉ XHR báo được tiến trình upload.

export class UploadHttpError extends Error {
  constructor(status, body) {
    super(`Máy chủ trả về lỗi ${status}`);
    this.name = 'UploadHttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Tạo hàm uploader cho UploadQueue / <vv-basket-upload>.
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {string} [opts.method='POST']
 * @param {string} [opts.fieldName='file'] tên trường file trong multipart/form-data
 * @param {Record<string,string>} [opts.fields] trường kèm theo
 * @param {Record<string,string>|(() => Record<string,string>)} [opts.headers]
 * @param {boolean} [opts.withCredentials=false]
 * @param {'multipart'|'raw'} [opts.body='multipart'] 'raw' gửi thẳng nội dung file (vd. URL ký sẵn của S3/R2)
 */
export function xhrUploader(url, opts = {}) {
  const {
    method = 'POST',
    fieldName = 'file',
    fields = {},
    headers = {},
    withCredentials = false,
    body: bodyMode = 'multipart',
  } = opts;

  return (file, { onProgress, signal } = {}) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, typeof url === 'function' ? url(file) : url);
    xhr.withCredentials = withCredentials;
    const h = typeof headers === 'function' ? headers(file) : headers;
    for (const [k, v] of Object.entries(h)) xhr.setRequestHeader(k, v);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let parsed = xhr.responseText;
      try { parsed = JSON.parse(xhr.responseText); } catch { /* không phải JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
      else reject(new UploadHttpError(xhr.status, parsed));
    };
    xhr.onerror = () => reject(new Error('Mất kết nối mạng'));
    xhr.onabort = () => reject(new DOMException('Đã hủy', 'AbortError'));

    if (signal) {
      if (signal.aborted) return xhr.abort();
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    if (bodyMode === 'raw') {
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    } else {
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      form.append(fieldName, file, file.name);
      xhr.send(form);
    }
  });
}
