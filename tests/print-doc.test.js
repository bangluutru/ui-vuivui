import { describe, it, expect } from 'vitest';
import { sniffKind, escapeHtml, imagePage, textPage, withBase, extFor, expectedKind } from '../src/print/doc.js';

const bytes = (...a) => new Uint8Array(a.flat());
const str = (s) => new TextEncoder().encode(s);

describe('sniffKind', () => {
  it('nhận diện theo byte đầu, không tin MIME', () => {
    expect(sniffKind(str('%PDF-1.4\n...'), 'image/png')).toBe('pdf');
    expect(sniffKind(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe('png');
    expect(sniffKind(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('jpeg');
    expect(sniffKind(bytes([...str('RIFF'), 0, 0, 0, 0, ...str('WEBP')]))).toBe('webp');
    expect(sniffKind(str('GIF89a'))).toBe('gif');
  });
  it('văn bản, SVG, HTML', () => {
    expect(sniffKind(str('Xin chào, đây là ghi chú.'))).toBe('text');
    expect(sniffKind(str('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('svg');
    expect(sniffKind(str('  <!DOCTYPE html><html></html>'))).toBe('html');
    expect(sniffKind(str('<p>hi</p>'), 'text/html')).toBe('html');
  });
  it('file nhị phân lạ → null', () => {
    expect(sniffKind(bytes([0x50, 0x4b, 0x03, 0x04, 0, 0, 0]))).toBeNull(); // zip
    expect(sniffKind(bytes([0xc3, 0x28, 0x41]))).toBeNull(); // UTF-8 hỏng
    expect(sniffKind(bytes([0x50, 0x4b, 0x03, 0x04, 1, 2]))).toBeNull(); // ký tự điều khiển
    expect(sniffKind(str('dòng 1\r\n\tdòng 2\f'))).toBe('text');
  });
  it('văn bản bị cắt giữa ký tự nhiều byte ở cuối mẫu vẫn là text', () => {
    const t = str('ằ'.repeat(700)); // 3 byte/ký tự → 2100 byte, cắt ở 2048 rơi giữa ký tự
    expect(sniffKind(t)).toBe('text');
  });
});

describe('trang bọc', () => {
  it('escapeHtml', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
  it('textPage thoát mã, không chèn được thẻ', () => {
    const html = textPage('<script>alert(1)</script>', 'Ghi <chú>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('<title>Ghi &lt;chú&gt;</title>');
  });
  it('imagePage dùng <img>, thoát src', () => {
    const html = imagePage('blob:x" onerror="y');
    expect(html).toContain('<img src="blob:x&quot; onerror=&quot;y"');
  });
  it('withBase chèn ngay sau <head>', () => {
    expect(withBase('<html><head><title>a</title></head></html>', 'https://a.vn/de/')).toContain('<head><base href="https://a.vn/de/"><title>');
    expect(withBase('<p>x</p>', '/x/')).toBe('<base href="/x/"><p>x</p>');
  });
  it('expectedKind theo đuôi, bỏ query/hash', () => {
    expect(expectedKind('/de/toan.PDF?v=2#p1')).toBe('pdf');
    expect(expectedKind('https://a.vn/anh.jpg')).toBe('jpeg');
    expect(expectedKind('/de/toan')).toBeNull();
    expect(expectedKind('/x.docx')).toBeNull();
  });
  it('extFor', () => {
    expect(extFor('jpeg')).toBe('jpg');
    expect(extFor('khac')).toBe('bin');
  });
});
