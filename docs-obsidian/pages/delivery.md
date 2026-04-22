---
aliases: [Giao hàng, Delivery Page, Đặt hàng online]
tags: [page, public, customer-facing, delivery]
type: page
route: /delivery
file: pages/delivery.html
role: public
---

# 🛵 Trang Giao Hàng (delivery)

> Trang đặt hàng giao tận nơi cho khách hàng - tích hợp bản đồ và theo dõi đơn.

## Thông tin

| Thuộc tính | Giá trị |
|-----------|---------|
| **Route** | `/delivery` |
| **File** | `public/pages/delivery.html` |
| **Quyền truy cập** | 🌐 Public |
| **Bản đồ** | Leaflet.js |

## Chức năng chính
- Đặt hàng giao tận nơi
- Chọn địa chỉ trên bản đồ
- Liên kết app bên thứ 3 (GrabFood, ShopeeFood)

## Liên kết đến các trang khác

### Navigation
- → [[index]] → Logo header link (quay về trang chủ)

### External links
- → GrabFood (grabfood.grab.com)
- → ShopeeFood (shopeefood.vn)

### Các trang liên kết ĐẾN trang delivery
- [[tracking]] → Nút "Quay lại đặt hàng"
- [[guide]] → Bảng danh sách trang

## Luồng người dùng
```
delivery → (đặt hàng) → tracking (theo dõi)
   ↑                         |
   └─────────────────────────┘
   
delivery → index (logo)
```

## Ghi chú
- Đơn hàng delivery sẽ xuất hiện ở [[kitchen]] và [[staff]] qua Supabase Realtime
- Khách hàng sau khi đặt xong có thể theo dõi tại [[tracking]]
