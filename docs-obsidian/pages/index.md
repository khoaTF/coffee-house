---
aliases: [Trang chủ, Homepage, Menu QR]
tags: [page, public, customer-facing]
type: page
route: /
file: pages/index.html
role: public
---

# 🏠 Trang Chủ (index)

> Trang đặt hàng chính - Khách hàng quét QR code để truy cập và đặt món.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/` |
| **File** | `public/pages/index.html` |
| **Quyền truy cập** | 🌐 Public (không cần đăng nhập) |
| **Thiết bị** | 📱 Mobile-first |

## Chức năng chính
- Hiển thị menu đồ uống & thức ăn
- Khách hàng chọn món, thêm vào giỏ hàng
- Gửi đơn hàng trực tiếp tại bàn

## Liên kết đến các trang khác

### Trang được liên kết đến từ trang này
- Không có liên kết trực tiếp ra ngoài (trang độc lập cho khách hàng)

### Các trang liên kết đến trang này
- [[login]] → Logo "Powered by Nohope Coffee System"
- [[admin]] → Sidebar navigation → "Trang đặt hàng"
- [[delivery]] → Header logo link
- [[guide]] → Bảng danh sách trang → link "Trang chủ"

## Luồng người dùng
```
Khách hàng quét QR → index (đặt món) → Đơn hàng gửi đến → [[kitchen]] & [[staff]]
```

## Ghi chú
- Đây là entry point chính cho khách hàng tại quán
- Mỗi bàn có QR code riêng dẫn đến trang này với tham số bàn
