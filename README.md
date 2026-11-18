# FORENCOS – Marketing Performance Dashboard

Website tĩnh (HTML + JS + JSON), không cần build. Hai trang:
- `#booking` – Booking × Digital (lọc theo tháng)
- `#ecom` – Digital × Ecom (lọc theo ngày)

## Deploy lên Vercel

**Cách 1 – Kéo thả qua GitHub (không cần cài gì)**
1. Tạo repo mới trên GitHub (Private), bấm "uploading an existing file", kéo toàn bộ nội dung thư mục này vào, Commit.
2. Vào https://vercel.com/new → Import repo vừa tạo → Framework Preset: **Other** → Deploy.

**Cách 2 – Vercel CLI**
```
npm i -g vercel
cd forencos-dashboard
vercel --prod
```

## Cập nhật số liệu
Thay các file trong `data/` rồi commit (Cách 1, Vercel tự deploy lại) hoặc chạy lại `vercel --prod`.
