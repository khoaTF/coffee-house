# 📘 Sổ Tay Hướng Dẫn Sử Dụng & Chi Tiết Các Chức Năng Cốt Lõi

Chào mừng bạn đến với tài liệu Hướng Dẫn Sử Dụng của hệ thống quản lý Nohope Coffee. 
Tài liệu này sẽ đi sâu vào việc **hướng dẫn thao tác** và **giải thích chi tiết các tính năng cụ thể** trên từng màn hình, được phân chia dựa trên người sử dụng trực tiếp: Khách hàng, Bếp và Quản trị viên (Chủ quán).

---

## 1. GIAO DIỆN KHÁCH HÀNG (Dành Cho Thực Khách)

Giao diện khách hàng được thiết kế tập trung cực độ vào sự đơn giản, giúp khách có thể chốt đơn hàng nhanh chóng mà không cần ai hướng dẫn.

### 📱 1.1 Khách Đặt Tại Bàn (Dine-in / Quét QR Code)
- **Cách truy cập:** Khách không cần tải app, chỉ cần mở camera điện thoại quét mã QR được dán sẵn trên bàn. (Ví dụ: `https://.../?table=1` sẽ biết luôn khách ở Bàn 1).
- **Thực Hiện Đặt Món:**
  - Nhấp vào từng món để xem hình ảnh sắc nét và mô tả đồ uống.
  - Khách có thể tuỳ ý cấu hình từng loại nước với nhóm **Tuỳ Chỉnh (Topping)** như: Kích cỡ (Sửa đổi giá), Lượng đường, Lượng đá...
  - Bấm nút **"Thêm vào giỏ"**. Hệ thống lưu trữ giỏ hàng thông minh: dù khách lỡ tay tắt trình duyệt thì quay lại mở mã QR, các món đã chọn vẫn nằm đó!
- **Sự Kiện - Món Nước Túi Mù (Mystery Gacha Box):**
  - Khách chọn mục "Túi Mù" tham gia trò chơi với một phần tiền cố định (vd: 29.000đ).
  - Sau khi thanh toán, vòng quay Slot Machine sẽ xoay tròn và tặng khách ngẫu nhiên một thức uống xịn xò. Nếu vận đỏ, khách có thể trúng ly đồ uống trị giá gấp 2-3 lần số tiền bỏ ra!
- **Thanh Toán Không Tiền Mặt (ViệtQR AI):**
  - Chốt giỏ hàng, App tự động xuất 1 mã QR Ngân Hàng kèm theo chính xác số tiền cần chuyển mạng lưới NAPAS.
  - Khách quét bằng app ngân hàng của họ, sau đó chụp bill đính kèm lên lại (Tải tệp ảnh). Đơn hàng sẽ chính thức châm ngòi nổ bên trong Bếp!

### 🛵 1.2 Đặt Giao Món Từ Xa (Delivery)
- **Cách truy cập:** Khách ở xa nhấp vào trang `/pages/delivery.html` qua liên kết nhắn tin hoặc Facebook.
- **Thao tác:** Khách sẽ xem một menu tương tự, nhưng hệ thống sẽ yêu cầu điền bổ sung Địa chỉ, Tên, Số Điện Thoại nhận hàng. Mọi hoá đơn này sẽ tự động chạy dọc qua màn hình Bếp với định dạng *Đơn Đem Đi (Delivery)*.

### 🧭 1.3 Màn Hình Theo Dõi Tiến Trình (Order Tracking)
- Khách tự coi thời gian thực tình trạng ly nước của mình như app Gợi Ý: *Đang chờ ➡️ Đang pha ➡️ Đã pha xong (Tiến lại quầy lấy) ➡️ Hoàn tất thanh toán*.

---

## 2. GIAO DIỆN BỘ PHẬN BẾP (Kitchen Display System)

Màn hình này thường được ghim trên iPad hoặc PC tại không gian pha chế. Đặc thù của nó là **cập nhật Tự Động (Thời gian thực)**, nhân viên bếp không bao giờ cần tải lại trang.
- **Truy cập:** `/pages/kitchen.html` mang giao diện Tối (Dark mode) siêu dịu mắt.

### 👨‍🍳 2.1 Quản Lý Đơn Hàng Theo Dây Chuyền (Luồng KDS)
- Khi có khách bấm tạo đơn mới (dù là ở bàn hay từ xa), Máy tính bếp sẽ réo âm thanh `"Ting Ting"` báo động. Đơn hàng lọt vào cột **"Chờ Xử Lý"**.
- Nhân viên bếp nhấn nút **"Bắt Đầu Làm"**. 
  - Khách hàng xem điện thoại sẽ lập tức thấy dòng "Bếp đang pha chế nhen...". 
  - **Tự động hoá kho (Lõi hệ thống):** Hệ thống Data tự động lục lọi công thức và trừ đúng số Gram hạt Cafe, số ml Cốt Sữa, số Ly Nhựa của món đó ra khỏi kho.
