# Kế hoạch Triển khai: Quản lý Ca làm việc & Phân tách admin.js

Tính năng "Quản lý ca làm việc" giúp cửa hàng có thể quản lý được số tiền quỹ thực tế đầu ca, cuối ca, tránh thất thoát tiền mặt. Đồng thời, chúng tôi sẽ tiến hành tái cấu trúc file `admin.js` (hiện tại hơn 3500 dòng) để hệ thống dễ bảo trì hơn về sau.

## User Review Required

> [!WARNING]
> Việc chia nhỏ file `admin.js` thành nhiều file có thể chạm đến toàn bộ cấu trúc giao diện Admin. Quá trình này sẽ tách nhỏ logic ra nhưng vẫn bắt buộc giao diện phải hoạt động trơn tru.
> Trong giai đoạn đầu, tôi sẽ tách làm 2 phần tĩnh rõ rệt:
> 1. Triển khai Database và UI cho tính năng **Mở Ca / Đóng Ca (Shift Management)**.
> 2. Phân nhỏ cấu trúc `admin.js`.

## Proposed Changes

### 1. Cơ sở dữ liệu (Supabase)
Tạo bảng mới `shifts` với các cột:
- `id` (UUID, Primary Key)
- `staff_name` (Text)
- `start_time` (Timestamptz)
- `end_time` (Timestamptz, Nullable)
- `start_balance` (Numeric - Tiền quỹ đầu ca)
- `end_balance` (Numeric - Tiền quỹ thực tế cuối ca)
- `expected_balance` (Numeric - Tiền quỹ dự kiến theo máy tính)
- `status` (Text: `open` hoặc `closed`)

### 2. Giao diện Admin Dashboard
#### [MODIFY] `public/pages/admin.html`
- Thêm Badge trạng thái Ca ở Header (ví dụ: "🟢 Đang mở ca (Thu Ngân A)").
- Thêm Modal **Mở Ca**: Nhập số tiền mặt có sẵn trong két.
- Thêm Modal **Đóng Ca**: Nhập số tiền mặt thực tế kiểm đếm được trong két, hệ thống tự đối soát với tổng doanh thu tiền mặt trong ca. Cảnh báo nếu có chênh lệch.

### 3. Tái cấu trúc file JavaScript
#### [MODIFY] `public/js/admin.js`
Thay vì để một file 3500 dòng, chúng ta sẽ bắt đầu tách các mảng độc lập ra các file riêng nhưng vẫn giữ nguyên biến toàn cục để không phã vỡ hiển thị:
#### [NEW] `public/js/admin-core.js` (Setup, RBAC, Realtime)
#### [NEW] `public/js/admin-products.js` (CRUD Sản phẩm, Recipes)
#### [NEW] `public/js/admin-inventory.js` (Tồn kho, Nhập kho)
#### [NEW] `public/js/admin-orders.js` (POS, Quản lý đơn, In hóa đơn)
#### [NEW] `public/js/admin-analytics.js` (Thống kê, Sổ quỹ)
#### [NEW] `public/js/admin-marketing.js` (CRM, Loyalty, Giảm giá)
#### [NEW] `public/js/admin-shifts.js` (Logic quản lý ca mới)

## Open Questions

> [!IMPORTANT]
> Câu hỏi về rủi ro tách file:
> Thay đổi hàng loạt 3500 dòng code Javascript có rủi ro gây lỗi nhỏ (bug lặt vặt) trong quá trình vận hành ban đầu cho đến khi tinh chỉnh xong. 
> **Lựa chọn của bạn:**
> 1. Triển khai cả 2: Thiết kế Quản lý Ca VÀ Tách file `admin.js` cùng lúc.
> 2. An toàn trước: Chỉ triển khai Quản lý Ca (giữ nguyên `admin.js`) trước, để quán chạy ổn định vài ngày rồi mới chia nhỏ file sau.

Bạn muốn tôi tiến hành theo phương án 1 (Làm ngay toàn bộ) hay phương án 2 (Chỉ làm tính năng Quản lý Ca trước) để đảm bảo an toàn?
