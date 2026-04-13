// =============================================
// ADMIN-INVENTORY — Inventory & Restock Management
// =============================================
// Dependencies: admin-core.js (ingredients, inventoryTableBody, ingredientModalInstance,
//               customConfirm, logAudit, showAdminToast, supabase, createRestockModalInstance)

async function fetchIngredients() {
    try {
        const { data, error } = await supabase.from('ingredients').select('*').eq('tenant_id', window.AdminState.tenantId).order('name');
        if (error) throw error;

        // Calculate Burn Rate over the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: logsData } = await supabase
            .from('inventory_logs')
            .select('ingredient_id, amount')
            .eq('tenant_id', window.AdminState.tenantId)
            .eq('change_type', 'deduction')
            .gte('created_at', sevenDaysAgo.toISOString());
            
        const burnMap = {};
        if (logsData) {
            logsData.forEach(log => {
                if (!burnMap[log.ingredient_id]) burnMap[log.ingredient_id] = 0;
                burnMap[log.ingredient_id] += Math.abs(log.amount);
            });
        }

        ingredients = data.map(i => ({
            ...i,
            _id: i.id,
            lowStockThreshold: i.low_stock_threshold,
            dailyBurnRate: burnMap[i.id] ? (burnMap[i.id] / 7) : 0
        }));
        renderIngredients();
    } catch (error) {
        console.error(error);
        inventoryTableBody.replaceChildren();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.className = 'text-danger text-center';
        td.textContent = 'Lỗi tải dữ liệu kho.';
        tr.appendChild(td);
        inventoryTableBody.appendChild(tr);
    }
}

function renderIngredients() {
    if (!inventoryTableBody) return;
    inventoryTableBody.replaceChildren();

    if (ingredients.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.className = 'text-center py-4 text-muted';
        td.textContent = 'Chưa có nguyên liệu nào.';
        tr.appendChild(td);
        inventoryTableBody.appendChild(tr);
    } else {
        ingredients.forEach(i => {
            const tr = document.createElement('tr');
            const isLow = i.stock <= (i.lowStockThreshold || 50);

            const tdName = document.createElement('td');
            const strong = document.createElement('strong');
            strong.textContent = i.name;
            tdName.appendChild(strong);
            if (isLow) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-danger ms-2';
                badge.style.fontSize = '0.7em';
                badge.textContent = 'Sắp hết';
                tdName.appendChild(badge);
            }

            const tdStock = document.createElement('td');
            tdStock.className = isLow ? 'text-danger font-bold align-middle' : 'align-middle';
            
            let stockHtml = `<span>${i.stock}</span>`;
            if (i.dailyBurnRate > 0) {
                const daysLeft = Math.floor(i.stock / i.dailyBurnRate);
                let colorClass = 'text-green-600 dark:text-green-500';
                if (daysLeft < 3) colorClass = 'text-red-600 dark:text-red-500 font-extrabold';
                else if (daysLeft <= 7) colorClass = 'text-yellow-600 dark:text-yellow-500';
                stockHtml += `<div class="text-xs mt-1.5 p-1.5 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 w-max"><i class="fa-solid fa-fire text-[#D97531] mr-1"></i>Tiêu dùng ~${i.dailyBurnRate.toFixed(1)}/ngày<br><span class="${colorClass} ml-4">&rarr; Dự kiến còn <b>${daysLeft}</b> ngày</span></div>`;
            } else {
                stockHtml += `<div class="text-[0.65rem] text-stone-400 mt-1 italic w-max px-1.5 py-0.5 border border-dashed border-stone-200 dark:border-stone-700 rounded">Không đủ DL tiêu thụ 7 ngày qua</div>`;
            }
            tdStock.innerHTML = stockHtml;

            const tdUnit = document.createElement('td');
            tdUnit.textContent = i.unit;

            const tdAction = document.createElement('td');
            tdAction.className = 'text-end';

            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn me-2 needs-inventory-edit';
            const editIcon = document.createElement('i');
            editIcon.className = 'fa-solid fa-pen-to-square';
            editBtn.appendChild(editIcon);
            editBtn.onclick = () => openIngredientModal(i._id);

            const delBtn = document.createElement('button');
            delBtn.className = 'action-btn delete needs-inventory-edit';
            const delIcon = document.createElement('i');
            delIcon.className = 'fa-solid fa-trash';
            delBtn.appendChild(delIcon);
            delBtn.onclick = () => deleteIngredient(i._id, i.stock);

            tdAction.append(editBtn, delBtn);
            tr.append(tdName, tdStock, tdUnit, tdAction);
            inventoryTableBody.appendChild(tr);
        });
    }

    renderIngredientAlerts();
}

