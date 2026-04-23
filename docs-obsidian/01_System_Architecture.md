# 🏗 1. Kiến Trúc Hệ Thống (System Architecture)

> [!IMPORTANT]
> Hệ thống sử dụng mô hình **Fat-Client (JAMStack)**: 90% logic chạy trên trình duyệt, kết nối thẳng Supabase. Server chỉ serve file tĩnh + nhận webhook.

## Sơ Đồ Kiến Trúc Tổng Thể

```mermaid
graph TD
    subgraph CLIENT["📱 Frontend (Trình duyệt)"]
        CustApp["Customer App<br/>index.html + modules/"]
        KitchenApp["Kitchen KDS<br/>kitchen.html + kitchen.js"]
        AdminApp["Admin Dashboard<br/>admin.html + admin-*.js"]
        StaffApp["Staff POS<br/>staff.html"]
        TVApp["TV Display<br/>tv.html + tv.js"]
        DeliveryApp["Delivery Hub<br/>delivery.html"]
    end

    subgraph VERCEL["☁️ Vercel (Hosting)"]
        StaticFiles["Static File Server<br/>(HTML/CSS/JS)"]
        WebhookFn["Serverless Function<br/>api/payment-webhook.js"]
        ExpressAPI["Express Server<br/>src/app.js"]
    end

    subgraph SUPABASE["🟢 Supabase (BaaS)"]
        SupaAuth["🔐 Auth<br/>(JWT + PIN Login)"]
        SupaDB["🗄 PostgreSQL<br/>(15+ Tables + RPC)"]
        SupaRT["⚡ Realtime<br/>(WebSocket Channels)"]
        SupaRLS["🛡 RLS Policies<br/>(Row Level Security)"]
        SupaStorage["📁 Storage<br/>(Images)"]
    end

    Bank["🏦 Ngân hàng<br/>(Sepay/Casso)"]

    CLIENT -->|"HTTPS GET"| StaticFiles
    CLIENT <-->|"supabase-js SDK"| SupaDB
    CLIENT <-->|"WebSocket"| SupaRT
    CLIENT -->|"JWT Login"| SupaAuth
    Bank -->|"POST webhook"| WebhookFn
    WebhookFn -->|"Service Role Key"| SupaDB
    SupaDB --- SupaRLS

    classDef client fill:#3b82f6,stroke:#fff,color:#fff
    classDef vercel fill:#000,stroke:#fff,color:#fff
    classDef supa fill:#3ecf8e,stroke:#fff,color:#000
    classDef bank fill:#f59e0b,stroke:#fff,color:#000

    class CustApp,KitchenApp,AdminApp,StaffApp,TVApp,DeliveryApp client
    class StaticFiles,WebhookFn,ExpressAPI vercel
    class SupaAuth,SupaDB,SupaRT,SupaRLS,SupaStorage supa
    class Bank bank
```

## Tech Stack Chi Tiết

| Layer | Công nghệ | Vai trò |
|-------|-----------|---------|
| **Frontend** | Vanilla JS + Tailwind CSS 3.4 | UI/UX, business logic |
| **Styling** | Glassmorphism + Dark Mode | Design system |
| **Font** | Plus Jakarta Sans + Inter | Typography |
| **Icons** | Font Awesome 6.4 | Biểu tượng |
| **i18n** | Custom i18n.js | Đa ngôn ngữ VI/EN |
| **Backend** | Express 5 + Helmet + Rate Limiter | Security & Routing |
| **Database** | Supabase PostgreSQL | CSDL chính |
| **Realtime** | Supabase Realtime (WebSocket) | Đồng bộ tức thì |
| **Auth** | Supabase Auth + PIN Hash | Xác thực nhân viên |
| **Hosting** | Vercel (Serverless) | Deploy & CDN |
| **Payment** | VietQR + Webhook Auto-verify | Thanh toán tự động |

## Luồng Dữ Liệu Chính

```mermaid
sequenceDiagram
    participant KH as 📱 Khách hàng
    participant FE as 💻 Frontend JS
    participant SB as 🟢 Supabase DB
    participant RT as ⚡ Realtime
    participant BP as 🍳 Màn hình Bếp
    participant TV as 📺 TV Display

    KH->>FE: Quét QR → Vào menu
    FE->>SB: Đọc products + store_settings
    KH->>FE: Chọn món → Checkout
    FE->>SB: INSERT orders (status=Pending)
    SB->>RT: Broadcast INSERT event
    RT->>BP: 🔔 Đơn mới xuất hiện + âm báo
    RT->>TV: Hiện mã đơn "Đang chuẩn bị"
    BP->>SB: UPDATE status → Preparing → Ready
    SB->>RT: Broadcast UPDATE event
    RT->>TV: ✅ Đơn chuyển sang "Đã xong"
    RT->>KH: Tracking page cập nhật
```

---

👉 **Tiếp theo**: Cấu trúc database chi tiết → [[02_Database_Schema]]
