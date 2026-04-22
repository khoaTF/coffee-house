 # 🗂 Cẩm Nang Hệ Thống Cafe QR (Map Of Contents)

Chào mừng bạn đến với hệ thống tài liệu đồ thị tư duy (Knowledge Graph) của dự án **Cafe QR System**. Bạn có thể điều hướng nhanh đến từng phần thông qua các liên kết bên dưới.

## 🏛 1. Kiến Trúc Giải Pháp
Mô tả sơ đồ tổng quan của toàn bộ Client - Server - Database.
👉 [[01_System_Architecture]]

## 💾 2. Cơ Sở Dữ Liệu
Biểu đồ Thực thể - Liên kết (ER Diagram) minh họa các bảng, trường dữ liệu cốt lõi (Orders, Products, Ingredients, User...) cùng chức năng SaaS multi-tenant.
👉 [[02_Database_Schema]]

## 🎭 3. Phân Quyền & Quy Trình
Hiểu về các vai trò trong hệ thống và vòng đời đơn hàng.
- **Vai trò người dùng:** 👉 [[03_User_Roles]]
- **Quy trình đơn hàng (State Logic):** 👉 [[04_Order_Lifecycle]]

## 💻 4. Cấu Trúc Mã Nguồn
Bóc tách các Modules trên giao diện và backend, luồng hoạt động từng file.
- **Client & Giao diện:** 👉 [[05_Frontend_Modules]]
- **Server & APIs:** 👉 [[06_Backend_And_APIs]]

## 🗺 5. Sơ Đồ Mạng Lưới Trang Web
Bản đồ liên kết giữa tất cả các trang trong hệ thống - xem bằng Graph View.
👉 [[00_Sitemap]]

**Các trang chính:**
| Nhóm | Trang |
|-------|-------|
| 🌐 Public | [[index]] · [[delivery]] · [[tracking]] · [[tv]] · [[guide]] |
| 🔒 Protected | [[admin]] · [[kitchen]] · [[staff]] · [[driver]] |
| 🛡️ System | [[login]] · [[superadmin]] |

---
> [!TIP]
> **Hướng dẫn xem Obsidian**: 
> - Nhấn phím `Ctrl`/`Cmd` + Click vào các link `[[...]]` phía trên để mở qua lại giữa các file.
> - Bấm tổ hợp `Ctrl`/`Cmd` + `G` để mở **Graph View** và nhìn toàn cảnh sự liên kết tuyệt đẹp của dự án này!
