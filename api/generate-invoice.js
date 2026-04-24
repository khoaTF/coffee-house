/**
 * E-Invoice PDF Generator — Vercel Serverless Function
 * 
 * Generates a professional PDF invoice for a completed order.
 * Uses html-pdf-node for server-side PDF generation.
 * 
 * Endpoint: POST /api/generate-invoice
 * Body: { order_id, tenant_id }
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getChannelLabel(source) {
    const map = {
        qr_table: 'QR Bàn', pos_counter: 'POS Quầy', grabfood: 'GrabFood',
        shopeefood: 'ShopeeFood', befood: 'BeFood', zalo: 'Zalo',
        phone_call: 'Điện thoại', manual: 'Thủ công'
    };
    return map[source] || 'QR Bàn';
}

function buildInvoiceHTML(order, shopInfo) {
    const items = order.items || [];
    const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const discount = order.discount_amount || 0;
    const deliveryFee = order.delivery_fee || 0;
    const total = order.total_price || (subtotal - discount + deliveryFee);
    const invoiceNo = `INV-${(order.id || '').substring(0, 8).toUpperCase()}`;
    const channelLabel = getChannelLabel(order.order_source);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Roboto', sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b45309; padding-bottom: 20px; margin-bottom: 24px; }
  .shop-info { max-width: 60%; }
  .shop-name { font-size: 24px; font-weight: 800; color: #b45309; margin-bottom: 4px; }
  .shop-detail { font-size: 11px; color: #6b7280; line-height: 1.6; }
  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 28px; font-weight: 900; color: #1a1a1a; letter-spacing: 1px; }
  .invoice-no { font-size: 13px; color: #b45309; font-weight: 700; margin-top: 4px; }
  .invoice-date { font-size: 11px; color: #6b7280; margin-top: 2px; }
  
  .info-grid { display: flex; gap: 40px; margin-bottom: 24px; }
  .info-block { flex: 1; background: #faf9f6; border-radius: 8px; padding: 14px; }
  .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 700; margin-bottom: 6px; }
  .info-value { font-size: 13px; color: #1a1a1a; font-weight: 600; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #b45309; color: white; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  thead th:first-child { border-radius: 6px 0 0 0; }
  thead th:last-child { border-radius: 0 6px 0 0; text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
  tbody tr:last-child td { border-bottom: none; }
  .item-name { font-weight: 600; }
  .item-options { font-size: 11px; color: #6b7280; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  
  .totals { margin-left: auto; width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .total-row.grand { border-top: 2px solid #b45309; padding-top: 10px; margin-top: 6px; font-size: 18px; font-weight: 900; color: #b45309; }
  .total-label { color: #6b7280; }
  .total-value { font-weight: 700; }
  
  .footer { margin-top: 40px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  .footer-text { font-size: 11px; color: #9ca3af; }
  .thank-you { font-size: 16px; font-weight: 700; color: #b45309; margin-bottom: 8px; }
  
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; }
  .badge-paid { background: rgba(34,197,94,0.1); color: #16a34a; }
  .badge-unpaid { background: rgba(239,68,68,0.1); color: #dc2626; }
  .badge-channel { background: rgba(180,83,9,0.1); color: #b45309; }
</style>
</head>
<body>
  <div class="header">
    <div class="shop-info">
      <div class="shop-name">${shopInfo.name || 'Nohope Coffee'}</div>
      <div class="shop-detail">
        ${shopInfo.address || 'Cà phê & Trà thượng hạng'}<br>
        ${shopInfo.phone ? 'ĐT: ' + shopInfo.phone + '<br>' : ''}
        ${shopInfo.email ? 'Email: ' + shopInfo.email : ''}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">HÓA ĐƠN</div>
      <div class="invoice-no">${invoiceNo}</div>
      <div class="invoice-date">${formatDate(order.created_at)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <div class="info-label">Thông tin đơn hàng</div>
      <div class="info-value">
        Bàn: ${order.table_number || 'N/A'}<br>
        Kênh: <span class="badge badge-channel">${channelLabel}</span><br>
        Thanh toán: ${order.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
        <span class="badge ${order.is_paid ? 'badge-paid' : 'badge-unpaid'}">${order.is_paid ? 'Đã thanh toán' : 'Chưa TT'}</span>
      </div>
    </div>
    <div class="info-block">
      <div class="info-label">Khách hàng</div>
      <div class="info-value">
        ${order.delivery_name || order.customer_name || 'Khách lẻ'}<br>
        ${order.customer_phone || order.delivery_phone || '—'}
        ${order.delivery_address ? '<br>' + order.delivery_address : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:5%">#</th>
        <th style="width:45%">Tên món</th>
        <th class="text-center" style="width:10%">SL</th>
        <th class="text-right" style="width:20%">Đơn giá</th>
        <th class="text-right" style="width:20%">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div class="item-name">${item.name}</div>
          ${(item.selectedOptions || []).length > 0 ? `<div class="item-options">${item.selectedOptions.map(o => typeof o === 'string' ? o : o.name || o.label || '').join(', ')}</div>` : ''}
          ${item.note ? `<div class="item-options">📝 ${item.note}</div>` : ''}
        </td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${formatCurrency(item.price)}</td>
        <td class="text-right">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span class="total-label">Tạm tính</span>
      <span class="total-value">${formatCurrency(subtotal)}</span>
    </div>
    ${discount > 0 ? `
    <div class="total-row">
      <span class="total-label">Giảm giá</span>
      <span class="total-value" style="color:#16a34a">-${formatCurrency(discount)}</span>
    </div>` : ''}
    ${deliveryFee > 0 ? `
    <div class="total-row">
      <span class="total-label">Phí giao hàng</span>
      <span class="total-value">${formatCurrency(deliveryFee)}</span>
    </div>` : ''}
    <div class="total-row grand">
      <span>TỔNG CỘNG</span>
      <span>${formatCurrency(total)}</span>
    </div>
  </div>

  ${order.order_note ? `<div style="margin-top:16px;padding:10px;background:#fef3c7;border-radius:6px;font-size:12px;color:#92400e;">📝 Ghi chú: ${order.order_note}</div>` : ''}

  <div class="footer">
    <div class="thank-you">Cảm ơn quý khách! ☕</div>
    <div class="footer-text">Hóa đơn được tạo tự động bởi hệ thống ${shopInfo.name || 'Nohope Coffee'}</div>
    <div class="footer-text" style="margin-top:4px">Mã đơn: ${order.id || 'N/A'}</div>
  </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    if (!SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
    }

    try {
        const { order_id, tenant_id } = req.body;

        if (!order_id || !tenant_id) {
            return res.status(400).json({ error: 'order_id and tenant_id are required' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Fetch order
        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order_id)
            .eq('tenant_id', tenant_id)
            .single();

        if (error || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Fetch shop info for tenant
        let shopInfo = { name: 'Nohope Coffee', address: '', phone: '', email: '' };
        try {
            const { data: tenant } = await supabase
                .from('tenants')
                .select('name, address, phone, email')
                .eq('id', tenant_id)
                .single();
            if (tenant) {
                shopInfo = { ...shopInfo, ...tenant };
            }
        } catch (e) {
            // Use defaults
        }

        const html = buildInvoiceHTML(order, shopInfo);

        // Return HTML for client-side rendering / print
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Invoice generation error:', error);
        return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
};
