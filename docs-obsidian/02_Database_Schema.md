# 🗄 2. Sơ đồ Cơ Sở Dữ Liệu (Database Schema)

Dưới đây là sơ đồ cốt lõi **Thực Thể - Liên Kết (ERD)** của Cafe QR. Cơ sở dữ liệu sử dụng **PostgreSQL** (chạy trên Supabase). 

```mermaid
erDiagram
    store_settings {
        int id PK "Singleton = 1"
        string store_name
        string store_address
        string wifi_pass
        string bank_acc
    }

    users {
        uuid id PK
        string name
        string pin UK
        string role "staff | admin | kitchen | manager"
    }

    customers {
        uuid id PK
        string phone UK "Số điện thoại Tích điểm"
        string name
        string tier
        int current_points
    }
    
    products {
        uuid id PK
        string name
        string category
        numeric price
        numeric promotional_price
        boolean is_best_seller
        jsonb recipe
    }
    
    ingredients {
        uuid id PK
        string name
        string unit
        numeric stock
        numeric low_stock_threshold
    }

    orders {
        uuid id PK
        string table_number
        string session_id
        string customer_phone
        jsonb items
        numeric total_price
        string status "Pending | Preparing | Ready | Completed | Cancelled"
        string payment_status "unpaid | paid"
    }

    shifts {
        uuid id PK
        string opened_by
        timestamp opened_at
        numeric start_balance
        numeric total_revenue
        string status "open | closed"
    }
    
    staff_requests {
        uuid id PK
        string table_number
        string type "staff | bill"
        string status "pending | completed"
    }

    %% Relationships
    orders ||--o| customers : "Tích điểm (customer_phone)"
    products ||--o| ingredients : "Công thức cấu thành (recipe JSONB)"
```

## Các Bảng Cốt Lõi (Core Tables)
- **`orders`**: Trung tâm của hệ thống. Mỗi khi khách "Add to cart" và Submit, nó lưu vào `orders.items` bằng dạng `JSONB` nhằm chống việc khóa Foreign Key khi sửa xóa sản phẩm, giữ hóa đơn gốc luôn đúng trạng thái lịch sử.
- **`store_settings`**: Là bảng Singleton (Chỉ có ID=1), dùng để Supabase quản lý thông tin cấu hình quán (Wifi, tài khoản nhận tiền).
- **`products` & `ingredients`**: Hệ thống quản lý kho tự động. Khi `orders` được hoàn tất (Completed), hệ thống có khả năng gọi RPC/Tự động trừ `ingredients.stock` thông qua `products.recipe`.

*(Chú ý: Trong Supabase, mọi kết nối Front-end được kiểm soát qua RLS (Row Level Security). Người dùng và khách (vô danh) sẽ có Policy độc lập bảo vệ các hàng truy xuất phù hợp).*

👉 **Tiếp tục với**: [[03_User_Roles]]
