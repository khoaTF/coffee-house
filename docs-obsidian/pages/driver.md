---
aliases: [Tài xế, Driver App]
tags: [page, protected, driver, mobile]
type: page
route: /driver
file: pages/driver.html
role: driver
---

# 🚗 Trang Tài Xế (driver)

> Giao diện cho tài xế giao hàng - nhận đơn, điều hướng, cập nhật trạng thái.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/driver` |
| **File** | `public/pages/driver.html` |
| **Quyền truy cập** | 🔒 Driver |
| **Bản đồ** | Leaflet.js |

## Chức năng chính
- Nhận đơn hàng giao hàng
- Điều hướng đến địa chỉ khách
- Cập nhật trạng thái giao hàng

## Liên kết đến các trang khác

### Navigation
- Không có liên kết trực tiếp đến trang khác (trang độc lập)

### Các trang liên kết ĐẾN trang driver
- [[guide]] → Bảng danh sách trang

## Luồng người dùng
```
driver → (độc lập, nhận đơn qua realtime)
```

## Ghi chú
- Trang **độc lập** - không có navigation đến trang khác
- Vị trí tài xế hiển thị trên [[tracking]] qua dữ liệu realtime
- Nhận đơn từ hệ thống [[delivery]] qua Supabase
