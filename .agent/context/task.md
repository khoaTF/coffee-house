# Task: Triển khai Quản lý Ca làm việc (Shift Management)

Vì bạn đã duyệt tự động thông qua chính sách phê duyệt, tôi sẽ chọn **Phương án 2 (Chỉ làm tính năng Quản lý Ca trước để đảm bảo an toàn, tránh đập phá `admin.js` quá mức ngay lúc này)**.

- `[x]` **1. Tạo bảng Database:** Viết script SQL `v4_shifts.sql` tạo bảng `shifts` và thiết lập RLS.
- `[x]` **2. Cập nhật UI Admin Dashboard:** Thêm nút "Ca làm việc" và Badge trạng thái vào Header. Tạo Modal Mở Ca / Đóng Ca.
- `[x]` **3. Viết logic `admin-shifts.js`:** Xử lý Mở ca, Đóng ca, Lấy ca hiện tại.
- `[x]` **4. Tính toán doanh thu:** Liên kết với bảng `cash_transactions` và `orders` để tính tổng tiền thu được trong ca từ lúc Mở ca đến hiện tại.
