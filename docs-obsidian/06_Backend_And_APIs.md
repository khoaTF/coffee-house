# ⚙️ 6. Backend & APIs

> [!NOTE]
> Backend của hệ thống rất nhẹ — chỉ phục vụ **2 chức năng**: serve file tĩnh (Clean URLs) và nhận webhook thanh toán. 90% logic nằm ở Frontend + Supabase.

## Kiến Trúc Server

```mermaid
graph TD
    subgraph Vercel["☁️ Vercel Deployment"]
        subgraph ServerlessAPI["api/ (Serverless Functions)"]
            indexAPI["index.js<br/>→ Express app"]
            webhookAPI["payment-webhook.js<br/>→ Auto-verify payment"]
        end

        subgraph Express["src/ (Express App)"]
            app["app.js<br/>(Helmet + Rate Limit)"]
            routes["routes/api.routes.js"]
            controller["controllers/webhook.controller.js"]
            supaConfig["config/supabase.js<br/>(Service Role Key)"]
        end

        subgraph Static["public/ (Static Files)"]
            html["pages/*.html"]
            js["js/*.js + modules/"]
            css["css/*.css"]
            images["images/"]
        end
    end

    indexAPI --> app
    app --> routes
    routes --> controller
    controller --> supaConfig

    Bank["🏦 Ngân hàng"] -->|"POST"| webhookAPI
    webhookAPI --> supaConfig
```

## API Endpoints

| Method | Path | Handler | Chức năng |
|--------|------|---------|-----------|
| `GET` | `/*` | Express static | Serve HTML/CSS/JS/Images |
| `POST` | `/api/payment-webhook` | `payment-webhook.js` | Auto-verify chuyển khoản |
| `POST` | `/api/webhook` | `webhook.controller.js` | Legacy webhook handler |

## Clean URL Routing (vercel.json)

```json
{
    "/api/payment-webhook" → "api/payment-webhook.js",
    "/api/*"               → "api/index.js (Express)",
    "/"                    → "pages/index.html",
    "/login"               → "pages/login.html",
    "/admin"               → "pages/admin.html",
    "/kitchen"             → "pages/kitchen.html",
    "/staff"               → "pages/staff.html",
    "/tv"                  → "pages/tv.html",
    "/delivery"            → "pages/delivery.html",
    "/tracking"            → "pages/tracking.html",
    "/driver"              → "pages/driver.html",
    "/guide"               → "pages/guide.html",
    "/superadmin"          → "pages/superadmin.html"
}
```

## Payment Webhook Flow

```mermaid
sequenceDiagram
    participant Bank as 🏦 Ngân hàng (Sepay/Casso)
    participant WH as ☁️ /api/payment-webhook
    participant DB as 🟢 Supabase

    Bank->>WH: POST { content: "NH123456", amount: 85000 }

    Note over WH: 1. Verify PAYMENT_WEBHOOK_SECRET
    Note over WH: 2. Extract order ref (NH123456)
    Note over WH: 3. Tìm order unpaid matching

    WH->>DB: SELECT orders WHERE payment_ref = 'NH123456'
    DB-->>WH: Order found (total: 85000)

    Note over WH: 4. Verify amount (±5% tolerance)

    WH->>DB: UPDATE orders SET payment_status = 'paid'
    WH-->>Bank: 200 { success: true, matched: 1 }

    Note over DB: Realtime broadcast → Kitchen thấy "Đã TT"
```

## Bảo Mật Server-Side

| Layer | Thư viện | Chức năng |
|-------|----------|-----------|
| **CSP** | `helmet` | Content Security Policy, X-Frame chặn clickjacking |
| **Rate Limit** | `express-rate-limit` | Chống spam webhook |
| **Auth** | `PAYMENT_WEBHOOK_SECRET` | Bearer token xác thực webhook |
| **DB Access** | `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS cho server-side updates |
| **XSS** | `escapeHTML()` | Global utility chống injection |

## Environment Variables

| Key | Mô tả | Nơi dùng |
|-----|--------|----------|
| `SUPABASE_URL` | URL dự án Supabase | Server + Client |
| `SUPABASE_ANON_KEY` | Public key (qua RLS) | Client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (bypass RLS) | Server-side only |
| `PAYMENT_WEBHOOK_SECRET` | Secret xác thực webhook | Vercel Function |

---

👉 **Tiếp theo**: Tính năng mới → [[07_New_Features]]
