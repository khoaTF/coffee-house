# ☕ Nohope Coffee — Hệ Thống Đặt Món QR & Quản Lý Quán (Phiên bản Dễ Hiểu)

> Không chỉ là một phần mềm đặt món thông thường, Nohope Coffee là một **giải pháp quản lý quán cà phê thông minh từ A-Z**: Từ lúc khách ngồi vào bàn, quét mã chọn món, nhà bếp chế biến, giao hàng, đến khi chủ quán xem báo cáo doanh thu tài chính từ xa.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com)

---

## 🌟 Chương Trình Của Chúng Ta Hoạt Động Ra Sao?

Hãy tưởng tượng bạn là một khách hàng bước vào quán, hoặc bạn là người chủ đang điều hành. Dưới đây là những gì sẽ diễn ra dưới sự điều phối trơn tru của hệ thống:

### 1. Trải Nghiệm Khách Hàng (Tự đặt món - Không cần chờ đợi nhân viên)
- Khách hàng tới, ngồi vào bất kỳ bàn nào và dùng điện thoại thông minh **quét mã QR** được dán sẵn trên bàn.
- Điện thoại lập tức hiển thị **Menu điện tử** sang trọng. Khách có thể xem hình ảnh, giá cả, và chủ động tinh chỉnh đồ uống (Ví dụ: ít đá, nhiều sữa, đổi cỡ ly L).
- Khách có thể giải trí với tính năng **Túi Mù (Mystery Box)**: Trò chơi vòng quay Gacha - Khách trả một số tiền cố định và hồi hộp chờ đợi xem hệ thống sẽ quay trúng đồ uống ngẫu nhiên nào.
- Sau khi chọn xong, khách bấm **"Gửi đơn"**, màn hình sẽ hiển thị mã QR Ngân Hàng của chủ quán. Khách chỉ cần mở App ngân hàng quét thanh toán và đơn hàng lập tức được đẩy thẳng vào bếp.

### 2. Sự Nhịp Nhàng Tại Quầy Bếp
- Trong lúc khách đang ngồi trò chuyện, **Màn Hình iPad tại bộ phận Barista (Bếp)** phát ra tiếng báo động "Ting Ting" và hiện lên thông tin đơn hàng mới.
- Nhân viên bếp thao tác trên màn hình, bấm nút **"Bắt đầu làm"**. 
- Điều kỳ diệu xảy ra ngầm dưới hệ thống: Database tự động truy cập vào kho nguyên liệu, **trừ đi số lượng bột cà phê, sữa, ly/nắp** một cách chính xác dựa trên công thức định lượng đã khai báo!
- Khi món nước hoàn thành, nhân viên bếp bấm **"Sửa soạn xong"**. Điện thoại của vị khách ngoài bàn cũng đồng thời chuyển trạng thái báo hiệu *"Đồ uống của bạn đã sẵn sàng được phục vụ!"*.

### 3. Giao Hàng Xuyên Suốt (Dành Cho Khách Ngoại Tuyến)
- Khách không đến quán mà muốn gọi về nhà? Họ chỉ cần vào trang giao hàng của quán, chọn món, điền địa chỉ và số điện thoại.
- Trải nghiệm đặt hàng mượt mà y như các app đặt đồ ăn chuyên nghiệp, giúp nhà hàng giữ chân khách trung thành và tối ưu hoá lợi nhuận thay vì phải chia hoa hồng sâu cho các app bên thứ 3.

### 4. Quyền Lực Trong Tay Người Quản Lý (Giám Sát Bức Tranh Toàn Cảnh)
- Ở bất kỳ đâu có sóng Internet, chủ quán chỉ cần mở màn hình **Bảng Điều Khiển (Dashboard)**.
- Hệ thống tổng hợp tự động mọi thứ một cách minh bạch: Hôm nay bán được bao nhiêu cốc, doanh thu và chi phí lời lãi ra sao, giờ nào đông khách nhất?
- Chủ quán nắm được chính xác kho hàng còn lại bao nhiêu gram cà phê, có món nào nguyên liệu sắp hết không để kịp thời nhập thêm. Mọi quyết định đều dựa trên những con số biết nói.

### 5. Khả Năng Mở Rộng Dành Cho Chuỗi (Mô hình SaaS - Multi-tenant)
- Nếu quán cà phê phát triển thành hệ thống chuỗi, nền tảng cho phép tạo ra **nhiều cửa hàng con**.
- Mỗi chi nhánh sẽ có không gian hình ảnh, menu và dữ liệu doanh thu tách biệt hoàn toàn nhưng người Tổng Quản Lý vẫn có thể xem tập trung ở một nơi duy nhất.

---

## 🛠 Dành Cho Đội Ngũ Kỹ Thuật (Architecture & Tech Stack)

Hệ thống được thiết kế cực kỳ liền mạch dựa trên kiến trúc **Real-time (Thời gian thực)** và **Serverless (Phi máy chủ)**:

- **Bộ não xử lý (Backend):** Ứng dụng Supabase (hệ thống trên nền PostgreSQL) mang lại khả năng phân quyền mạnh mẽ (RLS) để cô lập dữ liệu hiệu quả, kết hợp cùng các thủ tục lưu trữ (Stored Procedures/RPC) nhằm giảm tải logic xuống tận cấp độ CSDL.
- **Chi tiết Thời Theo Dõi (Real-time):** Sử dụng `WebSockets` giúp trạng thái đơn hàng đồng bộ vĩnh viễn với các màn hình của quán trong thời gian cực thấp (độ trễ ~0.2s) mà không cần khách hàng phải tự tải lại trình duyệt.
- **Trải Nghiệm Tốc Độ (Frontend):** Ứng dụng Web App nhẹ nhàng, được phát triển trên chuẩn PWA thuần không bị giật lag, kết hợp Framework giao diện hiện đại **Tailwind CSS**. 
- **Triển khai cực nhanh (Deployment):** Nền tảng tĩnh được đưa lên hệ thống phân phối nội dung toàn cầu của **Vercel** giúp khách quét mã và tải thực đơn ngay lập tức dù ở mạng 3G yếu.

### 🚀 Hướng Dẫn Vận Hành Ứng Dụng (Local Setup)

1. Tải ứng dụng về máy tính (Yêu cầu có `Node.js >= 18`):  
   `git clone https://github.com/khoaTF/coffee-house.git`
2. Truy cập vào thư mục và cài đặt bộ gõ:  
   `cd coffee-house && npm install`
3. Liên kết với kho dữ liệu hệ thống (Điền file `.env`):
   ```env
   SUPABASE_URL=liên_kết_của_bạn
   SUPABASE_ANON_KEY=chìa_khoá_api_của_bạn
   ```
4. Khởi chạy máy chủ nội bộ:  
   `npm start` _(hoặc `npm run dev`)_
5. Xong! Hệ thống đã lập tức sẵn sàng để phục vụ khách hàng.

---
*Mã nguồn thuộc sở hữu của Nohope Hệ Thống Cà Phê Thông Minh © 2026. Mọi quyền được bảo hộ.*