- Pha xong ly nước, Bếp bấm nút **"Hoàn Thành"**. Món ăn được ném vào thẻ "Đã Xong" để tiếp quản bởi nhân viên điều phối (Bưng ra bàn cho khách).

### 📦 2.2 Tắt/Bật Món Khẩn Cấp (Sold-out Toggles)
- Trong lúc đông đúc, nếu hết Sữa Chua, bếp trưởng kéo gạt từ Xanh sang Xám nút 'Tắt/Bật Món'. Lập tức Menu trên điện thoại tất cả các khách rớt sang vô hiệu hoá (Món mờ, báo Hết Hàng).

---

## 3. GIAO DIỆN BẢNG ĐIỀU KHIỂN CHỦ QUÁN (Admin Dashboard)

Đây là không gian dành riêng cho Cửa Hàng Trưởng, Kế Toán và Thu Ngân nhằm quản lý tập trung mọi số liệu sống còn của hệ thống.
- **Truy cập:** `/pages/admin.html` (Bắt buộc dùng mật khẩu để truy cập).

### 📊 3.1 Thống Kê Tài Chính (Analytics Dashboard)
- Các con số nhảy múa tự động thống kê Doanh Thu Theo Giờ, Sản phẩm bán chạy nhất, hoặc So sánh doanh thu hôm nay với tuần trước. Bạn cũng có thể in xuất File Excel (CSV) để trình kiểm toán.

### 📜 3.2 Tùy Chỉnh Menu Theo Thời Gian Thực
- Chủ nhà có thể tuỳ ý thay đổi giá món, thay thế hình ảnh thu hút hơn (Up base64).
- **Bộ Quản Quy Tắc (Rules Configuration):** Thay vì chỉ bán ly Trà Đào, Admin gài rule "Ly trà này được chọn *Tối thiểu 1 size, tối đa 3 topping*". Người dùng mua sẽ bắt buộc phải chọn đúng mới đi qua màn thanh toán.

### 💰 3.3 Sổ Quỹ Kinh Doanh (Cashflow/Expenses Manager)
- Bạn có thể xem dòng tiền thực tế ra/vào túi qua "Sổ Kế Toán Số". 
- Khi một ly bị bán ra -> có Phiếu THU 40.000đ. Nhân sự lấy tiền ra mua 2 bịch khăn giấy -> Tự Lập Phiếu CHI 10.000đ. Hệ thống tự cộng trừ Nhân Chia minh bạch để biết cuối ngày trong két sắt được đóng bao nhiêu tiền.

### 🎫 3.4 Quản Lý Băng Rôn (Ads & Marketing) 
- Chức năng tự thả nổi sự kiện. Bạn đẩy bức ảnh "Khuyến mãi Trung Thu Lên Tới 50%". Bức ảnh sẽ hiển thị cực đẹp ở vị trí trung tâm điện thoại của khách lúc lướt App, kích cầu thanh toán dễ dàng.

### 🛑 3.5 Quản Lý Nhân Sự / Phân Quyền Giáp Sắt (RBAC)
- Khởi tạo chức vị. **Thu ngân** chỉ được tính tiền, không có nút *Huỷ Đơn Hàng* (phòng lỗi nhét túi gian lận thất thoát). **Quyền Admin** mới hiển thị nút chỉnh sửa và huỷ lệnh số liệu cao cấp.

---

## 4. CHI NHÁNH & CHUỖI CỬA HÀNG (Siêu Quản Trị Hệ Thống - SaaS)

Tính năng cực kỳ đắt giá nếu Chủ Thương Hiệu muốn đem nền tảng này cho các Cửa hàng thương hiệu nhượng quyền khác thuê lại chung mạng lưới (Mô hình Multi-tenant).
- **Trình tạo Cửa Hàng Con:** Phân chia riêng biệt Không gian hình ảnh cửa hàng (Banner/Logo), Dữ liệu sản phẩm (Items), Nhân viên (Staff). Dữ liệu quán A hoàn toàn gián đoạn và không đụng chạm tới dữ liệu Quán B.
- Được quyền ấn định "Giới Hạn Nạp": Quán Trà Chanh C chỉ được quy định thêm tối đa "100 Món" và "5 Nhân Sự Thu Ngân".

---
*Cơ sở tài liệu Hướng Dẫn Kỹ Thuật Nội Bộ Mạng Cà Phê Nohope © 2026.*
