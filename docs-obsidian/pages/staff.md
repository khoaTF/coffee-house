---
aliases: [Nhân viên, Staff Panel, Thu ngân]
tags: [page, protected, staff, pos]
type: page
route: /staff
file: pages/staff.html
role: staff
---

# 🧑‍💼 Trang Nhân Viên (staff)

> Giao diện POS cho nhân viên phục vụ - quản lý đơn hàng, thanh toán.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/staff` |
| **File** | `public/pages/staff.html` |
| **Quyền truy cập** | 🔒 Staff |
| **Kích thước** | 48KB |

## Chức năng chính
- Xem và quản lý đơn hàng
- Thanh toán đơn hàng
- Giao tiếp với bếp
- Quản lý bàn

## Liên kết đến các trang khác

### Auth redirects
- → [[login]] → Khi logout hoặc session hết hạn

### Các trang liên kết ĐẾN trang staff
- [[login]] → Redirect sau đăng nhập (role: staff - default)
- [[guide]] → Bảng danh sách trang

## Luồng người dùng
```
login (staff) → staff
                  ↓
                login (logout)
```

## Ghi chú
- Trang này **không có liên kết trực tiếp** đến trang khác ngoài login
- Nhận đơn hàng từ [[index]] qua Supabase Realtime
