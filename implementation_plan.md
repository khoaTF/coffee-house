# Phase 6: Delivery & Logistics System Development

Hệ thống vận chuyển (Shipper/Delivery) đã được thiết kế khung sườn từ các bản cập nhật CSDL (V4). Tuy nhiên, để đưa vào hoạt động chính thức (Production), giao diện và luồng logic hiện tại đang thiếu sự đồng bộ với kiến trúc Đa thực thể (Multi-tenant) và giao diện Glassmorphism mới nhất của Phase 5.

Dưới đây là kế hoạch chi tiết để tối ưu UI/UX và phát triển hoàn thiện nhánh Vận Chuyển.

## User Review Required

> [!IMPORTANT]  
> Các trang `delivery.html`, `driver.html` và `tracking.html` hiện đang dùng màu cứng (`#994700` và `#FF7A00`). Kế hoạch sẽ loại bỏ màu cứng và đồng bộ với màu sắc (primary_color) của Tenant giống như trang Customer. Bạn có đồng ý với sự thay đổi toàn diện này không?

> [!NOTE]  
> Tài xế (Driver) hiện thuộc về từng Tenant (Quán cụ thể). Mã shipper (Ví dụ: `AB1234`) sẽ dùng để đăng nhập. Liệu bạn có muốn Driver App tự nhận diện Logo và Màu của quán khi đăng nhập thành công?

## Proposed Changes

---

### Delivery App (Khách đặt giao hàng)

Nâng cấp trang đặt giao hàng để tương thích hoàn toàn với nền tảng đa chi nhánh.

#### [MODIFY] delivery.html
- Thay thế các mã màu tĩnh (bg-[#994700], từ/tới #FF7A00, accent-[#FF7A00]...) bằng biến màu động (CSS Variables) hoặc class `text-[var(--primary)]`, `bg-gradient-to-br from-[var(--primary)]`.
- Thêm module `customer-session.js` vào `<script>` để tự động tải Logo và Màu sắc của quán theo URL/Storage.
- Tích hợp nút chuyển đổi Ngôn ngữ (Anh - Việt) trên Topbar (i18n switch).
- Sử dụng hiệu ứng Glassmorphism cho Card giỏ hàng và danh mục món.

#### [MODIFY] delivery.js
- Sửa hàm gọi dữ liệu để tận dụng `CustomerSession.tenantId` nhằm nạp đúng Menu của chi nhánh.
- Tích hợp logic xử lý đa ngôn ngữ thông qua `updatePageLanguage()` từ `i18n-pages.js`.

---

### Tối ưu Tracking Đơn Hàng (Dành cho Khách)

Trang theo dõi hành trình đơn hàng cần trực quan, mượt mà và hỗ trợ realtime tốt hơn.

#### [MODIFY] tracking.html
- Cập nhật giao diện thanh tiến trình (Stepper) với màu sắc chuyển động mượt mà bằng CSS variables theo brand color của quán.
- Thêm `CustomerSession` để lấy branding, hiển thị logo cửa hàng ở màn hình tra cứu.
- Thay thế nút quay lại đặt hàng bằng màu động thay vì màu cố định.

#### [MODIFY] tracking.js
- Đồng bộ Realtime (`orders` channel) để thanh tiến trình và bản đồ di chuyển tự động cập nhật mà không cần tải lại trang.
- Thêm các key dịch thuật vào file để thông báo đa ngôn ngữ trên realtime toasts.

---

### Driver / Shipper Dashboard (Dành cho Tài Xế)

Giao diện tài xế đang bị gãy layout trên một số máy màn hình nhỏ và chưa lấy thông tin Tenant.

#### [MODIFY] driver.html
- Tích hợp đăng nhập bằng mã shipper có trích xuất `tenant_id` để áp dụng màu cấu hình cửa hàng lên các nút trạng thái (Online, Đã giao).
- Tùy chỉnh `driver-sheet` sử dụng Glassmorphism thay vì màu xám `#1B1C1C` thuần, giúp tăng tính thẩm mỹ và dễ nhìn ngoài trời.
- Hỗ trợ xem vị trí giao hàng và gọi điện nhanh ngay trên app với API tel.

#### [MODIFY] driver.js
- Bổ sung logic lấy JWT token/session của tài xế và lưu LocalStorage để không phải đăng nhập lại mỗi lần đóng Tab.
- Nâng cấp cơ chế cập nhật tọa độ Realtime (mặc định 10s/lần) báo về server với debounce để giảm rác database.
- Bắt sự kiện giao hàng thành công để tự động popup màn hình xác nhận hoàn thành chuyến với hiệu ứng đồ hoạ cao (Confetti / WOW UI).

---

### Đa Ngôn Ngữ (Internationalization)

#### [MODIFY] i18n-pages.js
- Bổ sung nhóm key `[delivery]` (Vd: "Chọn món", "Thông tin người nhận", "Chi tiết đơn", "Đang giao"...).
- Bổ sung nhóm key `[driver]` (Vd: "Hôm nay", "Thu nhập", "Online", "Đơn cần giao").

## Open Questions

> [!WARNING]  
> Chi phí tính phí giao hàng (Fee/km) hiện được nạp từ bảng `store_settings`. Khách có thể đổi chi phí này ở màn quản trị Superadmin hay Admin? 
> Tôi sẽ giả định là Admin (chủ quán) cấu hình chi phí này thông qua Admin Panel `admin-delivery.js`.

## Verification Plan

### Automated/Manual Testing
1. **Khách hàng**: Đóng vai khách hàng mở `delivery.html`, đặt một đơn hàng thành công => Theo dõi qua thẻ `tracking.html`.
2. **Kênh Admin**: Đăng nhập Admin Panel -> Tab Vận chuyển -> Giao đơn hàng đó cho Shipper (mã `SHIP123` test).
3. **Shipper**: Mở `driver.html`, đăng nhập `SHIP123` -> Bấm Trạng thái: "Bắt đầu đi giao" -> Hoàn thành.
4. **Check Realtime**: Kiểm tra màn hình Tracking khách hàng có tự động chạy thanh Stepper sang "Đã giao" không.
