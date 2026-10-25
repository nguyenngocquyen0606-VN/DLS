# ClinPharmAI Hub – Cổng tài liệu dược lâm sàng

Web app tĩnh (PWA, chạy offline) gom 22 trang tài liệu của Khoa Dược lâm sàng vào một giao diện có **thanh điều hướng bên trái**: tóm tắt guideline, thông tin thuốc, so sánh dược lý lâm sàng, thẩm định bằng chứng (EBM).

## Cách mở

| Cách | Làm gì |
|---|---|
| Trên máy Windows | Nhấp đúp `Mo-ung-dung.cmd` (cần Node.js). Trình duyệt mở `http://localhost:8080`. |
| Dòng lệnh | `node tools/serve.mjs 8080` |
| GitHub Pages | Settings → Pages → Deploy from branch `main`, thư mục `/ (root)`. |

Mở trực tiếp `index.html` bằng `file://` sẽ không tải được danh mục (trình duyệt chặn đọc tệp JSON); trang sẽ hiện hướng dẫn.

## Tính năng

- Sidebar trái chia 4 nhóm, thu gọn được từng nhóm; nút ☰ ẩn/hiện sidebar (máy tính) hoặc mở ngăn kéo (điện thoại, < 960 px).
- Tìm kiếm không phân biệt dấu tiếng Việt (gõ `/` để vào ô tìm, `Enter` mở kết quả đầu, `↑ ↓` di chuyển, `Esc` xóa/đóng).
- Xem trang trong khung bên phải; nút trang trước/sau, tải lại, mở thẻ mới; đường dẫn `#/p/<id>` dùng được để chia sẻ và nút Back.
- Trang chủ: thống kê, "Mở gần đây", thẻ tài liệu theo nhóm.
- Giao diện sáng/tối/tự động; theme theo đơn vị (ClinPharmAI, BVĐK Phương Nam, Phương Châu) chỉ đổi màu nhấn.
- Offline: service worker lưu sẵn khung ứng dụng và 22 trang; thư viện CDN của từng trang (Tailwind, Alpine, Chart.js…) được lưu khi mở trang đó trực tuyến lần đầu.

## Cấu trúc

```
index.html              khung ứng dụng
css/base.css            token màu, font Be Vietnam Pro, bố cục
js/core.js              logic thuần (tìm kiếm, route, kiểm tra danh mục) – dùng chung cho Node test
js/app.js               giao diện
data/catalog.json       danh mục 22 trang (version, updated, source, status, records)
pages/                  22 trang gốc – KHÔNG sửa trong cổng
sw.js                   service worker (tăng CACHE_VERSION khi đổi tệp)
tests/core.test.js      ca kiểm thử
tools/validate.mjs      kiểm tra trước khi giao
tools/serve.mjs         máy chủ tĩnh cục bộ
```

## Thêm một trang mới

1. Chép tệp `.html` vào `pages/`.
2. Thêm một record vào `data/catalog.json`: `id` (a-z, 0-9, gạch ngang), `group`, `file`, `title` (nhãn ngắn), `title_goc` (chép nguyên văn thẻ `<title>` của trang), `org`, `year`, `specialty`, `tags`. Tăng `version`, sửa `updated`.
3. Tăng `CACHE_VERSION` trong `sw.js`.
4. Chạy kiểm tra:

```bash
node tests/core.test.js
```

```bash
node tools/validate.mjs
```

## Dữ liệu và pháp lý

- Cổng chạy hoàn toàn trên trình duyệt, không thu thập và không gửi dữ liệu người bệnh. `localStorage` chỉ lưu tùy chọn giao diện và id trang mở gần đây (khóa `cpai-hub:*`).
- Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm (Nghị định 13/2023/NĐ-CP); đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.
- Danh mục có `status: "unverified"`: cổng không thẩm định lại nội dung chuyên môn của từng trang; nguồn được ghi trong chính trang đó.
- Mã màu theme Phương Nam (`#8a2a5b`) và Phương Châu (`#0f7b6c`) là **tạm**, cần thay bằng mã nhận diện chính thức.
