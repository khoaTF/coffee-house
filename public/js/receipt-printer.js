/**
 * Receipt Printer Module - ESC/POS Thermal Print via window.print()
 * Generates a print-optimized receipt layout for 80mm/58mm thermal printers
 */

window.printReceipt = function(order, shopName = 'Nohope Coffee') {
    if (!order || !order.items) return;

    const orderId = order._id ? order._id.slice(-6).toUpperCase() : '------';
    const tableNum = order.table_number || '?';
    const orderDate = order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
    const note = order.note || '';
    const paymentMethod = order.payment_method === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';

    let itemsHtml = '';
    let totalAmount = 0;

    order.items.forEach(item => {
        const qty = item.quantity || 1;
        const basePrice = item.price || 0;
        const optPrice = (item.selectedOptions || []).reduce((s, o) => s + (o.priceExtra || 0), 0);
        const lineTotal = (basePrice + optPrice) * qty;
        totalAmount += lineTotal;

        itemsHtml += `
            <tr>
                <td style="text-align:left;padding:3px 0;font-size:13px;">
                    <strong>${qty}x</strong> ${escapeHTML(item.name)}
                    ${item.selectedOptions && item.selectedOptions.length > 0
                        ? `<br><span style="font-size:11px;color:#666;padding-left:16px;">+ ${item.selectedOptions.map(o => escapeHTML(o.choiceName)).join(', ')}</span>` 
                        : ''}
                    ${item.note 
                        ? `<br><span style="font-size:11px;color:#888;padding-left:16px;">📝 ${escapeHTML(item.note)}</span>` 
                        : ''}
                </td>
                <td style="text-align:right;padding:3px 0;font-size:13px;white-space:nowrap;">${lineTotal.toLocaleString('vi-VN')}đ</td>
            </tr>`;
    });

    // Apply discounts
    const discount = order.discount_amount || 0;
    const finalTotal = totalAmount - discount;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        alert('Vui lòng cho phép popup để in hóa đơn.');
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Hóa đơn #${orderId}</title>
<style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
        font-family: 'Courier New', monospace; 
        width: 80mm; 
        max-width: 80mm;
        padding: 8mm 5mm;
        font-size: 13px;
        color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { 
        border-top: 1px dashed #000; 
        margin: 8px 0; 
    }
    .double-divider {
        border-top: 2px double #000;
        margin: 8px 0;
    }
    table { width: 100%; border-collapse: collapse; }
    .shop-name { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
    .order-id { font-size: 22px; font-weight: 900; margin: 6px 0; }
    .footer-text { font-size: 11px; color: #666; margin-top: 4px; }
    .total-row td { font-size: 16px; font-weight: 900; padding-top: 6px; }
    @media print {
        body { width: 80mm; }
    }
</style>
</head>
<body>
    <div class="center">
        <div class="shop-name">${escapeHTML(shopName)}</div>
        <div style="font-size:11px;margin-top:2px;">☕ Thưởng thức cà phê</div>
    </div>
    
    <div class="divider"></div>
    
    <div class="center">
        <div class="order-id">#${orderId}</div>
        <div style="font-size:12px;">Bàn: <strong>${escapeHTML(String(tableNum))}</strong></div>
        <div style="font-size:11px;color:#666;">${orderDate}</div>
    </div>
    
    <div class="double-divider"></div>
    
    <table>
        <thead>
            <tr>
                <th style="text-align:left;padding-bottom:4px;font-size:12px;border-bottom:1px solid #000;">Món</th>
                <th style="text-align:right;padding-bottom:4px;font-size:12px;border-bottom:1px solid #000;">Giá</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>
    
    <div class="double-divider"></div>
    
    <table>
        <tr>
            <td style="font-size:13px;">Tạm tính:</td>
            <td style="text-align:right;font-size:13px;">${totalAmount.toLocaleString('vi-VN')}đ</td>
        </tr>
        ${discount > 0 ? `
        <tr>
            <td style="font-size:13px;color:#e74c3c;">Giảm giá:</td>
            <td style="text-align:right;font-size:13px;color:#e74c3c;">-${discount.toLocaleString('vi-VN')}đ</td>
        </tr>` : ''}
        <tr class="total-row">
            <td>TỔNG CỘNG:</td>
            <td style="text-align:right;">${finalTotal.toLocaleString('vi-VN')}đ</td>
        </tr>
    </table>
    
    <div class="divider"></div>
    
    <div style="font-size:12px;">
        <div>Thanh toán: <strong>${paymentMethod}</strong></div>
        ${note ? `<div style="margin-top:4px;">Ghi chú: <em>${escapeHTML(note)}</em></div>` : ''}
    </div>
    
    <div class="divider"></div>
    
    <div class="center">
        <div class="footer-text">Cảm ơn quý khách!</div>
        <div class="footer-text">Hẹn gặp lại ☕</div>
    </div>
</body>
</html>`);

    printWindow.document.close();
    
    // Wait for content to render then trigger print
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Close after print dialog
        setTimeout(() => printWindow.close(), 1000);
    }, 300);
};

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
