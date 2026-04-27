// ====================================================
// customer-order.js — Order placement, history, realtime
// ====================================================
import { TABLE_NUMBER, state, dom, sessionId, statusMap } from './customer-config.js';
import { updateCartUI } from './customer-cart.js';
import { fetchMenu, renderMenu, getActiveCategory } from './customer-menu.js';
import { closeModal, openPaymentModal } from './customer-modal.js';
import { customerAlert, customerConfirm } from './customer-ui.js';

// Supabase Realtime Subscription
export function setupRealtimeSubscription() {
    supabase
      .channel('customer-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `session_id=eq.${sessionId}` }, payload => {
          const updatedOrder = payload.new;
          const currentInSession = state.sessionOrders.find(o => o.id === updatedOrder.id || o._id === updatedOrder.id);
          
          if (currentInSession) {
              if (currentInSession.payment_status === 'unpaid' && updatedOrder.payment_status === 'paid' && state.currentPaymentMethod === 'transfer') {
                  const paymentModal = document.getElementById('payment-modal');
                  if (paymentModal && paymentModal.classList.contains('active')) {
                       const btnConfirmPayment = document.getElementById('confirm-payment-btn');
                       if(btnConfirmPayment) {
                           btnConfirmPayment.innerHTML = '<i class="fa-solid fa-check-double"></i> Thanh toán thành công!';
                           btnConfirmPayment.classList.replace('btn-primary', 'btn-success');
                       }
                       setTimeout(() => {
                           handleOrderConfirmed({ ...updatedOrder, _id: updatedOrder.id, createdAt: updatedOrder.created_at, totalPrice: updatedOrder.total_price, orderNote: updatedOrder.order_note });
                       }, 1500);
                  }
              }
              currentInSession.payment_status = updatedOrder.payment_status;
              currentInSession.status = updatedOrder.status;
              currentInSession.is_paid = updatedOrder.is_paid;
              
              const currentId = updatedOrder.id || updatedOrder._id;
              if (state.trackedOrderId === currentId) {
                  let statusText = statusMap[updatedOrder.status] ? statusMap[updatedOrder.status].text : updatedOrder.status;
                  let statusClass = statusMap[updatedOrder.status] ? statusMap[updatedOrder.status].class : 'text-primary';
                  let statusColor = (statusMap[updatedOrder.status] && statusMap[updatedOrder.status].color) ? statusMap[updatedOrder.status].color : '';

                  if (updatedOrder.status === 'Pending') {
                      if (!updatedOrder.is_paid) {
                          statusText = 'Chưa thanh toán (Chờ xác nhận)';
                          statusClass = 'text-danger font-bold';
                          statusColor = '#e74c3c';
                      } else {
                          statusText = 'Đã thanh toán (Chờ bếp làm)';
                          statusClass = 'text-primary font-bold';
                          statusColor = '#3498db';
                      }
                  }
                  
                  if (dom.liveStatus) {
                      dom.liveStatus.textContent = statusText;
                      dom.liveStatus.className = statusClass;
                      if (statusColor) dom.liveStatus.style.color = statusColor;
                  }
              }
          }
          
          if (typeof window.handleOrderStatusUpdate === 'function') {
              window.handleOrderStatusUpdate(updatedOrder);
          }
      })
      .subscribe();
}

