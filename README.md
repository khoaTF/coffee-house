# ☕ Nohope Coffee — Hệ Thống Đặt Món QR & Quản Lý Quán

> Hệ thống POS thời gian thực tích hợp màn hình bếp, giao hàng và phân tích dành cho quán cà phê — tất cả trong một nền tảng.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com)
[![License](https://img.shields.io/badge/License-Private-red)](.)

---

## ✨ Tính Năng

### 👤 Khách Hàng
- **Đặt Món Qua Mã QR** — Quét QR tại bàn → Xem menu → Đặt món → Thanh toán
- **Theo Dõi Đơn Hàng Thời Gian Thực** — Cập nhật trạng thái trực tiếp (chờ xử lý → đang pha → hoàn thành)
- **🎰 Túi Mù (Mystery Box)** — Vòng quay kiểu gacha: trả 29.000đ, nhận ngẫu nhiên 1 món được tiết lộ qua hoạt ảnh máy đánh bạc. Món rẻ hơn xuất hiện thường xuyên hơn!
- **Đặt Giao Hàng** — Đặt hàng online kèm địa chỉ và số điện thoại
- **Tích Điểm Thành Viên** — Kiếm & đổi điểm, phân hạng thành viên
- **Đa Ngôn Ngữ** — Chuyển đổi Tiếng Việt 🇻🇳 / English 🇬🇧 (i18n)
- **Hỗ Trợ PWA** — Cài đặt trên điện thoại như ứng dụng native

### 🍳 Bếp (Kitchen Display)
- **Màn Hình Bếp Thời Gian Thực** — Đơn hàng hiển thị ngay lập tức qua Supabase Realtime
- **Quản Lý Hàng Đợi** — Nhận, chuẩn bị và hoàn thành đơn hàng
- **Trừ Kho Theo Công Thức** — Tự động trừ nguyên liệu khi xử lý đơn

### 🔧 Quản Trị (Admin)
- **Phân Tích Dashboard** — Doanh thu, số đơn, sản phẩm bán chạy
- **Quản Lý Menu** — Thêm/sửa/xóa sản phẩm, danh mục, giá, tuỳ chọn
- **Kho Hàng & Nhập Hàng** — Theo dõi nguyên liệu, phiếu nhập kho với đơn giá
- **Nhân Viên & Phân Quyền (RBAC)** — Phân quyền chi tiết (huỷ đơn, xử lý thanh toán, v.v.)
- **Quản Lý Ca Làm** — Mở/đóng ca, đối chiếu doanh thu
- **Sổ Quỹ (Cashflow)** — Ghi chép thu chi thủ công + tự động, báo cáo KPI
- **Khuyến Mãi** — Mã giảm giá, chiến dịch ưu đãi
- **Tạo Mã QR** — Tạo & in mã QR riêng cho từng bàn
- **AI Gợi Ý Bán Chạy** — Tự động gắn thẻ sản phẩm trending
- **Băng Rôn Quảng Cáo** — Banner trang chủ & popup khuyến mãi
- **Xuất CSV** — Xuất dữ liệu để phân tích bên ngoài

---

## 🛠 Công Nghệ Sử Dụng

| Lớp | Công Nghệ |
|-----|-----------|
| **Frontend** | Vanilla HTML / CSS / JavaScript, PWA |
| **Backend** | Supabase (PostgreSQL + Realtime + Auth + RPC) |
| **Hosting** | Vercel (Static + Serverless Functions) |
| **Thanh Toán** | Chuyển khoản QR (Ngân hàng / MoMo) |
| **CSS Framework** | Tailwind CSS v3 |

---

## 🚀 Bắt Đầu Nhanh

### Yêu Cầu
- **Node.js** >= 18 (LTS khuyến nghị)
- **Tài khoản Supabase** — Với các bảng dữ liệu & hàm RPC đã cấu hình

### Cài Đặt
```bash
git clone https://github.com/khoaTF/coffee-house.git
cd coffee-house
npm install
```

### Cấu Hình Môi Trường
Tạo file `.env` ở thư mục gốc (hoặc thiết lập biến môi trường trên Vercel):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Chạy Cục Bộ (Local)
```bash
npm start
# hoặc
npm run dev
```

### CSS Build (Tailwind)
```bash
npm run build:css
```

---

## 🗺 Các Trang Truy Cập

| Trang | Đường Dẫn |
|-------|-----------|
| Menu Khách Hàng | `/?table=1` |
| Màn Hình Bếp | `/pages/kitchen.html` |
| Dashboard Quản Trị | `/pages/admin.html` |
| Đặt Giao Hàng | `/pages/delivery.html` |
| Theo Dõi Đơn Hàng | `/pages/tracking.html` |

---

## 📁 Cấu Trúc Dự Án

```
cafe_qr_production_final/
├── public/
│   ├── pages/          # Các trang HTML (index, admin, kitchen, delivery, tracking)
│   ├── js/             # Module JavaScript phía client
│   │   ├── customer.js     # Logic đặt món khách hàng
│   │   ├── gacha.js        # Túi Mù – máy quay slot
│   │   ├── i18n.js         # Đa ngôn ngữ (VI/EN)
│   │   ├── admin.js        # Dashboard quản trị
│   │   ├── admin-orders.js # Quản lý đơn hàng admin
│   │   ├── admin-cashflow.js # Sổ quỹ & cashflow
│   │   └── ...
│   ├── css/            # Stylesheet
│   └── images/         # Tài nguyên tĩnh
├── src/
│   ├── server.js       # Express server + API routes
│   ├── controllers/    # Logic xử lý request
│   ├── routes/         # Định nghĩa route
│   └── config/         # Cấu hình ứng dụng
├── database/           # Schema & migration SQL
├── supabase/           # Cấu hình Supabase
├── vercel.json         # Cấu hình triển khai Vercel
└── package.json
```

---

## 🎰 Tính Năng Túi Mù (Mystery Box)

Tính năng gacha đặc biệt dành cho khách hàng:

1. Thêm **"Túi Mù"** vào giỏ hàng với giá cố định **29.000đ**
2. Thanh toán bình thường
3. Sau khi thanh toán, **hoạt ảnh máy đánh bạc** tiết lộ món được chọn ngẫu nhiên
4. Kết quả hiển thị **Thắng / Hoà / Thua** dựa trên giá trị thực của món so với giá túi mù

**Xác Suất Xuất Hiện:**
- Món ≤ 29.000đ → xuất hiện **3×** thường hơn
- Món ≤ 43.500đ → xuất hiện **2×** thường hơn
- Món cao cấp → tỉ lệ cơ bản **1×**

---

## 🔐 Phân Quyền (RBAC)

| Vai Trò | Quyền Hạn |
|---------|-----------|
| **Admin** | Toàn quyền hệ thống |
| **Nhân Viên (Staff)** | Xử lý thanh toán, huỷ đơn, quản lý ca |
| **Bếp (Kitchen)** | Xem & cập nhật trạng thái đơn |
| **Khách Hàng** | Đặt món, theo dõi đơn, tích điểm |

---

## 🌐 Triển Khai (Deployment)

Dự án được tối ưu cho **Vercel**:

```bash
# Cài Vercel CLI
npm i -g vercel

# Triển khai
vercel --prod
```

Thiết lập các biến môi trường trên Vercel Dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

## 📄 Giấy Phép

Dự án nội bộ — **Nohope Coffee © 2026**. Bảo lưu mọi quyền.
