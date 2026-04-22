---
aliases: [Theo dõi đơn, Order Tracking]
tags: [page, public, customer-facing, tracking]
type: page
route: /tracking
file: pages/tracking.html
role: public
---

# 📍 Trang Theo Dõi Đơn Hàng (tracking)

> Theo dõi trạng thái đơn hàng giao hàng theo thời gian thực.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/tracking` |
| **File** | `public/pages/tracking.html` |
| **Quyền truy cập** | 🌐 Public |
| **Realtime** | ✅ Cập nhật trạng thái đơn |

## Chức năng chính
- Hiển thị trạng thái đơn hàng (đang xử lý → đang giao → hoàn thành)
- Theo dõi vị trí tài xế trên bản đồ
- Thông tin chi tiết đơn hàng

## Liên kết đến các trang khác

### Navigation
- → [[delivery]] → Nút "Quay lại đặt hàng" (2 links)

### Các trang liên kết ĐẾN trang tracking
- [[guide]] → Bảng danh sách trang

## Luồng người dùng
```
delivery → tracking ←→ delivery
```

## Ghi chú
- Liên kết **hai chiều** với [[delivery]]
- Hiển thị vị trí của [[driver]] trên bản đồ (qua dữ liệu, không phải link)
