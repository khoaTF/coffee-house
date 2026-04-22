---
aliases: [Bếp, Kitchen Display, KDS]
tags: [page, protected, kitchen, realtime]
type: page
route: /kitchen
file: pages/kitchen.html
role: kitchen, admin, manager
---

# 👨‍🍳 Trang Bếp (kitchen)

> Màn hình hiển thị đơn hàng cho nhà bếp - cập nhật realtime, quản lý trạng thái món.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/kitchen` |
| **File** | `public/pages/kitchen.html` |
| **Quyền truy cập** | 🔒 Kitchen, Admin, Manager |
| **Realtime** | ✅ Supabase Realtime |

## Chức năng chính
- Hiển thị đơn hàng mới theo thời gian thực
- Cập nhật trạng thái món (đang làm → hoàn thành)
- Phân loại đơn theo ưu tiên

## Liên kết đến các trang khác

### Navigation
- → [[admin]] → Nút "Quản trị" (chỉ hiện cho admin/manager)

### Auth redirects
- → [[login]] → Khi logout hoặc session hết hạn

### Các trang liên kết ĐẾN trang kitchen
- [[login]] → Redirect sau đăng nhập (role: kitchen)
- [[admin]] → Sidebar navigation → "Bếp"
- [[guide]] → Bảng danh sách trang

## Luồng người dùng
```
login (kitchen) → kitchen ←→ admin
                     ↓
                   login (logout)
```

## Ghi chú
- Liên kết **hai chiều** với [[admin]]
- Nhận đơn hàng từ [[index]] và [[delivery]] qua Supabase Realtime (không phải link trực tiếp)
