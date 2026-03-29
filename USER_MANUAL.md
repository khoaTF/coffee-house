# Hướng Dẫn & Nguyên Lý Hoạt Động (User Manual & Architecture)

Tài liệu này không chỉ hướng dẫn thao tác cơ bản mà còn giải thích chi tiết **Nguyên lý hoạt động (Under the hood)**, **Kiến trúc hệ thống**, và **Luồng dữ liệu (Data Flow)** của toàn bộ hệ thống bán hàng đa nền tảng Urban Brew (Nohope Coffee). Phù hợp cho cả Người dùng cuối (Khách hàng), Nhân sự (Bếp, Thu Ngân), và Quản lý cấp cao.

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo mô hình **Client-Server Real-time**.
- **Backend (Dữ liệu & Serverless API):** Sử dụng **Supabase** (dựa trên PostgreSQL). Lưu trữ vĩnh viễn hình ảnh qua *Supabase Storage*, đảm bảo dữ liệu toàn vẹn và bảo mật cao.
- **WebSocket & Real-time:** Sử dụng Supabase Realtime Channel. Các bảng (tables) quan trọng như `orders` (đơn hàng), `inventory_transactions` (giao dịch tồn kho) được theo dõi liên tục. Khi một thay đổi xảy ra trên Database, nó được đẩy xuống mọi thiết bị theo milliseconds mà không cần bấm nút (refresh) tải lại trang.
- **Phân luồng thông tin (Routing):**
  - `<domain>/?table=X` dành cho App của Khách Hàng đặt tại trải nghiệm bàn.
  - `<domain>/admin.html?tab=kitchen` mở khoá dành riêng cho iPad của bộ phận Bếp.
  - `<domain>/admin.html` giao diện Đầy đủ quyền quản trị cơ sở dữ liệu.

---

## 2. NGUYÊN LÝ HOẠT ĐỘNG CÁC TÍNH NĂNG CỐT LÕI

### 2.1 Máy Trạng Thái Của Một Đơn Hàng (Order State Machine)
Mỗi đơn hàng (Order) là một Entity trải qua vòng đời bảo mật khép kín, ngăn chặn sự mâu thuẫn hệ thống cục bộ:

1. **`pending` (Chờ xử lý):** Khách gửi yêu cầu từ thiết bị. Đơn được ghi (`INSERT`) vào Database. Bếp nhận được "Ping" âm thanh khẩn.
2. **`preparing` (Đang chuẩn bị):** Bếp bấm "Bắt đầu làm". 
   - **[QUAN TRỌNG/CỐT LÕI]**: Ngay khoảnh khắc này, Trigger logic nội bộ sẽ truy vấn bảng `recipes` (Công thức thành phần). Hệ thống chạy quy trình trừ tự động khối lượng bột cafe, sữa, ly nắp (`inventory deduction`) trong cơ sở dữ liệu tổng với Timestamp chính xác. Khoản hụt này không thể bị thao túng bởi người dùng trực tiếp. Điện thoại khách chuyển trạng thái "Đang pha chế".
3. **`ready` (Sẵn sàng phục vụ):** Bếp hoàn tất và bấm "Xong". Báo về trạm bưng bê của nhân viên rảnh rỗi.
4. **`completed` (Hoàn thành / Tính cước):** Thu ngân xác minh nguồn tiền. Khi bấm đóng đơn, Hệ Thống mở khoá (`Clear`) Bàn đó về trạng thái Free to book. Doanh thu của đơn sẽ được ném vào kho dữ liệu Doanh thu báo cáo.
5. **`cancelled` (Đã Hủy):** Thu ngân hoặc Bếp buộc huỷ lệnh. Hệ thống áp dụng **Quy trình Hoàn kho (Inventory Rollback)** để phục hồi dữ liệu ban đầu cho các nguyên liệu của đơn hàng bị huỷ.

### 2.2 Xử Lý Đồng Bộ & Nhóm Chỗ Ngồi (Re-Order & Merging Logic)
- **Tình huống:** Khách đang ở Bàn số 5, mã hoá đơn `order_id` tạm thời là `123`. Khách muốn gọi thêm (Re-order) 1 chiếc bánh ngọt vào lúc sau.
- **Nguyên lý Xử lý DB:** Khách thực hiện quét tiếp hay click menu. Lúc này, trình duyệt Web App nhận diện Cờ Bàn (Table Flag) vẫn đang kích hoạt. Hệ thống truy vấn chớp nhoáng Bàn 5 có đơn hàng mở không. Ghi nhận là CÓ. Chiếc bánh được `push()` thẳng vào mã đơn `123` mà không làm xuất hiện thêm đơn ảo làm phiền Thu Ngân. Tổng tiền được kích hoạt lệnh Cập Nhật Cộng Dồn Bất Ngờ (Accumulation Script).

