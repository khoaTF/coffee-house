# 💻 5. Cấu trúc Mã Nguồn (Frontend Modules)

Dự án này sử dụng kiến trúc hoàn toàn Modular trên Frontend JS (`public/js/`), không build bằng Webpack/React mà dùng Vanilla JS (với ES Modules nếu có) cho tốc độ thực thi trực tiếp trên trình duyệt. Rất thích hợp để host dưới dạng Static File.

## Các Thư Viện Chức Năng Chính

```mermaid
graph LR
    subgraph Core ["Nhân lõi & Data"]
        supabase[supabase.js (Connect DB)]
        i18n[i18n.js (Đa ngôn ngữ)]
        constants[constants.js (Hằng số)]
    end

    subgraph UserSpaces ["Logic Giao Diện"]
        customer[customer.js / tracking.js]
        admin[admin-*.js (POS, Menu, Analytics...)]
        roles[kitchen.js / delivery.js / staff.js]
    end

    subgraph Addons ["Tính Năng Mờ Rộng"]
        gacha[gacha.js (Vòng quay may mắn)]
    end

    UserSpaces --> Core
    Addons --> Core
```

## Bóc Tách `public/js/`
- **`supabase.js` / `supabase-config.js`**: Tim mạch của ứng dụng - cấu hình URL và API KEY để JS Client móc thẳng tới DB.
- **Dòng họ `admin-*.js`**: Chủ yếu để load vào trang `admin.html`. 
  - `admin-analytics.js`: Phân tích Chart.
  - `admin-pos.js`: Điểm tính tiền tại quầy cho thu ngân.
  - `admin-inventory.js`: Quản lý trừ kho recipe.
  - `admin-shifts.js`: Mở/Đóng ca.
- **`customer.js`** & **`gacha.js`**: Logic tạo đơn ngoài Front-end và mini-game Vòng Quay cho khách hàng.
- **Dòng họ đa ngôn ngữ**: `i18n.js`, `i18n-pages.js`. Hỗ trợ chuyển đổi Tiếng Việt / Tiếng Anh cho khách nước ngoài khi dùng menu thông minh.

👉 **Tiếp tục với**: [[06_Backend_And_APIs]]
