let products = [];
let orderHistory = [];
let ingredients = [];
let discounts = [];
let productModalInstance;
let ingredientModalInstance;
let promoModalInstance;
let confirmModalInstance;
const authHeaders = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('cafe_token') });

// DOM Elements (Initialized in DOMContentLoaded to prevent null errors)
let productsTableBody, historyTableBody, inventoryTableBody, totalRevenueEl;

// Custom confirm dialog (replaces native confirm() which can be blocked by browsers)
function customConfirm(message, title = 'Xác nhận') {
    return new Promise((resolve) => {
        if (!confirmModalInstance) {
            confirmModalInstance = new bootstrap.Modal(document.getElementById('confirmModal'));
        }
        document.getElementById('confirmModalTitle').textContent = title;
        // If we really need the icon, we should use a separate element or a safer approach
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-triangle-exclamation text-warning me-2';
        document.getElementById('confirmModalTitle').prepend(icon);
        document.getElementById('confirmModalBody').textContent = message;

        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');

        // Remove old listeners to prevent stacking
        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        document.getElementById('confirmModalOk').addEventListener('click', () => {
            confirmModalInstance.hide();
            resolve(true);
        }, { once: true });

        document.getElementById('confirmModalCancel').addEventListener('click', () => {
            resolve(false);
        }, { once: true });

        document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
            resolve(false);
        }, { once: true });

        confirmModalInstance.show();
    });
}



// Initialize
document.addEventListener('DOMContentLoaded', () => {
    productsTableBody = document.getElementById('products-table-body');
    historyTableBody = document.getElementById('history-table-body');
    inventoryTableBody = document.getElementById('inventory-table-body');
    totalRevenueEl = document.getElementById('total-revenue');

    productModalInstance = new bootstrap.Modal(document.getElementById('productModal'));
    ingredientModalInstance = new bootstrap.Modal(document.getElementById('ingredientModal'));
    promoModalInstance = new bootstrap.Modal(document.getElementById('promoModal'));
    // Load initial data
    fetchProducts();
    fetchHistory();
    fetchIngredients();
});

// const socket = io(); // REMOVED FOR SUPABASE



// --- Tab Switching Logic ---
function switchTab(tabId) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    // Show selected section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`section-${tabId}`).classList.add('active');

    // Fetch data if needed
    if (tabId === 'history' || tabId === 'analytics') {
        fetchHistory();
        if (tabId === 'analytics') fetchFeedbackStats();
    } else if (tabId === 'tables') {
        fetchTablesStatus();
    } else if (tabId === 'inventory') {
        fetchIngredients();
    } else if (tabId === 'promo') {
        fetchDiscounts();
    } else {
        fetchProducts();
    }
}

// --- Menu Management ---

async function fetchProducts() {
    try {
        // In admin, we fetch all products (even unavailable)
        const { data, error } = await supabase.from('products').select('*').order('name');
        if (error) throw error;
        
        // Map data to maintain frontend compatibility
        products = data.map(p => ({
            ...p,
            _id: p.id,
            imageUrl: p.image_url,
            isAvailable: p.is_available,
            isBestSeller: p.is_best_seller
        }));
        renderProductsTable();
    } catch (error) {
        console.error(error);
        productsTableBody.replaceChildren();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'text-danger text-center';
        td.textContent = 'Không tải được thực đơn.';
        tr.appendChild(td);
        productsTableBody.appendChild(tr);
    }
}

function renderProductsTable() {
    productsTableBody.replaceChildren();
    
    if (products.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'text-muted text-center py-4';
        td.textContent = 'Chưa có món nào. Hãy thêm món mới!';
        tr.appendChild(td);
        productsTableBody.appendChild(tr);
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        const imgUrl = p.imageUrl || 'https://via.placeholder.com/50?text=No+Img';
        const isAvail = p.isAvailable !== false;
        
        // Image Cell
        const tdImg = document.createElement('td');
        const img = document.createElement('img');
        img.src = imgUrl;
        img.className = 'table-avatar';
        img.alt = p.name;
        tdImg.appendChild(img);
        
        // Info Cell
        const tdInfo = document.createElement('td');
        tdInfo.className = 'product-info-cell';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'fw-bold';
        nameSpan.textContent = p.name;
        const br = document.createElement('br');
        const descSmall = document.createElement('small');
        descSmall.className = 'text-muted fw-normal';
        descSmall.textContent = p.description || '';
        tdInfo.append(nameSpan, br, descSmall);
        
        // Category Cell
        const tdCat = document.createElement('td');
        const catBadge = document.createElement('span');
        catBadge.className = 'badge bg-secondary';
        catBadge.textContent = p.category;
        tdCat.appendChild(catBadge);
        
        // Price Cell
        const tdPrice = document.createElement('td');
        tdPrice.className = 'text-primary fw-bold';
        tdPrice.textContent = `${p.price.toLocaleString('vi-VN')} đ`;
        
        // Status Cell
        const tdStatus = document.createElement('td');
        tdStatus.className = 'status-cell';
        const statusBadge = document.createElement('span');
        statusBadge.className = isAvail ? 'badge bg-success' : 'badge bg-danger';
        statusBadge.textContent = isAvail ? 'Hoạt động' : 'Đã ẩn';
        tdStatus.appendChild(statusBadge);
        
        // Action Cell
        const tdAction = document.createElement('td');
        tdAction.className = 'text-end';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn';
        editBtn.title = 'Sửa';
        const editIcon = document.createElement('i');
        editIcon.className = 'fa-solid fa-pen';
        editBtn.appendChild(editIcon);
        editBtn.onclick = () => editProduct(p._id);
        
        const toggleBtn = document.createElement('button');
        if (isAvail) {
            toggleBtn.className = 'action-btn delete';
            toggleBtn.title = 'Ẩn món';
            const hideIcon = document.createElement('i');
            hideIcon.className = 'fa-solid fa-eye-slash';
            toggleBtn.appendChild(hideIcon);
            toggleBtn.onclick = () => deleteProduct(p._id);
        } else {
            toggleBtn.className = 'action-btn text-success';
            toggleBtn.title = 'Hiện lại';
            const showIcon = document.createElement('i');
            showIcon.className = 'fa-solid fa-eye';
            toggleBtn.appendChild(showIcon);
            toggleBtn.onclick = () => restoreProduct(p._id);
        }
        
        tdAction.append(editBtn, toggleBtn);
        
        tr.append(tdImg, tdInfo, tdCat, tdPrice, tdStatus, tdAction);
        productsTableBody.appendChild(tr);
    });
}

function openProductModal() {
    // Reset form
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodBestSeller').checked = false;
    document.getElementById('options-container').replaceChildren();
    document.getElementById('recipe-container').replaceChildren();
    document.getElementById('productModalLabel').textContent = 'Thêm món mới';
    productModalInstance.show();
}

function editProduct(id) {
    const product = products.find(p => p._id === id);
    if (!product) return;

    document.getElementById('prodId').value = product._id;
    document.getElementById('prodName').value = product.name;
    document.getElementById('prodCategory').value = product.category || 'Coffee';
    document.getElementById('prodPrice').value = product.price;
    document.getElementById('prodDesc').value = product.description || '';
    document.getElementById('prodImg').value = product.imageUrl || '';
    document.getElementById('prodBestSeller').checked = !!product.isBestSeller;
    // Load existing options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.replaceChildren();
    if (product.options && product.options.length > 0) {
        product.options.forEach(opt => {
            const block = addOptionBlock(opt.name || opt.optionName);
            opt.choices.forEach(ch => {
                addChoiceRow(block, ch.name || ch.choiceName, ch.priceExtra, ch.isAbsoluteRecipe, ch.recipe);
            });
        });
    }

    // Load existing recipe
    document.getElementById('recipe-container').replaceChildren();
    if (product.recipe && product.recipe.length > 0) {
        product.recipe.forEach(r => addRecipeRow(r.ingredientId, r.quantity));
    }
    
    document.getElementById('productModalLabel').innerText = 'Chỉnh sửa món';
    productModalInstance.show();
}

// Option & Choice Logic
function addOptionBlock(optName = '') {
    const block = document.createElement('div');
    block.className = 'option-block mb-3 p-3 border rounded bg-light';
    
    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between align-items-center mb-2';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm option-name fw-bold';
    input.placeholder = 'Tên tùy chọn (VD: Size, Độ ngọt)';
    input.value = optName;
    input.style.maxWidth = '250px';
    
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-sm btn-outline-danger';
    delBtn.textContent = 'Xóa Nhóm';
    delBtn.onclick = () => block.remove();
    
    header.append(input, delBtn);
    
    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container mb-2';
    
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-sm btn-outline-secondary';
    const plusIcon = document.createElement('i');
    plusIcon.className = 'fa-solid fa-plus';
    addBtn.append(plusIcon, ' Thêm lựa chọn');
    addBtn.onclick = () => addChoiceRow(block);
    
    block.append(header, choicesContainer, addBtn);
    document.getElementById('options-container').appendChild(block);
    return block;
}

