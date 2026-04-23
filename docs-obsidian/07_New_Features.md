# 🆕 7. Tính Năng Mới (Phase 6+ Features)

> [!TIP]
> Các tính năng dưới đây đã được triển khai thành công ngày **23/04/2026** và push lên production.

## 7.1 Ghi Chú Từng Món (Item Notes) 📝

Cho phép khách hàng thêm ghi chú riêng cho mỗi món khi đặt hàng.

### Luồng hoạt động

```mermaid
graph LR
    A["📱 Khách chọn món<br/>Modal Options"] -->|"Nhập ghi chú"| B["🛒 Lưu vào Cart<br/>(note field)"]
    B -->|"Checkout"| C["📤 Gửi order<br/>(items JSONB)"]
    C -->|"Realtime"| D["🍳 Bếp thấy ghi chú<br/>(amber box)"]
    C -->|"Lịch sử"| E["📋 Hiện trong<br/>Order History"]
```

### Files liên quan
| File | Thay đổi |
|------|----------|
| `customer-modal.js` | Thêm `<textarea>` ghi chú trong modal options |
| `customer-cart.js` | `handleCartUpdate()` lưu `note` vào cart item |
| `customer-order.js` | Gửi `note` trong payload + hiện trong lịch sử |
| `kitchen.js` | Render note trong khung amber (`bg-amber-50`) |

### Ví dụ dữ liệu
```json
{
    "name": "Cafe Sữa Đá",
    "quantity": 1,
    "price": 35000,
    "note": "Ít đường, nhiều đá",
    "selectedOptions": [...]
}
```

---

## 7.2 Hệ Thống Yêu Thích (Favorites) ❤️

Cho phép khách "thả tim" các món thường xuyên gọi, lọc nhanh khi quay lại.

### Cách hoạt động

```mermaid
graph TD
    A["❤️ Nhấn heart trên card"] -->|"Toggle"| B{"Đã yêu thích?"}
    B -->|"Chưa"| C["Thêm vào localStorage<br/>key: nohope_favorites"]
    B -->|"Rồi"| D["Xóa khỏi localStorage"]
    C --> E["Hiện pill '❤️ Yêu thích'<br/>trong category filter"]
    D --> F["Ẩn pill nếu rỗng"]
    E --> G["Filter: chỉ hiện<br/>các món đã thả tim"]
```

### Files liên quan
| File | Thay đổi |
|------|----------|
| `customer-menu.js` | `getFavorites()`, `toggleFavorite()`, render heart button, add filter pill |
| `styles.css` | `.fav-heart-btn` CSS + animation `heartPop` + dark mode |

### Đặc điểm kỹ thuật
- **Persistence**: `localStorage` (key: `nohope_favorites`)
- **Animation**: `heartPop` keyframe — scale bounce khi toggle
- **Dark mode**: Tự động điều chỉnh background/color
- **Responsive**: Circular 32px button, position absolute top-right

---

## 7.3 In Hóa Đơn Nhiệt (Receipt Printer) 🖨️

In bill 80mm trực tiếp từ trình duyệt — không cần driver phần mềm.

### Luồng in

```mermaid
sequenceDiagram
    participant Staff as 🍳 Nhân viên bếp
    participant JS as receipt-printer.js
    participant Win as 🪟 Popup Window
    participant Printer as 🖨️ Máy in nhiệt

    Staff->>JS: Click "In Bill"
    JS->>JS: Format receipt HTML (80mm)
    JS->>Win: window.open() → Inject HTML
    Win->>Win: Render receipt
    Win->>Printer: window.print()
    Note over Printer: ESC/POS compatible<br/>80mm thermal paper
    Win->>Win: Auto-close sau 1s
```

### Nội dung bill in ra
| Phần | Chi tiết |
|------|----------|
| Header | Tên quán + tagline |
| Order ID | Mã 6 ký tự (in lớn) |
| Bàn + Thời gian | Số bàn + ngày giờ |
| Danh sách món | Tên × SL, options, notes, giá |
| Tổng | Tạm tính, giảm giá, **TỔNG CỘNG** |
| Thanh toán | Phương thức + ghi chú đơn |
| Footer | "Cảm ơn quý khách! ☕" |

### File: `receipt-printer.js`
- Font: Courier New (monospace)
- Paper: `@page { size: 80mm auto }`
- Tự động popup + print + close

---

## 7.4 Xác Nhận Thanh Toán Tự Động (Payment Webhook) 💳

### Webhook Flow

```mermaid
graph TD
    A["🏦 Khách chuyển khoản<br/>Nội dung: NH123456"] -->|"Sepay/Casso"| B["POST /api/payment-webhook"]
    B --> C{"Verify<br/>WEBHOOK_SECRET"}
    C -->|"❌ Sai"| D["401 Unauthorized"]
    C -->|"✅ Đúng"| E["Extract order ref<br/>từ nội dung CK"]
    E --> F["Tìm order unpaid<br/>matching ref"]
    F -->|"Found"| G["UPDATE payment_status = paid"]
    F -->|"Not found"| H["Log & skip"]
    G --> I["✅ Realtime broadcast<br/>Bếp thấy 'Đã TT'"]
```

### Chiến lược matching
1. **Strategy 1**: Match `payment_ref` column trực tiếp
2. **Strategy 2**: Match order ID suffix (6 digits)
3. **Tolerance**: Chấp nhận ±5% chênh lệch số tiền

### 1-Tap Manual Confirm
Khi webhook chưa kịp bắn, nhân viên bếp có thể nhấn nút **"Chưa TT — Nhấn xác nhận"** trên mỗi order card để update thủ công.

### Files liên quan
| File | Thay đổi |
|------|----------|
| `api/payment-webhook.js` | Vercel serverless function |
| `vercel.json` | Route `/api/payment-webhook` |
| `kitchen.js` | `markOrderPaid()` function + button UI |

---

## Tổng Hợp Tất Cả Tính Năng

```mermaid
mindmap
    root((Nohope Coffee<br/>Feature Map))
        📱 Customer
            Menu + Filter
            Options + Ghi chú 📝
            Favorites ❤️
            Cart + Checkout
            VietQR Payment
            Loyalty Points
            Gacha Wheel 🎰
            Feedback ⭐
            Tracking
            Call Staff/Bill
            i18n VI/EN
        🍳 Kitchen
            KDS Realtime
            Item Tracking ✅
            Station Filter
            Group View
            Print Receipt 🖨️
            1-Tap Payment ✅
            Audio Alert 🔔
            Order History
        📊 Admin
            Menu CRUD
            Orders Management
            POS at Counter
            Inventory + Recipe
            Analytics + Charts
            CRM + RFM
            Cashflow Ledger
            Shifts Management
            Staff + Permissions
            Delivery Hub
            Promo Banners
            Table Management
        📺 TV Display
            Dual Column View
            Audio Notification
            Auto-refresh
        🚚 Delivery
            Order Dispatch
            Driver Assignment
            GPS Tracking
        🛡️ SaaS
            Multi-tenant
            Subscription Tiers
            Superadmin Panel
```

---

👉 **Tiếp theo**: Lịch sử phát triển → [[08_Development_Timeline]]