function renderIngredientAlerts() {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;

    const lowStockItems = ingredients.filter(i => i.stock <= (i.lowStockThreshold || 50));

    if (lowStockItems.length > 0) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-warning alert-dismissible fade show';
        alertDiv.role = 'alert';
        alertDiv.style.backgroundColor = 'rgba(255, 193, 7, 0.12)';
        alertDiv.style.color = '#92600a';
        alertDiv.style.borderColor = 'rgba(255, 193, 7, 0.35)';

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-triangle-exclamation me-2';

        const msgStrong = document.createElement('strong');
        msgStrong.textContent = 'Cảnh báo kho:';

        const msgText = document.createTextNode(' Các nguyên liệu sau sắp hết: ');

        const itemsSpan = document.createElement('span');
        lowStockItems.forEach((i, idx) => {
            const s = document.createElement('strong');
            s.textContent = i.name;
            itemsSpan.appendChild(s);
            itemsSpan.append(` (còn ${i.stock} ${i.unit})`);
            if (idx < lowStockItems.length - 1) itemsSpan.append(', ');
        });

        const footText = document.createTextNode('. Vui lòng nhập thêm hàng.');

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('data-bs-dismiss', 'alert');
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.style.filter = 'invert(1) grayscale(100%) brightness(200%)';

        alertDiv.append(icon, msgStrong, msgText, itemsSpan, footText, closeBtn);
        alertsContainer.replaceChildren(alertDiv);
    } else {
        alertsContainer.replaceChildren();
    }
}

function openIngredientModal(ingredientId = null) {
    const isEditing = ingredientId !== null;
    document.getElementById('ingredientModalLabel').textContent = isEditing ? 'Sửa Nguyên Liệu' : 'Thêm Nguyên Liệu';

    if (isEditing) {
        const ingredient = ingredients.find(i => String(i._id) === String(ingredientId));
        if (ingredient) {
            document.getElementById('ingId').value = ingredient._id;
            document.getElementById('ingName').value = ingredient.name;
            document.getElementById('ingUnit').value = ingredient.unit;
            document.getElementById('ingStock').value = ingredient.stock;
            document.getElementById('ingOldStock').value = ingredient.stock;
            document.getElementById('ingThreshold').value = ingredient.lowStockThreshold || 50;
            if(document.getElementById('ingCostPrice')) {
                document.getElementById('ingCostPrice').value = ingredient.cost_price || '';
            }
            if(document.getElementById('ingSupplierName')) {
                document.getElementById('ingSupplierName').value = ingredient.supplier_name || '';
            }
        }
    } else {
        document.getElementById('ingredientForm').reset();
        document.getElementById('ingId').value = '';
        if(document.getElementById('ingOldStock')) document.getElementById('ingOldStock').value = '0';
        document.getElementById('ingStock').value = '0';
        document.getElementById('ingThreshold').value = '50';
        if(document.getElementById('ingCostPrice')) document.getElementById('ingCostPrice').value = '';
        if(document.getElementById('ingSupplierName')) document.getElementById('ingSupplierName').value = '';
    }

    ingredientModalInstance.show();
}