// Place Order
export async function placeOrder(method = 'cash') {
    state.currentPaymentMethod = method;
    
    // Phase 4.2: Request Push Notification Permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    // GACHA: Resolve mystery box items BEFORE order placement
    let gachaResults = [];
    if (typeof window.resolveGachaInCart === 'function' && typeof window.cartHasGacha === 'function' && window.cartHasGacha()) {
        gachaResults = window.resolveGachaInCart();
    }

    const subtotal = state.cart.reduce((sum, item) => {
        const itemOptionsPrice = (item.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0);
        return sum + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);
    
    const totalPrice = subtotal - state.currentDiscountAmount;
    
    // Generate item_code prefix from table number (1→A, 2→B, ..., 26→Z, 27→AA)
    const tblNum = parseInt(TABLE_NUMBER) || 1;
    const codePrefix = tblNum <= 26
        ? String.fromCharCode(64 + tblNum)
        : String.fromCharCode(64 + Math.floor((tblNum - 1) / 26)) + String.fromCharCode(65 + ((tblNum - 1) % 26));

    const formattedItems = state.cart.map((item, index) => ({
        productId: item._id || item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        selectedOptions: item.selectedOptions || [],
        recipe: item.recipe || [],
        note: item.note || '',
        item_code: `${codePrefix}${index + 1}`,
        is_done: false
    }));
    
    const reductions = {};
    state.cart.forEach(item => {
        if (item.recipe && Array.isArray(item.recipe)) {
            item.recipe.forEach(ri => {
                const iId = ri.ingredientId || ri.ingredient_id;
                if (!reductions[iId]) reductions[iId] = 0;
                reductions[iId] += (ri.quantity * item.quantity);
            });
        }
    });

    let orderNote = document.getElementById('order-note') ? document.getElementById('order-note').value : '';
    
    // Append Pickup Time if scheduled
    const pickupSelect = document.getElementById('pickup-time-select');
    if (pickupSelect && pickupSelect.value !== 'asap') {
        let timeStr = '';
        if (pickupSelect.value === '15min') timeStr = 'Sau 15 phút';
        else if (pickupSelect.value === '30min') timeStr = 'Sau 30 phút';
        else if (pickupSelect.value === 'custom') {
            const d = document.getElementById('pickup-date').value;
            const t = document.getElementById('pickup-time').value;
            timeStr = `${t} (${d})`;
        }
        if (timeStr) {
            orderNote = `[Hẹn giờ lấy: ${timeStr}] ` + orderNote;
        }
    }
    const earnedPts = Math.floor(Math.max(0, totalPrice) / 1000);

    const orderData = {
        table_number: TABLE_NUMBER.toString(),
        session_id: sessionId,
        customer_phone: window.currentCustomerPhone,
        earned_points: earnedPts,
        items: formattedItems,
        reductions: reductions,
        total_price: Math.max(0, totalPrice),
        discount_code: state.appliedPromo ? state.appliedPromo.code : null,
        discount_amount: state.currentDiscountAmount,
        order_note: orderNote,
        is_paid: false,
        status: 'Pending',
        payment_method: method,
        payment_status: 'unpaid',
        tenant_id: state.tenantId
    };

    try {
        // STOCK PRE-CHECK
        const ingredientIds = [...new Set(
            state.cart.flatMap(item => (item.recipe || []).map(r => r.ingredientId || r.ingredient_id).filter(Boolean))
        )];
        if (ingredientIds.length > 0) {
            const { data: freshStock } = await supabase.from('ingredients').select('id, name, stock').eq('tenant_id', state.tenantId).in('id', ingredientIds);
            if (freshStock && freshStock.length > 0) {
                freshStock.forEach(i => { state.ingredientStock[i.id] = i.stock; });
                const outOfStockItems = [];
                for (const item of state.cart) {
                    const recipe = item.recipe || [];
                    for (const req of recipe) {
                        const ingrId = req.ingredientId || req.ingredient_id;
                        const needed = (req.quantity || req.amount || 0) * item.quantity;
                        const available = state.ingredientStock[ingrId] || 0;
                        if (needed > available) {
                            const ingrInfo = freshStock.find(i => i.id === ingrId);
                            outOfStockItems.push(`• ${item.name} (thiếu: ${ingrInfo?.name || 'nguyên liệu'})`);
                            break;
                        }
                    }
                }
                if (outOfStockItems.length > 0) {
                    resetCheckoutButtons();
                    renderMenu(getActiveCategory());
                    await customerAlert(`❌ Một số món đã hết nguyên liệu:\n${outOfStockItems.join('\n')}\n\nVui lòng cập nhật lại giỏ hàng.`);
                    return;
                }
            }
        }

        const { data: newOrderId, error } = await supabase.rpc('place_order_and_deduct_inventory', { payload: orderData });
        if (error) throw error;
        
        const savedOrder = { ...orderData, id: newOrderId, _id: newOrderId, createdAt: new Date().toISOString(), totalPrice: orderData.total_price, orderNote: orderData.order_note };
        
        if (method === 'transfer') {
            state.activeOrderId = savedOrder._id;
            state.trackedOrderId = savedOrder._id;
            state.sessionOrders.unshift(savedOrder);
            
            state.cart.length = 0;
            state.appliedPromo = null;
            state.currentDiscountAmount = 0;
            if(document.getElementById('promo-code-input')) document.getElementById('promo-code-input').value = '';
            if(document.getElementById('promo-message')) document.getElementById('promo-message').style.display = 'none';
            updateCartUI();
            
            if (gachaResults.length > 0 && typeof window.showSlotReveal === 'function') {
                await window.showSlotReveal(gachaResults);
            }
            
            openPaymentModal(savedOrder);
        } else {
            if (gachaResults.length > 0 && typeof window.showSlotReveal === 'function') {
                await window.showSlotReveal(gachaResults);
            }
            handleOrderConfirmed(savedOrder);
        }
        
        // Deduct loyalty points
        if (window.loyaltyDiscountApplied && window.currentCustomerPhone) {
            const ptsUsed = state.appliedPromo && state.appliedPromo.originalPointsUsed ? state.appliedPromo.originalPointsUsed : 100;
            supabase.from('customers').select('id, current_points').eq('tenant_id', state.tenantId).eq('phone', window.currentCustomerPhone).maybeSingle().then(({data: cust}) => {
                if (cust) {
                    supabase.from('customers').update({ current_points: Math.max(0, cust.current_points - ptsUsed) }).eq('tenant_id', state.tenantId).eq('id', cust.id).then(() => {
                        supabase.from('point_logs').insert([{
                            tenant_id: state.tenantId,
                            customer_id: cust.id,
                            amount: -ptsUsed,
                            reason: `Đổi ${ptsUsed} điểm lấy ${(ptsUsed*100).toLocaleString('vi-VN')}đ giảm giá cho đơn ` + savedOrder._id.substring(0,8)
                        }]).then();
                    });
                }
            });
        }
        
        // Increment discount used_count
        if (orderData.discount_code && orderData.discount_code !== 'LOYALTY_100' && !orderData.discount_code.startsWith('VIP ')) {
            supabase.from('discounts').select('id, used_count').eq('tenant_id', state.tenantId).eq('code', orderData.discount_code).maybeSingle().then(({data: dData}) => {
                if (dData) {
                    supabase.from('discounts').update({ used_count: (dData.used_count || 0) + 1 }).eq('tenant_id', state.tenantId).eq('id', dData.id).then();
                }
            });
        }
    } catch (error) {
        console.error("placeOrder ERROR:", error);
        resetCheckoutButtons();
        const errDetail = error.message || JSON.stringify(error) || 'Lỗi không xác định';
        window.showRetryToast('Xin lỗi, không thể tạo đơn hàng! Mã lỗi: ' + errDetail, 'error');
        fetchMenu();
    }
}

function resetCheckoutButtons() {
    const btnConfirmPayment = document.getElementById('confirm-payment-btn');
    if (btnConfirmPayment) {
        btnConfirmPayment.innerHTML = '<i class="fa-solid fa-check-circle"></i> Tôi đã chuyển khoản xong';
        btnConfirmPayment.disabled = false;
        btnConfirmPayment.classList.replace('btn-success', 'btn-primary');
    }
    if(dom.checkoutCashBtn) {
        dom.checkoutCashBtn.disabled = false;
        dom.checkoutCashBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Thanh toán tại quầy';
    }
    if(dom.checkoutTransferBtn) {
        dom.checkoutTransferBtn.disabled = false;
        dom.checkoutTransferBtn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Chuyển khoản (Duyệt TĐ)';
    }
}

// Handle confirmed order
export function handleOrderConfirmed(savedOrder) {
    savedOrder._id = savedOrder.id || savedOrder._id;
    state.cart.length = 0;
    state.appliedPromo = null;
    state.currentDiscountAmount = 0;
    if(document.getElementById('promo-code-input')) document.getElementById('promo-code-input').value = '';
    if(document.getElementById('promo-message')) document.getElementById('promo-message').style.display = 'none';
    
    updateCartUI();
    closeModal();
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal) paymentModal.classList.remove('active');
    
    resetCheckoutButtons();
    
    if (!state.sessionOrders.find(o => o.id === savedOrder._id || o._id === savedOrder._id)) {
        state.sessionOrders.unshift(savedOrder);
    }
    
    state.activeOrderId = savedOrder._id;
    state.trackedOrderId = savedOrder._id;
    dom.liveOrderBanner.style.display = 'block';
    
    document.getElementById('live-status').textContent = 'Chưa thanh toán';
    document.getElementById('live-status').className = 'text-danger banner-status';
    document.getElementById('live-status').style.color = '#e74c3c';
    document.querySelectorAll('.timeline-step').forEach(el => el.className = 'timeline-step');
    document.querySelectorAll('.timeline-line').forEach(el => el.className = 'timeline-line');
    document.getElementById('step-pending')?.classList.add('active');
}

