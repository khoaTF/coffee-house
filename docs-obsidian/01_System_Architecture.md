# 🏗 1. Kiến Trúc Hệ Thống (System Architecture)

Hệ thống được thiết kế theo mô hình **Fat-Client (JAMStack - static html + client js + BaaS)**, kết hợp cùng một web server siêu nhẹ để serve file html và nhận webhook. Thay vì xử lý logic thông qua Server truyền thống, 90% logic được đẩy xuống Frontend và kết nối thẳng qua **Supabase (Backend-as-a-Service)**.

## Sơ Đồ Kiến Trúc Tổng Thể

```mermaid
graph TD
    %% Tác nhân
    Client[📱 Trình Duyệt / Khách / Nhân viên]
    NodeServer[🟢 Node.js Express Server\n(src/app.js)]
    SupaAuth[🔐 Supabase Auth]
    SupaDB[🗄 Supabase Postgres & Functions]
    SupaRealtime[⚡ Supabase Realtime]
    ThirdParty[💳 Webhook (Thanh toán, \nZalo ZNS, API ngoài)]

    %% Kết nối
    Client -- "1. Gửi request lấy trang tĩnh\n(HTML, CSS, JS)" --> NodeServer
    NodeServer -- "2. Trả về Frontend App" --> Client
    
    Client -- "3. Đăng nhập / Xác thực\n(Token JWT)" --> SupaAuth
    Client -- "4. Truy vấn / Ghi Dữ Liệu\n(Supabase.js client)" --> SupaDB
    Client -- "5. WebSocket: Lắng nghe trạng thái realtime" <--> SupaRealtime
    
    ThirdParty -- "6. Bắn Webhook" --> NodeServer
    NodeServer -- "7. Controller xử lý Webhook\n(Thêm đơn, Cập nhật trạng thái...)" --> SupaDB

    %% Style
    classDef client fill:#3b82f6,stroke:#fff,stroke-width:2px,color:#fff,rx:10,ry:10;
    classDef server fill:#22c55e,stroke:#fff,stroke-width:2px,color:#fff,rx:10,ry:10;
    classDef supabase fill:#10b981,stroke:#fff,stroke-width:2px,color:#fff,rx:10,ry:10;
    classDef thirdparty fill:#f59e0b,stroke:#fff,stroke-width:2px,color:#fff,rx:10,ry:10;

    class Client client;
    class NodeServer server;
    class SupaAuth,SupaDB,SupaRealtime supabase;
    class ThirdParty thirdparty;
```

## Giải Thích Các Tầng
- **Tầng Client**: Là các modules trong `public/js/` chứa mọi Logic giao diện. Khi file tải về trình duyệt, mã JS sẽ tự bắt nối `supabase.js` bằng public key.
- **Tầng Server (Express)**:
    - Nhiệm vụ 1: Trả về file HTML sạch, tối ưu bảo mật (`Helmet`), rate-limiting (tránh DDOS).
    - Nhiệm vụ 2: `.post('/api/webhook')` tiếp nhận biến động bên ngoài (nhạc lệnh ngân hàng báo đã thanh toán). Do CSDL không gọi qua mạng internet bên ngoài được hoặc cần ẩn API token, hệ thống ủy quyền tác vụ này thay vì lưu Secret dưới Frontend.
- **Tầng Supabase**: 
    - Database xử lý dữ liệu với RLS (Row Level Security).
    - Realtime dùng PostgreSQL replication để ngay lập tức cập nhật màn hình Bếp, Thu Ngân khi Khách đặt đơn.

👉 **Tiếp theo**: Đi vào chi tiết xem dữ liệu được lưu trữ ra sao với [[02_Database_Schema]]