async function saveIngredient() {
    const id = document.getElementById('ingId').value;
    const name = document.getElementById('ingName').value.trim();
    const unit = document.getElementById('ingUnit').value.trim();
    const stock = parseFloat(document.getElementById('ingStock').value) || 0;
    const oldStock = document.getElementById('ingOldStock') ? (parseFloat(document.getElementById('ingOldStock').value) || 0) : 0;
    const lowStockThreshold = parseFloat(document.getElementById('ingThreshold').value) || 50;
    const costPrice = document.getElementById('ingCostPrice') ? (parseFloat(document.getElementById('ingCostPrice').value) || 0) : 0;
    const supplierName = document.getElementById('ingSupplierName') ? document.getElementById('ingSupplierName').value.trim() : null;

    if (!name || !unit) {
        showAdminToast("Vui lòng nhập tên và đơn vị!", 'warning');
        return;
    }

    const payload = {
        name,
        unit,
        stock,
        low_stock_threshold: lowStockThreshold,
        cost_price: costPrice
    };
    if (supplierName !== null) payload.supplier_name = supplierName;

    try {
        if (id) {
            const { error } = await supabase.from('ingredients').update(payload).eq('id', id).eq('tenant_id', window.AdminState.tenantId);
            if (error) throw error;

            if (stock !== oldStock) {
                const diff = stock - oldStock;
                const changeType = diff > 0 ? 'restock' : 'adjustment';
                await supabase.from('inventory_logs').insert([{
                    tenant_id: window.AdminState.tenantId,
                    ingredient_id: id,
                    change_type: changeType,
                    amount: Math.abs(diff),
                    previous_stock: oldStock,
                    new_stock: stock,
                    reason: 'Cập nhật thủ công từ Dashboard'
                }]);
            }
        } else {
            payload.tenant_id = window.AdminState.tenantId;
            const { data, error } = await supabase.from('ingredients').insert([payload]).select();
            if (error) throw error;

            if (stock > 0 && data && data.length > 0) {
                await supabase.from('inventory_logs').insert([{
                    tenant_id: window.AdminState.tenantId,
                    ingredient_id: data[0].id,
                    change_type: 'restock',
                    amount: stock,
                    previous_stock: 0,
                    new_stock: stock,
                    reason: 'Khởi tạo nguyên liệu mới'
                }]);
            }
        }

        ingredientModalInstance.hide();
        fetchIngredients();
    } catch (e) {
        console.error(e);
        showAdminToast("Lưu thất bại.", 'error');
    }
}

async function deleteIngredient(id, stock) {
    const msg = stock > 0
        ? `Nguyên liệu này còn ${stock} đơn vị trong kho. Bạn có chắc chắn muốn xóa không? Hành động này không thể hoàn tác và sẽ ảnh hưởng đến các công thức liên kết.`
        : 'Xóa nguyên liệu này?';
    const title = stock > 0 ? 'Cảnh báo: Còn Hàng Trong Kho' : 'Xóa Nguyên Liệu';
    const confirmed = await customConfirm(msg, title);
    if (!confirmed) return;
    try {
        const { error } = await supabase.from('ingredients').delete().eq('id', id).eq('tenant_id', window.AdminState.tenantId);
        if (error) throw error;
        fetchIngredients();
    } catch (e) {
        console.error(e);
        showAdminToast("Lỗi kết nối.", 'error');
    }
}