function addChoiceRow(block, choiceName = '', priceExtra = 0, isAbsolute = false, recipeData = []) {
    const container = block.querySelector('.choices-container');
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 mb-1 choice-row align-items-center';
    
    // Hidden inputs for recipe data
    const inputRecipe = document.createElement('input');
    inputRecipe.type = 'hidden';
    inputRecipe.className = 'choice-recipe-data';
    inputRecipe.value = JSON.stringify(recipeData || []);
    
    const inputAbsolute = document.createElement('input');
    inputAbsolute.type = 'hidden';
    inputAbsolute.className = 'choice-is-absolute';
    inputAbsolute.value = isAbsolute ? 'true' : 'false';
    row.append(inputRecipe, inputAbsolute);
    
    // Give row a unique id to map back from modal
    row.id = 'choice-row-' + Math.random().toString(36).substr(2, 9);
    
    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.className = 'form-control form-control-sm choice-name';
    inputName.placeholder = 'Tên (VD: L, Đen)';
    inputName.value = choiceName;
    inputName.required = true;
    
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group input-group-sm';
    inputGroup.style.width = '150px';
    
    const span1 = document.createElement('span');
    span1.className = 'input-group-text';
    span1.textContent = '+';
    
    const inputPrice = document.createElement('input');
    inputPrice.type = 'number';
    inputPrice.className = 'form-control choice-price';
    inputPrice.placeholder = 'Tiền thêm';
    inputPrice.required = true;
    inputPrice.value = priceExtra;
    
    const span2 = document.createElement('span');
    span2.className = 'input-group-text';
    span2.textContent = 'đ';
    
    inputGroup.append(span1, inputPrice, span2);
    
    const recipeBtn = document.createElement('button');
    recipeBtn.type = 'button';
    recipeBtn.className = (recipeData && recipeData.length > 0) ? 'btn btn-sm btn-info text-white' : 'btn btn-sm btn-outline-info';
    recipeBtn.title = 'Gắn công thức';
    recipeBtn.innerHTML = '<i class="fa-solid fa-spoon"></i>';
    recipeBtn.onclick = () => openChoiceRecipeModal(row.id);
    
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-sm btn-outline-danger';
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fa-solid fa-times';
    delBtn.appendChild(closeIcon);
    delBtn.onclick = () => row.remove();
    
    row.append(inputName, inputGroup, recipeBtn, delBtn);
    container.appendChild(row);
}

function addRecipeRow(ingId = '', qty = '') {
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 mb-2 recipe-row';
    
    // Ingredient Select
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm recipe-ing';
    select.required = true;
    
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Chọn nguyên liệu --';
    select.appendChild(defaultOpt);
    
    ingredients.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i._id;
        opt.textContent = `${i.name} (${i.unit})`;
        if (i._id === ingId) opt.selected = true;
        select.appendChild(opt);
    });
    
    // Quantity Input
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-control form-control-sm recipe-qty';
    input.placeholder = 'Số lượng';
    input.value = qty;
    input.required = true;
    input.style.width = '100px';
    
    // Remove Button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-danger btn-sm';
    const timesIcon = document.createElement('i');
    timesIcon.className = 'fa-solid fa-times';
    btn.appendChild(timesIcon);
    btn.onclick = () => row.remove();
    
    row.append(select, input, btn);
    document.getElementById('recipe-container').appendChild(row);
}

async function saveProduct() {
    const id = document.getElementById('prodId').value;
    
    // Gather recipe data
    const recipeRows = document.querySelectorAll('.recipe-row');
    const recipe = [];
    recipeRows.forEach(row => {
        const ingId = row.querySelector('.recipe-ing').value;
        const qty = parseFloat(row.querySelector('.recipe-qty').value);
        if (ingId && !isNaN(qty)) {
            recipe.push({ ingredientId: ingId, quantity: qty });
        }
    });

    // Gather options data
    const optionBlocks = document.querySelectorAll('.option-block');
    const options = [];
    optionBlocks.forEach(block => {
        const optName = block.querySelector('.option-name').value.trim();
        if (!optName) return;

        const choiceRows = block.querySelectorAll('.choice-row');
        const choices = [];
        choiceRows.forEach(row => {
            const cName = row.querySelector('.choice-name').value.trim();
            const cPrice = parseInt(row.querySelector('.choice-price').value) || 0;
            const cRecipeJson = row.querySelector('.choice-recipe-data').value;
            const cIsAbsolute = row.querySelector('.choice-is-absolute').value === 'true';
            
            let parsedRecipe = [];
            try { parsedRecipe = JSON.parse(cRecipeJson); } catch (e) {}

            if (cName) {
                const choiceObj = { name: cName, priceExtra: cPrice };
                if (parsedRecipe && parsedRecipe.length > 0) {
                    choiceObj.recipe = parsedRecipe;
                    choiceObj.isAbsoluteRecipe = cIsAbsolute;
                }
                choices.push(choiceObj);
            }
        });

        if (choices.length > 0) {
            options.push({ name: optName, choices: choices });
        }
    });

    const productData = {
        name: document.getElementById('prodName').value,
        category: document.getElementById('prodCategory').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        description: document.getElementById('prodDesc').value,
        image_url: document.getElementById('prodImg').value,
        is_best_seller: document.getElementById('prodBestSeller').checked,
        recipe: recipe,
        options: options
    };

    const imageUrl = document.getElementById('prodImg').value;
    if (imageUrl && imageUrl.startsWith('data:')) {
        alert('Vui lòng nhập URL hình ảnh (bắt đầu bằng https://...) thay vì tải ảnh trực tiếp.\n\nBạn có thể dùng ảnh từ Unsplash, Imgur, hoặc các dịch vụ lưu ảnh miễn phí khác.');
        return;
    }

    if (!productData.name || isNaN(productData.price)) {
        alert("Vui lòng điền đầy đủ các thông tin bắt buộc.");
        return;
    }

    try {
        if (id) {
            // Update
            const { error } = await supabase.from('products').update(productData).eq('id', id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase.from('products').insert([productData]);
            if (error) throw error;
        }

        productModalInstance.hide();
        fetchProducts();
    } catch (error) {
        console.error(error);
        alert("Lưu sản phẩm thất bại.");
    }
}

async function deleteProduct(id) {
    const confirmed = await customConfirm('Bạn có chắc chắn muốn ẩn món này không?', 'Ẩn món khỏi thực đơn');
    if (!confirmed) return;
    
    try {
        const { error } = await supabase.from('products').update({ is_available: false }).eq('id', id);
        if (error) throw error;
        fetchProducts();
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối máy chủ.");
    }
}

async function restoreProduct(id) {
    const confirmed = await customConfirm('Bạn có muốn hiển thị lại món này trên thực đơn không?', 'Hiện lại món');
    if (!confirmed) return;
    
    try {
        const { error } = await supabase.from('products').update({ is_available: true }).eq('id', id);
        if (error) throw error;
        fetchProducts();
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối máy chủ.");
    }
}


// --- Order History ---

async function fetchHistory() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Map data for compatibility
        orderHistory = data.map(o => ({
            ...o,
            _id: o.id,
            createdAt: o.created_at,
            tableNumber: o.table_number,
            orderNote: o.order_note,
            totalPrice: o.total_price,
            discountAmount: o.discount_amount,
            paymentMethod: o.payment_method,
            paymentStatus: o.payment_status
        }));
        
        renderHistoryTable();
        renderAnalytics();
    } catch (error) {
        console.error("fetchHistory error:", error);
        historyTableBody.replaceChildren();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.className = 'text-danger text-center';
        td.textContent = 'Lỗi tải lịch sử đơn hàng.';
        tr.appendChild(td);
        historyTableBody.appendChild(tr);
    }
}

