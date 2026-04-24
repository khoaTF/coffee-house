/**
 * i18n-pages.js — Shared bilingual (VI/EN) module for internal + delivery pages
 * Covers: login, kitchen, staff, admin, tracking, delivery, driver, tv, guide
 * API: window.t(key), window.togglePageLang(), window.applyPageLang()
 */
(function () {
  'use strict';

  const translations = {
    vi: {
      // ── Common ────────────────────────────────────────────────
      'common.loading': 'Đang tải...',
      'common.refresh': 'Làm mới',
      'common.logout': 'Đăng xuất',
      'common.close': 'Đóng',
      'common.save': 'Lưu',
      'common.cancel': 'Hủy',
      'common.confirm': 'Xác nhận',
      'common.error': 'Lỗi',
      'common.success': 'Thành công',
      'common.online': 'Online',
      'common.offline': 'Offline',
      'common.search': 'Tìm kiếm',
      'common.today': 'Hôm nay',
      'common.yesterday': 'Hôm qua',
      'common.all': 'Tất cả',
      'common.export_csv': 'Xuất CSV',
      'common.greeting': 'Xin chào',
      'common.logged_in_as': 'Đang đăng nhập',

      // ── Status Labels ────────────────────────────────────────
      'status.pending': 'Chờ xác nhận',
      'status.preparing': 'Đang ché biến',
      'status.ready': 'Sẵn sàng',
      'status.delivering': 'Đang giao',
      'status.completed': 'Hoàn thành',
      'status.cancelled': 'Đã hủy',
      'status.paid': 'Đã thanh toán',

      // ── Login ────────────────────────────────────────────────
      'login.subtitle': 'Đăng nhập vào hệ thống quản lý',
      'login.tab_account': 'Tài khoản',
      'login.tab_pin': 'Mã PIN',
      'login.username_label': 'Tên đăng nhập',
      'login.username_placeholder': 'Nhập Tài Khoản...',
      'login.password_label': 'Mật khẩu',
      'login.password_placeholder': 'Nhập mật khẩu...',
      'login.pin_label': 'Mã PIN Bí mật',
      'login.pin_placeholder': '••••••',
      'login.btn': 'Đăng nhập',
      'login.authenticating': 'Đang xác thực...',
      'login.success': 'Thành công!',
      'login.footer': 'Powered by Nohope Coffee System',
      'login.error_credentials': 'Tài khoản hoặc mật khẩu không đúng!',
      'login.error_pin': 'Mã PIN không hợp lệ (sai mã)!',
      'login.error_fill': 'Vui lòng nhập đủ Tên đăng nhập và Mật khẩu.',
      'login.error_fill_pin': 'Vui lòng nhập Mã PIN.',

      // ── Kitchen ───────────────────────────────────────────────
      'kitchen.title': 'Nohope Kitchen',
      'kitchen.subtitle': 'Quản lý trạm bếp',
      'kitchen.logged_in': 'Đang đăng nhập',
      'kitchen.audio_btn': 'Âm báo',
      'kitchen.history_btn': 'Lịch sử',
      'kitchen.admin_btn': 'Quản trị',
      'kitchen.orders_title': 'Phiếu order đang chờ',
      'kitchen.auto_print': 'Tự in bill mới',
      'kitchen.group_orders': 'Gộp Món',
      'kitchen.batch_title': 'Tổng hợp chế biến',
      'kitchen.history_modal_title': 'Lịch sử đơn hàng (Bếp)',
      'kitchen.history_loading': 'Đang tải lịch sử...',
      'kitchen.history_error': 'Không thể tải lịch sử đơn hàng.',
      'kitchen.syncing': 'Đang đồng bộ lệnh bếp...',

      // ── Staff ────────────────────────────────────────────────
      'staff.nav_title': 'Dịch Vụ - Nohope',
      'staff.hello': 'Xin chào',
      'staff.tab_tables': 'Sơ Đồ Bàn',
      'staff.tab_orders': 'Đơn & Món',
      'staff.tab_requests': 'Yêu Cầu Hỗ Trợ',
      'staff.loading_tables': 'Đang tải sơ đồ bàn...',
      'staff.loading_orders': 'Đang lấy dữ liệu đơn hàng...',
      'staff.connected': 'Đã kết nối với hệ thống thời gian thực.',
      'staff.refresh': 'Làm mới',
      'staff.exit': 'Thoát',

      // ── Admin ────────────────────────────────────────────────
      'admin.panel': 'Admin Panel',
      'admin.logged_in': 'Đang đăng nhập:',
      'admin.nav_overview': 'Tổng quan',
      'admin.nav_manage': 'Quản lý',
      'admin.nav_store': 'Cửa hàng',
      'admin.nav_shortcuts': 'Lối tắt',
      'admin.dashboard': 'Dashboard',
      'admin.pos': 'POS Bán hàng',
      'admin.menu': 'Thực đơn',
      'admin.inventory': 'Tồn kho',
      'admin.restock': 'Nhập hàng',
      'admin.promo': 'Khuyến mãi',
      'admin.orders': 'Đơn hàng',
      'admin.shifts': 'Ca làm việc',
      'admin.delivery': 'Giao hàng',
      'admin.analytics': 'Báo cáo',
      'admin.cashflow': 'Sổ quỹ',
      'admin.tables': 'Bàn',
      'admin.customers': 'Khách hàng',
      'admin.staff': 'Nhân viên',
      'admin.audit': 'Nhật ký HĐ',
      'admin.qr': 'Mã QR Bàn',
      'admin.settings': 'Cài đặt',
      'admin.customer_menu': 'Menu khách',
      'admin.kitchen_link': 'Bếp',
      'admin.end_shift': 'Kết ca',
      'admin.guide': 'Hướng dẫn kỹ thuật',
      'admin.logout': 'Đăng xuất',

      // ── Tracking ─────────────────────────────────────────────
      'tracking.loading': 'Đang tải thông tin đơn hàng...',
      'tracking.not_found_title': 'Không tìm thấy đơn hàng',
      'tracking.not_found_desc': 'Mã theo dõi không hợp lệ hoặc đã hết hạn.',
      'tracking.new_order': 'Đặt đơn mới',
      'tracking.order_label': 'Đơn #',
      'tracking.order_detail': 'Chi tiết đơn',
      'tracking.subtotal': 'Tạm tính',
      'tracking.fee': 'Phí giao hàng',
      'tracking.total': 'Tổng cộng',
      'tracking.lookup_title': 'Tra cứu đơn hàng',
      'tracking.lookup_desc': 'Nhập mã theo dõi để xem trạng thái',
      'tracking.lookup_placeholder': 'VD: A1B2C3D4',
      'tracking.lookup_btn': 'Tra cứu',
      'tracking.back': '← Quay lại đặt hàng',
      'tracking.step_ordered': 'Đã đặt',
      'tracking.step_preparing': 'Chế biến',
      'tracking.step_ready': 'Sẵn sàng',
      'tracking.step_delivering': 'Đang giao',
      'tracking.step_done': 'Đã giao',

      // ── TV Display ───────────────────────────────────────────
      'tv.setup_title': 'MÀN HÌNH TIVI',
      'tv.setup_desc': 'Bấm nút bên dưới để cấp quyền phát âm thanh và mở toàn màn hình.',
      'tv.start_btn': 'BẮT ĐẦU',
      'tv.preparing': 'Đang Chuẩn Bị',
      'tv.ready': 'Mời Nhận Đồ',

      // ── Driver ───────────────────────────────────────────────
      'driver.login_title': 'Shipper Login',
      'driver.login_subtitle': 'Đăng nhập bằng mã shipper',
      'driver.code_placeholder': 'Nhập mã shipper',
      'driver.login_btn': 'Đăng nhập',
      'driver.logout': 'Đăng xuất',
      'driver.today': 'Hôm nay',
      'driver.earnings': 'Thu nhập',
      'driver.rating': 'Đánh giá',
      'driver.pending_orders': 'Đơn cần giao',
      'driver.no_orders': 'Chưa có đơn nào.',
      'driver.online': 'Online',
      'driver.offline': 'Offline',
      'driver.login_title': 'Đăng nhập tài xế',
      'driver.login_subtitle': 'Nhập mã để bắt đầu ca làm việc',
      'driver.code_placeholder': 'Mã tài xế (VD: DRV-001)',
      'driver.login_btn': 'Vào ca',

      // ── Tracking ─────────────────────────────────────────────
      'tracking.loading': 'Đang tải thông tin đơn hàng...',
      'tracking.not_found_title': 'Không tìm thấy đơn hàng',
      'tracking.not_found_desc': 'Vui lòng kiểm tra lại mã Tracking Token trên biên lai.',
      'tracking.new_order': 'Đặt đơn mới',
      'tracking.step_ordered': 'Đã đặt',
      'tracking.step_preparing': 'Đang làm',
      'tracking.step_ready': 'Sẵn sàng',
      'tracking.step_delivering': 'Đang giao',
      'tracking.step_done': 'Hoàn tất',
      'tracking.subtotal': 'Tạm tính',
      'tracking.fee': 'Phí giao hàng',
      'tracking.total': 'Tổng cộng',
      'tracking.order_detail': 'Chi tiết đơn hàng',
      'tracking.order_label': 'Đơn hàng',
      'tracking.lookup_title': 'Tra cứu đơn hàng',
      'tracking.lookup_desc': 'Nhập mã Tracking Token để xem tiến độ thực tế.',
      'tracking.lookup_placeholder': 'Mã gồm 6 chữ số...',
      'tracking.lookup_btn': 'Tra cứu',
      'tracking.back': 'Về trang chủ',

      // ── Delivery ─────────────────────────────────────────────
      'delivery.back_home': 'Về trang chủ',
      'delivery.status_accepting': 'Đang nhận đơn',
      'delivery.hero_title': '🛵 Giao hàng tận nơi',
      'delivery.hero_desc': 'Giao nhanh trong bán kính <strong>3km</strong> • Phí ship từ ',
      'delivery.step_menu': 'Chọn món',
      'delivery.search_placeholder': 'Tìm kiếm...',
      'delivery.loading_menu': 'Đang tải thực đơn...',
      'delivery.cart_title': 'Giỏ hàng',
      'delivery.subtotal': 'Tổng (tạm tính):',
      'delivery.continue': 'Tiếp tục',
      'delivery.step_info': 'Thông tin giao hàng',
      'delivery.receiver_name': 'Tên người nhận',
      'delivery.phone': 'Số điện thoại',
      'delivery.address': 'Địa chỉ giao hàng',
      'delivery.find_location': 'Tìm vị trí hiện tại',
      'delivery.notes': 'Ghi chú (Tùy chọn, vd: Tòa nhà, tầng...)',
      'delivery.go_back': 'Quay lại',
      'delivery.confirm_pay': 'Xác nhận & Thanh toán',
      'delivery.step_payment': 'Thanh toán & Hoàn tất',
      'delivery.pay_instruction': 'Vui lòng thanh toán để hoàn tất đơn',
      'delivery.qr_instruction': 'Mở ứng dụng ngân hàng và quét mã:',
      'delivery.total_amount': 'Tổng thanh toán',
      'delivery.waiting_payment': 'Đang chờ thanh toán...',
      'delivery.check_payment_btn': 'Tôi đã chuyển khoản',
      'delivery.success_title': 'Đặt hàng thành công!',
      'delivery.success_desc': 'Đơn hàng của bạn đã được ghi nhận và đang chờ xác nhận.',
      'delivery.track_order_btn': 'Theo dõi tiến độ',

      // ── Superadmin ────────────────────────────────────────────
      'superadmin.title': 'Trung Tâm Điều Hành SaaS',
      'superadmin.login_title': 'Nhập Khóa Chủ (Owner Secret)',
      'superadmin.owner_secret': 'Khóa Chủ',
      'superadmin.unlock_btn': 'Mở Khóa Hệ Thống',
      'superadmin.system_online': 'Trạng Thái Hệ Thống: Online',
      'superadmin.stat_tenants': 'Chi Nhánh Kích Hoạt',
      'superadmin.stat_revenue': 'Tổng Doanh Thu',
      'superadmin.stat_subs': 'Gói Cước Đang Chạy',
      'superadmin.stat_users': 'Tổng Người Dùng',
      'superadmin.search': 'Tìm theo tên hoặc miền...',
      'superadmin.filter_all': 'Tất cả trạng thái',
      'superadmin.filter_active': 'Đang hoạt động',
      'superadmin.filter_suspended': 'Đình chỉ',
      'superadmin.filter_expiring': 'Sắp hết hạn',
      'superadmin.filter_expired': 'Đã hết hạn',
      'superadmin.onboard': 'Tạo Mới',
      'superadmin.col_id': 'Mã',
      'superadmin.col_name': 'Tên Chi Nhánh',
      'superadmin.col_domain': 'Tên Miền',
      'superadmin.col_status': 'Trạng Thái',
      'superadmin.col_expires': 'Hết Hạn',
      'superadmin.col_limits': 'Giới Hạn',
      'superadmin.col_actions': 'Thao Tác',
      'superadmin.btn_manage': 'Quản lý',
      'superadmin.sidebar_doc': 'Tài Liệu Superadmin',
      'superadmin.sidebar_api': 'Trạng Thái API',
      'superadmin.create_title': 'Tạo Chi Nhánh Mới',
      'superadmin.client_name': 'Tên Hiển Thị',
      'superadmin.subdomain': 'Tên Miền Mong Muốn',
      'superadmin.tier': 'Gói Cước',
      'superadmin.tier_default': '-- Tự chọn cấu hình --',
      'superadmin.tier_trial': 'Dùng thử (7 ngày, 5 NV, 50 món)',
      'superadmin.tier_basic': 'Cơ bản (30 ngày, 10 NV, 200 món)',
      'superadmin.tier_premium': 'Cao cấp (365 ngày, 50 NV, 9999 món)',
      'superadmin.admin_pin': 'Mã PIN Admin',
      'superadmin.admin_password': 'Mật Khẩu Admin',
      'superadmin.create_btn': 'Tạo Không Gian Mới',
      'superadmin.manage_title': 'Quản Lý Chi Nhánh',
      'superadmin.btn_impersonate': 'Đăng Nhập Admin',
      'superadmin.btn_reset_pin': 'Đổi PIN',
      'superadmin.btn_delete': 'Xóa Bỏ',
      'superadmin.quick_plan': 'Chọn Nhanh Gói Cước',
      'superadmin.expiry_date': 'Ngày Hết Hạn Gói Cước',
      'superadmin.max_staff': 'Giới Hạn Nhân Viên',
      'superadmin.max_items': 'Giới Hạn Món Ăn',
      'superadmin.save_btn': 'Lưu Thông Tin',
      'superadmin.card_rev': 'Doanh thu',
      'superadmin.card_staff': 'Nhân viên',
      'superadmin.card_expired': 'HẾT HẠN',
      'superadmin.card_expiring': 'SẮP HẾT HẠN',
      'superadmin.card_copy_id': 'Sao chép ID',
      'superadmin.card_no_tenants': 'Chưa có chi nhánh nào được đăng ký.',
      'superadmin.broadcast_title': 'Thông báo Toàn hệ thống',
      'superadmin.broadcast_placeholder': 'Nhập thông báo...',
      'superadmin.broadcast_btn': 'Gửi Thông báo',
      'superadmin.platform_subtitle': 'Nền tảng Cà Phê Nohope',
      'superadmin.create_placeholder_name': 'vd: Phúc Long Coffee',
      'superadmin.create_placeholder_pin': 'Khuyên dùng 6 chữ số',
      'superadmin.create_pin_hint': 'Mã PIN này sẽ được Admin sử dụng để đăng nhập vào Bảng điều khiển.',
      'superadmin.broadcast_info': 'Thông tin (Xanh dương)',
      'superadmin.broadcast_warning': 'Cảnh báo (Vàng)',
      'superadmin.broadcast_danger': 'Khẩn cấp (Đỏ)',
      'superadmin.branding_title': 'Thương Hiệu & Hệ Thống',
      'superadmin.custom_domain': 'Tên Miền Tùy Chỉnh',
      'superadmin.domain_placeholder': 'vd: order.mycafe.com',
      'superadmin.logo_url': 'Đường dẫn Logo',
      'superadmin.primary_color': 'Màu Chủ Đạo',
      'superadmin.integrations_title': 'Tích Hợp',
      'superadmin.webhook_url': 'Zalo ZNS / Webhook URL',
      'superadmin.webhook_hint': 'Bỏ trống nếu không sử dụng Zalo ZNS marketing.',
    },

    en: {
      // ── Common ────────────────────────────────────────────────
      'common.loading': 'Loading...',
      'common.refresh': 'Refresh',
      'common.logout': 'Logout',
      'common.close': 'Close',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.confirm': 'Confirm',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.online': 'Online',
      'common.offline': 'Offline',
      'common.search': 'Search',
      'common.today': 'Today',
      'common.yesterday': 'Yesterday',
      'common.all': 'All',
      'common.export_csv': 'Export CSV',
      'common.greeting': 'Hello',
      'common.logged_in_as': 'Logged in as',

      // ── Status Labels ────────────────────────────────────────
      'status.pending': 'Pending',
      'status.preparing': 'Preparing',
      'status.ready': 'Ready',
      'status.delivering': 'Delivering',
      'status.completed': 'Completed',
      'status.cancelled': 'Cancelled',
      'status.paid': 'Paid',

      // ── Login ────────────────────────────────────────────────
      'login.subtitle': 'Sign in to the management system',
      'login.tab_account': 'Account',
      'login.tab_pin': 'PIN Code',
      'login.username_label': 'Username',
      'login.username_placeholder': 'Enter username...',
      'login.password_label': 'Password',
      'login.password_placeholder': 'Enter password...',
      'login.pin_label': 'Secret PIN Code',
      'login.pin_placeholder': '••••••',
      'login.btn': 'Sign In',
      'login.authenticating': 'Authenticating...',
      'login.success': 'Success!',
      'login.footer': 'Powered by Nohope Coffee System',
      'login.error_credentials': 'Incorrect username or password!',
      'login.error_pin': 'Invalid PIN code!',
      'login.error_fill': 'Please enter your username and password.',
      'login.error_fill_pin': 'Please enter your PIN.',

      // ── Kitchen ───────────────────────────────────────────────
      'kitchen.title': 'Nohope Kitchen',
      'kitchen.subtitle': 'Kitchen Station Manager',
      'kitchen.logged_in': 'Logged in',
      'kitchen.audio_btn': 'Sound Alert',
      'kitchen.history_btn': 'History',
      'kitchen.admin_btn': 'Admin',
      'kitchen.orders_title': 'Pending Orders',
      'kitchen.auto_print': 'Auto-print new bills',
      'kitchen.group_orders': 'Group Items',
      'kitchen.batch_title': 'Preparation Summary',
      'kitchen.history_modal_title': 'Order History (Kitchen)',
      'kitchen.history_loading': 'Loading history...',
      'kitchen.history_error': 'Failed to load order history.',
      'kitchen.syncing': 'Syncing kitchen queue...',

      // ── Staff ────────────────────────────────────────────────
      'staff.nav_title': 'Service — Nohope',
      'staff.hello': 'Hello',
      'staff.tab_tables': 'Table Layout',
      'staff.tab_orders': 'Orders & Items',
      'staff.tab_requests': 'Support Requests',
      'staff.loading_tables': 'Loading table layout...',
      'staff.loading_orders': 'Fetching order data...',
      'staff.connected': 'Connected to realtime system.',
      'staff.refresh': 'Refresh',
      'staff.exit': 'Exit',

      // ── Admin ────────────────────────────────────────────────
      'admin.panel': 'Admin Panel',
      'admin.logged_in': 'Logged in as:',
      'admin.nav_overview': 'Overview',
      'admin.nav_manage': 'Management',
      'admin.nav_store': 'Store',
      'admin.nav_shortcuts': 'Shortcuts',
      'admin.dashboard': 'Dashboard',
      'admin.pos': 'POS Sales',
      'admin.menu': 'Menu',
      'admin.inventory': 'Inventory',
      'admin.restock': 'Restocking',
      'admin.promo': 'Promotions',
      'admin.orders': 'Orders',
      'admin.shifts': 'Work Shifts',
      'admin.delivery': 'Delivery',
      'admin.analytics': 'Analytics',
      'admin.cashflow': 'Cash Flow',
      'admin.tables': 'Tables',
      'admin.customers': 'Customers',
      'admin.staff': 'Staff',
      'admin.audit': 'Activity Log',
      'admin.qr': 'QR Codes',
      'admin.settings': 'Settings',
      'admin.customer_menu': 'Customer Menu',
      'admin.kitchen_link': 'Kitchen',
      'admin.end_shift': 'End Shift',
      'admin.guide': 'Technical Guide',
      'admin.logout': 'Logout',

      // ── Tracking ─────────────────────────────────────────────
      'tracking.loading': 'Loading order information...',
      'tracking.not_found_title': 'Order Not Found',
      'tracking.not_found_desc': 'Invalid or expired tracking code.',
      'tracking.new_order': 'Place New Order',
      'tracking.order_label': 'Order #',
      'tracking.order_detail': 'Order Details',
      'tracking.subtotal': 'Subtotal',
      'tracking.fee': 'Delivery Fee',
      'tracking.total': 'Total',
      'tracking.lookup_title': 'Track Your Order',
      'tracking.lookup_desc': 'Enter tracking code to check status',
      'tracking.lookup_placeholder': 'E.g. A1B2C3D4',
      'tracking.lookup_btn': 'Track',
      'tracking.back': '← Back to ordering',
      'tracking.step_ordered': 'Ordered',
      'tracking.step_preparing': 'Preparing',
      'tracking.step_ready': 'Ready',
      'tracking.step_delivering': 'Delivering',
      'tracking.step_done': 'Delivered',

      // ── TV Display ───────────────────────────────────────────
      'tv.setup_title': 'TV DISPLAY',
      'tv.setup_desc': 'Press the button below to enable audio and enter fullscreen.',
      'tv.start_btn': 'START',
      'tv.preparing': 'Preparing',
      'tv.ready': 'Ready for Pickup',

      // ── Driver ───────────────────────────────────────────────
      'driver.login_title': 'Shipper Login',
      'driver.login_subtitle': 'Sign in with your driver code',
      'driver.code_placeholder': 'Enter driver code',
      'driver.login_btn': 'Sign In',
      'driver.logout': 'Logout',
      'driver.today': 'Today',
      'driver.earnings': 'Earnings',
      'driver.rating': 'Rating',
      'driver.pending_orders': 'Pending Orders',
      'driver.no_orders': 'No pending orders.',
      'driver.online': 'Online',
      'driver.offline': 'Offline',
      'driver.login_title': 'Driver Login',
      'driver.login_subtitle': 'Enter code to start shift',
      'driver.code_placeholder': 'Driver Code (e.g. DRV-001)',
      'driver.login_btn': 'Login',

      // ── Tracking ─────────────────────────────────────────────
      'tracking.loading': 'Loading order info...',
      'tracking.not_found_title': 'Order Not Found',
      'tracking.not_found_desc': 'Please check your Tracking Token on the receipt.',
      'tracking.new_order': 'Place New Order',
      'tracking.step_ordered': 'Ordered',
      'tracking.step_preparing': 'Preparing',
      'tracking.step_ready': 'Ready',
      'tracking.step_delivering': 'Delivering',
      'tracking.step_done': 'Done',
      'tracking.subtotal': 'Subtotal',
      'tracking.fee': 'Delivery Fee',
      'tracking.total': 'Total',
      'tracking.order_detail': 'Order Detail',
      'tracking.order_label': 'Order',
      'tracking.lookup_title': 'Look up order',
      'tracking.lookup_desc': 'Enter Tracking Token to see realtime progress.',
      'tracking.lookup_placeholder': '6-digit code...',
      'tracking.lookup_btn': 'Look up',
      'tracking.back': 'Back to home',

      // ── Delivery ─────────────────────────────────────────────
      'delivery.back_home': 'Back to home',
      'delivery.status_accepting': 'Accepting orders',
      'delivery.hero_title': '🛵 Delivery Service',
      'delivery.hero_desc': 'Fast delivery within <strong>3km</strong> • Fee from ',
      'delivery.step_menu': 'Select Items',
      'delivery.search_placeholder': 'Search...',
      'delivery.loading_menu': 'Loading menu...',
      'delivery.cart_title': 'Your Cart',
      'delivery.subtotal': 'Subtotal:',
      'delivery.continue': 'Continue',
      'delivery.step_info': 'Delivery Information',
      'delivery.receiver_name': 'Receiver Name',
      'delivery.phone': 'Phone Number',
      'delivery.address': 'Delivery Address',
      'delivery.find_location': 'Find current location',
      'delivery.notes': 'Notes (Optional, e.g. Building, floor...)',
      'delivery.go_back': 'Go Back',
      'delivery.confirm_pay': 'Confirm & Pay',
      'delivery.step_payment': 'Payment & Complete',
      'delivery.pay_instruction': 'Please pay to complete order',
      'delivery.qr_instruction': 'Open your banking app and scan:',
      'delivery.total_amount': 'Total Amount',
      'delivery.waiting_payment': 'Waiting for payment...',
      'delivery.check_payment_btn': 'I have transferred',
      'delivery.success_title': 'Order Successful!',
      'delivery.success_desc': 'Your order has been recorded and is pending confirmation.',
      'delivery.track_order_btn': 'Track Order Progress',

      // ── Superadmin ────────────────────────────────────────────
      'superadmin.title': 'SaaS Command Center',
      'superadmin.login_title': 'Enter Owner Secret Key',
      'superadmin.owner_secret': 'Owner Secret',
      'superadmin.unlock_btn': 'Unlock System',
      'superadmin.system_online': 'System Status: Online',
      'superadmin.stat_tenants': 'Active Tenants',
      'superadmin.stat_revenue': 'Estimated Value',
      'superadmin.stat_subs': 'Active Subscriptions',
      'superadmin.stat_users': 'Total Users',
      'superadmin.search': 'Search by name or domain...',
      'superadmin.filter_all': 'All Statuses',
      'superadmin.filter_active': 'Active',
      'superadmin.filter_suspended': 'Suspended',
      'superadmin.filter_expiring': 'Expiring Soon',
      'superadmin.filter_expired': 'Expired',
      'superadmin.onboard': 'Onboard New',
      'superadmin.col_id': 'ID',
      'superadmin.col_name': 'Tenant Name',
      'superadmin.col_domain': 'Subdomain',
      'superadmin.col_status': 'Status',
      'superadmin.col_expires': 'Expires At',
      'superadmin.col_limits': 'Limits',
      'superadmin.col_actions': 'Actions',
      'superadmin.btn_manage': 'Manage',
      'superadmin.sidebar_doc': 'Superadmin Documentation',
      'superadmin.sidebar_api': 'API Status',
      'superadmin.create_title': 'Create New Tenant',
      'superadmin.client_name': 'Client Display Name',
      'superadmin.subdomain': 'Subdomain Preference',
      'superadmin.tier': 'Subscription Tier',
      'superadmin.tier_default': '-- Custom Settings --',
      'superadmin.tier_trial': 'Trial (7 days, 5 staff, 50 items)',
      'superadmin.tier_basic': 'Basic (30 days, 10 staff, 200 items)',
      'superadmin.tier_premium': 'Premium (365 days, 50 staff, 9999 items)',
      'superadmin.admin_pin': 'Admin PIN',
      'superadmin.admin_password': 'Admin Password',
      'superadmin.create_btn': 'Create Workspace',
      'superadmin.manage_title': 'Manage Workspace',
      'superadmin.btn_impersonate': 'Login As Admin',
      'superadmin.btn_reset_pin': 'Reset PIN',
      'superadmin.btn_delete': 'Delete',
      'superadmin.quick_plan': 'Quick Set Plan',
      'superadmin.expiry_date': 'Subscription Expiry Date',
      'superadmin.max_staff': 'Max Staff Accounts',
      'superadmin.max_items': 'Max Menu Items',
      'superadmin.save_btn': 'Save Tenant Info',
      'superadmin.card_rev': 'Rev',
      'superadmin.card_staff': 'Staff',
      'superadmin.card_expired': 'EXPIRED',
      'superadmin.card_expiring': 'EXPIRING SOON',
      'superadmin.card_copy_id': 'Copy ID',
      'superadmin.card_no_tenants': 'No tenants registered yet.',
      'superadmin.broadcast_title': 'Global Broadcast',
      'superadmin.broadcast_placeholder': 'Enter system announcement...',
      'superadmin.broadcast_btn': 'Send Alert',
      'superadmin.platform_subtitle': 'Nohope Coffee Platform',
      'superadmin.create_placeholder_name': 'e.g. Phúc Long Coffee',
      'superadmin.create_placeholder_pin': '6 digits recommended',
      'superadmin.create_pin_hint': "This PIN will be used by the client's superuser to log in to the Dashboard.",
      'superadmin.broadcast_info': 'Info (Blue)',
      'superadmin.broadcast_warning': 'Warning (Yellow)',
      'superadmin.broadcast_danger': 'Danger (Red)',
      'superadmin.branding_title': 'Branding & Infrastructure',
      'superadmin.custom_domain': 'Custom Domain',
      'superadmin.domain_placeholder': 'e.g. order.mycafe.com',
      'superadmin.logo_url': 'Logo URL',
      'superadmin.primary_color': 'Primary Color',
      'superadmin.integrations_title': 'Integrations',
      'superadmin.webhook_url': 'Zalo ZNS / Webhook URL',
      'superadmin.webhook_hint': 'Leave blank to disable ZNS marketing automations.',
    }
  };

  // ── State ────────────────────────────────────────────────────
  const STORAGE_KEY = 'nohope_lang';
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'vi';

  // ── Core API ─────────────────────────────────────────────────
  function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) ||
           (translations['vi'][key]) || key;
  }

  function getLang() { return currentLang; }

  function setLang(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyPageLang();
    updateToggleBtn();
    document.documentElement.lang = lang;
    
    // Re-render JS dynamic elements if function exists
    if (window.fetchAndRenderTenants) {
        window.fetchAndRenderTenants();
    }
  }

  function togglePageLang() {
    setLang(currentLang === 'vi' ? 'en' : 'vi');
  }

  // ── DOM Patching ─────────────────────────────────────────────
  function patch(selector, key, attr) {
    try {
      const els = document.querySelectorAll(selector);
      els.forEach(el => {
        if (attr === 'placeholder') { el.placeholder = t(key); }
        else if (attr === 'title') { el.title = t(key); }
        else { el.textContent = t(key); }
      });
    } catch (_) {}
  }

  function patchHTML(selector, key) {
    try {
      const el = document.querySelector(selector);
      if (el) el.innerHTML = t(key);
    } catch (_) {}
  }

  // Generic data-i18n attribute handler
  function applyDataAttributes() {
    try {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        try {
          const key = el.getAttribute('data-i18n');
          const attr = el.getAttribute('data-i18n-attr');
          if (attr === 'placeholder') el.placeholder = t(key);
          else if (attr === 'title') el.title = t(key);
          else el.textContent = t(key);
        } catch (_) {}
      });
    } catch (_) {}
  }

  function applyPageLang() {
    applyDataAttributes();
    detectAndPatchPage();
  }

  // ── Page-specific patches ─────────────────────────────────────
  function detectAndPatchPage() {
    const path = window.location.pathname;

    if (path.includes('/login')) patchLoginPage();
    else if (path.includes('/kitchen')) patchKitchenPage();
    else if (path.includes('/staff')) patchStaffPage();
    else if (path.includes('/admin')) patchAdminPage();
    else if (path.includes('/tracking')) patchTrackingPage();
    else if (path.includes('/tv')) patchTVPage();
    else if (path.includes('/driver')) patchDriverPage();
    else if (path.includes('/delivery')) applyDataAttributes(); // Delivery uses pure data-i18n tags!
    else if (path.includes('/superadmin')) patchSuperadminPage();
  }

  function patchLoginPage() {
    patch('.subtitle', 'login.subtitle');
    patch('#tab-account', 'login.tab_account');
    patch('#tab-pin', 'login.tab_pin');
    try {
      const accLabel = document.querySelector('#account-section label:first-of-type');
      if (accLabel) accLabel.textContent = t('login.username_label');
      const passLabel = document.querySelector('#account-section label:last-of-type');
      if (passLabel) passLabel.textContent = t('login.password_label');
      const pinLabel = document.querySelector('#pin-section label');
      if (pinLabel) pinLabel.textContent = t('login.pin_label');
      const userInput = document.getElementById('username');
      if (userInput) userInput.placeholder = t('login.username_placeholder');
      const passInput = document.getElementById('password');
      if (passInput) passInput.placeholder = t('login.password_placeholder');
      const pinInput = document.getElementById('staff-pin');
      if (pinInput) pinInput.placeholder = t('login.pin_placeholder');
    } catch (_) {}
    try {
      const btn = document.getElementById('login-btn');
      if (btn && !btn.disabled) {
        btn.innerHTML = `<i class="fa-solid fa-right-to-bracket me-2"></i>${t('login.btn')}`;
      }
    } catch (_) {}
    patch('.footer-text a', 'login.footer');
    // Tab icon preservation
    try {
      const tabAcc = document.getElementById('tab-account');
      if (tabAcc) tabAcc.innerHTML = `<i class="fa-solid fa-user-lock me-2"></i>${t('login.tab_account')}`;
      const tabPin = document.getElementById('tab-pin');
      if (tabPin) tabPin.innerHTML = `<i class="fa-solid fa-key me-2"></i>${t('login.tab_pin')}`;
    } catch (_) {}
  }

  function patchKitchenPage() {
    try {
      const h1 = document.querySelector('h1.font-headline');
      if (h1) h1.textContent = t('kitchen.title');
      const sub = document.querySelector('p.text-xs.text-gray-500.font-semibold');
      if (sub) sub.textContent = t('kitchen.subtitle');
      const loggedInLabel = document.querySelector('.text-\\[10px\\].text-gray-400');
      if (loggedInLabel) loggedInLabel.textContent = t('kitchen.logged_in');
    } catch (_) {}

    try {
      const audioBtn = document.getElementById('btn-toggle-audio');
      if (audioBtn) audioBtn.innerHTML = `<i class="fa-solid fa-volume-high mr-1"></i>${t('kitchen.audio_btn')}`;
    } catch (_) {}

    try {
      const allBtns = document.querySelectorAll('header button, header a');
      allBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        const txt = btn.textContent.trim();
        if (txt.includes('Lịch sử') || txt.includes('History')) {
          btn.innerHTML = `<i class="fa-solid fa-clock-rotate-left mr-1"></i>${t('kitchen.history_btn')}`;
        } else if (txt.includes('Quản trị') || txt.includes('Admin')) {
          btn.innerHTML = `<i class="fa-solid fa-gear mr-1"></i>${t('kitchen.admin_btn')}`;
        }
      });
    } catch (_) {}

    try {
      const orderTitle = document.querySelector('h2.font-headline.font-bold');
      if (orderTitle) orderTitle.innerHTML = `<i class="fa-solid fa-bell-concierge text-[#D97531]"></i> ${t('kitchen.orders_title')}`;
      const batchTitle = document.querySelector('#batch-container h6');
      if (batchTitle) batchTitle.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${t('kitchen.batch_title')}`;
    } catch (_) {}

    try {
      // Toggle labels
      const labels = document.querySelectorAll('.toggle-checkbox + .toggle-label');
      const allLabels = document.querySelectorAll('label.cursor-pointer.font-medium');
      allLabels.forEach(lbl => {
        const txt = lbl.textContent.trim();
        if (txt.includes('Tự in') || txt.includes('Auto')) {
          const icon = lbl.querySelector('i');
          const cb = lbl.querySelector('div');
          if (cb) lbl.innerHTML = cb.outerHTML + `<i class="fa-solid fa-print"></i> ${t('kitchen.auto_print')}`;
        } else if (txt.includes('Gộp') || txt.includes('Group')) {
          const cb = lbl.querySelector('div');
          if (cb) lbl.innerHTML = cb.outerHTML + `<i class="fa-solid fa-layer-group"></i> ${t('kitchen.group_orders')}`;
        }
      });
    } catch (_) {}

    try {
      const historyTitle = document.querySelector('#kitchenHistoryModal .modal-title');
      if (historyTitle) historyTitle.innerHTML = `<i class="fa-solid fa-clock-rotate-left mr-2 text-[#D97531]"></i> ${t('kitchen.history_modal_title')}`;
      const closeBtn = document.querySelector('#kitchenHistoryModal .modal-footer button');
      if (closeBtn) closeBtn.textContent = t('common.close');
    } catch (_) {}
  }

  function patchSuperadminPage() {
    try {
      // Titles and Stats
      patch('.auth-title', 'superadmin.title');
      patch('.auth-subtitle', 'superadmin.login_title');
      
      patch('#auth-screen input[type="password"]', 'superadmin.owner_secret', 'placeholder');
      
      const unlockBtn = document.querySelector('#auth-screen button');
      if (unlockBtn) unlockBtn.innerHTML = `<i class="fa-solid fa-lock-open me-2"></i>${t('superadmin.unlock_btn')}`;
      
      patch('.brand-text h1', 'superadmin.title');
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) logoutBtn.innerHTML = `<i class="fa-solid fa-power-off me-2"></i>${t('common.logout')}`;

      // Broadcast section
      const broadcastTitle = document.querySelector('h5.mb-3.font-noto');
      if (broadcastTitle) broadcastTitle.innerHTML = `<i class="fa-solid fa-bullhorn text-warning me-2"></i> ${t('superadmin.broadcast_title')}`;
      patch('#broadcast-message', 'superadmin.broadcast_placeholder', 'placeholder');
      
      const sendBroadcastBtn = document.getElementById('send-broadcast-btn');
      if (sendBroadcastBtn) sendBroadcastBtn.textContent = t('superadmin.broadcast_btn');

      // Dashboard Stats
      const statLabels = document.querySelectorAll('.stat-label');
      if (statLabels[0]) statLabels[0].textContent = t('superadmin.stat_revenue');
      if (statLabels[1]) statLabels[1].textContent = t('superadmin.stat_tenants');
      if (statLabels[2]) statLabels[2].textContent = t('superadmin.stat_users');

      // Grid header
      patch('#tenant-search', 'superadmin.search', 'placeholder');
      
      const filterSelect = document.getElementById('status-filter');
      if (filterSelect && filterSelect.options && filterSelect.options.length >= 5) {
        filterSelect.options[0].textContent = t('superadmin.filter_all');
        filterSelect.options[1].textContent = `🟢 ${t('superadmin.filter_active')}`;
        filterSelect.options[2].textContent = `🔴 ${t('superadmin.filter_suspended')}`;
        filterSelect.options[3].textContent = `🟠 ${t('superadmin.filter_expiring')}`;
        filterSelect.options[4].textContent = `⚪ ${t('superadmin.filter_expired')}`;
      }
      
      const onboardBtn = document.querySelector('button[data-bs-target="#createTenantModal"]');
      if (onboardBtn) onboardBtn.innerHTML = `<i class="fa-solid fa-plus me-2"></i>${t('superadmin.onboard')}`;

      // Modals - Create
      const createTitle = document.querySelector('#createTenantModal .modal-title');
      if (createTitle) createTitle.innerHTML = `<i class="fa-solid fa-rocket me-2 text-primary"></i> ${t('superadmin.create_title')}`;

      // Modals - Manage
      const manageTitleText = document.getElementById('manage-title-text');
      if (manageTitleText) manageTitleText.textContent = t('superadmin.manage_title');

      const btnImpersonate = document.getElementById('btn-impersonate');
      if (btnImpersonate) btnImpersonate.innerHTML = `<i class="fa-solid fa-masks-theater me-2"></i>${t('superadmin.btn_impersonate')}`;
      
      const btnResetPin = document.getElementById('btn-reset-pin');
      if (btnResetPin) btnResetPin.innerHTML = `<i class="fa-solid fa-key me-2"></i>${t('superadmin.btn_reset_pin')}`;
      
      const btnDelete = document.getElementById('btn-delete-tenant');
      if (btnDelete) btnDelete.innerHTML = `<i class="fa-solid fa-trash me-2"></i>${t('superadmin.btn_delete')}`;

      // Sidebar
      const sidebarDocContainer = document.querySelector('.fa-book');
      if (sidebarDocContainer && sidebarDocContainer.parentNode) sidebarDocContainer.parentNode.innerHTML = `<i class="fa-solid fa-book w-5"></i> ${t('superadmin.sidebar_doc')}`;
      
      const sidebarAPIContainer = document.querySelector('.fa-server');
      if (sidebarAPIContainer && sidebarAPIContainer.parentNode) sidebarAPIContainer.parentNode.innerHTML = `<i class="fa-solid fa-server w-5 text-success"></i> ${t('superadmin.sidebar_api')} <span class="badge bg-success ms-auto">OK</span>`;
    } catch (_) {}
  }

  function patchStaffPage() {
    try {
      const navTitle = document.querySelector('nav .font-serif, nav .font-xl');
      if (navTitle) navTitle.innerHTML = `<i class="fa-solid fa-mug-hot text-secondary"></i> ${t('staff.nav_title')}`;
    } catch (_) {}

    try {
      const helloSpan = document.querySelector('span.text-\\[10px\\].text-on-surface-variant');
      if (helloSpan) helloSpan.textContent = t('staff.hello');
    } catch (_) {}

    try {
      const tabTables = document.getElementById('tab-tables');
      if (tabTables) tabTables.textContent = t('staff.tab_tables');
      const tabOrders = document.getElementById('tab-orders');
      if (tabOrders) tabOrders.textContent = t('staff.tab_orders');
      const tabRequests = document.getElementById('tab-requests');
      if (tabRequests) {
        const badge = tabRequests.querySelector('#req-badge');
        tabRequests.textContent = t('staff.tab_requests') + ' ';
        if (badge) tabRequests.appendChild(badge);
      }
    } catch (_) {}

    try {
      const refreshBtn = document.getElementById('refresh-btn');
      if (refreshBtn) refreshBtn.innerHTML = `<i class="fa-solid fa-rotate-right mr-1"></i>${t('staff.refresh')}`;
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) logoutBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket mr-1"></i>${t('staff.exit')}`;
    } catch (_) {}

    try {
      const statusBar = document.getElementById('status-bar');
      if (statusBar) statusBar.textContent = t('staff.connected');
    } catch (_) {}
  }

  function patchAdminPage() {
    // Sidebar nav labels
    const navMap = {
      'tab-dashboard': 'admin.dashboard',
      'tab-pos': 'admin.pos',
      'tab-menu': 'admin.menu',
      'tab-inventory': 'admin.inventory',
      'tab-restock': 'admin.restock',
      'tab-promo': 'admin.promo',
      'tab-history': 'admin.orders',
      'tab-shifts': 'admin.shifts',
      'tab-delivery': 'admin.delivery',
      'tab-analytics': 'admin.analytics',
      'tab-cashflow': 'admin.cashflow',
      'tab-tables': 'admin.tables',
      'tab-customers': 'admin.customers',
      'tab-staff': 'admin.staff',
      'tab-audit': 'admin.audit',
      'tab-qr': 'admin.qr',
      'tab-settings': 'admin.settings',
    };

    const iconMap = {
      'tab-dashboard': 'fa-gauge-high',
      'tab-pos': 'fa-cash-register',
      'tab-menu': 'fa-book-open',
      'tab-inventory': 'fa-boxes-stacked',
      'tab-restock': 'fa-truck-ramp-box',
      'tab-promo': 'fa-ticket',
      'tab-history': 'fa-clock-rotate-left',
      'tab-shifts': 'fa-business-time',
      'tab-delivery': 'fa-motorcycle',
      'tab-analytics': 'fa-chart-pie',
      'tab-cashflow': 'fa-wallet',
      'tab-tables': 'fa-table-cells',
      'tab-customers': 'fa-users',
      'tab-staff': 'fa-user-tie',
      'tab-audit': 'fa-clipboard-list',
      'tab-qr': 'fa-qrcode',
      'tab-settings': 'fa-gear',
    };

    Object.entries(navMap).forEach(([id, key]) => {
      try {
        const btn = document.getElementById(id);
        if (!btn) return;
        const icon = iconMap[id];
        const badge = btn.querySelector('span[id$="-badge"]');
        if (id === 'tab-history') {
          btn.innerHTML = `<span class="flex items-center gap-3"><i class="fa-solid ${icon} w-5 text-center"></i> ${t(key)}</span>`;
          if (badge) btn.appendChild(badge);
        } else if (id === 'tab-delivery') {
          btn.innerHTML = `<span class="flex items-center gap-3"><i class="fa-solid ${icon} w-5 text-center"></i> ${t(key)}</span>`;
          if (badge) btn.appendChild(badge);
        } else {
          btn.innerHTML = `<i class="fa-solid ${icon} w-5 text-center"></i> ${t(key)}`;
        }
      } catch (_) {}
    });

    // Section labels
    try {
      const navLabels = document.querySelectorAll('#admin-main-nav p.text-\\[11px\\]');
      if (navLabels[0]) navLabels[0].textContent = t('admin.nav_overview');
      if (navLabels[1]) navLabels[1].textContent = t('admin.nav_manage');
      if (navLabels[2]) navLabels[2].textContent = t('admin.nav_store');
      if (navLabels[3]) navLabels[3].textContent = t('admin.nav_shortcuts');
    } catch (_) {}

    // Shortcuts
    try {
      const shortcuts = document.querySelectorAll('#admin-main-nav a');
      shortcuts.forEach(a => {
        const txt = a.textContent.trim();
        if (txt.includes('Menu khách') || txt.includes('Customer Menu')) {
          a.innerHTML = `<i class="fa-solid fa-store w-5 text-center"></i> ${t('admin.customer_menu')}`;
        } else if ((txt.includes('Bếp') || txt.includes('Kitchen')) && !txt.includes('Hướng')) {
          a.innerHTML = `<i class="fa-solid fa-utensils w-5 text-center"></i> ${t('admin.kitchen_link')}`;
        } else if (txt.includes('Hướng dẫn') || txt.includes('Technical Guide')) {
          a.innerHTML = `<i class="fa-solid fa-circle-question w-5 text-center"></i> ${t('admin.guide')}`;
        }
      });
    } catch (_) {}

    // End shift button
    try {
      const shiftBtn = document.getElementById('toggle-shift-btn-desktop');
      if (shiftBtn) shiftBtn.innerHTML = `<i class="fa-solid fa-moon w-5 text-center"></i> ${t('admin.end_shift')}`;
    } catch (_) {}

    // Logout
    try {
      const logoutBtns = document.querySelectorAll('button[onclick*="signOut"]');
      logoutBtns.forEach(btn => {
        btn.innerHTML = `<i class="fa-solid fa-sign-out-alt w-5 text-center"></i> ${t('admin.logout')}`;
      });
    } catch (_) {}

    // Logged-in label
    try {
      const loggedInLabel = document.querySelector('.text-\\[10px\\].text-slate-500.uppercase');
      if (loggedInLabel && (loggedInLabel.textContent.includes('Đang') || loggedInLabel.textContent.includes('Logged'))) {
        loggedInLabel.textContent = t('admin.logged_in');
      }
    } catch (_) {}
  }

  function patchTrackingPage() {
    try {
      const loadingText = document.querySelector('#tracking-loading p');
      if (loadingText) loadingText.textContent = t('tracking.loading');

      const notFoundTitle = document.querySelector('#tracking-not-found h2');
      if (notFoundTitle) notFoundTitle.textContent = t('tracking.not_found_title');
      const notFoundDesc = document.querySelector('#tracking-not-found p');
      if (notFoundDesc) notFoundDesc.textContent = t('tracking.not_found_desc');
      const newOrderBtn = document.querySelector('#tracking-not-found a');
      if (newOrderBtn) newOrderBtn.innerHTML = `<i class="fa-solid fa-plus"></i> ${t('tracking.new_order')}`;

      // Stepper labels
      const stepLabels = document.querySelectorAll('.step-label');
      const stepKeys = ['tracking.step_ordered', 'tracking.step_preparing', 'tracking.step_ready', 'tracking.step_delivering', 'tracking.step_done'];
      stepLabels.forEach((el, i) => { if (stepKeys[i]) el.textContent = t(stepKeys[i]); });

      // Price labels
      const priceLabels = document.querySelectorAll('.bg-\\[\\#F6F3F2\\] span.text-gray-500');
      if (priceLabels[0]) priceLabels[0].textContent = t('tracking.subtotal');
      if (priceLabels[1]) priceLabels[1].textContent = t('tracking.fee');
      const totalLabel = document.querySelector('.bg-\\[\\#F6F3F2\\] .flex.justify-between.pt-2 span:first-child');
      if (totalLabel) totalLabel.textContent = t('tracking.total');

      const detailTitle = document.querySelector('#tracking-content h3');
      if (detailTitle) detailTitle.innerHTML = `<i class="fa-solid fa-list mr-1"></i> ${t('tracking.order_detail')}`;

      // Order header prefix
      const orderH2 = document.querySelector('#tracking-content h2');
      if (orderH2) {
        const span = orderH2.querySelector('span');
        if (span) orderH2.firstChild.textContent = t('tracking.order_label');
      }

      // Lookup modal
      const lookupTitle = document.querySelector('#lookup-modal h2');
      if (lookupTitle) lookupTitle.textContent = t('tracking.lookup_title');
      const lookupDesc = document.querySelector('#lookup-modal p');
      if (lookupDesc) lookupDesc.textContent = t('tracking.lookup_desc');
      const lookupInput = document.getElementById('lookup-token');
      if (lookupInput) lookupInput.placeholder = t('tracking.lookup_placeholder');
      const lookupBtn = document.querySelector('#lookup-modal button');
      if (lookupBtn) lookupBtn.innerHTML = `<i class="fa-solid fa-search mr-2"></i> ${t('tracking.lookup_btn')}`;
      const backLink = document.querySelector('#lookup-modal a');
      if (backLink) backLink.textContent = t('tracking.back');
    } catch (_) {}
  }

  function patchTVPage() {
    try {
      const title = document.querySelector('#setup-prompt h2');
      if (title) title.innerHTML = `<i class="fa-solid fa-tv me-4"></i> ${t('tv.setup_title')}`;
      const desc = document.querySelector('#setup-prompt p');
      if (desc) desc.textContent = t('tv.setup_desc');
      const startBtn = document.querySelector('#setup-prompt button');
      if (startBtn) startBtn.innerHTML = `${t('tv.start_btn')} <i class="fa-solid fa-play ms-2"></i>`;

      const cols = document.querySelectorAll('.flex-1 > div > h2');
      cols.forEach(h2 => {
        const txt = h2.textContent.trim();
        if (txt.includes('Chuẩn Bị') || txt.includes('Preparing')) {
          h2.innerHTML = `<i class="fa-solid fa-fire-burner text-tertiary me-3"></i>${t('tv.preparing')}`;
        } else if (txt.includes('Nhận Đồ') || txt.includes('Pickup') || txt.includes('Ready')) {
          h2.innerHTML = `<i class="fa-solid fa-bell-concierge me-3 fa-bounce" style="--fa-animation-duration: 2s;"></i>${t('tv.ready')}`;
        }
      });
    } catch (_) {}
  }

  function patchDriverPage() {
    try {
      const loginTitle = document.querySelector('#driver-login h1');
      if (loginTitle) loginTitle.textContent = t('driver.login_title');
      const loginSub = document.querySelector('#driver-login p');
      if (loginSub) loginSub.textContent = t('driver.login_subtitle');
      const codeInput = document.getElementById('driver-code');
      if (codeInput) codeInput.placeholder = t('driver.code_placeholder');
      const loginBtn = document.querySelector('#driver-login button[onclick="driverLogin()"]');
      if (loginBtn) loginBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> ${t('driver.login_btn')}`;

      const logoutBtn = document.querySelector('button[onclick="driverLogout()"]');
      if (logoutBtn) logoutBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket mr-1"></i> ${t('driver.logout')}`;

      const statLabels = document.querySelectorAll('.stat-chip .label');
      if (statLabels[0]) statLabels[0].textContent = t('driver.today');
      if (statLabels[1]) statLabels[1].textContent = t('driver.earnings');
      if (statLabels[2]) statLabels[2].textContent = t('driver.rating');

      const ordersTitle = document.querySelector('.driver-sheet h3');
      if (ordersTitle) ordersTitle.innerHTML = `<i class="fa-solid fa-list-check mr-1"></i> ${t('driver.pending_orders')}`;

      const onlineBtn = document.getElementById('btn-online');
      if (onlineBtn) onlineBtn.innerHTML = `<i class="fa-solid fa-signal mr-1"></i> ${t('driver.online')}`;
      const offlineBtn = document.getElementById('btn-offline');
      if (offlineBtn) offlineBtn.innerHTML = `<i class="fa-solid fa-moon mr-1"></i> ${t('driver.offline')}`;

      const emptyMsg = document.querySelector('#driver-orders p');
      if (emptyMsg) emptyMsg.textContent = t('driver.no_orders');
    } catch (_) {}
  }

  // ── Toggle Button ────────────────────────────────────────────
  function createToggleBtn() {
    if (document.getElementById('i18n-page-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'i18n-page-toggle';
    btn.title = 'Toggle Language / Chuyển ngôn ngữ';
    btn.style.cssText = `
      position: fixed;
      bottom: 160px;
      right: 20px;
      z-index: 9999;
      background: linear-gradient(135deg, var(--primary, #994700), var(--accent, #FF7A00));
      color: white;
      border: none;
      border-radius: 50px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.15s, box-shadow 0.15s;
      font-family: 'Inter', sans-serif;
    `;
    btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)'; btn.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; };
    btn.onclick = togglePageLang;
    document.body.appendChild(btn);
    updateToggleBtn();
  }

  function updateToggleBtn() {
    const btn = document.getElementById('i18n-page-toggle');
    if (!btn) return;
    const next = currentLang === 'vi' ? 'EN' : 'VI';
    btn.innerHTML = `🌐 ${next}`;
    btn.title = currentLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt';
  }

  // ── Expose Globals ───────────────────────────────────────────
  window.t = t;
  window.getLang = getLang;
  window.setLang = setLang;
  window.togglePageLang = togglePageLang;
  window.applyPageLang = applyPageLang;

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    document.documentElement.lang = currentLang;
    applyPageLang();
    createToggleBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