// Cancel Order
window.cancelOrder = async (orderId) => {
    const confirmed = await customerConfirm('Hủy đơn hàng này?\nNguyên liệu sẽ được hoàn lại kho tự động.');
    if (!confirmed) return;
    try {
        const { data: orderRow } = await supabase.from('orders').select('items, status').eq('tenant_id', state.tenantId).eq('id', orderId).maybeSingle();
        if (!orderRow || orderRow.status !== 'Pending') {
            await customerAlert('Đơn hàng đang được xử lý, không thể hủy.');
            return;
        }
        const { error } = await supabase.from('orders').update({ status: 'Cancelled' }).eq('tenant_id', state.tenantId).eq('id', orderId);
        if (error) throw error;

        const items = orderRow.items || [];
        for (const item of items) {
            const recipe = item.recipe || [];
            if (!Array.isArray(recipe) || recipe.length === 0) continue;
            const qty = item.quantity || 1;
            for (const ingr of recipe) {
                const ingrId = ingr.ingredientId || ingr.ingredient_id || ingr.id;
                if (!ingrId) continue;
                const restoreAmt = (ingr.amount || ingr.quantity || 0) * qty;
                if (restoreAmt <= 0) continue;
                const { data: cur } = await supabase.from('ingredients').select('stock').eq('tenant_id', state.tenantId).eq('id', ingrId).maybeSingle();
                if (cur) await supabase.from('ingredients').update({ stock: (cur.stock || 0) + restoreAmt }).eq('tenant_id', state.tenantId).eq('id', ingrId);
            }
        }

        const idx = state.sessionOrders.findIndex(o => o._id === orderId || o.id === orderId);
        if (idx > -1) { state.sessionOrders[idx].status = 'Cancelled'; }
        renderHistoryModal();
        await customerAlert('Đã hủy đơn hàng thành công.');
    } catch (e) {
        console.error('Cancel order error', e);
        await customerAlert('Lỗi khi hủy đơn hàng. Vui lòng thử lại.');
    }
};

