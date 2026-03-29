# Hướng Dẫn Sử Dụng Hệ Thống Urban Brew (Nohope Coffee)

Hệ thống quản lý quán cà phê **Urban Brew** (Coffee House) được chia thành 3 phần chính phục vụ cho 3 đối tượng khác nhau: **Khách hàng (Customer)**, **Quản lý / Thu ngân (Admin / POS)**, và **Bếp / Pha chế (Kitchen)**. Giải pháp tập trung vào mô hình phục vụ tại bàn qua mã QR (Dine-in QR Ordering).

---

## 1. Dành cho Khách Hàng (Customer)
**Giao diện Web App tương thích mọi thiết bị di động. Khách hàng sử dụng bằng cách dùng camera điện thoại quét mã QR được dán tại bàn.**

### 1.1 Quét mã QR & Chọn món
- **Quét mã:** Khi quét mã QR tại bàn, hệ thống tự động nhận diện số bàn.
- **Xem Menu:** Khách lướt xem danh sách đồ uống, bánh ngọt được phân chia theo danh mục dễ nhìn. Các món **Best Seller** hoặc **Khuyến mãi** sẽ được làm nổi bật.
- **Thêm vào giỏ hàng:**
  - Nhấp vào món để chọn các tuỳ chọn bắt buộc (VD: Size, Lượng đá, Lượng đường).
  - Nếu món là **Combo/Set Menu**, giao diện sẽ yêu cầu khách chọn đủ thành phần (VD: chọn 1 đồ uống, chọn 1 bánh).
  - Thêm số lượng và ghi chú riêng (Ví dụ: "Không lấy ống hút").

### 1.2 Đặt hàng & Theo dõi
- Sau khi chọn xong, vào **Giỏ hàng** kiểm tra lại và bấm **Đặt hàng**.
- Màn hình sẽ chuyển sang trạng thái theo dõi đơn. Tại đây khách xem được:
  - Tình trạng: **Đang chờ** ➡️ **Đang chuẩn bị** (Bếp đã nhận) ➡️ **Sẵn sàng** (Nhân viên mang ra).
- **Gọi thêm món:** Nếu khách muốn gọi thêm, chỉ cần quay lại menu đặt món, hệ thống sẽ gộp đơn mới vào bàn hiện tại.

### 1.3 Thanh toán (Tự phục vụ)
- Khách nhấn **Thanh toán** trên điện thoại.
- Lựa chọn phương thức:
  - **Quét mã QR Chuyển khoản (Ví dụ MoMo/VietQR):** Hệ thống tạo mã QR tự động số tiền. Khách quét mã, sau đó có thể chụp và tải ảnh biên lai giao dịch lên để thu ngân duyệt.
  - **Tiền mặt / Tại quầy:** Thu ngân sẽ đến tận bàn để thu tiền.

---

## 2. Dành cho Bếp / Pha Chế (Kitchen)
**Giao diện được hiển thị trên máy tính bảng hoặc màn hình đặt tại quầy pha chế, tối ưu hoá cho theo dõi luồng công việc thời gian thực.**

### 2.1 Nhận đơn & Chuẩn bị
- Đơn hàng mới do khách đặt (hoặc thu ngân lên đơn) sẽ ngay lập tức hiện lên màn hình **Bếp**. Âm thanh thông báo (*tít tít*) phát ra để gây sự chú ý.
- Bếp click vào **"Bắt đầu làm"** (Start) để chuyển đơn sang trạng thái Đang chuẩn bị (Khách cũng sẽ thấy điều này trên điện thoại).

### 2.2 Hoàn thành món
- Khi pha chế xong, nhân viên bếp click **"Xong"** (Done). Đơn hàng sẽ báo hiệu cho nhân viên phục vụ bê ra bàn.
- *Lưu ý:* Bếp có quyền đánh dấu "Hủy" một số món trong đơn nếu đột xuất hết nguyên liệu, lệnh hủy sẽ báo về thu ngân.

---

## 3. Dành cho Thu Ngân & Quản Lý (Admin)
**Gắn tại máy chủ POS và trang quản lý hệ thống. Đây là nơi kiểm soát toàn bộ cơ sở dữ liệu và vận hành.**

### 3.1 Quản lý Đơn hàng (Orders)
- Xem luồng đơn trực tiếp. Thu ngân thấy các đơn đang từ bếp báo ra.
- **Thanh toán:** Chốt đơn. Nếu khách chọn trả tiền mặt hoặc chuyển khoản tải biên lai, thu ngân xác nhận đã nhận tiền và đóng đơn. Bàn sẽ được làm trống để đón khách mới.
- **Gộp bàn/Chuyển bàn:** Thu ngân có thể chuyển đơn từ bàn này sang bàn khác.
- Có chức năng **Hủy đơn** khi cần thiết. Hủy đơn sẽ tự động đối soát và trả lại kho.

### 3.2 Quản lý Menu & Combo
- **Sản phẩm mới:** Khai báo Tên món, Hình ảnh, Giá gốc, Giá bán, Danh mục.
- **Khuyến mãi tự động:** Đặt Giá Khuyến mãi kèm Khung giờ (Bắt đầu / Kết thúc). Hết giờ tự động về giá cũ.
- **Tuỳ chọn:** Thêm các thuộc tính (Size M/L, Topping) vào từng sản phẩm.
- **Set Menu / Combo:** Gắn cờ *Là Set Menu*, sau đó tạo các nhóm lựa chọn và nhúng các món ăn con vào trong Combo.
- **Công thức (Recipe):** Liên kết món ăn với các nguyên liệu kho để hệ thống trừ kho tự động khi bán.

### 3.3 Quản lý Kho (Inventory)
- Thêm Nguyên liệu (VD: Cà phê hạt, Sữa tươi) và định lượng (Gram, ml).
- Hệ thống tự cộng dồn mỗi khi **Nhập kho**.
- Tự động trừ thẳng vào tồn kho ngay khi đơn hàng được bếp **Xác nhận làm**. Nếu đơn hàng bị Huỷ, hệ thống tự động hoàn lại số nguyên liệu đó.
- Cảnh báo khi nguyên liệu ở mức thấp.

### 3.4 Quản lý Không gian quán (Tables)
- Tự do thiết lập danh sách điểm phục vụ (Bàn 1, Bàn 2, Tầng 2, Đang mang đi...).
- Mỗi bàn đi kèm chức năng **Tạo và in mã QR**. Mã QR quét vào sẽ trỏ thẳng link Menu kèm parameter mã bàn.

### 3.5 Báo cáo & Thống kê (Dashboard)
- Giao diện Admin trang chủ hiển thị **Doanh thu trong ngày**, **Doanh thu trong tháng**, Tổng số đơn.
- Các món **Bán chạy nhất** được liệt kê để có chiến lược nhập hàng phù hợp.

---
*Ghi chú thêm: Tài liệu này liên tục được cập nhật. Nếu bạn gặp các lỗi kĩ thuật có thể kiểm tra tab Network hoặc Database trên Supabase hoặc làm mới trình duyệt.*
