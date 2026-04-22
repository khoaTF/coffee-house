---
aliases: [Hướng dẫn, User Guide, Tài liệu]
tags: [page, public, documentation]
type: page
route: /guide
file: pages/guide.html
role: public
---

# 📖 Trang Hướng Dẫn (guide)

> Tài liệu hướng dẫn sử dụng hệ thống - liên kết đến TẤT CẢ các trang.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/guide` |
| **File** | `public/pages/guide.html` |
| **Quyền truy cập** | 🌐 Public |
| **Vai trò** | Hub tài liệu |

## Chức năng chính
- Hướng dẫn sử dụng cho từng role
- Bảng danh sách tất cả trang trong hệ thống
- QR code links

## Liên kết đến các trang khác

### Bảng danh sách trang (links đến TẤT CẢ trang)
- → [[index]] → Trang chủ đặt hàng
- → [[delivery]] → Trang giao hàng
- → [[tracking]] → Theo dõi đơn hàng
- → [[kitchen]] → Trang bếp
- → [[staff]] → Trang nhân viên
- → [[driver]] → Trang tài xế
- → [[tv]] → Màn hình TV
- → [[admin]] → Trang quản trị
- → [[login]] → Trang đăng nhập

### Các trang liên kết ĐẾN trang guide
- [[admin]] → Sidebar navigation → "Hướng dẫn"

## Luồng người dùng
```
admin → guide → (tất cả trang)
```

## Ghi chú
- Đây là **HUB trung tâm** - liên kết đến MỌI trang trong hệ thống
- Sẽ tạo ra node lớn nhất trên Graph View
- Chỉ [[admin]] có link trực tiếp đến guide
