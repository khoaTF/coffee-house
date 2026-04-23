# 🗂 Cẩm Nang Hệ Thống Nohope Coffee (Map of Contents)

> [!NOTE]
> Phiên bản cập nhật: **23/04/2026** — Bao gồm toàn bộ 6+ phases triển khai.

Chào mừng bạn đến với **Knowledge Vault** của dự án **Nohope Coffee QR System**. Hệ thống này quản lý toàn bộ vận hành quán cafe từ A → Z: Khách quét mã → Đặt món → Bếp nhận → Giao hàng → Thanh toán tự động.

---

## 🏛 1. Kiến Trúc Tổng Thể
Mô tả sơ đồ Fat-Client (JAMStack) + Supabase BaaS + Vercel Serverless.
👉 [[01_System_Architecture]]

## 💾 2. Cơ Sở Dữ Liệu
Sơ đồ ERD đầy đủ 15+ bảng, RLS, multi-tenant SaaS.
👉 [[02_Database_Schema]]

## 🎭 3. Phân Quyền & Vai Trò
6 loại người dùng: Customer → Staff → Kitchen → Admin → Driver → SuperAdmin.
👉 [[03_User_Roles]]

## 🔄 4. Vòng Đời Đơn Hàng
State machine 5 trạng thái + Thanh toán tự động webhook.
👉 [[04_Order_Lifecycle]]

## 💻 5. Frontend Modules
30+ file JS modular, 9 customer modules, 13 admin modules.
👉 [[05_Frontend_Modules]]

## ⚙️ 6. Backend & APIs
Express.js server, Vercel Functions, Payment Webhook.
👉 [[06_Backend_And_APIs]]

## 🆕 7. Tính Năng Mới (Phase 6+)
Item Notes, Favorites, Receipt Printer, Auto Payment.
👉 [[07_New_Features]]

## 📊 8. Lịch Sử Phát Triển
Timeline các phase từ MVP → Production.
👉 [[08_Development_Timeline]]

---

## 🗺 Sơ Đồ Mạng Lưới Trang Web

| Nhóm | Trang | Mô tả |
|-------|-------|-------|
| 🌐 Public | [[pages/index\|index]] · [[pages/delivery\|delivery]] · [[pages/tracking\|tracking]] · [[pages/tv\|tv]] · [[pages/guide\|guide]] | Dành cho khách hàng |
| 🔒 Protected | [[pages/admin\|admin]] · [[pages/kitchen\|kitchen]] · [[pages/staff\|staff]] · [[pages/driver\|driver]] | Dành cho nhân viên |
| 🛡️ System | [[pages/login\|login]] · [[pages/superadmin\|superadmin]] | Hệ thống quản trị |

---

> [!TIP]
> **Cách dùng Obsidian:**
> - `Ctrl + Click` vào `[[link]]` để mở trang liên kết.
> - `Ctrl + G` mở **Graph View** để xem toàn cảnh kết nối.
> - Dùng **Canvas** để kéo thả các note thành sơ đồ tư duy.
