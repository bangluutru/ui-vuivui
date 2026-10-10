# CLAUDE.md — ui-vuivui

Thư viện Web Component "vui vẻ" cho thao tác thường gặp (upload, in, đăng nhập, OTP, captcha). Chủ dự án giao tiếp bằng **tiếng Việt**, không giả định người đọc biết code.

## Cấu trúc
- `src/core/` — lõi dùng chung, **không đụng DOM** để test được trong Node: `upload-queue.js`, `xhr-uploader.js`, `motion.js` (cung ném, tween), `sound.js` (Web Audio).
- `src/<ten-thanh-phan>/` — mỗi "bộ da" một thư mục: element + `styles.js` + `art.js` (SVG tự vẽ) + `labels.js` (vi/en).
- `src/index.js` — điểm vào, đăng ký mọi element.
- `index.html` + `demo/` — trang demo. Uploader giả **chỉ** nằm trong `demo/`.
- `tests/` — Vitest cho phần lõi.

## Quy ước
- Tên thẻ `vv-<việc>` hoặc `vv-<chủ-đề>-<việc>`; sự kiện `vv-*` có `bubbles + composed`.
- Không thêm thư viện runtime nếu không thật cần (hiện 0 phụ thuộc). Mượn mã: chỉ MIT/ISC/Apache, ghi nguồn. Không dùng Aceternity, hover.dev, hàng Framer, mã GPL.
- Element không bao giờ giả lập thành công: thiếu `uploader`/backend → báo lỗi rõ ràng.
- Bắt buộc: dùng được bằng bàn phím, `aria-live` cho trạng thái, tôn trọng `prefers-reduced-motion`, âm thanh tắt mặc định (bật bằng thuộc tính `sound`).
- Bảo mật: không lộ mật khẩu/OTP qua hoạt cảnh; OTP kiểm tra ở server một lần cho cả mã (KHÔNG báo đúng/sai từng chữ số như video gốc); captcha vui chỉ là vỏ bọc captcha thật.
- Commit nhỏ, thông điệp tiếng Việt.

## Lệnh
- `npm run dev` — demo ở http://localhost:5180
- `npm test` — Vitest
- `npm run build` — `dist/ui-vuivui.js` (ES) + `dist/ui-vuivui.iife.js`

## Kiểm tra trong trình duyệt
Kéo-thả giả lập bằng `new DataTransfer()` + `dt.items.add(new File(...))`, rồi dispatch `DragEvent('dragenter'|'dragover'|'drop', { dataTransfer, clientX, clientY, bubbles: true, composed: true, cancelable: true })` lên phần tử trong shadow root. Giảm chuyển động: tạm ghi đè `window.matchMedia`.
