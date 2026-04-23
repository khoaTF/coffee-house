# 💻 5. Cấu Trúc Mã Nguồn Frontend (Modules)

> [!NOTE]
> Kiến trúc **100% Vanilla JS** — không React/Vue. Mỗi trang HTML load các file `.js` cần thiết. Tổng cộng **39 file JS** + **8 file CSS**.

## Sơ Đồ Module Dependency

```mermaid
graph TD
    subgraph Core["🔧 Core Layer"]
        supabase["supabase.js<br/>(SDK CDN 188KB)"]
        config["supabase-config.js<br/>(Init client + escapeHTML)"]
        constants["constants.js<br/>(Hằng số toàn cục)"]
        helpers["helpers.js<br/>(Utility functions)"]
        i18n["i18n.js + i18n-pages.js<br/>(Đa ngôn ngữ VI/EN)"]
        store["store.js<br/>(State management)"]
        retry["retry-helper.js<br/>(Network retry logic)"]
    end

    subgraph Customer["📱 Customer Modules (9 files)"]
        cust["customer.js<br/>(Entry point)"]
        cMenu["customer-menu.js<br/>(Menu + Favorites ❤️)"]
        cCart["customer-cart.js<br/>(Giỏ hàng + Notes)"]
        cModal["customer-modal.js<br/>(Options + Note textarea)"]
        cOrder["customer-order.js<br/>(Checkout + History)"]
        cSession["customer-session.js<br/>(Table lock + QR)"]
        cLoyalty["customer-loyalty.js<br/>(Tích điểm)"]
        cFeedback["customer-feedback.js<br/>(Đánh giá 1-5⭐)"]
        cConfig["customer-config.js<br/>(Cấu hình)"]
        cUI["customer-ui.js<br/>(UI helpers)"]
    end

    subgraph Admin["📊 Admin Modules (13 files)"]
        aCore["admin-core.js<br/>(Init + Router)"]
        aMenu["admin-menu.js<br/>(CRUD sản phẩm)"]
        aOrders["admin-orders.js<br/>(Quản lý đơn)"]
        aPOS["admin-pos.js<br/>(POS tại quầy)"]
        aInventory["admin-inventory.js<br/>(Kho + Recipe)"]
        aAnalytics["admin-analytics.js<br/>(Charts + KPI)"]
        aCRM["admin-crm.js<br/>(Phân khúc khách)"]
        aCashflow["admin-cashflow.js<br/>(Sổ quỹ)"]
        aShifts["admin-shifts.js<br/>(Ca làm việc)"]
        aDelivery["admin-delivery.js<br/>(Giao hàng)"]
        aAds["admin-ads.js<br/>(Promo banners)"]
        aTables["admin-tables.js<br/>(Quản lý bàn)"]
        aManagement["admin-management.js<br/>(Nhân sự)"]
    end

    subgraph Operations["🍳 Operations"]
        kitchen["kitchen.js<br/>(KDS 68KB)"]
        tv["tv.js<br/>(TV Display)"]
        delivery["delivery.js<br/>(Điều phối GH)"]
        driver["driver.js<br/>(Tài xế)"]
        tracking["tracking.js<br/>(Tracking khách)"]
        printer["receipt-printer.js<br/>(In bill 80mm)"]
        gacha["gacha.js<br/>(Vòng quay thưởng)"]
        superadmin["superadmin.js<br/>(SaaS management)"]
    end

    Core --> Customer
    Core --> Admin
    Core --> Operations
    cust --> cMenu & cCart & cModal & cOrder & cSession & cLoyalty & cFeedback

    classDef core fill:#6366f1,color:#fff
    classDef cust fill:#3b82f6,color:#fff
    classDef admin fill:#f59e0b,color:#000
    classDef ops fill:#22c55e,color:#000

    class supabase,config,constants,helpers,i18n,store,retry core
    class cust,cMenu,cCart,cModal,cOrder,cSession,cLoyalty,cFeedback,cConfig,cUI cust
    class aCore,aMenu,aOrders,aPOS,aInventory,aAnalytics,aCRM,aCashflow,aShifts,aDelivery,aAds,aTables,aManagement admin
    class kitchen,tv,delivery,driver,tracking,printer,gacha,superadmin ops
```

## Chi Tiết Customer Modules

| File | Size | Chức năng |
|------|------|-----------|
| `customer.js` | 1.2KB | Entry point — load tất cả modules |
| `customer-menu.js` | 27KB | Render menu, filter category, **Favorites ❤️** |
| `customer-cart.js` | 16KB | Giỏ hàng, quantity, **item notes**, tính tổng |
| `customer-modal.js` | 11KB | Modal chọn Options (Size/Topping) + **note textarea** |
| `customer-order.js` | 26KB | Checkout, VietQR, lịch sử, **notes in history** |
| `customer-session.js` | 20KB | Table lock, QR session, device fingerprint |
| `customer-loyalty.js` | 12KB | Tích điểm, tier display, point exchange |
| `customer-feedback.js` | 15KB | Đánh giá 5⭐, comment, submit |
| `customer-config.js` | 3.5KB | Store settings, theme config |
| `customer-ui.js` | 3.4KB | Toast, modal helpers |

## Chi Tiết Admin Modules

| File | Size | Chức năng |
|------|------|-----------|
| `admin-core.js` | 34KB | Tab routing, init, permissions check |
| `admin-menu.js` | 34KB | CRUD products, options, recipe, images |
| `admin-orders.js` | 32KB | Danh sách đơn, filter, detail modal |
| `admin-pos.js` | 38KB | POS tại quầy cho staff |
| `admin-inventory.js` | 28KB | Kho nguyên liệu, import, logs |
| `admin-analytics.js` | 42KB | KPI metrics, charts, revenue analysis |
| `admin-management.js` | 34KB | CRUD nhân viên, phân quyền |
| `admin-shifts.js` | 33KB | Ca làm việc, đối soát |
| `admin-cashflow.js` | 13KB | Sổ quỹ thu/chi |
| `admin-delivery.js` | 31KB | Quản lý giao hàng |
| `admin-crm.js` | 5KB | CRM + RFM segmentation |
| `admin-ads.js` | 11KB | Promo banners management |
| `admin-tables.js` | 16KB | Quản lý sơ đồ bàn |

## CSS Architecture

| File | Size | Phạm vi |
|------|------|---------|
| `styles.css` | 44KB | Global design system + components |
| `index.css` | 82KB | Tailwind compiled output |
| `admin.css` | 14KB | Admin-specific styles |
| `kitchen.css` | 3KB | Kitchen dashboard styles |
| `login.css` | 7KB | Login page styles |
| `gacha.css` | 7KB | Lucky wheel animations |
| `logo.css` | 2KB | Logo & branding |
| `staff.css` | 1KB | Staff POS styles |

---

👉 **Tiếp theo**: Backend & APIs → [[06_Backend_And_APIs]]
