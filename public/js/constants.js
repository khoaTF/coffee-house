// =============================================
// SHARED CONSTANTS — Single Source of Truth
// =============================================

// Order Status — dùng chung cho Customer, Admin, Kitchen, TV
window.ORDER_STATUS = {
    PENDING: 'Pending',
    PREPARING: 'Preparing',
    READY: 'Ready',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
};

// Status Labels (Vietnamese)
window.STATUS_LABELS = {
    Pending: 'Đang chờ',
    Preparing: 'Đang làm',
    Ready: 'Đã xong',
    Completed: 'Hoàn thành',
    Cancelled: 'Đã hủy'
};

// Status Badge CSS Classes (Bootstrap)
window.STATUS_BADGE_CLASSES = {
    Pending: 'bg-warning text-dark',
    Preparing: 'bg-primary',
    Ready: 'bg-info text-dark',
    Completed: 'bg-success',
    Cancelled: 'bg-danger'
};

// Payment Methods
window.PAYMENT_LABELS = {
    cash: 'Tiền mặt',
    transfer: 'Chuyển khoản'
};

// Payment Status
window.PAYMENT_STATUS_LABELS = {
    paid: 'Đã thanh toán',
    unpaid: 'Chưa thanh toán'
};
