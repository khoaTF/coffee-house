# 🛠 10. Phân Tích Chuyên Sâu Tính Năng & Thuật Toán

Tài liệu này bóc tách chi tiết các tính năng cốt lõi và thuật toán kỹ thuật (đang chạy "dưới nắp capo") của hệ thống Nohope Coffee QR. Tài liệu dành cho các kỹ sư phát triển, quản trị viên hệ thống để hiểu rõ cơ chế vận hành.

---

## 🏛 PHẦN 1: CÁC TÍNH NĂNG CỐT LÕI (Detailed Features)

### 1.1 Kiến Trúc Đa Khách Hàng (Shared-DB Multi-tenant SaaS)
Hệ thống Nohope Coffee có khả năng cung cấp phần mềm cho nhiều chuỗi cửa hàng cà phê khác nhau trên **cùng một nền tảng mã nguồn và cơ sở dữ liệu**.

- **Cơ chế**: Không dùng cấu trúc URL riêng (như `tenant.domain.com`) mà sử dụng chung URL `/admin`.
- **Cách phân tách dữ liệu**:
  1. Khi User đăng nhập qua Supabase Auth, máy chủ nhận diện `user.id`.
  2. Bảng `users` ánh xạ `user.id` tới `tenant_id` (Mã định danh của quán/công ty).
  3. Giá trị `tenant_id` được lưu trữ an toàn trong `sessionStorage` (ở file `admin-core.js`).
  4. **Tất cả các truy vấn Database** (lấy món, lấy đơn hàng) đều bị filter cưỡng bức: `.eq('tenant_id', currentTenantId)`.
- **Bảo mật RLS**: Ở phía cơ sở dữ liệu, **Row Level Security** (RLS) của Postgres chặn toàn bộ các request cố tình truy vấn dữ liệu của quán khác (nếu hacker sửa gói tin).

### 1.2 Hệ Thống Hiển Thị Bếp KDS (Kitchen Display System)
Luồng xử lý đơn hàng thời gian thực từ điện thoại khách xuống thẳng màn hình bếp.

- **WebSocket Broadcast**: Ngay khi khách ấn "Xác nhận đặt", hệ thống push một object hóa đơn lên cơ sở dữ liệu.
- **Supabase Realtime**: `kitchen.js` sử dụng `supabase.channel()` lắng nghe các thay đổi `INSERT` trên bảng `orders` có chứa `tenant_id` tương ứng.
- **State Machine**: Món ăn có luồng vòng đời tuyến tính: `pending` (chờ làm) ➔ `preparing` (đang pha) ➔ `ready` (đã xong) ➔ `completed` (đã giao khách).

### 1.3 Quản Lý Giỏ Hàng & Tùy Chọn Động (Cart & Options Matrix)
Module `customer-cart.js` không chỉ lưu ID sản phẩm, mà lưu **toàn bộ định dạng của sản phẩm** ở thời điểm đặt.

- **Options Array**: Khách có thể chọn nhiều topping (như Trân châu, Thêm đá, Thêm đường). Mỗi loại topping được lưu thành mảng `options` đính kèm trong object món.
- **Lưu chú (Item Notes)**: Mỗi dòng sản phẩm trong giỏ hàng đều có một thuộc tính `note` (ghi chú riêng biệt: "Ít ngọt", "Không lấy muỗng").
- **Hệ thống tính giá chéo (Cross-calculation)**: `Cart Total = Sum(Item Price + Sum(Option Prices)) * Quantity`.

### 1.4 Hệ Thống Phân Quyền (Role-Based Access Control - RBAC)
Ngăn chặn nhân viên phục vụ truy cập vào báo cáo doanh thu hay kho bãi.

- **Cấu trúc lưu trữ**: Mỗi tài khoản có mảng `permissions` dạng `["pos", "orders", "kitchen"]` được lưu trong database.
- **Frontend Filter**: Ở `admin-core.js`, khi render thanh Sidebar, thẻ `<li>` sẽ bị ẩn `display: none` nếu chuỗi quyền không khớp với `data-permission`.
- **Backend Filter**: Mặc dù ẩn ở Frontend, nhưng Supabase RLS ở Backend cũng chứa logic cấm `SELECT` / `UPDATE` nếu JWT Token của user không có cờ phân quyền phù hợp.

---

## 🧠 PHẦN 2: THUẬT TOÁN KỸ THUẬT SÂU (Core Algorithms)

### 2.1 Thuật Toán Trừ Kho Nguyên Tử (Atomic Inventory Transaction)
Đây là "trái tim" của hệ thống chống gian lận và chống xuất âm kho (Over-selling). Được lập trình bằng PostgreSQL Stored Procedure (RPC `process_checkout`).

> [!CAUTION]
> **Bài toán Over-selling:** Nếu 2 khách cùng bấm đặt "Cà phê sữa" cùng 1 mili-giây, mà lượng sữa trong kho chỉ còn đủ cho 1 ly, nếu xử lý bằng JavaScript sẽ gây lỗi xuất âm kho.