function renderHistoryTable() {
    historyTableBody.replaceChildren();
    let revenue = 0;

    if (orderHistory.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.className = 'text-muted text-center py-4';
        td.textContent = 'Chưa có đơn hàng nào trong quá khứ.';
        tr.appendChild(td);
        historyTableBody.appendChild(tr);
        totalRevenueEl.innerText = `Tổng doanh thu: 0 đ`;
        return;
    }

    orderHistory.forEach(order => {
        let dateStr = "Unknown Date";
        if(order.createdAt) {
            try {
                dateStr = new Date(order.createdAt).toLocaleString();
            }catch(e){}
        }

        const itemsStr = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');
        const total = order.totalPrice || 0;
        
        if (order.status === 'Completed') {
            revenue += total;
        }

        const statusMap = {
            'Pending': 'Chờ xác nhận',
            'Preparing': 'Đang làm',
            'Ready': 'Đã xong',
            'Completed': 'Hoàn thành',
            'Cancelled': 'Đã hủy'
        };

        const statusBadgeClasses = {
            'Pending': 'bg-warning text-dark',
            'Preparing': 'bg-primary',
            'Ready': 'bg-info text-dark',
            'Completed': 'bg-success',
            'Cancelled': 'bg-danger'
        };
        const badgeClass = statusBadgeClasses[order.status] || 'bg-secondary';

        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.className = 'text-dark-id';
        const smallId = document.createElement('small');
        smallId.textContent = `${(order._id||'').substring(0, 8)}...`;
        tdId.appendChild(smallId);
        
        const tdDate = document.createElement('td');
        tdDate.className = 'date-cell';
        tdDate.textContent = dateStr;
        
        const tdTable = document.createElement('td');
        tdTable.className = 'fw-bold table-cell';
        tdTable.textContent = `Bàn ${order.tableNumber || '?'}`;
        
        const tdItems = document.createElement('td');
        const smallItems = document.createElement('small');
        smallItems.className = 'items-cell';
        smallItems.textContent = itemsStr;
        tdItems.appendChild(smallItems);
        
        const tdPrice = document.createElement('td');
        tdPrice.className = 'text-success fw-bold price-cell';
        tdPrice.textContent = `${total.toLocaleString('vi-VN')} đ`;
        
        const tdStatus = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge status-badge ${badgeClass} d-block mb-1`;
        statusBadge.textContent = statusMap[order.status] || order.status;
        
        const paymentBadge = document.createElement('span');
        const isPaid = order.paymentStatus === 'paid';
        const methodTxt = order.paymentMethod === 'transfer' ? 'CK' : 'Tại quầy';
        paymentBadge.className = `badge ${isPaid ? 'bg-success' : 'bg-warning text-dark'}`;
        paymentBadge.innerHTML = `<i class="fa-solid ${isPaid ? 'fa-check' : 'fa-clock'}"></i> ${methodTxt}: ${isPaid ? 'Đã TT' : 'Chưa TT'}`;
        
        tdStatus.appendChild(statusBadge);
        tdStatus.appendChild(paymentBadge);
        
        const tdAction = document.createElement('td');
        tdAction.className = 'text-end action-cell';
        
        if (['Pending', 'Preparing', 'Ready'].includes(order.status)) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-danger';
            btn.textContent = 'Hủy';
            btn.onclick = () => cancelOrder(order._id);
            tdAction.appendChild(btn);
            
            // For Cash/Transfer orders, if unpaid, we can click Check mark directly in Admin
            if (order.paymentStatus !== 'paid') {
                 const btnPaid = document.createElement('button');
                 btnPaid.className = 'btn btn-sm btn-success ms-1';
                 btnPaid.innerHTML = '<i class="fa-solid fa-check"></i> Thu tiền';
                 btnPaid.title = "Xác nhận đã nhận tiền (Tiền mặt/Chuyển khoản)";
                 btnPaid.onclick = () => markOrderPaid(order._id);
                 tdAction.appendChild(btnPaid);
            }
        } else if (order.status === 'Completed') {
            const btnPrint = document.createElement('button');
            btnPrint.className = 'btn btn-sm btn-outline-secondary ms-1';
            btnPrint.innerHTML = '<i class="fa-solid fa-print"></i> In Bill';
            btnPrint.onclick = () => printInvoice(order._id);
            tdAction.appendChild(btnPrint);
        }
        
        tr.append(tdId, tdDate, tdTable, tdItems, tdPrice, tdStatus, tdAction);
        
        historyTableBody.appendChild(tr);
    });

    totalRevenueEl.replaceChildren();
    const strongRev = document.createElement('strong');
    strongRev.textContent = 'Tổng doanh thu (Hoàn thành):';
    const spanRev = document.createElement('span');
    spanRev.className = 'text-success ms-2';
    spanRev.textContent = `${revenue.toLocaleString('vi-VN')} đ`;
    totalRevenueEl.append(strongRev, spanRev);
}

window.cancelOrder = async (orderId) => {
    const confirmed = await customConfirm(
        'Bạn có chắc chắn muốn hủy đơn hàng này? (Lưu ý: Bạn cần kiểm tra lại kho thủ công nếu đã trừ nguyên liệu)',
        'Hủy Đơn Hàng'
    );
    if (!confirmed) return;
    try {
        const { error } = await supabase.from('orders').update({ status: 'Cancelled' }).eq('id', orderId);
        if (error) throw error;
        
        fetchHistory();
    } catch (error) {
        console.error(error);
        alert('Lỗi kết nối máy chủ.');
    }
};

window.markOrderPaid = async (orderId) => {
    try {
        const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
        if (error) throw error;
        fetchHistory();
    } catch (e) {
        console.error(e);
        alert('Lỗi xác nhận thanh toán.');
    }
};

window.printInvoice = (orderId) => {
    const order = orderHistory.find(o => o._id === orderId);
    if (!order) return;

    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute';
    printWindow.style.top = '-10000px';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow.document;
    
    // Receipt styling (80mm width standard)
    const style = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
            body { 
                font-family: 'Roboto Mono', monospace; 
                color: #000; 
                margin: 0; 
                padding: 10px;
                width: 72mm; /* ~80mm wrapper */
                font-size: 12px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .mb-1 { margin-bottom: 5px; }
            .mb-2 { margin-bottom: 15px; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; vertical-align: top; }
            .header-info { font-size: 11px; margin-bottom: 3px; }
            .total-row { font-size: 14px; font-weight: bold; }
        </style>
    `;

    let itemsHtml = '';
    order.items.forEach(item => {
        let optionsStr = '';
        if(item.selectedOptions && item.selectedOptions.length > 0) {
            optionsStr = `<br><span style="font-size: 10px; padding-left: 10px;">+ ${item.selectedOptions.map(o => o.choiceName).join(', ')}</span>`;
        }
        
        itemsHtml += `
            <tr>
                <td style="width: 15%;">${item.quantity}</td>
                <td style="width: 50%;">${item.name}${optionsStr}</td>
                <td style="width: 35%;" class="text-right">${(item.price * item.quantity).toLocaleString('vi-VN')}</td>
            </tr>
        `;
    });

    const dateStr = new Date(order.createdAt).toLocaleString('vi-VN');
    const noteHtml = order.orderNote ? `<div class="divider"></div><div><strong>Ghi chú:</strong> ${order.orderNote}</div>` : '';
    const discountStr = order.discountAmount ? `
        <tr>
            <td colspan="2" class="text-right pb-1">Khuyến mãi:</td>
            <td class="text-right pb-1">-${order.discountAmount.toLocaleString('vi-VN')}</td>
        </tr>` : '';

    const html = `
        <html>
        <head>
            <title>Receipt</title>
            ${style}
        </head>
        <body>
            <div class="text-center mb-2">
                <h2 style="margin: 0; font-size: 18px;">NOHOPE COFFEE</h2>
                <div class="header-info">Hóa đơn thanh toán</div>
            </div>
            
            <div class="header-info">Ngày: ${dateStr}</div>
            <div class="header-info">Bàn: ${order.tableNumber}</div>
            <div class="header-info">Mã đơn: ${order._id.substring(0, 8).toUpperCase()}</div>
            
            <div class="divider"></div>
            
            <table>
                <tr style="border-bottom: 1px solid #000;">
                    <th class="text-left" style="width: 15%;">SL</th>
                    <th class="text-left" style="width: 50%;">Món</th>
                    <th class="text-right" style="width: 35%;">T.Tiền</th>
                </tr>
                ${itemsHtml}
            </table>
            
            <div class="divider"></div>
            
            <table>
                ${discountStr}
                <tr class="total-row">
                    <td colspan="2" class="text-right pt-2">TỔNG CỘNG:</td>
                    <td class="text-right pt-2">${order.totalPrice.toLocaleString('vi-VN')}</td>
                </tr>
            </table>
            
            ${noteHtml}
            
            <div class="divider"></div>
            <div class="text-center mb-1" style="font-size: 11px;">Cảm ơn quý khách!</div>
            <div class="text-center" style="font-size: 11px;">Hẹn gặp lại.</div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.parent.document.body.removeChild(window.frameElement);
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();
};

// --- Analytics / Charts ---

// --- Tables View ---
async function fetchTablesStatus() {
    const grid = document.getElementById('tables-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="col-12 text-center text-muted p-5"><i class="fa-solid fa-spinner fa-spin fs-3"></i><br>Đang tải dữ liệu bàn...</div>';
    
    try {
        // Fetch active table_sessions
        const { data: sessions, error: sessionErr } = await supabase
            .from('table_sessions')
            .select('*');
        if (sessionErr) throw sessionErr;

        // Fetch active orders for these tables
        const { data: activeOrders, error: orderErr } = await supabase
            .from('orders')
            .select('*')
            .in('status', ['Pending', 'Preparing', 'Ready']);
        if (orderErr) throw orderErr;
        
        const maxTables = 20;
        let html = '';
        
        for (let i = 1; i <= maxTables; i++) {
            const tableNo = i.toString();
            const session = sessions.find(s => s.table_number === tableNo);
            
            let isStale = false;
            let timeAgo = '';
            if (session && session.last_seen) {
                 const ageMs = Date.now() - new Date(session.last_seen).getTime();
                 const ageMins = Math.floor(ageMs / 60000);
                 isStale = ageMs > 5 * 60 * 1000;
                 if (ageMins === 0) timeAgo = 'Vừa xong';
                 else if (ageMins < 60) timeAgo = `${ageMins} phút trước`;
                 else timeAgo = `Hơn 1 giờ trước`;
            }
            
            const isOccupied = session && !isStale;
            const ordersForTable = activeOrders.filter(o => o.table_number === tableNo);
            const hasUnpaid = ordersForTable.some(o => o.payment_status !== 'paid');
            
            let badgeHtml = '';
            let btnHtml = '';
            let bgClass = 'bg-dark border-secondary';
            
            if (isOccupied) {
                bgClass = 'bg-primary border-primary';
                badgeHtml = '<div class="badge bg-light text-primary mb-2">Đang có khách</div>';
                
                if (ordersForTable.length > 0) {
                    badgeHtml += `<div class="badge bg-warning text-dark mb-2 ms-1">${ordersForTable.length} Đơn chờ</div>`;
                }
                btnHtml = `
                    <div class="mt-3">
                        <small class="text-light d-block mb-2"><i class="fa-solid fa-wifi"></i> Online: ${timeAgo || 'Vừa xong'}</small>
                        <button class="btn btn-sm btn-outline-light w-100" onclick="clearTableSession('${tableNo}')"><i class="fa-solid fa-broom"></i> Dọn bàn</button>
                    </div>
                `;
            } else {
                badgeHtml = '<div class="badge bg-secondary mb-2">Bàn trống</div>';
                bgClass = 'bg-dark border-secondary';
            }
            
            if (hasUnpaid) {
                badgeHtml += '<div class="badge bg-danger mb-2 ms-1">Chưa TT</div>';
                bgClass = 'bg-dark border-danger';
            }
            
            html += `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card ${bgClass} h-100 text-center shadow-sm" style="border-width: 2px;">
                        <div class="card-body d-flex flex-column align-items-center justify-content-center">
                            <h3 class="text-white mb-2">Bàn ${i}</h3>
                            <div>${badgeHtml}</div>
                            ${btnHtml}
                        </div>
                    </div>
                </div>
            `;
        }
        
        grid.innerHTML = html;
        
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="col-12 text-center text-danger p-5">Lỗi tải dữ liệu bàn.</div>';
    }
}

window.clearTableSession = async (tableNo) => {
    const confirmed = await customConfirm(`Bạn có chắc muốn xóa phiên truy cập của Bàn ${tableNo} không?`, 'Dọn bàn');
    if (!confirmed) return;
    try {
        await supabase.from('table_sessions').delete().eq('table_number', tableNo);
        fetchTablesStatus();
    } catch(e) {
        console.error(e);
        alert('Lỗi khi dọn bàn');
    }
};

let dailyChartInstance = null;
let categoryChartInstance = null;

function renderAnalytics() {
    // Filter only completed orders for revenue
    const completedOrders = orderHistory.filter(o => o.status === 'Completed');

    // 1. Process Data for Daily Chart (Last 7 Days)
    const dailyData = {};
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateString = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        dailyData[dateString] = 0;
    }

    // Accumulate revenue
    completedOrders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const dateString = orderDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (dailyData[dateString] !== undefined) {
            dailyData[dateString] += (order.totalPrice || 0);
        }
    });

    const dailyLabels = Object.keys(dailyData);
    const dailyValues = Object.values(dailyData);

    // 2. Process Data for Category Chart
    const categoryData = {};
    const colorPalette = ['#d4af37', '#ff416c', '#4facfe', '#43e97b', '#b02a2c', '#6f42c1'];

    completedOrders.forEach(order => {
        if (!order.items) return;
        order.items.forEach(item => {
            // We don't save category in history items right now, so we approximate based on product name/lookup
            // To be precise, we need to cross-ref the global `products` array
            const productRef = products.find(p => p._id === item._id || p.name === item.name);
            const categoryName = productRef ? productRef.category : 'Khác';
            
            if(!categoryData[categoryName]) categoryData[categoryName] = 0;
            categoryData[categoryName] += (item.price * item.quantity);
        });
    });

    const categoryLabels = Object.keys(categoryData);
    const categoryValues = Object.values(categoryData);

    // --- Render Daily Chart ---
    const ctxDaily = document.getElementById('revenueDailyChart');
    if (ctxDaily) {
        if (dailyChartInstance) dailyChartInstance.destroy(); // Clear old chart
        dailyChartInstance = new Chart(ctxDaily, {
            type: 'bar',
            data: {
                labels: dailyLabels,
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: dailyValues,
                    backgroundColor: 'rgba(212, 175, 55, 0.7)',
                    borderColor: 'rgba(212, 175, 55, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { callback: (value) => value.toLocaleString('vi-VN') } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ctx.raw.toLocaleString('vi-VN') + ' đ' } }
                }
            }
        });
    }

    // --- Render Category Chart ---
    const ctxCategory = document.getElementById('revenueCategoryChart');
    if (ctxCategory) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        categoryChartInstance = new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: categoryLabels.length > 0 ? categoryLabels : ['Chưa có dữ liệu'],
                datasets: [{
                    data: categoryValues.length > 0 ? categoryValues : [1],
                    backgroundColor: categoryLabels.length > 0 ? colorPalette.slice(0, categoryLabels.length) : ['#e9ecef'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#a0a0a0' } },
                    tooltip: { 
                        callbacks: { 
                            label: (ctx) => {
                                if(categoryLabels.length === 0) return ' 0 đ';
                                return ' ' + ctx.raw.toLocaleString('vi-VN') + ' đ';
                            }
                        } 
                    }
                }
            }
        });
    }
}

// --- Inventory Management ---

async function fetchIngredients() {
    try {
        const { data, error } = await supabase.from('ingredients').select('*').order('name');
        if (error) throw error;
        
        ingredients = data.map(i => ({
            ...i,
            _id: i.id,
            lowStockThreshold: i.low_stock_threshold
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
            
            // Name cell with badge
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
            
            // Stock cell
            const tdStock = document.createElement('td');
            if (isLow) tdStock.className = 'text-danger font-bold';
            tdStock.textContent = i.stock;
            
            // Unit cell
            const tdUnit = document.createElement('td');
            tdUnit.textContent = i.unit;
            
            // Action cell
            const tdAction = document.createElement('td');
            tdAction.className = 'text-end';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn';
            const editIcon = document.createElement('i');
            editIcon.className = 'fa-solid fa-pen-to-square';
            editBtn.appendChild(editIcon);
            editBtn.onclick = () => openIngredientModal(i._id);
            
            const delBtn = document.createElement('button');
            delBtn.className = 'action-btn delete';
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

// Function to render global alert for low stock
function renderIngredientAlerts() {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;

    const lowStockItems = ingredients.filter(i => i.stock <= (i.lowStockThreshold || 50));
    
    if (lowStockItems.length > 0) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-warning alert-dismissible fade show';
        alertDiv.role = 'alert';
        alertDiv.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
        alertDiv.style.color = '#ecc94b';
        alertDiv.style.borderColor = 'rgba(255, 193, 7, 0.3)';
        
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
        const ingredient = ingredients.find(i => i._id === ingredientId);
        if (ingredient) {
            document.getElementById('ingId').value = ingredient._id;
            document.getElementById('ingName').value = ingredient.name;
            document.getElementById('ingUnit').value = ingredient.unit;
            document.getElementById('ingStock').value = ingredient.stock;
            document.getElementById('ingOldStock').value = ingredient.stock;
            document.getElementById('ingThreshold').value = ingredient.lowStockThreshold || 50;
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
    const supplierName = document.getElementById('ingSupplierName') ? document.getElementById('ingSupplierName').value.trim() : null;

    if (!name || !unit) {
        alert("Vui lòng nhập tên và đơn vị!");
        return;
    }

    const payload = { 
        name, 
        unit, 
        stock, 
        low_stock_threshold: lowStockThreshold
    };
    if (supplierName !== null) payload.supplier_name = supplierName;

    try {
        if (id) {
            const { error } = await supabase.from('ingredients').update(payload).eq('id', id);
            if (error) throw error;
            
            // Log Stock Change
            if (stock !== oldStock) {
                const diff = stock - oldStock;
                const changeType = diff > 0 ? 'restock' : 'adjustment';
                await supabase.from('inventory_logs').insert([{
                    ingredient_id: id,
                    change_type: changeType,
                    amount: Math.abs(diff),
                    previous_stock: oldStock,
                    new_stock: stock,
                    reason: 'Cập nhật thủ công từ Dashboard'
                }]);
            }
        } else {
            const { data, error } = await supabase.from('ingredients').insert([payload]).select();
            if (error) throw error;
            
            // Log Initial Restock
            if (stock > 0 && data && data.length > 0) {
                await supabase.from('inventory_logs').insert([{
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
        alert("Lưu thất bại.");
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
        const { error } = await supabase.from('ingredients').delete().eq('id', id);
        if (error) throw error;
        fetchIngredients();
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối.");
    }
}


// --- Promo Management ---

async function fetchDiscounts() {
    try {
        const { data, error } = await supabase.from('discounts').select('*');
        if (error) throw error;
        
        discounts = data.map(d => ({
            ...d,
            _id: d.id,
            discountType: d.discount_type,
            usageLimit: d.usage_limit,
            usedCount: d.used_count
        }));
        renderDiscounts();
    } catch (error) {
        console.error('Error fetching discounts:', error);
    }
}

function renderDiscounts() {
    const promoTableBody = document.getElementById('promo-table-body');
    if (!promoTableBody) return;

    promoTableBody.replaceChildren();
    if (discounts.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.className = 'text-center py-4 text-muted';
        td.textContent = 'Chưa có mã khuyến mãi nào.';
        tr.appendChild(td);
        promoTableBody.appendChild(tr);
        return;
    }

    discounts.forEach(d => {
        const isLimitReached = d.usageLimit > 0 && d.usedCount >= d.usageLimit;
        
        const tr = document.createElement('tr');
        
        // Code
        const tdCode = document.createElement('td');
        const strongCode = document.createElement('strong');
        strongCode.className = 'text-primary';
        strongCode.textContent = d.code;
        tdCode.appendChild(strongCode);
        
        // Type
        const tdType = document.createElement('td');
        tdType.textContent = d.discountType === 'PERCENT' ? 'Phần trăm (%)' : 'Tiền mặt (đ)';
        
        // Value
        const tdValue = document.createElement('td');
        tdValue.className = 'fw-bold';
        tdValue.textContent = d.discountType === 'PERCENT' ? `${d.value}%` : `${d.value.toLocaleString()} đ`;
        
        // Limit
        const tdLimit = document.createElement('td');
        tdLimit.textContent = d.usageLimit > 0 ? d.usageLimit : 'Không giới hạn';
        
        // Used
        const tdUsed = document.createElement('td');
        tdUsed.textContent = d.usedCount;
        
        // Status
        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');
        if (!d.active || isLimitReached) {
            badge.className = 'badge bg-danger';
            badge.textContent = 'Ngừng HĐ';
        } else {
            badge.className = 'badge bg-success';
            badge.textContent = 'Hoạt động';
        }
        tdStatus.appendChild(badge);
        
        // Actions
        const tdAction = document.createElement('td');
        tdAction.className = 'text-end';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-outline-primary';
        const editIcon = document.createElement('i');
        editIcon.className = 'fa-solid fa-pen-to-square';
        editBtn.appendChild(editIcon);
        editBtn.onclick = () => openPromoModal(d._id);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-outline-danger ms-1';
        const delIcon = document.createElement('i');
        delIcon.className = 'fa-solid fa-trash';
        delBtn.appendChild(delIcon);
        delBtn.onclick = () => deletePromo(d._id);
        
        tdAction.append(editBtn, delBtn);
        
        tr.append(tdCode, tdType, tdValue, tdLimit, tdUsed, tdStatus, tdAction);
        promoTableBody.appendChild(tr);
    });
}

function openPromoModal(id = null) {
    const isEditing = id !== null;
    const modalTitle = document.querySelector('#promoModal .modal-title');
    modalTitle.textContent = isEditing ? ' Sửa Khuyến Mãi' : ' Thêm Khuyến Mãi';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-ticket me-2';
    modalTitle.prepend(icon);
    
    if (isEditing) {
        const discount = discounts.find(d => d._id === id);
        if (discount) {
            document.getElementById('promoId').value = discount._id;
            document.getElementById('promoCode').value = discount.code;
            document.getElementById('promoType').value = discount.discountType;
            document.getElementById('promoValue').value = discount.value;
            document.getElementById('promoLimit').value = discount.usageLimit;
            document.getElementById('promoActive').checked = discount.active;
        }
    } else {
        document.getElementById('promoForm').reset();
        document.getElementById('promoId').value = '';
        document.getElementById('promoLimit').value = '0';
        document.getElementById('promoActive').checked = true;
    }
    
    promoModalInstance.show();
}

async function savePromo() {
    const id = document.getElementById('promoId').value;
    const code = document.getElementById('promoCode').value.trim().toUpperCase();
    const discountType = document.getElementById('promoType').value;
    const value = parseFloat(document.getElementById('promoValue').value) || 0;
    const usageLimit = parseInt(document.getElementById('promoLimit').value) || 0;
    const active = document.getElementById('promoActive').checked;

    if (!code || value <= 0) {
        alert("Vui lòng nhập mã hợp lệ và mức giảm giá lớn hơn 0!");
        return;
    }

    const payload = { 
        code, 
        discount_type: discountType, 
        value, 
        usage_limit: usageLimit, 
        active 
    };

    try {
        if (id) {
            const { error } = await supabase.from('discounts').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('discounts').insert([payload]);
            if (error) throw error;
        }

        promoModalInstance.hide();
        fetchDiscounts();
    } catch (e) {
        console.error(e);
        alert("Lưu thất bại.");
    }
}

async function deletePromo(id) {
    if(!confirm("Xóa mã khuyến mãi này vĩnh viễn?")) return;
    try {
        const { error } = await supabase.from('discounts').delete().eq('id', id);
        if (error) throw error;
        fetchDiscounts();
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối.");
    }
}

// Socket listeners replaced by Supabase Realtime at the bottom of the file

// --- Feedback Management ---


// --- Table Status Map ---
async function fetchTablesStatus() {
    try {
        const response = await fetch('/api/tables', { headers: authHeaders() });
        const tableData = await response.json();
        renderTablesGrid(tableData);
    } catch (e) {
        console.error("Error fetching tables:", e);
    }
}

function renderTablesGrid(data) {
    const grid = document.getElementById('tables-grid');
    if (!grid) return;
        grid.replaceChildren();

    Object.values(data).forEach(table => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-3 col-lg-2';
        
        // Status colors & icons
        const statusConfigs = {
            'Empty': { color: 'rgba(255,255,255,0.05)', icon: 'fa-chair', text: 'Trống', border: 'rgba(255,255,255,0.1)' },
            'Ordering': { color: 'rgba(52, 152, 219, 0.15)', icon: 'fa-user-pen', text: 'Đang chọn', border: '#3498db' },
            'ordered': { color: 'rgba(231, 76, 60, 0.15)', icon: 'fa-utensils', text: 'Đã đặt món', border: '#e74c3c' },
            'help_requested': { color: 'rgba(241, 196, 15, 0.2)', icon: 'fa-hand-paper', text: 'Gọi phục vụ!', border: '#f1c40f', pulse: true },
            'bill_requested': { color: 'rgba(46, 204, 113, 0.2)', icon: 'fa-file-invoice-dollar', text: 'Gọi tính tiền!', border: '#2ecc71', pulse: true }
        };

        const config = statusConfigs[table.status] || statusConfigs['Empty'];
        
        const card = document.createElement('div');
        card.className = `card h-100 text-center p-3 table-card ${config.pulse ? 'pulse-border' : ''}`;
        card.style.transition = 'all 0.3s';
        card.style.background = config.color;
        card.style.border = `1px solid ${config.border} !important`;

        const iconContainer = document.createElement('div');
        iconContainer.className = 'icon-container fs-1 mb-2';
        iconContainer.style.color = config.border;
        const icon = document.createElement('i');
        icon.className = `fa-solid ${config.icon}`;
        iconContainer.appendChild(icon);

        const idText = document.createElement('h5');
        idText.className = 'mb-1 table-id-text';
        idText.textContent = `Bàn ${table.id}`;

        const statusText = document.createElement('small');
        statusText.className = 'status-text';
        statusText.style.color = config.border;
        statusText.textContent = config.text;

        card.append(iconContainer, idText, statusText);
        col.appendChild(card);
        grid.appendChild(col);
    });
}

// Add CSS for pulse
const style = document.createElement('style');
style.innerHTML = `
    @keyframes pulse-border {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(241, 196, 15, 0.4); }
        70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(241, 196, 15, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(241, 196, 15, 0); }
    }
    .pulse-border { animation: pulse-border 1.5s infinite; }
    .table-card:hover { transform: translateY(-5px); cursor: pointer; }
`;
document.head.appendChild(style);

async function fetchFeedbackStats() {
    try {
        const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        let total = 0;
        let count = data.length;
        data.forEach(f => total += f.rating);
        const average = count > 0 ? (total / count).toFixed(1) : 0;
        
        const mappedData = data.map(f => ({
            ...f,
            createdAt: f.created_at,
            tableNumber: f.table_number
        }));

        document.getElementById('fb-avg-rating').innerText = average;
        document.getElementById('fb-total-count').innerText = `${count} lượt đánh giá`;
        
        // Render stars
        const avgStars = document.getElementById('fb-avg-stars');
    avgStars.replaceChildren();
        const avg = Math.round(average);
        for(let i=1; i<=5; i++) {
            const star = document.createElement('i');
            star.className = i <= avg ? 'fa-solid fa-star text-gold' : 'fa-regular fa-star text-gold';
            avgStars.appendChild(star);
        }
        
        // Render recent list
        const listEl = document.getElementById('fb-recent-list');
        if(count === 0) {
            listEl.replaceChildren();
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'p-4 text-center text-muted';
            emptyDiv.textContent = 'Chưa có đánh giá nào.';
            listEl.appendChild(emptyDiv);
        } else {
            listEl.replaceChildren();
            mappedData.slice(0, 50).forEach(f => {
                const item = document.createElement('div');
                item.className = 'p-3 border-bottom fb-item';
                item.style.borderColor = 'rgba(255,255,255,0.08) !important';
                
                const header = document.createElement('div');
                header.className = 'd-flex justify-content-between mb-1';
                
                const starsDiv = document.createElement('div');
                starsDiv.className = 'text-gold';
                for(let i=0; i<5; i++) {
                    const star = document.createElement('i');
                    star.className = i < f.rating ? 'fa-solid fa-star small' : 'fa-regular fa-star small';
                    starsDiv.appendChild(star);
                }
                
                const dateSmall = document.createElement('small');
                dateSmall.className = 'text-muted';
                const clockIcon = document.createElement('i');
                clockIcon.className = 'fa-regular fa-clock me-1';
                dateSmall.append(clockIcon, new Date(f.createdAt).toLocaleDateString('vi-VN'));
                
                header.append(starsDiv, dateSmall);
                
                const tableInfo = document.createElement('div');
                tableInfo.className = 'fw-bold small text-light';
                tableInfo.textContent = `Bàn số: ${f.tableNumber || '?'}`;
                
                const commentDiv = document.createElement('div');
                commentDiv.className = 'text-white small mt-1';
                commentDiv.style.fontSize = '0.95rem';
                if (f.comment) {
                    commentDiv.textContent = f.comment;
                } else {
                    const em = document.createElement('i');
                    em.className = 'text-muted';
                    em.textContent = 'Không có bình luận';
                    commentDiv.appendChild(em);
                }
                
                item.append(header, tableInfo, commentDiv);
                listEl.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching feedback:', error);
    }
}

// Analytics charts and other stats will be refreshed by existing render functions

async function exportOrdersToCSV() {
    try {
        // Use locally cached orderHistory since it is already fetched from Supabase
        const orders = orderHistory;
        
        let csv = 'Mã đơn (ID),Bàn,Thời gian,Giá trị,Trạng thái,Món ăn\n';
        orders.forEach(o => {
            const itemsStr = o.items.map(i => `${i.name} x${i.quantity}`).join('; ');
            csv += `${o._id},${o.tableNumber},${new Date(o.createdAt).toLocaleString('vi-VN')},${o.totalPrice},${o.status},"${itemsStr}"\n`;
        });
        
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    } catch (e) {
        alert('Lỗi khi xuất dữ liệu!');
    }
}

async function fetchTablesStatus() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .in('status', ['Pending', 'Preparing', 'Ready']);
            
        if (error) throw error;
        
        const activeOrders = data.map(o => ({
            ...o,
            _id: o.id,
            tableNumber: parseInt(o.table_number) || o.table_number
        }));

        const grid = document.getElementById('tables-grid');
        grid.innerHTML = '';
        
        const maxTable = 15;
        
        for (let i = 1; i <= maxTable; i++) {
            const tableOrders = activeOrders.filter(o => o.tableNumber == i);
            const isOccupied = tableOrders.length > 0;
            const hasUnpaid = tableOrders.some(o => !o.is_paid);
            
            let statusConfig = { color: 'rgba(255,255,255,0.05)', icon: 'fa-chair', text: 'Trống', border: 'rgba(255,255,255,0.1)', pulse: false };
            if (isOccupied) {
                if (hasUnpaid) {
                    statusConfig = { color: 'rgba(231, 76, 60, 0.15)', icon: 'fa-money-bill-wave', text: 'Chưa TToán', border: '#e74c3c', pulse: true };
                } else {
                    statusConfig = { color: 'rgba(52, 152, 219, 0.15)', icon: 'fa-utensils', text: 'Đang làm/chờ món', border: '#3498db', pulse: false };
                }
            }
            
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3 mb-3';
            
            const card = document.createElement('div');
            card.className = `card h-100 text-center p-3 table-card ${statusConfig.pulse ? 'pulse-border' : ''}`;
            card.style.transition = 'all 0.3s';
            card.style.background = statusConfig.color;
            card.style.border = `1px solid ${statusConfig.border}`;
            card.style.cursor = isOccupied ? 'pointer' : 'default';
            
            if (isOccupied) {
                card.onclick = () => window.showTableActions(i, tableOrders);
            }

            const iconContainer = document.createElement('div');
            iconContainer.className = 'icon-container fs-1 mb-2';
            iconContainer.style.color = statusConfig.border;
            const icon = document.createElement('i');
            icon.className = `fa-solid ${statusConfig.icon}`;
            iconContainer.appendChild(icon);

            const idText = document.createElement('h5');
            idText.className = 'mb-1 table-id-text';
            idText.textContent = `Bàn ${i}`;
            idText.style.color = isOccupied ? '#fff' : 'rgba(255,255,255,0.5)';

            const statusText = document.createElement('small');
            statusText.className = 'status-text';
            statusText.style.color = statusConfig.border;
            statusText.textContent = statusConfig.text;
            
            card.append(iconContainer, idText, statusText);
            
            if (isOccupied) {
                const badgeContainer = document.createElement('div');
                badgeContainer.className = 'small mt-2';
                const badge = document.createElement('span');
                badge.className = hasUnpaid ? 'badge bg-danger' : 'badge bg-primary';
                badge.textContent = `${tableOrders.length} đơn hàng`;
                badgeContainer.appendChild(badge);
                card.appendChild(badgeContainer);
            }
            
            col.appendChild(card);
            grid.appendChild(col);
        }
    } catch (e) {
        console.error('Error fetching table status:', e);
    }
}

window.showTableActions = async (tableNum, tableOrders) => {
    const hasUnpaid = tableOrders.some(o => !o.is_paid);
    let msg = `Bàn ${tableNum} đang có ${tableOrders.length} đơn hàng.\nBạn muốn làm gì?\n\n1. Chuyển Bàn\n`;
    if (hasUnpaid) msg += `2. Xác nhận Đã Thanh Toán toàn bộ\n`;
    msg += `\nNhập phím (1${hasUnpaid ? " hoặc 2" : ""}):`;
    
    const action = window.prompt(msg);
    if (!action) return;
    
    if (action === '1') {
        const newTable = window.prompt(`Nhập số Bàn mới cho Bàn ${tableNum}:`);
        if (newTable && newTable.trim() !== '' && newTable != tableNum) {
            try {
                const orderIds = tableOrders.map(o => o._id);
                for (const oid of orderIds) {
                    await supabase.from('orders').update({ table_number: newTable.toString() }).eq('id', oid);
                }
                const sessionIds = [...new Set(tableOrders.map(o => o.session_id))];
                for (const sid of sessionIds) {
                    await supabase.from('table_sessions').update({ table_number: newTable.toString() }).eq('session_id', sid).eq('table_number', tableNum.toString());
                }
                alert(`Đã chuyển sang Bàn ${newTable}!`);
                fetchTablesStatus();
            } catch(e) {
                alert("Lỗi khi chuyển bàn: " + e.message);
            }
        }
    } else if (action === '2' && hasUnpaid) {
        if (confirm(`Xác nhận đã thu tiền cho toàn bộ đơn của Bàn ${tableNum}?\n(Sau khi thu, các đơn sẽ gửi xuống Bếp và dọn Bàn tự động để khách mới có thể quét mã)`)) {
            try {
                 const unpaidOrders = tableOrders.filter(o=>!o.is_paid);
                 for(const ord of unpaidOrders) {
                     await supabase.from('orders').update({ is_paid: true }).eq('id', ord._id);
                 }
                 await supabase.from('table_sessions').delete().eq('table_number', tableNum.toString());
                 alert("Thanh toán thành công!");
                 fetchTablesStatus();
            } catch(e) {
                 alert("Lỗi thanh toán: " + e.message);
            }
        }
    }
}

// Setup Realtime for admin
supabase.channel('admin-orders')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
      if (document.getElementById('section-history').classList.contains('active') || 
          document.getElementById('section-analytics').classList.contains('active')) {
          fetchHistory();
      }
      if (document.getElementById('section-tables').classList.contains('active')) {
          fetchTablesStatus();
      }
  })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_requests' }, payload => {
      if(payload.new.status === 'pending') renderStaffRequest(payload.new);
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'staff_requests' }, payload => {
      if(payload.new.status === 'completed') removeStaffRequestUI(payload.new.id);
  })
  .subscribe((status, err) => {
      console.log('ADMIN REALTIME STATUS:', status);
      if (err) console.error('ADMIN REALTIME ERROR:', err);
  });

// --- Staff Requests (Top-Right Floating Alerts) ---
async function fetchActiveStaffRequests() {
    try {
        const { data, error } = await supabase.from('staff_requests').select('*').eq('status', 'pending');
        if (error) throw error;
        data.forEach(req => renderStaffRequest(req));
    } catch (e) { console.error("Error fetching staff requests:", e); }
}

function renderStaffRequest(data) {
    if (!document.getElementById('admin-alerts-container')) {
        const container = document.createElement('div');
        container.id = 'admin-alerts-container';
        container.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; width: 320px;';
        document.body.appendChild(container);
    }

    const { id, table_number, type, created_at } = data;
    if(document.querySelector(`.admin-alert[data-request-id="${id}"]`)) return;

    const msg = type === 'bill' ? `Bàn ${table_number} thanh toán!` : `Bàn ${table_number} gọi phục vụ!`;
    const bg = type === 'bill' ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : 'linear-gradient(135deg, #f39c12, #e67e22)';
    const icon = type === 'bill' ? 'fa-file-invoice-dollar' : 'fa-bell-concierge';

    const alertDiv = document.createElement('div');
    alertDiv.className = 'admin-alert custom-alert shadow-lg';
    alertDiv.setAttribute('data-request-id', id);
    alertDiv.style.cssText = `background: ${bg}; padding: 15px; border-radius: 12px; color: white; display: flex; align-items: center; justify-content: space-between; animation: slideInRight 0.3s ease;`;
    
    const alertContent = document.createElement('div');
    alertContent.style.display = 'flex';
    alertContent.style.alignItems = 'center';
    alertContent.style.gap = '15px';

    const alertIcon = document.createElement('i');
    alertIcon.className = `fa-solid ${icon} fs-3`;
    
    const textDiv = document.createElement('div');
    const titleH = document.createElement('h6');
    titleH.className = 'mb-0 fw-bold';
    titleH.textContent = msg;
    
    const timeSm = document.createElement('small');
    timeSm.style.opacity = '0.8';
    timeSm.textContent = new Date(created_at).toLocaleTimeString();
    
    textDiv.append(titleH, timeSm);
    alertContent.append(alertIcon, textDiv);

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-sm btn-light font-bold';
    doneBtn.textContent = 'Xong';
    doneBtn.onclick = (e) => clearStaffRequest(id, e.target);

    alertDiv.append(alertContent, doneBtn);
    
    document.getElementById('admin-alerts-container').prepend(alertDiv);
    
    // Play sound if you want, similar to kitchen
    playAdminAudio();
}

function removeStaffRequestUI(id) {
    const el = document.querySelector(`.admin-alert[data-request-id="${id}"]`);
    if(el) el.remove();
}

window.clearStaffRequest = async (id, btn) => {
    btn.disabled = true;
    try {
        await supabase.from('staff_requests').update({ status: 'completed' }).eq('id', id);
        removeStaffRequestUI(id);
    } catch(e) {
        console.error(e);
        btn.disabled = false;
        alert("Lỗi khi hoàn thành yêu cầu");
    }
};

function playAdminAudio() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

const slideInStyle = document.createElement('style');
slideInStyle.innerHTML = '@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
document.head.appendChild(slideInStyle);

// Init fetch
fetchActiveStaffRequests();

// --- Analytics & Charts ---
let revenueDailyChartInstance = null;
let revenueCategoryChartInstance = null;

function renderAnalytics() {
    if (!document.getElementById('section-analytics').classList.contains('active')) return;
    
    const startDateInput = document.getElementById('analytics-start-date');
    const endDateInput = document.getElementById('analytics-end-date');
    let startDateStr = startDateInput ? startDateInput.value : '';
    let endDateStr = endDateInput ? endDateInput.value : '';
    
    let daysToShow = 7;
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0,0,0,0);
    let endDate = new Date();
    endDate.setHours(23,59,59,999);
    
    if (startDateStr && endDateStr) {
        startDate = new Date(startDateStr);
        startDate.setHours(0,0,0,0);
        endDate = new Date(endDateStr);
        endDate.setHours(23,59,59,999);
        
        let diffTime = Math.abs(endDate - startDate);
        daysToShow = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysToShow === 0) daysToShow = 1;
    }
    
    // Generate empty buckets
    const dateLabels = [...Array(daysToShow)].map((_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return {
            dateStr: d.toISOString().split('T')[0],
            display: d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }),
            revenue: 0
        };
    });

    const categoryTotals = {};
    const itemSales = {};
    
    orderHistory.forEach(o => {
        if (o.status !== 'Completed' && o.status !== 'Ready') return; 
        
        const d = new Date(o.createdAt);
        if (d >= startDate && d <= endDate) {
            const dateStr = d.toISOString().split('T')[0];
            const dayMatch = dateLabels.find(l => l.dateStr === dateStr);
            if (dayMatch) {
                dayMatch.revenue += (o.totalPrice || 0);
            }
            
            if (o.items && Array.isArray(o.items)) {
                o.items.forEach(item => {
                    const prod = typeof products !== 'undefined' ? products.find(p => p._id === item.productId || p.id === item.productId) : null;
                    const cat = prod ? prod.category : 'Khác';
                    // We only want original price or option price (we can estimate item.price)
                    const itemRev = (item.price * item.quantity);
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + itemRev;
                    
                    const name = prod ? prod.name : item.name;
                    if (!itemSales[name]) itemSales[name] = { qty: 0, rev: 0 };
                    itemSales[name].qty += item.quantity;
                    itemSales[name].rev += itemRev;
                });
            }
        }
    });

    // Draw Line Chart
    const ctxDaily = document.getElementById('revenueDailyChart').getContext('2d');
    if (revenueDailyChartInstance) revenueDailyChartInstance.destroy();
    
    revenueDailyChartInstance = new Chart(ctxDaily, {
        type: 'line',
        data: {
            labels: dateLabels.map(d => d.display),
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: dateLabels.map(d => d.revenue),
                borderColor: '#d4a76a',
                backgroundColor: 'rgba(212,167,106,0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }
            }
        }
    });

    // Draw Doughnut Chart
    const ctxCat = document.getElementById('revenueCategoryChart').getContext('2d');
    if (revenueCategoryChartInstance) revenueCategoryChartInstance.destroy();
    
    revenueCategoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryTotals).length ? Object.keys(categoryTotals) : ['Chưa có dữ liệu'],
            datasets: [{
                data: Object.keys(categoryTotals).length ? Object.values(categoryTotals) : [1],
                backgroundColor: ['#d4a76a', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#c9d1d9' } }
            }
        }
    });

    // Render Top Items
    const topItemsEl = document.getElementById('top-selling-body');
    if (topItemsEl) {
        topItemsEl.innerHTML = '';
        const sortedItems = Object.keys(itemSales)
            .map(name => ({ name, ...itemSales[name] }))
            .sort((a,b) => b.qty - a.qty)
            .slice(0, 5); // top 5
            
        if (sortedItems.length === 0) {
            topItemsEl.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-muted">Chưa có giao dịch nào trong thời gian này.</td></tr>';
        } else {
            sortedItems.forEach((item, index) => {
                const tr = document.createElement('tr');
                const badgeClass = index === 0 ? 'bg-danger' : (index === 1 ? 'bg-warning' : (index === 2 ? 'bg-success' : 'bg-secondary'));
                tr.innerHTML = `
                    <td><span class="badge ${badgeClass} me-2">#${index+1}</span> ${item.name}</td>
                    <td class="text-center font-bold text-light">${item.qty} đv</td>
                    <td class="text-end text-success">${item.rev.toLocaleString('vi-VN')} đ</td>
                `;
                topItemsEl.appendChild(tr);
            });
        }
    }
}

function fetchFeedbackStats() {
    const ratedOrders = orderHistory.filter(o => o.feedback_rating > 0);
    const avgRatingEl = document.getElementById('fb-avg-rating');
    const avgStarsEl = document.getElementById('fb-avg-stars');
    const totalCountEl = document.getElementById('fb-total-count');
    
    if (ratedOrders.length === 0) {
        if(avgRatingEl) avgRatingEl.textContent = '0.0';
        if(avgStarsEl) avgStarsEl.innerHTML = '<i class="fa-regular fa-star text-warning"></i>'.repeat(5);
        if(totalCountEl) totalCountEl.textContent = '0 lượt đánh giá';
        return;
    }
    
    const sum = ratedOrders.reduce((acc, curr) => acc + curr.feedback_rating, 0);
    const avg = (sum / ratedOrders.length).toFixed(1);
    
    if(avgRatingEl) avgRatingEl.textContent = avg;
    if(totalCountEl) totalCountEl.textContent = `${ratedOrders.length} lượt đánh giá`;
    
    if(avgStarsEl) {
        let starsHtml = '';
        const fullStars = Math.floor(avg);
        const hasHalf = avg - fullStars >= 0.5;
        
        for(let i = 0; i < fullStars; i++) starsHtml += '<i class="fa-solid fa-star text-warning"></i>';
        if (hasHalf) starsHtml += '<i class="fa-solid fa-star-half-stroke text-warning"></i>';
        const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
        for(let i = 0; i < emptyStars; i++) starsHtml += '<i class="fa-regular fa-star text-warning"></i>';
        
        avgStarsEl.innerHTML = starsHtml;
    }
}
// --- Promo Management ---
async function fetchDiscounts() {
    const tbody = document.getElementById('promo-table-body');
    if (!tbody) return;
    try {
        const { data, error } = await supabase.from('discounts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        discounts = data;
        renderDiscountsTable(data);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" class="text-danger text-center">Lỗi tải dữ liệu.</td></tr>';
    }
}

function renderDiscountsTable(data) {
    const tbody = document.getElementById('promo-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-muted text-center py-4">Chưa có mã khuyến mãi nào.</td></tr>';
        return;
    }
    
    data.forEach(d => {
        const tr = document.createElement('tr');
        const isActive = d.active !== false;
        
        tr.innerHTML = `
            <td class="font-bold text-light">${d.code}</td>
            <td>${d.discount_type === 'PERCENT' ? 'Phần trăm' : 'Cố định'}</td>
            <td class="text-success">${d.discount_type === 'PERCENT' ? d.value + '%' : d.value.toLocaleString('vi-VN') + ' đ'}</td>
            <td>${d.usage_limit || 'Không giới hạn'}</td>
            <td>${d.used_count || 0}</td>
            <td><span class="badge ${isActive ? 'bg-success' : 'bg-danger'}">${isActive ? 'Hoạt động' : 'Đã ngưng'}</span></td>
            <td class="text-end">
                <button class="action-btn" title="Sửa" onclick="editPromo('${d.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn ${isActive ? 'delete' : 'text-success'}" title="${isActive ? 'Ngưng' : 'Bật lại'}" onclick="togglePromoStatus('${d.id}', ${isActive})">
                    <i class="fa-solid ${isActive ? 'fa-ban' : 'fa-check'}"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openPromoModal() {
    document.getElementById('promoForm').reset();
    document.getElementById('promoId').value = '';
    promoModalInstance.show();
}

// --- Import/Export Inventory ---
async function exportInventoryToCSV() {
    try {
        const { data: logs, error } = await supabase.from('inventory_logs')
            .select('*, ingredients(name, unit)')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!logs || logs.length === 0) {
            alert('Không có dữ liệu log kho nào!');
            return;
        }
        
        let csv = 'Thời gian,Tên nguyên liệu,Loại,Khối lượng thay đổi,Tồn cũ,Tồn mới,Chi tiết\n';
        logs.forEach(l => {
            const date = new Date(l.created_at).toLocaleString('vi-VN');
            const ingName = l.ingredients ? l.ingredients.name : 'Unknown';
            const unit = l.ingredients ? l.ingredients.unit : '';
            const typeMap = { deduction: 'Xuất (Bán)', restock: 'Nhập', spoilage: 'Hư hỏng', adjustment: 'Kiểm kho' };
            const type = typeMap[l.change_type] || l.change_type;
            const prefix = l.amount > 0 ? '+' : '';
            csv += `"${date}","${ingName}","${type}","${prefix}${l.amount} ${unit}","${l.previous_stock}","${l.new_stock}","${l.reason || ''}"\n`;
        });
        
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `inventory_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    } catch (e) {
        console.error(e);
        alert('Lỗi xuất dữ liệu kho!');
    }
}

function editPromo(id) {
    const p = discounts.find(i => i.id === id);
    if(!p) return;
    document.getElementById('promoId').value = p.id;
    document.getElementById('promoCode').value = p.code;
    document.getElementById('promoType').value = p.discount_type;
    document.getElementById('promoValue').value = p.value;
    document.getElementById('promoLimit').value = p.usage_limit || 0;
    promoModalInstance.show();
}

async function savePromo() {
    const id = document.getElementById('promoId').value;
    const data = {
        code: document.getElementById('promoCode').value.trim().toUpperCase(),
        discount_type: document.getElementById('promoType').value,
        value: parseFloat(document.getElementById('promoValue').value) || 0,
        usage_limit: parseInt(document.getElementById('promoLimit').value) || 0
    };
    
    if (!data.code || data.value <= 0) {
        alert("Vui lòng nhập mã và mức giảm hợp lệ.");
        return;
    }
    
    try {
        if (id) {
            const { error } = await supabase.from('discounts').update(data).eq('id', id);
            if(error) throw error;
        } else {
            const { error } = await supabase.from('discounts').insert([data]);
            if(error) throw error;
        }
        promoModalInstance.hide();
        fetchDiscounts();
    } catch (e) {
        console.error(e);
        alert("Lỗi khi lưu mã khuyến mãi.");
    }
}

async function togglePromoStatus(id, currentlyActive) {
    const conf = await customConfirm(`Bạn muốn ${currentlyActive ? 'ngưng' : 'bật lại'} mã này?`, "Xác nhận");
    if(!conf) return;
    try {
        const { error } = await supabase.from('discounts').update({ active: !currentlyActive }).eq('id', id);
        if(error) throw error;
        fetchDiscounts();
    } catch(e) {
        console.error(e);
        alert("Lỗi hệ thống.");
    }
}

// --- Choice Recipe Modal Logic ---
let choiceRecipeModalInstance;

function openChoiceRecipeModal(rowId) {
    if (!choiceRecipeModalInstance) {
        choiceRecipeModalInstance = new bootstrap.Modal(document.getElementById('choiceRecipeModal'));
    }
    
    const row = document.getElementById(rowId);
    if (!row) return;
    
    // Store current row ID in modal
    let cachedInput = document.getElementById('currentChoiceRowId');
    if (!cachedInput) {
        cachedInput = document.createElement('input');
        cachedInput.type = 'hidden';
        cachedInput.id = 'currentChoiceRowId';
        document.querySelector('#choiceRecipeModal .modal-body').appendChild(cachedInput);
    }
    cachedInput.value = rowId;
    
    // Read data from row
    const isAbsolute = row.querySelector('.choice-is-absolute').value === 'true';
    const recipeData = JSON.parse(row.querySelector('.choice-recipe-data').value || '[]');
    
    // Set UI
    document.getElementById('choiceIsAbsolute').checked = isAbsolute;
    
    const container = document.getElementById('choice-recipe-container');
    container.replaceChildren();
    
    if (recipeData && recipeData.length > 0) {
        recipeData.forEach(r => addChoiceRecipeRow(r.ingredientId, r.quantity));
    } else {
        addChoiceRecipeRow(); // start with one empty row
    }
    
    document.getElementById('choiceRecipeModalLabel').textContent = 'Công thức: ' + (row.querySelector('.choice-name').value || 'Tùy chọn');
    choiceRecipeModalInstance.show();
}

function addChoiceRecipeRow(ingId = '', qty = '') {
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 mb-2 choice-recipe-row';
    
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm choice-recipe-ing bg-dark text-light border-secondary';
    select.required = true;
    
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Chọn nguyên liệu --';
    select.appendChild(defaultOpt);
    
    ingredients.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i._id;
        opt.textContent = `${i.name} (${i.unit})`;
        if (i._id === ingId) opt.selected = true;
        select.appendChild(opt);
    });
    
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-control form-control-sm choice-recipe-qty bg-dark text-light border-secondary';
    input.placeholder = 'Số lượng';
    input.value = qty;
    input.required = true;
    input.style.width = '100px';
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-danger btn-sm';
    btn.innerHTML = '<i class="fa-solid fa-times"></i>';
    btn.onclick = () => row.remove();
    
    row.append(select, input, btn);
    document.getElementById('choice-recipe-container').appendChild(row);
}

function saveChoiceRecipe() {
    const rowId = document.getElementById('currentChoiceRowId').value;
    const row = document.getElementById(rowId);
    if (!row) {
        choiceRecipeModalInstance.hide();
        return;
    }
    
    const isAbsolute = document.getElementById('choiceIsAbsolute').checked;
    
    const recipeRows = document.querySelectorAll('.choice-recipe-row');
    const recipe = [];
    recipeRows.forEach(r => {
        const ingId = r.querySelector('.choice-recipe-ing').value;
        const qty = parseFloat(r.querySelector('.choice-recipe-qty').value);
        if (ingId && !isNaN(qty) && qty > 0) {
            recipe.push({ ingredientId: ingId, quantity: qty });
        }
    });
    
    // Save to row
    row.querySelector('.choice-is-absolute').value = isAbsolute ? 'true' : 'false';
    row.querySelector('.choice-recipe-data').value = JSON.stringify(recipe);
    
    // Update button styling
    const btn = row.querySelector('.fa-spoon').parentElement;
    if (recipe.length > 0) {
        btn.className = 'btn btn-sm btn-info text-white';
    } else {
        btn.className = 'btn btn-sm btn-outline-info';
    }
    
    choiceRecipeModalInstance.hide();
}
