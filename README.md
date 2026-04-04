# ☕ Nohope Coffee — QR Ordering & Management System

> Real-time coffee shop POS, kitchen display, delivery, and admin analytics — all in one.

## ✨ Features

### Customer
- **QR Code Ordering** — Scan table QR → browse menu → order → pay
- **Real-time Order Tracking** — Live status updates (pending → preparing → done)
- **🎰 Mystery Box (Túi Mù)** — Gacha-style blind box: pay 29,000đ, get a random item revealed via slot machine animation. Cheap items appear more often!
- **Delivery Ordering** — Online ordering with address & phone tracking
- **Loyalty Points** — Earn & redeem points, membership tiers
- **Multi-language** — Vietnamese 🇻🇳 / English 🇬🇧 toggle (i18n)
- **PWA Support** — Installable on mobile as a native-like app

### Kitchen
- **Real-time Kitchen Display** — Orders appear instantly via Supabase Realtime
- **Order Queue Management** — Accept, prepare, complete orders
- **Recipe-based Inventory** — Auto-deduct stock when orders are placed

### Admin
- **Dashboard Analytics** — Revenue, order count, popular items
- **Menu Management** — CRUD menu items, categories, pricing, options
- **Inventory & Restock** — Track raw materials, import tickets with unit prices
- **Staff & RBAC** — Granular permissions (cancel order, process payment, etc.)
- **Shift Management** — Open/close shifts, revenue reconciliation
- **Cashflow (Sổ Quỹ)** — Manual + auto transaction logs, KPI reporting
- **Promotions** — Promo codes, discount campaigns
- **QR Generator** — Generate & print table-specific QR codes
- **AI Best Sellers** — Auto-tag trending items
- **Ad Banners** — Hero banners & pop-up promotions
- **CSV Export** — Export data for external analysis

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS, PWA |
| Backend | Supabase (PostgreSQL + Realtime + Auth + RPC) |
| Hosting | Vercel (Static + Serverless) |
| Payments | QR Transfer (Bank/MoMo) |

## 🚀 Getting Started

### Prerequisites
- **Node.js** (LTS) — for local dev server
- **Supabase Project** — with tables & RPC functions configured

### Installation
```bash
git clone https://github.com/khoaTF/coffee-house.git
cd coffee-house
npm install
```

### Configuration
Create a `.env` file (or set Vercel env vars):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Run Locally
```bash
npm start
# or
node server.js
```

### Access Points
| Page | URL |
|------|-----|
| Customer Menu | `/?table=1` |
| Kitchen Display | `/pages/kitchen.html` |
| Admin Dashboard | `/pages/admin.html` |
| Delivery | `/pages/delivery.html` |
| Order Tracking | `/pages/tracking.html` |

## 📁 Project Structure
```
├── public/
│   ├── pages/          # HTML pages (index, admin, kitchen, delivery, tracking)
│   ├── js/             # Client-side JS modules
│   │   ├── customer.js # Main customer ordering logic
│   │   ├── gacha.js    # Mystery Box (Túi Mù) slot machine
│   │   ├── i18n.js     # Multi-language translations
│   │   ├── admin.js    # Admin dashboard logic
│   │   └── ...
│   ├── css/            # Stylesheets
│   └── images/         # Static assets
├── server.js           # Express server + API routes
├── vercel.json         # Vercel deployment config
└── package.json
```

## 🎰 Mystery Box (Túi Mù)
A gacha/blind-box feature where customers:
1. Add "Túi Mù" to cart at a fixed price (29,000đ)
2. Checkout & pay normally
3. After payment, a **slot machine animation** reveals a random menu item
4. Result shows Win/Even/Lose based on actual item value vs gacha price

**Probability**: Items priced ≤29k appear 3× more often. Mid-range (≤43.5k) appear 2×. Premium items appear at base 1× rate.

## 📄 License
Private project — Nohope Coffee © 2026