**Giải thuật (Atomic SQL):**
1. Nhận mảng `cart_items` từ khách.
2. Dùng con trỏ lặp (loop) qua từng item, phân rã trường `recipe` (Công thức) để quy đổi ra các nguyên liệu gốc (ingredient_id, lượng tiêu hao).
3. Cộng dồn lượng cần tiêu hao vào một bảng tạm (Temporary array).
4. Khởi tạo một giao dịch **Lock** (Database Transaction): So sánh bảng tạm với tồn kho thực tế ở bảng `ingredients`.
5. **IF (Kho >= Lượng Cần)**:
   - Trừ kho thật.
   - Thêm bản ghi `inventory_logs` (Ghi vết).
   - Thêm bản ghi vào `orders`.
   - Xác nhận lưu (COMMIT).
6. **IF (Kho < Lượng Cần)**:
   - Phá bỏ toàn bộ thao tác (ROLLBACK). Không lưu đơn, không trừ kho.
   - Quăng lỗi (Throw Error) về màn hình điện thoại khách thông báo "Hết nguyên liệu".

### 2.2 Thuật Toán Khóa Bàn & Dấu Vân Tay (Table Lock & Fingerprinting)
Ngăn chặn việc nhiều điện thoại (hoặc troll/phá hoại) quét chung 1 mã QR dán trên bàn. 

**Giải thuật Fingerprint (`customer-session.js`):**
- Hệ thống gom nhặt thông tin trình duyệt: UserAgent, Screen Resolution, Color Depth, Timezone, Ngôn ngữ...
- Biến đổi (Hash) các thông tin trên thành một chuỗi Hex (VD: `abc123xyz890`) gọi là `deviceFingerprint`.
- Khi thiết bị A lần đầu quét QR bàn số 5, hệ thống sẽ tạo một bản ghi `table_sessions` khóa bàn số 5 với `fingerprint` của thiết bị A. Thời gian khóa có thể là 60 phút.
- Nếu thiết bị B quét bàn số 5, hệ thống đối chiếu `fingerprint` của B thấy khác chuỗi đang khóa, lập tức chặn B và hiển thị: *"Bàn này đang được người khác đặt. Vui lòng chờ!"*

### 2.3 Thuật Toán Tính Điểm Khách Hàng (Loyalty & Tiering Algorithm)
Quy tắc tự động tích lũy và nâng/hạ hạng thẻ thành viên.

- **Tích điểm (Earning)**: Bằng tỷ lệ quy đổi, ví dụ: 10,000 VND = 1 Điểm. `Points = Math.floor(TotalAmount / 10000)`.
- **Thăng hạng (Tier Evaluation)**: 
  Sử dụng vòng lặp duyệt qua Object cấp độ (Tiers):
  - Đồng (Bronze): 0 - 99 điểm
  - Bạc (Silver): 100 - 499 điểm
  - Vàng (Gold): 500 - 999 điểm
  - Kim Cương (Diamond): 1000+ điểm
  Thuật toán tự động tìm mốc cao nhất `Total Points >= Tier.threshold` để phong cấp và áp dụng % chiết khấu mặc định cho lần mua sau.

### 2.4 Giải Thuật Phục Hồi Lỗi Ký Tự Encoding (Mojibake Fix)
Xử lý trường hợp tiếng Việt hiển thị thành các ký tự rác (Mojibake) do lỗi triple-encoding lúc lưu vào cơ sở dữ liệu.

**Vấn đề:** Từ "ĐƠN HÀNG" bị biến thành `ÃÆ N HÃ€NG`.
**Thuật toán (Reverse Transformation):**
- Thay vì phải đi sửa từng dòng dữ liệu trong Database, hệ thống sử dụng thuật toán JavaScript ép kiểu theo luồng `UTF-8 ➔ CP1252 ➔ UTF-8`.
```javascript
// admin-analytics.js
const fixMojibake = (str) => {
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str; // Trả về gốc nếu lỗi
    }
}
```
*Lưu ý: Đoạn code trên tận dụng khả năng xử lý byte ISO-8859-1 (CP1252) của hàm `escape()` (đã bị deprecate nhưng xử lý byte rất tốt) lồng vào `decodeURIComponent()` (xử lý UTF-8) để hoàn nguyên mảng byte về chuẩn tiếng Việt.*

### 2.5 Cơ Chế Bảo Vệ Gọi Đệ Quy Vô Hạn (Stack Overflow Prevention)
Một lỗi nghiêm trọng khiến Browser bị đứng cứng (Crash) do gọi hàm vô hạn (Infinite Recursion) đã được giải quyết triệt để.

**Thuật toán:**
- Vấn đề: Việc khai báo `function escapeHTML()` ở global scope hoặc dùng Var Hoisting làm ghi đè hàm tiện ích chuẩn `window.escapeHTML` ở core. Dẫn đến hàm tự gọi chính nó.
- **Giải pháp**: Xóa bỏ khai báo hàm con gây trùng tên. Nếu cần tạo hàm riêng cho module, sử dụng quy tắc biến cụ thể (Namespace prefixing) như `const _crmEscapeHTML = (str) => { ... }` hoặc gọi an toàn (Delegation) thẳng tới thư viện mẹ `window.helpers.escapeHTML()`.

---

> [!TIP]
> Việc am hiểu các thuật toán trên rất quan trọng khi bạn muốn nâng cấp hệ thống (Scale-up) ở Phase 8, ví dụ như chuyển đổi sang Microservices hoặc thay đổi cấu trúc bảng.
