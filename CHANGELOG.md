# Nhật ký thay đổi

## 1.1.0 – 2026-10-25

- Thêm 2 trang vào nhóm Tóm tắt guideline (chép nguyên bản, không sửa nội dung):
  - `KDIGO-AKI-AKD-2026-Ch3-4-tom-tat.html` – KDIGO AKI/AKD (dự thảo 03/2026), chương 3–4.
  - `EAU-2026-UTI-3.3-3.9-tom-tat.html` – EAU 2026, nhiễm khuẩn niệu khoa mục 3.3–3.9.
- Danh mục v1.1.0 (22 trang); `sw.js` CACHE_VERSION v1.1.0 để máy đã cài nhận bản mới.
- Thêm 3 ca kiểm thử tìm kiếm cho 2 trang mới.

## 1.0.0 – 2026-10-25

- Cổng có sidebar trái, tìm kiếm không dấu, xem trang trong khung, trang trước/sau, route `#/p/<id>`.
- Danh mục `data/catalog.json` v1.0.0: 20 trang, 4 nhóm; `title_goc` khớp nguyên văn `<title>` (kiểm bằng `tools/validate.mjs`). Trạng thái: chưa kiểm chứng nội dung chuyên môn.
- PWA offline: `sw.js` CACHE_VERSION v1.0.0.
- Không có công thức lâm sàng trong cổng; không cần dược sĩ/bác sĩ đối chiếu công thức. Nội dung từng trang giữ nguyên bản gốc.
- Kiểm tra đã chạy: `node tests/core.test.js` (55/55 đạt), `node tools/validate.mjs` (ĐẠT, 1 cảnh báo "chưa kiểm chứng"), mở thật trên trình duyệt ở 375 px, 800 px và 1280 px, thử offline khi tắt máy chủ.