// --- Restock Management ---
async function loadRestockLogs() {
    try {
        const tbody = document.getElementById('restock-logs-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-500"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải dữ liệu...</td></tr>';

        const { data, error } = await supabase.from('inventory_logs')
            .select('*, ingredients(name, unit)')
            .eq('tenant_id', window.AdminState.tenantId)
            .eq('change_type', 'restock')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        renderRestockLogs(data);
    } catch (e) {
        console.error(e);
        const tbody = document.getElementById('restock-logs-table-body');
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-danger">Lỗi tải dữ liệu.</td></tr>';
    }
}

function renderRestockLogs(logs) {
    const tbody = document.getElementById('restock-logs-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500">Chưa có lịch sử nhập hàng nào.</td></tr>';
        return;
    }

    const groupedLogs = {};
    logs.forEach(log => {
        const timeKey = new Date(log.created_at).toISOString().substring(0, 16);
        const reasonKey = log.reason || 'Không có ghi chú';
        const key = timeKey + '|' + reasonKey;

        if (!groupedLogs[key]) {
            groupedLogs[key] = { id: log.id, time: log.created_at, note: log.reason, items: [] };
        }
        groupedLogs[key].items.push({
            name: log.ingredients ? log.ingredients.name : 'Unknown',
            amount: log.amount,
            unit: log.ingredients ? log.ingredients.unit : '',
            unit_price: log.unit_price || 0
        });
    });

    Object.values(groupedLogs).sort((a,b) => new Date(b.time) - new Date(a.time)).forEach(group => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-200 hover:bg-[#2A271D] transition-colors';

        const timeStr = new Date(group.time).toLocaleString('vi-VN');
        const itemsHtml = group.items.map(i => {
            const priceTag = i.unit_price > 0 ? ` <span class="text-slate-500 text-[10px]">(${i.unit_price.toLocaleString('vi-VN')}đ/${i.unit})</span>` : '';
            return `<span class="badge bg-[#e2e8f0] text-slate-800 border border-[#64748b] border-opacity-25 me-1 mb-1">+${i.amount} ${i.unit} ${i.name}${priceTag}</span>`;
        }).join('');
        const totalCost = group.items.reduce((sum, i) => sum + (i.unit_price * i.amount), 0);
        const totalCostHtml = totalCost > 0 ? `<span class="text-[#b45309] font-bold">${totalCost.toLocaleString('vi-VN')}đ</span>` : '<span class="text-slate-500">-</span>';

        tr.innerHTML = `
            <td class="text-slate-500 font-mono text-xs">#${group.id.substring(0,8)}</td>
            <td class="text-slate-800 text-sm">${timeStr}</td>
            <td class="max-w-xs flex-wrap gap-1">${itemsHtml}</td>
            <td class="text-end">${totalCostHtml}</td>
            <td class="text-slate-500 text-sm italic">${group.note || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openCreateRestockModal() {
    if (!createRestockModalInstance) {
        createRestockModalInstance = new bootstrap.Modal(document.getElementById('createRestockModal'));
    }
    document.getElementById('createRestockForm').reset();
    document.getElementById('restock-items-container').innerHTML = '';

    if (ingredients.length === 0) {
        fetchIngredients().then(() => {
            updateRestockEmptyState();
            createRestockModalInstance.show();
        });
    } else {
        updateRestockEmptyState();
        createRestockModalInstance.show();
    }
}

function updateRestockEmptyState() {
    const container = document.getElementById('restock-items-container');
    const emptyState = document.getElementById('restock-empty-state');
    if (container.children.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

function addRestockItemRow() {
    const container = document.getElementById('restock-items-container');
    const tr = document.createElement('tr');
    tr.className = 'restock-item-row border-b border-slate-200 border-opacity-50';

    let optionsHtml = '<option value="">-- Chọn nguyên liệu --</option>';
    ingredients.forEach(ing => {
        optionsHtml += `<option value="${ing._id}" data-unit="${ing.unit}" data-stock="${ing.stock}">${ing.name} (Tồn hiện tại: ${ing.stock} ${ing.unit})</option>`;
    });

    tr.innerHTML = `
        <td class="py-2 pe-2">
            <select class="form-select form-select-sm bg-slate-100 text-slate-800 border-slate-200 restock-ing-select" required>
                ${optionsHtml}
            </select>
        </td>
        <td class="py-2 px-2">
            <div class="input-group input-group-sm">
                <input type="number" class="form-control bg-slate-100 text-slate-800 border-slate-200 restock-amount-input" placeholder="0" required min="0.1" step="any">
                <span class="input-group-text bg-[#e2e8f0] text-slate-500 border-slate-200 restock-unit-display">-</span>
            </div>
        </td>
        <td class="py-2 px-2">
            <div class="input-group input-group-sm">
                <input type="number" class="form-control bg-slate-100 text-slate-800 border-slate-200 restock-price-input" placeholder="0" min="0" step="any">
                <span class="input-group-text bg-[#e2e8f0] text-slate-500 border-slate-200">đ</span>
            </div>
        </td>
        <td class="py-2 ps-2 text-end">
            <button type="button" class="btn btn-sm btn-outline-danger border-0 rounded-lg w-8 h-8 flex items-center justify-center p-0" onclick="removeRestockItemRow(this)">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;

    const select = tr.querySelector('.restock-ing-select');
    const unitDisplay = tr.querySelector('.restock-unit-display');
    select.addEventListener('change', function() {
        const option = this.options[this.selectedIndex];
        unitDisplay.textContent = option.dataset.unit || '-';
    });

    container.appendChild(tr);
    updateRestockEmptyState();
}

function removeRestockItemRow(btn) {
    btn.closest('tr').remove();
    updateRestockEmptyState();
}

async function submitRestockTicket() {
    const note = document.getElementById('restockNote').value.trim();
    const rows = document.querySelectorAll('.restock-item-row');

    if (rows.length === 0) {
        showAdminToast("Giỏ nhập kho đang trống! Vui lòng thêm ít nhất một nguyên liệu.", 'warning');
        return;
    }

    const restockItems = [];
    let hasError = false;

    rows.forEach(row => {
        const select = row.querySelector('.restock-ing-select');
        const amountInput = row.querySelector('.restock-amount-input');

        const ingId = select.value;
        const amount = parseFloat(amountInput.value);

        if (!ingId) { hasError = true; select.classList.add('border-danger'); }
        else { select.classList.remove('border-danger'); }

        if (isNaN(amount) || amount <= 0) { hasError = true; amountInput.classList.add('border-danger'); }
        else { amountInput.classList.remove('border-danger'); }

        if (ingId && amount > 0) {
            const currentStock = parseFloat(select.options[select.selectedIndex].dataset.stock) || 0;
            const priceInput = row.querySelector('.restock-price-input');
            const unitPrice = parseFloat(priceInput ? priceInput.value : 0) || 0;
            restockItems.push({ ingredient_id: ingId, amount, current_stock: currentStock, unit_price: unitPrice });
        }
    });

    if (hasError) {
        showAdminToast("Vui lòng kiểm tra lại thông tin nguyên liệu và số lượng nhập.", 'warning');
        return;
    }

    createRestockModalInstance.hide();
    await new Promise(resolve => {
        document.getElementById('createRestockModal').addEventListener('hidden.bs.modal', resolve, { once: true });
    });

    const conf = await customConfirm(`Bạn chắc chắn muốn nhập ${restockItems.length} loại nguyên liệu vào kho?`, "Xác nhận Nhập Kho");
    if (!conf) {
        createRestockModalInstance.show();
        return;
    }

    try {
        const btn = document.getElementById('saveRestockBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Đang xử lý...';

        const updates = [];
        const logs = [];
        const reason = note || 'Phiếu nhập kho gộp';

        for (const item of restockItems) {
            const newStock = item.current_stock + item.amount;
            updates.push(supabase.from('ingredients').update({ stock: newStock }).eq('id', item.ingredient_id).eq('tenant_id', window.AdminState.tenantId));
            logs.push({
                tenant_id: window.AdminState.tenantId,
                ingredient_id: item.ingredient_id,
                change_type: 'restock',
                amount: item.amount,
                previous_stock: item.current_stock,
                new_stock: newStock,
                reason: reason,
                unit_price: item.unit_price
            });
        }

        await Promise.all(updates);
        const { error: logErr } = await supabase.from('inventory_logs').insert(logs);
        if (logErr) throw logErr;

        logAudit('Quản lý Kho', `Tạo phiếu nhập kho cho ${restockItems.length} nguyên liệu. Ghi chú: ${reason}`);

        fetchIngredients();
        loadRestockLogs();

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = 'Hoàn thành Phiếu Nhập';
        }, 500);
    } catch (e) {
        console.error(e);
        showAdminToast("Có lỗi xảy ra khi nhập kho: " + e.message, 'error');
        const btn = document.getElementById('saveRestockBtn');
        btn.disabled = false;
        btn.innerHTML = 'Hoàn thành Phiếu Nhập';
    }
}

// --- Export Inventory Excel ---
window.exportInventoryExcel = async function() {
    if (typeof XLSX === 'undefined') {
        showAdminToast('Thư viện xuất Excel chưa sẵn sàng.', 'warning');
        return;
    }
    const { data } = await supabase.from('ingredients').select('*').eq('tenant_id', window.AdminState.tenantId).order('name');
    if (!data || data.length === 0) return showAdminToast('Không có dữ liệu kho!', 'warning');

    const rows = data.map(i => ({
        'Tên Nguyên Liệu': i.name,
        'Tồn Kho': i.stock,
        'Đơn Vị': i.unit,
        'Mức Tối Thiểu': i.min_stock,
        'Trạng Thái': i.stock <= (i.min_stock || 0) ? 'SẮP HẾT' : 'Đủ hàng'
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ton Kho");
    XLSX.writeFile(wb, `ton_kho_${dateStr}.xlsx`);
};

// --- Low Stock Alert (Dashboard) ---
async function checkLowStock() {
    try {
        const { data } = await supabase
            .from('ingredients')
            .select('name, stock, min_stock')
            .eq('tenant_id', window.AdminState.tenantId)
            .gt('min_stock', 0);

        if (!data) return;
        const lowItems = data.filter(i => i.stock <= i.min_stock);

        const inventoryTab = document.getElementById('tab-inventory');
        const existingBadge = inventoryTab?.querySelector('.low-stock-badge');
        if (existingBadge) existingBadge.remove();

        if (lowItems.length > 0 && inventoryTab) {
            const badge = document.createElement('span');
            badge.className = 'low-stock-badge ms-auto badge rounded-pill bg-danger text-white text-xs';
            badge.textContent = lowItems.length;
            inventoryTab.appendChild(badge);

            const lastWarn = sessionStorage.getItem('lowstock_warned');
            if (!lastWarn) {
                sessionStorage.setItem('lowstock_warned', '1');
                showAdminToast(`⚠️ ${lowItems.length} nguyên liệu sắp hết: ${lowItems.map(i=>i.name).slice(0,3).join(', ')}${lowItems.length > 3 ? '...' : ''}`, 'warning', 8000);
            }
        }
    } catch(e) { console.error('Low stock check error:', e); }
}

window.exportInventoryLogsExcel = async function() {
    if (typeof XLSX === 'undefined') {
        showAdminToast('Thư viện xuất Excel chưa sẵn sàng.', 'warning');
        return;
    }
    try {
        const { data: logs, error } = await supabase.from('inventory_logs')
            .select('*, ingredients(name, unit)')
            .eq('tenant_id', window.AdminState.tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!logs || logs.length === 0) { showAdminToast('Không có dữ liệu log kho nào!', 'warning'); return; }

        const typeMap = { deduction: 'Xuất (Bán)', restock: 'Nhập', spoilage: 'Hư hỏng', adjustment: 'Kiểm kho' };
        
        const rows = logs.map(l => {
            const date = new Date(l.created_at).toLocaleString('vi-VN');
            const ingName = l.ingredients ? l.ingredients.name : 'Unknown';
            const unit = l.ingredients ? l.ingredients.unit : '';
            const type = typeMap[l.change_type] || l.change_type;
            const prefix = l.amount > 0 ? '+' : '';
            
            return {
                'Thời gian': date,
                'Tên nguyên liệu': ingName,
                'Loại': type,
                'Khối lượng thay đổi': `${prefix}${l.amount} ${unit}`,
                'Tồn cũ': l.previous_stock,
                'Tồn mới': l.new_stock,
                'Chi tiết': l.reason || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Lich Su Kho");
        XLSX.writeFile(wb, `inventory_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error(e);
        showAdminToast('Lỗi xuất dữ liệu kho!', 'error');
    }
}
