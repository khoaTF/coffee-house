# 🔄 4. Vòng Đời Đơn Hàng (Order Lifecycle)

> [!IMPORTANT]
> Mọi thay đổi trạng thái đều được **Supabase Realtime** broadcast tức thì đến tất cả màn hình (Bếp, TV, POS, Tracking) — không cần reload.

## State Machine — 5 Trạng Thái

```mermaid
stateDiagram-v2
    [*] --> Pending : Khách gửi đơn qua QR

    state "⏳ Chờ Xử Lý (Pending)" as Pending
    state "🔥 Đang Pha Chế (Preparing)" as Preparing
    state "✅ Sẵn Sàng (Ready)" as Ready
    state "📦 Hoàn Thành (Completed)" as Completed
    state "❌ Đã Hủy (Cancelled)" as Cancelled

    Pending --> Preparing : Bếp nhấn "Nhận Đơn"
    Pending --> Cancelled : Hủy đơn

    Preparing --> Ready : Tất cả items xong
    note right of Preparing
        Item-level tracking:
        Mỗi món check ✅ riêng.
        Tự chuyển Ready khi 100%.
    end note

    Ready --> Completed : Staff giao khách
    note right of Ready
        TV Display nhấp nháy.
        Âm thanh thông báo.
    end note

    Completed --> [*] : Cộng điểm Loyalty
    Cancelled --> [*] : Hoàn kho (nếu đã trừ)
```

## Luồng Thanh Toán Song Song

```mermaid
stateDiagram-v2
    [*] --> Unpaid : Đơn mới tạo

    state "💰 Chưa TT (unpaid)" as Unpaid
    state "✅ Đã TT (paid)" as Paid

    Unpaid --> Paid : Webhook ngân hàng auto-verify
    Unpaid --> Paid : Nhân viên 1-tap xác nhận
    Unpaid --> Paid : Tiền mặt tại quầy

    note right of Unpaid
        VietQR hiển thị mã chuyển khoản.
        Nội dung CK chứa mã đơn.
    end note
```

## Luồng Chi Tiết — Từ Quét QR đến Giao Hàng

```mermaid
sequenceDiagram
    participant KH as 📱 Khách hàng
    participant FE as 💻 Customer App
    participant DB as 🟢 Supabase
    participant RT as ⚡ Realtime
    participant BP as 🍳 Bếp (KDS)
    participant TV as 📺 TV Display
    participant NH as 🏦 Ngân hàng

    Note over KH,FE: Phase 1 — Đặt món
    KH->>FE: Quét QR bàn → Vào menu
    FE->>DB: SELECT products, store_settings
    KH->>FE: Chọn món + Options + Ghi chú
    KH->>FE: Tích điểm (nhập SĐT)
    FE->>DB: INSERT order (Pending + items JSONB)

    Note over DB,TV: Phase 2 — Bếp nhận & chế biến
    DB->>RT: Broadcast: ORDER_INSERTED
    RT->>BP: 🔔 Ding! Đơn mới xuất hiện
    RT->>TV: Mã đơn → cột "Đang chuẩn bị"
    BP->>DB: UPDATE status = 'Preparing'
    BP->>DB: UPDATE items[0].is_done = true (từng món)
    BP->>DB: UPDATE status = 'Ready' (khi 100%)

    Note over RT,KH: Phase 3 — Giao & thanh toán
    RT->>TV: ✅ Mã đơn → cột "Đã xong" + âm thanh
    RT->>KH: Tracking page cập nhật
    NH-->>DB: POST /api/payment-webhook (auto-verify)
    BP->>DB: UPDATE status = 'Completed'
    DB->>RT: Broadcast: Xóa khỏi TV

    Note over DB: Phase 4 — Hậu kỳ
    DB->>DB: Cộng Loyalty points cho customer
    DB->>DB: Ghi cash_transactions
    DB->>DB: Trừ ingredients stock (Recipe)
```

## Item-Level Tracking (Theo dõi từng món)

Mỗi item trong `orders.items` JSONB có:
```json
{
    "name": "Cafe Sữa",
    "quantity": 2,
    "price": 35000,
    "item_code": "A1",
    "is_done": false,
    "note": "Ít đường",
    "selectedOptions": [
        { "choiceName": "Size L", "priceExtra": 10000 }
    ]
}
```

Khi nhân viên bếp click vào từng món:
- `is_done` → `true`, hiện ✅ xanh
- Thanh progress bar cập nhật %
- Khi 100% items done → Tự động chuyển `Ready`

---

👉 **Tiếp theo**: Cấu trúc mã nguồn → [[05_Frontend_Modules]]
