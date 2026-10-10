// Hàm thuần cho việc in: nhận diện loại file theo "chữ ký" byte đầu, dựng trang bọc ảnh/chữ.
// Dùng chung cho trình duyệt (<vv-print>) và chương trình in trên máy (tools/print-agent.mjs).

/** Các loại được in. HTML chỉ nhận từ thuộc tính `src` do lập trình viên đặt, KHÔNG nhận file thả vào. */
export const PRINTABLE = ['pdf', 'png', 'jpeg', 'webp', 'gif', 'svg', 'text'];

const EXT = { pdf: 'pdf', png: 'png', jpeg: 'jpg', webp: 'webp', gif: 'gif', svg: 'svg', text: 'txt', html: 'html' };
export const extFor = (kind) => EXT[kind] || 'bin';

const startsWith = (b, sig, offset = 0) => sig.every((v, i) => b[offset + i] === v);

/**
 * Nhận diện loại file. Ưu tiên byte đầu (không tin đuôi file/MIME do người dùng gửi).
 * @param {Uint8Array} bytes ít nhất ~512 byte đầu
 * @param {string} [mime]
 * @returns {'pdf'|'png'|'jpeg'|'webp'|'gif'|'svg'|'html'|'text'|null}
 */
export function sniffKind(bytes, mime = '') {
  const b = bytes;
  if (startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf'; // %PDF-
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(b, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp'; // RIFF....WEBP
  if (startsWith(b, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  // Văn bản: không có byte 0, giải mã được UTF-8.
  if (b.includes(0)) return null;
  let text;
  try {
    // stream:true → ký tự nhiều byte bị cắt dở ở cuối đoạn mẫu không bị coi là lỗi
    text = new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(0, Math.min(b.length, 2048)), { stream: true });
  } catch {
    return null;
  }
  // Văn bản thật không chứa ký tự điều khiển (trừ tab, xuống dòng, sang trang).
  if (/[\x00-\x08\x0B\x0E-\x1F\x7F]/.test(text)) return null;
  const head = text.replace(/^\uFEFF/, '').trimStart().slice(0, 300).toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  if (head.startsWith('<!doctype html') || head.startsWith('<html') || /^text\/html/.test(mime)) return 'html';
  return 'text';
}

const BY_EXT = { pdf: 'pdf', png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp', gif: 'gif', svg: 'svg', txt: 'text', html: 'html', htm: 'html' };

/** Loại file mong đợi theo đuôi đường dẫn (vd. "/de/a.pdf?v=2" → "pdf"), hoặc null. */
export function expectedKind(url) {
  const m = /\.([a-z0-9]+)$/i.exec(String(url).split(/[?#]/)[0]);
  return m ? BY_EXT[m[1].toLowerCase()] || null : null;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const PAGE_CSS = '@page{margin:12mm}html,body{margin:0}body{font:12pt/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#000}';

/** Trang HTML chỉ chứa một ảnh vừa khổ giấy (ảnh, kể cả SVG, luôn qua <img> — không chèn mã SVG). */
export function imagePage(src, title = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>`
    + `<style>${PAGE_CSS}body{display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}</style>`
    + `</head><body><img src="${escapeHtml(src)}" alt=""></body></html>`;
}

/** Trang HTML hiển thị văn bản thuần (đã thoát ký tự). */
export function textPage(text, title = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>`
    + `<style>${PAGE_CSS}pre{margin:0;white-space:pre-wrap;word-break:break-word;font:11pt/1.5 ui-monospace,Menlo,Consolas,monospace}</style>`
    + `</head><body><pre>${escapeHtml(text)}</pre></body></html>`;
}

/** Chèn <base href> để trang HTML in từ blob vẫn tải được CSS/ảnh tương đối. */
export function withBase(html, baseHref) {
  const tag = `<base href="${escapeHtml(baseHref)}">`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
  return `${tag}${html}`;
}
