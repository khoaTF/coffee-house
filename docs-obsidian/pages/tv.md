---
aliases: [TV Display, Màn hình TV, Menu Board]
tags: [page, public, display, tv]
type: page
route: /tv
file: pages/tv.html
role: public
---

# 📺 Trang TV Display (tv)

> Hiển thị trạng thái đơn hàng trên màn hình TV tại quán.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/tv` |
| **File** | `public/pages/tv.html` |
| **Quyền truy cập** | 🌐 Public |
| **Realtime** | ✅ Cập nhật đơn hàng |

## Chức năng chính
- Hiển thị trạng thái đơn hàng (đang chờ → đang làm → sẵn sàng)
- Tự động cập nhật realtime
- Giao diện tối ưu cho màn hình lớn

## Liên kết đến các trang khác

### Navigation
- Không có liên kết trực tiếp đến trang khác (trang hiển thị độc lập)

### Các trang liên kết ĐẾN trang tv
- [[guide]] → Bảng danh sách trang

## Luồng người dùng
```
tv → (độc lập, hiển thị đơn hàng realtime)
```

## Ghi chú
- Trang **độc lập** - chỉ hiển thị dữ liệu, không có navigation
- Nhận dữ liệu từ đơn hàng [[index]] và [[delivery]] qua Supabase Realtime
