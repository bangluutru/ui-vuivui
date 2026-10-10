// Thay {tên} trong chuỗi giao diện bằng giá trị.
export function fmt(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

/** Chọn bộ chuỗi theo thuộc tính lang của element (rồi của trang), mặc định tiếng Việt. */
export function pickLabels(table, el, override = {}) {
  const lang = (el.getAttribute('lang') || document.documentElement.lang || 'vi').slice(0, 2);
  return { ...(table[lang] || table.vi), ...override };
}