### 2.3 Quản Lý Sản Phẩm Phức Nguyên (Options & Combo Topology)
- Hệ thống hỗ trợ Cấu trúc Vây (Branching): 1 sản phẩm có vô hạn biến thể `options` (Size L + 30K, Sữa đặc + 5K). Giá bán = Current(Base) + Thặng Dư Biến Thể.
- **Kiểm Soát Nhóm Set Menu (Combo Constraint):** 
  Khả năng thiết kế Set đồ ăn cấu thành từ Món Phụ (VD: Combo Phở). Admin cài lệnh Tối Thiểu (min=1), Tối Đa (max=3). Kịch bản JavaScript Client-side khoá Cứng (Hard Lock) nút Thêm Vào Giỏ cho đến khi toàn bộ logic do Admin định hình được thoả mãn.

### 2.4 Bảo Toàn Kho Thực Tế (Inventory & Logistics Pipeline)
Bức tranh chuỗi cung ứng được lập mô hình dưới dạng *Sổ Nợ Kế Toán*:
- **Nhập Hàng:** Một giao dịch `IN` (Nhập vào) được tạo ở `inventory_transactions`. Cột tồn trữ `stock_quantity` tăng bằng phép `+`.
- **Xuất / Bán:** Hệ thống sinh giao dịch `OUT` dựa theo liên kết Món-NguyênLiệu. Cột `stock_quantity` giảm (`-`).
- Việc theo dõi log giao dịch giúp Giám Đốc đối chiếu 100% khi nhân viên kiểm đếm cuối ngày. Hoàn toàn miễn nhiễm sự can thiệp từ thao tác sửa lụi.

---

## 3. HƯỚNG DẪN ỨNG DỤNG CHO 3 ĐỐI TƯỢNG VẬN HÀNH

### 3.1 Giao diện Khách Hàng Mua Sắm (Customer Application)
1. **Lưu Nhớ Hành Vi (Persistence):** Toàn bộ giỏ hàng `[ {id, name, qtt...} ]` lưu vào `localStorage` của trình duyệt Safari/Chrome. Bạn thoát app, tắt máy điện thoại, ngày mai quét lại QR Code mở bàn cũ (nếu chưa tính tiền) hệ thống sẽ Load lại Giỏ Hàng đã chọn dở.
2. **Tuỳ Chỉnh Sâu (Deep Config):** Khách chọn ly nước ➡️ Tích dấu cho ít đường ➡️ Bấm xác nhận.
3. **Mã Thanh Toán Thông Minh (ViệtQR AI):** App liên kết qua hàm Sinh số Tiền, tích hợp `bankID`, tự xuất mã QR chuẩn form Ngân hàng. Khách chuyển xong chụp uỷ nhiệm chi găm (Attach hình ảnh Base64) quăng thẳng lên máy POS giám sát cho nhanh nhất lúc giờ cao điểm.

### 3.2 Hệ Thống Màn Hình Quầy Bếp (KDS - Kitchen Display System)
1. **Lắng Nghe Vĩnh Cửu:** Trình duyệt cắm rễ bằng giao thức WebSockets. Không yêu cầu Refresh. Đơn nhảy sẽ ép CPU tạo tiếng *“Ting ting”* dồn dập.
2. **Hành Động Khối (Batch Action):** Bếp ấn nút "Bắt đầu". Lệnh SQL bay về Data Base thay đổi cờ Status, trong 0.2s đập về máy Khách Hàng chữ *“Bếp Nhận Yêu Cầu”*. 
3. **Trạm Báo Hết Tạm Thời:** Nếu hết Sữa Tươi, Bếp báo *Sold Out*. API cập nhật Item Status từ `available` -> `sold_out`. App Khách rớt vào màu Xám (Disabled state) không cho phép nhấn.

### 3.3 Hệ Thống Giao Thức Quản Trị Trưởng (Admin C-Level / Pos Controller)
1. **Bán Hàng Tại Quầy (POS):** Bypass quy trình QR. Nhân viên đứng POS dùng Tablet ấn Món ném sang Màn Bán Hàng nhỏ, tính tiền ấn chốt bằng tay. Cơ sở dữ liệu chích y chang quy trình Mạng QR kia để thống nhất Tồn kho.
2. **Khuyến Mãi Mã Động (Discount Core):** Cài hàm "FLASH_SALE_20K". Hệ thống so số tiền Total với mức Sàn do Trưởng cửa hàng đề ra, đúng thuật toán mới cắt giá, giữ nguyên vẹn dữ liệu gốc bằng Cột ảo `final_price`.
3. **Báo cáo Hợp Giao (OLAP Dashboard):** Dùng lệnh tính toán SQL Views qua hệ lưới PostgREST API lôi toàn bộ lịch sử 1 vòng tháng qua, SUM số tiền ➡️ đổ về DataViz Canvas ngay trên điện thoại Giám Đốc ở giao diện Home Dashboard thời gian thực hiện thời, ko sai 1 đồng nẻ.