// Render History Modal
export function renderHistoryModal() {
    if (state.sessionOrders.length === 0) {
        dom.historyItemsContainer.innerHTML = '<div class="empty-cart text-center text-muted mt-4">Bạn chưa đặt đơn hàng nào trong phiên này.</div>';
        return;
    }

    dom.historyItemsContainer.innerHTML = '';
    state.sessionOrders.forEach(order => {
        const orderTime = new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        let itemsHtml = order.items.map(i => `
            <li style="display: flex; justify-content: space-between; font-size: 0.9rem; padding: 4px 0; border-bottom: 1px dashed var(--border);">
                <div>
                    <div>${i.quantity}x ${window.escapeHTML(i.name)}</div>
                    ${i.selectedOptions && i.selectedOptions.length > 0 ? 
                        `<div style="font-size: 0.75rem; color: #888; padding-left: 15px;">+${i.selectedOptions.map(o => window.escapeHTML(o.choiceName)).join(', +')}</div>` 
                        : ''}
                    ${i.note ? `<div style="font-size:0.73rem;color:#D97531;padding-left:15px;"><i class="fa-solid fa-pen-to-square" style="font-size:9px;margin-right:3px"></i>${window.escapeHTML(i.note)}</div>` : ''}
                </div>
                <span>${((i.price + (i.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0)) * i.quantity).toLocaleString('vi-VN')} đ</span>
            </li>
        `).join('');

        const stAttr = statusMap[order.status] || { text: order.status, class: 'text-muted' };

        const card = document.createElement('div');
        card.className = 'order-card';
        card.style.marginBottom = '16px';
        card.style.borderLeftColor = stAttr.color || (order.status === 'Cancelled' ? 'var(--danger)' : order.status === 'Completed' ? '#8b949e' : 'var(--primary)');
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="order-time"><i class="fa-regular fa-clock"></i> ${orderTime}</span>
                <span style="${stAttr.color ? "color: " + stAttr.color + ";" : ""}" class="${stAttr.class}">${stAttr.text}</span>
            </div>
            <ul style="list-style: none; padding: 0; margin-bottom: 12px;">
                ${itemsHtml}
            </ul>
            <div style="text-align: right; font-weight: 700; color: var(--primary);">
                Tổng: ${order.totalPrice.toLocaleString('vi-VN')} đ
            </div>
            ${order.orderNote ? `<div class="mt-2 text-muted" style="font-size: 0.85rem; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;"><i>Ghi chú: ${window.escapeHTML(order.orderNote)}</i></div>` : ''}
            ${order.status === 'Pending' ? `<div style="text-align: right; margin-top: 10px;"><button class="btn btn-sm btn-outline text-danger" style="border-color: var(--danger);" onclick="cancelOrder('${order._id}')">Hủy đơn</button></div>` : ''}
        `;
        dom.historyItemsContainer.appendChild(card);
    });
}

// Handle real-time status updates (global handler)
function playNotificationSound(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch(e) {}
}

// Push Notification Helper
function sendPushNotification(title, body) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
                try {
                    registration.showNotification(title, {
                        body: body,
                        icon: '/images/bunny_logo.png',
                        vibrate: [200, 100, 200, 100, 200],
                        badge: '/images/bunny_logo.png'
                    });
                } catch(e) {
                    new Notification(title, { body: body, icon: '/images/bunny_logo.png' });
                }
            });
        } else {
            new Notification(title, {
                body: body,
                icon: '/images/bunny_logo.png'
            });
        }
    }
}

window.handleOrderStatusUpdate = function(updatedOrderData) {
    const updatedOrder = {
        ...updatedOrderData, 
        _id: updatedOrderData.id, 
        createdAt: updatedOrderData.created_at,
        totalPrice: updatedOrderData.total_price,
        orderNote: updatedOrderData.order_note
    };

    const histIdx = state.sessionOrders.findIndex(o => o._id === updatedOrder._id);
    if(histIdx > -1) {
        state.sessionOrders[histIdx] = updatedOrder;
        const histModalRef = document.getElementById('order-history-modal');
        if(histModalRef && histModalRef.classList.contains('active')) {
            renderHistoryModal();
        }
    }

    // Trigger Push Notifications
    if (updatedOrder.status === 'Cancelled') {
        playNotificationSound('error');
        customerAlert(`❌ Đơn hàng của bạn đã bị Hủy. Bạn có thể đặt món mới!`);
        renderMenu(getActiveCategory());
        sendPushNotification('Đơn hàng đã bị hủy ❌', 'Đơn hàng của bạn đã bị hủy. Bạn có thể đặt lại món mới.');
    } else if (updatedOrder.status === 'Preparing') {
        const estMins = updatedOrder.estimated_minutes;
        const timeText = estMins ? `Khoảng ${estMins} phút nữa sẽ xong.` : 'Bếp đang chuẩn bị món cho bạn.';
        sendPushNotification('Đơn hàng đang làm 👨‍🍳', timeText);
    } else if (updatedOrder.status === 'Ready') {
        playNotificationSound('success');
        sendPushNotification('Đồ uống đã sẵn sàng! ☕', 'Mời bạn tới quầy nhận đồ uống nhé!');
    }

    if (state.trackedOrderId === updatedOrder._id) {
        const liveStatusEl = document.getElementById('live-status');
        if (!liveStatusEl) return;
        
        if (updatedOrder.status === 'Pending') {
            if (updatedOrder.is_paid) {
                liveStatusEl.textContent = 'Đã thanh toán (Chờ bếp làm)';
                liveStatusEl.className = 'text-primary font-bold banner-status';
                liveStatusEl.style.color = '#3498db';
            } else {
                liveStatusEl.textContent = 'Chưa thanh toán (Chờ xác nhận)';
                liveStatusEl.className = 'text-danger font-bold banner-status';
                liveStatusEl.style.color = '#e74c3c';
            }
        }
        
        if (updatedOrder.status === 'Preparing') {
            const estMins = updatedOrder.estimated_minutes;
            liveStatusEl.textContent = estMins ? `Đang làm — khoảng ${estMins} phút` : 'Đang làm';
            liveStatusEl.className = 'text-warning banner-status';
            
            document.getElementById('step-pending')?.classList.replace('active', 'completed');
            document.getElementById('line-1')?.classList.add('active');
            document.getElementById('step-preparing')?.classList.add('active');
            
            if (state.activeOrderId === updatedOrder._id) {
                state.activeOrderId = null;
                playNotificationSound('success');
                customerAlert(`Bếp đã nhận đơn và đang làm món! Bạn có thể tiếp tục đặt thêm.`);
                renderMenu(getActiveCategory());
            }
            
        } else if (updatedOrder.status === 'Ready') {
            liveStatusEl.textContent = 'Đã xong';
            liveStatusEl.className = 'text-success banner-status';
            
            document.getElementById('step-preparing')?.classList.replace('active', 'completed');
            document.getElementById('line-1')?.classList.add('completed');
            document.getElementById('line-2')?.classList.add('active');
            document.getElementById('step-ready')?.classList.add('active');
            
        } else if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
            if (state.activeOrderId === updatedOrder._id) {
                state.activeOrderId = null;
                renderMenu(getActiveCategory());
            }
            if (state.trackedOrderId === updatedOrder._id) {
                if(updatedOrder.status === 'Completed') {
                    liveStatusEl.textContent = 'Hoàn thành';
                    liveStatusEl.className = 'text-muted banner-status';
                    
                    document.getElementById('step-ready')?.classList.replace('active', 'completed');
                    document.getElementById('line-2')?.classList.add('completed');
                    
                    const bannerContent = document.querySelector('#live-order-banner .banner-content');
                    if (bannerContent && !bannerContent.querySelector('.feedback-btn-container')) {
                        const feedbackHtml = `
                            <div class="feedback-btn-container mt-3" style="display: flex; gap: 8px; justify-content: center; width: 100%;">
                                <button class="btn btn-sm btn-primary" onclick="currentFeedbackOrderId='${updatedOrder._id}'; showFeedbackModal()" style="flex: 1;"><i class="fa-solid fa-star me-2"></i>Đánh giá Trải nghiệm</button>
                            </div>
                        `;
                        bannerContent.insertAdjacentHTML('beforeend', feedbackHtml);
                    }
                    state.currentFeedbackOrderId = updatedOrder._id;
                    import('./customer-feedback.js').then(m => m.checkAndShowFeedback(updatedOrder));
                } else {
                    state.trackedOrderId = null;
                    dom.liveOrderBanner.style.display = 'none';
                }
            }
        }
    }
};
