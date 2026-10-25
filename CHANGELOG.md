# Nhật ký thay đổi

## 1.0.0 – 2026-10-25

- Cổng có sidebar trái, tìm kiếm không dấu, xem trang trong khung, trang trước/sau, route `#/p/<id>`.
- Danh mục `data/catalog.json` v1.0.0: 20 trang, 4 nhóm; `title_goc` khớp nguyên văn `<title>` (kiểm bằng `tools/validate.mjs`). Trạng thái: chưa kiểm chứng nội dung chuyên môn.
- PWA offline: `sw.js` CACHE_VERSION v1.0.0.
- Không có công thức lâm sàng trong cổng; không cần dược sĩ/bác sĩ đối chiếu công thức. Nội dung từng trang giữ nguyên bản gốc.
- Kiểm tra đã chạy: `node tests/core.test.js` (55/55 đạt), `node tools/validate.mjs` (ĐẠT, 1 cảnh báo "chưa kiểm chứng"), mở thật trên trình duyệt ở 375 px, 800 px và 1280 px, thử offline khi tắt máy chủ.
