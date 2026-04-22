---
aliases: [Quản trị, Admin Dashboard, Bảng điều khiển]
tags: [page, protected, admin, dashboard]
type: page
route: /admin
file: pages/admin.html
role: admin, manager
---

# 👨‍💼 Trang Quản Trị (admin)

> Bảng điều khiển chính cho quản lý quán - quản lý menu, đơn hàng, nhân viên, thống kê.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/admin` |
| **File** | `public/pages/admin.html` |
| **Quyền truy cập** | 🔒 Admin, Manager |
| **Kích thước** | 164KB (trang lớn nhất) |

## Chức năng chính
- Dashboard thống kê (Analytics)
- Quản lý menu & sản phẩm
- Quản lý đơn hàng
- Quản lý nhân viên
- Cài đặt quán

## Liên kết đến các trang khác

### Navigation sidebar
- → [[index]] → "Trang đặt hàng" (xem trang khách hàng)
- → [[kitchen]] → "Bếp" (xem trang bếp)
- → [[guide]] → "Hướng dẫn" (mở tab mới)

### Auth redirects
- → [[login]] → Khi logout hoặc session hết hạn

### Các trang liên kết ĐẾN trang admin
- [[login]] → Redirect sau đăng nhập (role: admin/manager)
- [[kitchen]] → Nút "Quản trị" trong header
- [[guide]] → Bảng danh sách trang

## Luồng người dùng
```
login (admin/manager) → admin ←→ index, kitchen, guide
                           ↓
                         login (logout)
```

## Ghi chú
- Đây là trang lớn nhất và phức tạp nhất trong hệ thống
- Có kết nối **hai chiều** với [[kitchen]] (admin → kitchen & kitchen → admin)
