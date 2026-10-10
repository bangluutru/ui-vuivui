# ui-vuivui

Thư viện **Web Component vui vẻ** cho các thao tác thường gặp — upload file, in, đăng nhập, nhập OTP, captcha… Mỗi thành phần làm **việc thật**, chỉ có lớp "da" là trò chơi. Dùng được ở mọi web (HTML thuần, React, Vue…), không phụ thuộc thư viện ngoài.

| Thành phần | Trạng thái |
|---|---|
| `<vv-basket-upload>` — ném file vào rổ để upload | ✅ v0.1 |
| Bắn OTP bằng ná (`<vv-slingshot-otp>`) | dự kiến |
| Đăng nhập Halloween với đèn pin soi mật khẩu | dự kiến |
| Ném đề vào máy in (`<vv-print>`) | dự kiến |
| Captcha vui (vỏ trò chơi bọc captcha thật: Cap / ALTCHA / Turnstile) | dự kiến |

## Chạy thử

```bash
npm install
npm run dev      # trang demo: http://localhost:5180
npm test         # test phần lõi
npm run build    # thư viện → dist/
```

## Dùng trong app khác

```bash
npm i ../ui-vuivui                 # từ thư mục bên cạnh
# hoặc, khi đã có repo GitHub:
npm i github:bangluutru/ui-vuivui
```

Gói trỏ thẳng vào mã nguồn ES module (`src/index.js`), không cần build, chạy được với Vite/webpack/esbuild.

## `<vv-basket-upload>`

Kéo file vào thẻ → hiện đường chấm từ con trỏ tới rổ → thả tay, file thành quả bóng bay lên vành.
Trong lúc upload, bóng **lăn quanh vành** (lắng dần theo tiến trình). Thành công → **lọt lưới**, bảng điểm +1.
Thất bại → **bật vành văng ra** ("Trượt rổ!") và có nút *Ném lại*. Nhiều file → xếp hàng, ném lần lượt.

```html
<script type="module">
  import 'ui-vuivui';                       // đăng ký các thẻ vv-*
  import { xhrUploader } from 'ui-vuivui';

  const up = document.querySelector('vv-basket-upload');
  up.uploader = xhrUploader('/api/upload', { fieldName: 'file' });
  up.addEventListener('vv-uploaded', (e) => console.log('Xong:', e.detail.result));
</script>

<vv-basket-upload multiple sound accept="image/*,.pdf" max-size="10MB"></vv-basket-upload>
```

Không dùng bundler: chạy `npm run build`, chép `dist/ui-vuivui.iife.js` rồi `<script src="ui-vuivui.iife.js"></script>`; các hàm nằm trong `window.UiVuiVui`.

### Thuộc tính HTML

| Thuộc tính | Ý nghĩa |
|---|---|
| `multiple` | Cho chọn/thả nhiều file (không có → chỉ lấy file đầu) |
| `accept` | Như `<input type=file accept>`: `image/*`, `.pdf`, `application/pdf`… |
| `max-size` | Giới hạn mỗi file: `10MB`, `512KB`, hoặc số byte |
| `sound` | Bật âm thanh (người dùng bật/tắt được bằng nút loa) |
| `lang` | `vi` (mặc định) hoặc `en` |
| `disabled` | Khóa thẻ |

### Thuộc tính JS & hàm

| | |
|---|---|
| `uploader` | **Bắt buộc.** `(file, { onProgress, signal }) => Promise<kết quả>`. Thiếu → mọi cú ném đều "trượt" với thông báo *Chưa nối với máy chủ* (thư viện không bao giờ giả vờ thành công). |
| `labels` | Ghi đè chữ, vd. `{ cta: 'Ném hồ sơ', titleB: 'hồ sơ' }` — xem `src/basket-upload/labels.js` |
| `files` | Danh sách item hiện tại (`{ id, name, size, status, progress, result, error }`) |
| `addFiles(files)` · `removeFile(id)` · `retry(id)` · `clear()` · `openPicker()` | |

`status`: `waiting` → `shooting` → `uploading` → `done` | `error`. Xóa một file đang upload sẽ **hủy** request (`signal`).

### Sự kiện (bubble, đi xuyên shadow DOM)

| Sự kiện | `detail` |
|---|---|
| `vv-select` | `{ items }` — file vừa được nhận |
| `vv-uploaded` | `{ item, result }` |
| `vv-error` | `{ item, error }` |
| `vv-reject` | `{ file, reason: 'type' \| 'size' }` |
| `vv-remove` | `{ item }` |
| `vv-drain` | `{ items }` — hàng chờ đã chạy hết |

### `xhrUploader(url, options)`

Dùng `XMLHttpRequest` vì chỉ XHR báo được tiến trình upload (`fetch` không làm được).

| Tùy chọn | Mặc định | |
|---|---|---|
| `method` | `POST` | |
| `fieldName` | `file` | tên trường trong `multipart/form-data` |
| `fields` | `{}` | trường kèm theo |
| `headers` | `{}` | object hoặc `(file) => object` (vd. token) |
| `withCredentials` | `false` | gửi cookie khác tên miền |
| `body` | `multipart` | `raw` = gửi thẳng nội dung file (URL ký sẵn của S3/R2) |

`url` cũng có thể là hàm `(file) => string`. Lỗi HTTP ném `UploadHttpError` (`status`, `body`).

### Đổi màu

Đặt biến CSS trên chính thẻ: `--vv-accent`, `--vv-accent-2`, `--vv-ink`, `--vv-muted`, `--vv-paper`, `--vv-court`, `--vv-head`, `--vv-ok`, `--vv-bad`, `--vv-radius`, `--vv-font`. Các phần `::part(card|header|dropzone|list|button|scoreboard|sound-button)` cũng chỉnh được.

## Nguyên tắc chung của thư viện

1. **Việc thật trước, trò chơi sau.** Lõi (`src/core/`) làm việc và phát sự kiện; "da" chỉ là hoạt cảnh. Không bao giờ giả vờ thành công.
2. **Luôn có đường thường:** mọi thao tác làm được bằng nút + bàn phím, có thông báo cho trình đọc màn hình.
3. **Tôn trọng "Giảm chuyển động"** của hệ điều hành: bỏ hoạt cảnh, việc vẫn chạy.
4. **Âm thanh** tổng hợp bằng Web Audio, chỉ phát khi bật `sound`.
5. **Bảo mật:** không lộ mật khẩu/OTP qua hoạt cảnh; OTP chỉ kiểm tra ở máy chủ, một lần cho cả mã; captcha vui phải bọc captcha thật.
6. **Bản quyền:** tự vẽ SVG; chỉ mượn mã MIT/ISC/Apache và ghi nguồn.

## Giấy phép

MIT — xem `LICENSE`.
