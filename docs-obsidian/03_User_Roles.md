# 🎭 3. Phân Quyền & Vai Trò (User Roles)

Hệ thống phân chia **6 vai trò** với dashboard riêng biệt cho từng bộ phận. Mỗi vai trò có trang `.html` độc lập, xác thực bằng JWT + PIN.

## Sơ Đồ Phân Quyền

```mermaid
mindmap
  root((Nohope Coffee<br/>QR System))
    👤 Khách Hàng
      Quét QR tại bàn
      Xem Menu & Đặt món
      Tùy chỉnh Options + Ghi chú
      Yêu thích ❤️ món
      Tích điểm Loyalty
      Theo dõi Tracking
      Quay thưởng Gacha
      Gọi phục vụ / Tính tiền
    🍳 Bếp / Pha Chế
      Kitchen Dashboard (KDS)
      Nhận đơn Realtime + Âm báo
      Item-level tracking
      In phiếu nhiệt 80mm
      Xác nhận thanh toán 1-tap
    👨‍💼 Nhân Viên
      Staff POS tại quầy
      Lên đơn manual
      Gộp bàn & Dọn bàn
      Ca làm việc (Shifts)
    🚚 Giao Hàng
      Delivery Admin điều phối
      Driver App nhận đơn
      GPS Tracking
    📊 Quản Trị (Admin)
      Toàn quyền thao tác
      Quản lý Menu + Kho
      Analytics & Báo cáo
      CRM & Loyalty
      Sổ quỹ Cashflow
      Promo Banners
    🛡️ Super Admin
      SaaS Multi-tenant
      Quản lý chi nhánh
      Gói dịch vụ & Giới hạn
```

## Chi Tiết Từng Vai Trò

### 👤 Customer (Khách hàng — Vô danh)
| Thuộc tính | Chi tiết |
|------------|----------|
| **Trang** | `index.html` (Customer Web App) |
| **Xác thực** | Không cần — truy cập qua QR |
| **Quyền DB** | `SELECT` products, store_settings · `INSERT` orders, feedback, staff_requests |
| **Tính năng** | Menu, Cart, Options, Notes, Favorites, Loyalty, Gacha, Tracking |

### 🍳 Kitchen (Bếp / Pha chế)
| Thuộc tính | Chi tiết |
|------------|----------|
| **Trang** | `kitchen.html` (KDS Dashboard) |
| **Xác thực** | PIN login → role = `kitchen` |
| **Quyền DB** | `SELECT/UPDATE` orders · `SELECT` products |
| **Tính năng** | Nhận đơn, Item tracking, In bill, Xác nhận TT, Lịch sử, Gộp món, Station filter |

### 👨‍💼 Staff (Nhân viên thu ngân)
| Thuộc tính | Chi tiết |
|------------|----------|
| **Trang** | `staff.html` (POS Dashboard) |
| **Xác thực** | PIN login → role = `staff` |
| **Quyền DB** | CRUD orders · `SELECT` products, customers |
| **Tính năng** | POS manual, Gọi phục vụ, Ca làm việc |

### 📊 Admin (Quản lý)
| Thuộc tính | Chi tiết |
|------------|----------|
| **Trang** | `admin.html` (Full Dashboard) |
| **Xác thực** | PIN login → role = `admin` hoặc `manager` |
| **Quyền DB** | Full CRUD tất cả bảng (theo staff_permissions) |
| **Modules** | Menu, Orders, POS, Inventory, Analytics, CRM, Cashflow, Shifts, Delivery, Ads, Tables |

### 🚚 Driver (Tài xế giao hàng)
| Thuộc tính | Chi tiết |
|------------|----------|
| **Trang** | `driver.html` |
| **Xác thực** | PIN login |
| **Tính năng** | Nhận đơn giao, Xem địa chỉ, Cập nhật trạng thái |

### 🛡️ Super Admin (Quản trị SaaS)
| Thuộc tính | Chi tiết |
|------------|----------|
| **Trang** | `superadmin.html` |
| **Xác thực** | Supabase Auth (Email/Password) |
| **Quyền DB** | Bypass RLS (Service Role) |
| **Tính năng** | CRUD tenants, Subscription tiers, Hard-delete cascade |

## Ma Trận Quyền (Permission Matrix)

```mermaid
graph LR
    subgraph Pages["Trang Web"]
        P1["/index<br/>(Customer)"]
        P2["/kitchen<br/>(KDS)"]
        P3["/staff<br/>(POS)"]
        P4["/admin<br/>(Dashboard)"]
        P5["/delivery"]
        P6["/driver"]
        P7["/superadmin"]
    end

    subgraph Roles["Vai trò"]
        R1["Customer<br/>(Vô danh)"]
        R2["Kitchen"]
        R3["Staff"]
        R4["Admin/Manager"]
        R5["Driver"]
        R6["SuperAdmin"]
    end

    R1 --> P1
    R2 --> P2
    R3 --> P3
    R4 --> P4
    R4 --> P2
    R4 --> P3
    R4 --> P5
    R5 --> P6
    R6 --> P7
    R6 --> P4
```

---

👉 **Tiếp theo**: Vòng đời đơn hàng → [[04_Order_Lifecycle]]
