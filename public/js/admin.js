let products = [];
let orderHistory = [];
let ingredients = [];
let discounts = [];
let customersList = [];
let staffList = [];
let productModalInstance;
let ingredientModalInstance;
let promoModalInstance;
let confirmModalInstance;
let customerModalInstance;
let staffModalInstance;
let quickPromoModalInstance;
let createRestockModalInstance = null;

// Debounce timers for realtime subscriptions
let historyDebounceTimer = null;
let tablesDebounceTimer = null;
let inventoryDebounceTimer = null;


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
    customerModalInstance = new bootstrap.Modal(document.getElementById('customerModal'));
    staffModalInstance = new bootstrap.Modal(document.getElementById('staffModal'));
    quickPromoModalInstance = new bootstrap.Modal(document.getElementById('quickPromoModal'));
    // Load initial data
    fetchProducts();
    fetchHistory();
    fetchIngredients();

    // RBAC: Apply Detailed Permissions
    const role = sessionStorage.getItem('cafe_role') || localStorage.getItem('cafe_role');
    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || (role === 'admin' ? 'Administrator' : 'Nhân viên');
    let permissions = [];
    try {
        permissions = JSON.parse(sessionStorage.getItem('nohope_permissions') || localStorage.getItem('nohope_permissions') || '[]');
    } catch(e) {}
    
    // Display logged in user name
    const desktopNameEl = document.getElementById('desktop-staff-name');
    const mobileNameEl = document.getElementById('mobile-staff-name');
    if (desktopNameEl) desktopNameEl.textContent = staffName;
    if (mobileNameEl) mobileNameEl.textContent = staffName;

    // Apply allowed tabs visibility
    const allTabsId = ['orders', 'pos', 'history', 'tables', 'menu', 'inventory', 'restock', 'promo', 'customers', 'staff', 'analytics', 'audit'];
    let defaultTab = '';
    
    if (role !== 'admin') {
        allTabsId.forEach(tab => {
            const el = document.getElementById(`tab-${tab}`);
            if (el) {
                if (!permissions.includes(tab)) {
                    el.style.display = 'none';
                } else {
                    el.style.display = '';
                    if (!defaultTab) defaultTab = tab; // Set the first allowed tab as default
                }
            }
        });
        
        // Specific CTA buttons
        const btnAddPromo = document.querySelector('button[onclick="openPromoModal()"]');
        if (btnAddPromo && !permissions.includes('promo')) btnAddPromo.style.display = 'none';

        if (defaultTab) {
            switchTab(defaultTab);
        } else {
            // Fallback if no permissions are somehow specified
            document.querySelector('.content-section.active')?.classList.remove('active');
            const mainContent = document.querySelector('main');
            mainContent.innerHTML = '<div class="flex items-center justify-center h-full"><div class="text-center"><i class="fa-solid fa-lock text-[#A89F88] text-6xl mb-4"></i><h2 class="text-2xl text-[#E8DCC4]">Bạn chưa được cấp quyền truy cập</h2><p class="text-[#A89F88] mt-2">Vui lòng liên hệ Quản trị viên</p></div></div>';
        }
    } else {
        // Admin: Show all
        allTabsId.forEach(tab => {
            const el = document.getElementById(`tab-${tab}`);
            if (el) el.style.display = '';
        });
        switchTab('menu');
    }

    // Add Event Listeners for Quick Promo Modal
    document.getElementById('quickPromoPercentInput').addEventListener('input', function() {
        const percent = parseFloat(this.value);
        const originalPrice = parseFloat(document.getElementById('quickPromoOriginalPriceValue').value);
        if (!isNaN(percent) && !isNaN(originalPrice) && percent >= 0 && percent <= 100) {
            let discountedPrice = originalPrice * (1 - percent / 100);
            discountedPrice = Math.round(discountedPrice / 1000) * 1000;
            document.getElementById('quickPromoPriceInput').value = discountedPrice;
        } else if (this.value === '') {
            document.getElementById('quickPromoPriceInput').value = '';
        }
    });

    document.getElementById('quickPromoPriceInput').addEventListener('input', function() {
        const price = parseFloat(this.value);
        const originalPrice = parseFloat(document.getElementById('quickPromoOriginalPriceValue').value);
        if (!isNaN(price) && !isNaN(originalPrice) && originalPrice > 0 && price >= 0) {
            const percent = (1 - price / originalPrice) * 100;
            document.getElementById('quickPromoPercentInput').value = Math.round(percent * 10) / 10;
        } else if (this.value === '') {
            document.getElementById('quickPromoPercentInput').value = '';
        }
    });
});

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
    } else if (tabId === 'restock') {
        loadRestockLogs();
    } else if (tabId === 'promo') {
        fetchDiscounts();
    } else if (tabId === 'customers') {
        fetchCustomers();
    } else if (tabId === 'staff') {
        fetchStaff();
    } else if (tabId === 'audit') {
        fetchAuditLogs();
    } else if (tabId === 'settings') {
        loadStoreSettings();
    } else if (tabId === 'qr') {
        // No specific initial data needed for QR
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
        
        let isPromoValid = false;
        if (p.promotional_price) {
            const now = new Date();
            const startStr = p.promo_start_time || p.promo_start_time === '' ? p.promo_start_time : null;
            const endStr = p.promo_end_time || p.promo_end_time === '' ? p.promo_end_time : null;

            if (!startStr && !endStr) {
                isPromoValid = true;
            } else {
                const s = startStr ? new Date(startStr) : null;
                const e = endStr ? new Date(endStr) : null;
                
                if (s && e) isPromoValid = now >= s && now <= e;
                else if (s && !e) isPromoValid = now >= s;
                else if (!s && e) isPromoValid = now <= e;
            }
        }

        if (isPromoValid) {
            tdPrice.innerHTML = `<span class="text-decoration-line-through small" style="color: #a3aab1;">${p.price.toLocaleString('vi-VN')} đ</span><br><span class="text-danger fw-bold">${p.promotional_price.toLocaleString('vi-VN')} đ</span>`;
        } else {
            tdPrice.className = 'text-primary fw-bold';
            tdPrice.textContent = `${p.price.toLocaleString('vi-VN')} đ`;
        }
        
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
        
        const quickPromoBtn = document.createElement('button');
        quickPromoBtn.className = 'action-btn text-warning me-2';
        quickPromoBtn.title = 'Giảm giá nhanh';
        const quickPromoIcon = document.createElement('i');
        quickPromoIcon.className = 'fa-solid fa-tag';
        quickPromoBtn.appendChild(quickPromoIcon);
        quickPromoBtn.onclick = () => openQuickPromo(p._id);

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
        
        tdAction.append(quickPromoBtn, editBtn, toggleBtn);
        
        tr.append(tdImg, tdInfo, tdCat, tdPrice, tdStatus, tdAction);
        productsTableBody.appendChild(tr);
    });
}

function openProductModal() {
    // Reset form
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodBestSeller').checked = false;
    document.getElementById('prodPromoPrice').value = '';
    document.getElementById('prodPromoStart').value = '';
    document.getElementById('prodPromoEnd').value = '';
    document.getElementById('options-container').replaceChildren();
    document.getElementById('recipe-container').replaceChildren();
    document.getElementById('productModalLabel').textContent = 'Thêm món mới';
    productModalInstance.show();
}

function editProduct(id) {
    const product = products.find(p => String(p._id) === String(id));
    if (!product) return;

    document.getElementById('prodId').value = product._id;
    document.getElementById('prodName').value = product.name;
    document.getElementById('prodCategory').value = product.category || 'Coffee';
    document.getElementById('prodPrice').value = product.price;
    document.getElementById('prodDesc').value = product.description || '';
    document.getElementById('prodImg').value = product.imageUrl || '';
    document.getElementById('prodBestSeller').checked = !!product.isBestSeller;
    if(document.getElementById('prodCostPrice')) {
        document.getElementById('prodCostPrice').value = product.cost_price || '';
    }
    
    // Promo fields
    const promoStartMatch = product.promotional_price && product.promo_start_time ? new Date(product.promo_start_time) : null;
    const promoEndMatch = product.promotional_price && product.promo_end_time ? new Date(product.promo_end_time) : null;
    
    document.getElementById('prodPromoPrice').value = product.promotional_price || '';
    
    // Format for datetime-local (YYYY-MM-DDThh:mm)
    const formatDateTimeLocal = (date) => {
        if (!date || isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };
    
    document.getElementById('prodPromoStart').value = formatDateTimeLocal(promoStartMatch);
    document.getElementById('prodPromoEnd').value = formatDateTimeLocal(promoEndMatch);
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

    const promoPriceStr = document.getElementById('prodPromoPrice').value;
    let promoStartStr = document.getElementById('prodPromoStart').value;
    const promoEndStr = document.getElementById('prodPromoEnd').value;
    
    if (promoPriceStr && !promoStartStr) {
        promoStartStr = new Date().toISOString();
    }
    
    const productData = {
        name: document.getElementById('prodName').value,
        category: document.getElementById('prodCategory').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        description: document.getElementById('prodDesc').value,
        image_url: document.getElementById('prodImg').value,
        is_best_seller: document.getElementById('prodBestSeller').checked,
        promotional_price: promoPriceStr ? parseFloat(promoPriceStr) : null,
        promo_start_time: promoStartStr ? new Date(promoStartStr).toISOString() : null,
        promo_end_time: promoEndStr ? new Date(promoEndStr).toISOString() : null,
        cost_price: document.getElementById('prodCostPrice') ? (parseFloat(document.getElementById('prodCostPrice').value) || 0) : 0,
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
            logAudit('Cập nhật món', `ID: ${id}, Tên: ${productData.name}`);
        } else {
            // Insert
            const { error } = await supabase.from('products').insert([productData]);
            if (error) throw error;
            logAudit('Thêm món mới', `Tên: ${productData.name}`);
        }

        productModalInstance.hide();
        fetchProducts();
    } catch (error) {
        console.error(error);
        alert("Lưu sản phẩm thất bại.");
    }
}

// Giảm Giá Nhanh
function openQuickPromo(id) {
    const product = products.find(p => String(p._id) === String(id));
    if (!product) return;
    
    document.getElementById('quickPromoId').value = product._id;
    document.getElementById('quickPromoName').textContent = product.name;
    document.getElementById('quickPromoOriginalPrice').textContent = `${product.price.toLocaleString('vi-VN')} đ`;
    document.getElementById('quickPromoOriginalPriceValue').value = product.price;
    
    document.getElementById('quickPromoPriceInput').value = product.promotional_price || '';
    
    if (product.promotional_price && product.price > 0) {
        const percent = (1 - product.promotional_price / product.price) * 100;
        document.getElementById('quickPromoPercentInput').value = Math.round(percent * 10) / 10;
    } else {
        document.getElementById('quickPromoPercentInput').value = '';
    }
    
    const formatDateTimeLocal = (dateStr) => {
        if (!dateStr || dateStr === '') return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        return (new Date(date - offset)).toISOString().slice(0, 16);
    };
    
    document.getElementById('quickPromoStart').value = formatDateTimeLocal(product.promo_start_time);
    document.getElementById('quickPromoEnd').value = formatDateTimeLocal(product.promo_end_time);
    
    quickPromoModalInstance.show();
}

async function saveQuickPromo() {
    const id = document.getElementById('quickPromoId').value;
    const priceStr = document.getElementById('quickPromoPriceInput').value;
    let startStr = document.getElementById('quickPromoStart').value;
    let endStr = document.getElementById('quickPromoEnd').value;
    
    // Auto set start time if left empty while setting a price
    if (priceStr && !startStr) {
        startStr = new Date().toISOString();
        document.getElementById('quickPromoStart').value = startStr.slice(0, 16);
    }
    
    const promoData = {
        promotional_price: priceStr ? parseFloat(priceStr) : null,
        promo_start_time: startStr ? new Date(startStr).toISOString() : null,
        promo_end_time: endStr ? new Date(endStr).toISOString() : null,
    };
    
    try {
        const { error } = await supabase.from('products').update(promoData).eq('id', id);
        if (error) throw error;
        logAudit('Cập nhật Quick Promo', `ID món: ${id}, Giá mới: ${priceStr}`);
        
        quickPromoModalInstance.hide();
        fetchProducts();
    } catch (e) {
        console.error(e);
        alert('Cập nhật khuyến mãi thất bại');
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
    let grossRevenue = 0;
    let netRevenue = 0;
    let totalProfit = 0;

    if (orderHistory.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.className = 'text-muted text-center py-4';
        td.textContent = 'Chưa có đơn hàng nào trong quá khứ.';
        tr.appendChild(td);
        historyTableBody.appendChild(tr);
        totalRevenueEl.innerHTML = `Tổng doanh thu nguyên giá: <strong>0 đ</strong> <span class="ms-3 text-success">Doanh thu thực nhận: <strong>0 đ</strong></span><span class="ms-3 text-primary">Lợi nhuận: <strong>0 đ</strong></span>`;
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
        const discount = order.discountAmount || 0;
        
        if (order.status === 'Completed') {
            netRevenue += total;
            grossRevenue += (total + discount);
            totalProfit += (order.profit || 0);
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
    
    // Gross Revenue
    const strongGross = document.createElement('strong');
    strongGross.textContent = 'Tổng doanh thu (Gốc):';
    const spanGross = document.createElement('span');
    spanGross.className = 'text-muted ms-2 me-4 text-decoration-line-through';
    spanGross.textContent = `${grossRevenue.toLocaleString('vi-VN')} đ`;
    
    // Net Revenue
    const strongNet = document.createElement('strong');
    strongNet.textContent = 'Doanh thu thực nhận:';
    const spanNet = document.createElement('span');
    spanNet.className = 'text-success ms-2 fw-bold fs-5';
    spanNet.textContent = `${netRevenue.toLocaleString('vi-VN')} đ`;
    
    // Profit
    const strongProfit = document.createElement('strong');
    strongProfit.className = 'ms-4';
    strongProfit.textContent = 'Tổng Lợi nhuận:';
    const spanProfit = document.createElement('span');
    spanProfit.className = 'text-primary ms-2 fw-bold fs-5';
    spanProfit.textContent = `${totalProfit.toLocaleString('vi-VN')} đ`;
    
    totalRevenueEl.append(strongGross, spanGross, strongNet, spanNet, strongProfit, spanProfit);
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
    const order = orderHistory.find(o => String(o._id) === String(orderId));
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
            editBtn.className = 'action-btn me-2';
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
        alert("Vui lòng nhập tên và đơn vị!");
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
    let tableActionsModalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('tableActionsModal'));

    // Populate modal info
    document.getElementById('tableActionsInfo').textContent =
        `Bàn ${tableNum} có ${tableOrders.length} đơn hàng.${hasUnpaid ? ` (${tableOrders.filter(o => !o.is_paid).length} chưa thanh toán)` : ' (Đã thanh toán)'}`;

    // Show/hide pay button based on unpaid status
    const payBtn = document.getElementById('tableActionPayBtn');
    payBtn.style.display = hasUnpaid ? 'flex' : 'none';

    // Reset transfer form
    const transferForm = document.getElementById('tableTransferForm');
    transferForm.style.display = 'none';
    document.getElementById('tableNewNumberInput').value = '';

    // Wire up Transfer button
    const transferBtn = document.getElementById('tableActionTransferBtn');
    const newTransferBtn = transferBtn.cloneNode(true);
    transferBtn.parentNode.replaceChild(newTransferBtn, transferBtn);
    newTransferBtn.addEventListener('click', () => {
        transferForm.style.display = 'block';
        document.getElementById('tableNewNumberInput').focus();
    });

    // Wire up Transfer Confirm button
    const confirmTransferBtn = document.getElementById('tableTransferConfirmBtn');
    const newConfirmBtn = confirmTransferBtn.cloneNode(true);
    confirmTransferBtn.parentNode.replaceChild(newConfirmBtn, confirmTransferBtn);
    newConfirmBtn.addEventListener('click', async () => {
        const newTable = document.getElementById('tableNewNumberInput').value.trim();
        if (!newTable || newTable == tableNum) {
            document.getElementById('tableNewNumberInput').classList.add('is-invalid');
            return;
        }
        newConfirmBtn.disabled = true;
        newConfirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>';
        try {
            const orderIds = tableOrders.map(o => o._id);
            for (const oid of orderIds) {
                await supabase.from('orders').update({ table_number: newTable }).eq('id', oid);
            }
            const sessionIds = [...new Set(tableOrders.map(o => o.session_id))];
            for (const sid of sessionIds) {
                await supabase.from('table_sessions').update({ table_number: newTable }).eq('session_id', sid).eq('table_number', tableNum.toString());
            }
            logAudit('Chuyển bàn', `Bàn ${tableNum} → Bàn ${newTable}`);
            tableActionsModalInstance.hide();
            fetchTablesStatus();
        } catch(e) {
            alert('Lỗi khi chuyển bàn: ' + e.message);
            newConfirmBtn.disabled = false;
            newConfirmBtn.textContent = 'Chuyển';
        }
    });

    // Wire up Pay button
    const newPayBtn = payBtn.cloneNode(true);
    payBtn.parentNode.replaceChild(newPayBtn, payBtn);
    newPayBtn.style.display = hasUnpaid ? 'flex' : 'none';
    newPayBtn.addEventListener('click', async () => {
        tableActionsModalInstance.hide();
        const confirmed = await customConfirm(
            `Xác nhận đã thu tiền cho toàn bộ đơn của Bàn ${tableNum}?\n(Sau khi thu, bàn sẽ được dọn để khách mới có thể quét mã)`,
            'Xác nhận Thanh Toán'
        );
        if (!confirmed) return;
        try {
            const unpaidOrders = tableOrders.filter(o => !o.is_paid);
            for (const ord of unpaidOrders) {
                await supabase.from('orders').update({ is_paid: true }).eq('id', ord._id);
            }
            await supabase.from('table_sessions').delete().eq('table_number', tableNum.toString());
            logAudit('Thanh toán bàn', `Bàn ${tableNum}, ${unpaidOrders.length} đơn`);
            fetchTablesStatus();
        } catch(e) {
            alert('Lỗi thanh toán: ' + e.message);
        }
    });

    tableActionsModalInstance.show();
}

// Setup Realtime for admin — debounced to prevent N calls on bulk updates
supabase.channel('admin-orders')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
      if (document.getElementById('section-history').classList.contains('active') || 
          document.getElementById('section-analytics').classList.contains('active')) {
          clearTimeout(historyDebounceTimer);
          historyDebounceTimer = setTimeout(() => fetchHistory(), 400);
      }
      if (document.getElementById('section-tables').classList.contains('active')) {
          clearTimeout(tablesDebounceTimer);
          tablesDebounceTimer = setTimeout(() => fetchTablesStatus(), 400);
      }
  })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_requests' }, payload => {
      if(payload.new.status === 'pending') renderStaffRequest(payload.new);
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'staff_requests' }, payload => {
      if(payload.new.status === 'completed') removeStaffRequestUI(payload.new.id);
  })
  .subscribe((status, err) => {
      if (err) console.error('ADMIN REALTIME ERROR:', err);
  });

// Realtime for ingredients inventory
supabase.channel('admin-ingredients')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => {
      if (document.getElementById('section-inventory')?.classList.contains('active')) {
          clearTimeout(inventoryDebounceTimer);
          inventoryDebounceTimer = setTimeout(() => fetchIngredients(), 400);
      }
  })
  .subscribe();

// --- Staff Requests (Top-Right Floating Alerts) ---
async function fetchActiveStaffRequests() {
    try {
        const { data, error } = await supabase.from('staff_requests').select('*').eq('status', 'pending');
        if (error) throw error;
        data.forEach(req => renderStaffRequest(req));
    } catch (e) { console.error("Error fetching staff requests:", e); }
}

function renderStaffRequest(data) {
    // Ensure container exists (CSS handles positioning/layout)
    if (!document.getElementById('admin-alerts-container')) {
        const container = document.createElement('div');
        container.id = 'admin-alerts-container';
        document.body.appendChild(container);
    }

    const { id, table_number, type, created_at } = data;
    if (document.querySelector(`.admin-alert[data-request-id="${id}"]`)) return;

    const isBill = type === 'bill';
    const msg = isBill ? `Bàn ${table_number} thanh toán!` : `Bàn ${table_number} gọi phục vụ!`;
    const iconClass = isBill ? 'fa-file-invoice-dollar' : 'fa-bell-concierge';
    const alertTypeClass = isBill ? 'alert-bill' : 'alert-call';

    const alertDiv = document.createElement('div');
    alertDiv.className = `admin-alert ${alertTypeClass}`;
    alertDiv.setAttribute('data-request-id', id);

    const alertContent = document.createElement('div');
    alertContent.className = 'alert-content';

    const alertIcon = document.createElement('i');
    alertIcon.className = `fa-solid ${iconClass} fs-3`;

    const textDiv = document.createElement('div');
    const titleH = document.createElement('h6');
    titleH.className = 'mb-0 fw-bold';
    titleH.textContent = msg;

    const timeSm = document.createElement('small');
    timeSm.className = 'alert-time';
    timeSm.textContent = new Date(created_at).toLocaleTimeString('vi-VN');

    textDiv.append(titleH, timeSm);
    alertContent.append(alertIcon, textDiv);

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-sm btn-light fw-bold';
    doneBtn.textContent = 'Xong';
    doneBtn.onclick = (e) => clearStaffRequest(id, e.target);

    alertDiv.append(alertContent, doneBtn);
    document.getElementById('admin-alerts-container').prepend(alertDiv);
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

// slideInRight animation is now defined in admin.css

// Init fetch
fetchActiveStaffRequests();

// --- Analytics & Charts ---
let revenueDailyChartInstance = null;
let revenueCategoryChartInstance = null;

function renderAnalytics() {
    const analyticsSection = document.getElementById('section-analytics');
    if (!analyticsSection || !analyticsSection.classList.contains('active')) return;
    
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
// --- Staff Management ---

function initStaffModal() {
    const el = document.getElementById('staffModal');
    if (el) staffModalInstance = new bootstrap.Modal(el);
}

// Call this manually once on load, or inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initStaffModal();
});

async function fetchStaff() {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;
    try {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        staffList = data || [];
        renderStaff(staffList);
    } catch (e) {
        console.error("Error fetching staff:", e);
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Lỗi tải dữ liệu nhân viên.</td></tr>';
    }
}

function renderStaff(data) {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-4">Chưa có nhân viên nào.</td></tr>';
        return;
    }
    
    const roleMap = {
        'admin': 'Quản trị viên (Admin)',
        'manager': 'Quản lý (Manager)',
        'kitchen': 'Nhân viên Bếp',
        'staff': 'Nhân viên Lễ Tân/Chạy bàn'
    };

    data.forEach(s => {
        const tr = document.createElement('tr');
        const roleLabel = roleMap[s.role] || s.role;
        const badgeClass = s.role === 'admin' ? 'bg-danger' : (s.role === 'manager' ? 'bg-warning' : 'bg-info');
        
        tr.innerHTML = `
            <td class="font-bold text-light"><i class="fa-solid fa-user me-2 text-muted"></i>${s.name}</td>
            <td><span class="badge ${badgeClass} text-dark rounded-xl px-2 py-1">${roleLabel}</span></td>
            <td class="font-mono text-warning font-bold tracking-widest">${s.pin || '---'}</td>
            <td class="text-end">
                <button class="action-btn text-info" title="Sửa" onclick="openStaffModal('${s.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" title="Xóa" onclick="deleteStaff('${s.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function togglePermissionsBlock() {
    const role = document.getElementById('staff-role').value;
    const block = document.getElementById('staff-permissions-block');
    if (role === 'admin') {
        block.style.display = 'none';
    } else {
        block.style.display = 'block';
    }
}

function openStaffModal(id = null) {
    document.getElementById('staff-form').reset();
    document.getElementById('staff-id').value = id || '';
    
    // reset checkboxes
    document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = false);

    if (id) {
        const s = staffList.find(x => String(x.id) === String(id));
        if (s) {
            document.getElementById('staff-name').value = s.name || '';
            document.getElementById('staff-pin').value = s.pin || '';
            document.getElementById('staff-role').value = s.role || 'staff';
            document.getElementById('staffModalTitle').innerText = 'Sửa thông tin nhân viên';
            
            if (s.permissions && Array.isArray(s.permissions)) {
                s.permissions.forEach(p => {
                    const cb = document.querySelector(`.perm-cb[value="${p}"]`);
                    if (cb) cb.checked = true;
                });
            }
        }
    } else {
        document.getElementById('staffModalTitle').innerText = 'Thêm nhân viên mới';
    }
    if (!window.staffModalInstance) {
        window.staffModalInstance = new bootstrap.Modal(document.getElementById('staffModal'));
    }
    togglePermissionsBlock();
    window.staffModalInstance.show();
}

async function saveStaff() {
    const id = document.getElementById('staff-id').value;
    const name = document.getElementById('staff-name').value.trim();
    const pin = document.getElementById('staff-pin').value.trim();
    const role = document.getElementById('staff-role').value;
    
    if (!name || !pin) {
        alert("Vui lòng điền đầy đủ Tên và Mã PIN.");
        return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
        alert("Mã PIN phải từ 4 đến 6 chữ số.");
        return;
    }

    const permissions = [];
    if (role !== 'admin') {
        document.querySelectorAll('.perm-cb:checked').forEach(cb => {
            permissions.push(cb.value);
        });
    }

    const payload = { name, pin, role, permissions };
    
    try {
        if (id) {
            const { data, error } = await supabase.from('users').update(payload).eq('id', id).select();
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("Không thể cập nhật dữ liệu. Có thể do lỗi phân quyền (RLS) hoặc nhân viên không tồn tại.");
            }
        } else {
            const { error } = await supabase.from('users').insert([payload]);
            if (error) throw error;
        }
        if (window.staffModalInstance) {
            window.staffModalInstance.hide();
        }
        fetchStaff();
    } catch (e) {
        console.error("Save staff error:", e);
        alert("Lỗi khi lưu thông tin nhân viên: " + (e.message || JSON.stringify(e)));
    }
}

async function deleteStaff(id) {
    const s = staffList.find(x => String(x.id) === String(id));
    const confirmed = await customConfirm(`Bạn có chắc chắn muốn xóa nhân viên ${s ? s.name : ''}?`, 'Xác nhận xóa');
    if (!confirmed) return;
    
    try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        fetchStaff();
    } catch (e) {
        console.error("Delete staff error:", e);
        alert("Lỗi khi xóa nhân viên.");
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
    const p = discounts.find(i => String(i.id) === String(id));
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
            logAudit('Cập nhật mã KM', `Mã: ${data.code}`);
        } else {
            const { error } = await supabase.from('discounts').insert([data]);
            if(error) throw error;
            logAudit('Thêm mã KM mới', `Mã: ${data.code}`);
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
        logAudit(currentlyActive ? 'Ngưng mã KM' : 'Bật mã KM', `ID: ${id}`);
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

// --- Admin Print Receipt ---
window.printInvoice = (orderId) => {
    const order = orderHistory.find(o => String(o._id) === String(orderId));
    if (!order) return;

    const itemsHtml = order.items.map(i => {
        const optionNames = i.selectedOptions && i.selectedOptions.length > 0 ? ` (+ ${i.selectedOptions.map(o => o.choiceName).join(', ')})` : '';
        return `<div>${i.quantity}x ${i.name}${optionNames} - ${(i.price * i.quantity).toLocaleString('vi-VN')}đ</div>`;
    }).join('');
    
    const subtotal = order.totalPrice ? order.totalPrice : 0;
    const discount = order.discountAmount ? order.discountAmount : 0;
    const finalTotal = subtotal - discount;
    
    const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
    const noteHtml = order.orderNote ? `<div style="margin-top: 10px; font-style: italic;">Ghi chú: ${order.orderNote}</div>` : '';

    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Hóa Đơn - Bàn ${order.tableNumber}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 14px; color: #000; margin: 0; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .items { margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .summary { text-align: right; font-size: 14px; margin-bottom: 5px; }
                    .total { text-align: right; font-weight: bold; font-size: 18px; margin-bottom: 20px; margin-top: 10px; }
                    .footer { text-align: center; font-size: 12px; }
                    @media print {
                        @page { margin: 0; }
                        body { width: 80mm; padding: 5mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin: 0 0 5px 0;">Nohope Coffee</h2>
                    <div>Đ/C: Số 123 Đường Tình Yêu</div>
                    <div>Hóa đơn thanh toán</div>
                    <div style="margin-top: 10px;">Bàn số: <strong>${order.tableNumber}</strong></div>
                    <div>Thời gian: ${timeStr}</div>
                    <div>Mã đơn: ${(order._id || '').substring(0, 8)}</div>
                </div>
                <div class="items">
                    ${itemsHtml}
                    ${noteHtml}
                </div>
                ${discount > 0 ? `<div class="summary">Giảm giá: -${discount.toLocaleString('vi-VN')} đ</div>` : ''}
                <div class="total">Tổng cộng: ${finalTotal.toLocaleString('vi-VN')} đ</div>
                <div class="footer">
                    <div>Wifi: NohopeCoffee / Pass: 12345678</div>
                    <div style="margin-top: 5px;">Cảm ơn quý khách! Hẹn gặp lại.</div>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // setTimeout to allow rendering before print
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 200);
};

// --- Advanced Restock Management ---


async function loadRestockLogs() {
    try {
        const tbody = document.getElementById('restock-logs-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-[#A89F88]"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải dữ liệu...</td></tr>';
        
        const { data, error } = await supabase.from('inventory_logs')
            .select('*, ingredients(name, unit)')
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-[#A89F88]">Chưa có lịch sử nhập hàng nào.</td></tr>';
        return;
    }
    
    const groupedLogs = {};
    logs.forEach(log => {
        const timeKey = new Date(log.created_at).toISOString().substring(0, 16); // group by minute
        const reasonKey = log.reason || 'Không có ghi chú';
        const key = timeKey + '|' + reasonKey;
        
        if (!groupedLogs[key]) {
            groupedLogs[key] = {
                id: log.id,
                time: log.created_at,
                note: log.reason,
                items: []
            };
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
        tr.className = 'border-b border-[#3A3528] hover:bg-[#2A271D] transition-colors';
        
        const timeStr = new Date(group.time).toLocaleString('vi-VN');
        const itemsHtml = group.items.map(i => {
            const priceTag = i.unit_price > 0 ? ` <span class="text-[#A89F88] text-[10px]">(${i.unit_price.toLocaleString('vi-VN')}đ/${i.unit})</span>` : '';
            return `<span class="badge bg-[#3A3528] text-[#E8DCC4] border border-[#A89F88] border-opacity-25 me-1 mb-1">+${i.amount} ${i.unit} ${i.name}${priceTag}</span>`;
        }).join('');
        const totalCost = group.items.reduce((sum, i) => sum + (i.unit_price * i.amount), 0);
        const totalCostHtml = totalCost > 0 ? `<span class="text-[#D4AF37] font-bold">${totalCost.toLocaleString('vi-VN')}đ</span>` : '<span class="text-[#A89F88]">-</span>';
        
        tr.innerHTML = `
            <td class="text-[#A89F88] font-mono text-xs">#${group.id.substring(0,8)}</td>
            <td class="text-[#E8DCC4] text-sm">${timeStr}</td>
            <td class="max-w-xs flex-wrap gap-1">${itemsHtml}</td>
            <td class="text-end">${totalCostHtml}</td>
            <td class="text-[#A89F88] text-sm italic">${group.note || '-'}</td>
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
    tr.className = 'restock-item-row border-b border-[#3A3528] border-opacity-50';
    
    let optionsHtml = '<option value="">-- Chọn nguyên liệu --</option>';
    ingredients.forEach(ing => {
        optionsHtml += `<option value="${ing._id}" data-unit="${ing.unit}" data-stock="${ing.stock}">${ing.name} (Tồn hiện tại: ${ing.stock} ${ing.unit})</option>`;
    });
    
    tr.innerHTML = `
        <td class="py-2 pe-2">
            <select class="form-select form-select-sm bg-[#1A1814] text-[#E8DCC4] border-[#3A3528] restock-ing-select" required>
                ${optionsHtml}
            </select>
        </td>
        <td class="py-2 px-2">
            <div class="input-group input-group-sm">
                <input type="number" class="form-control bg-[#1A1814] text-[#E8DCC4] border-[#3A3528] restock-amount-input" placeholder="0" required min="0.1" step="any">
                <span class="input-group-text bg-[#3A3528] text-[#A89F88] border-[#3A3528] restock-unit-display">-</span>
            </div>
        </td>
        <td class="py-2 px-2">
            <div class="input-group input-group-sm">
                <input type="number" class="form-control bg-[#1A1814] text-[#E8DCC4] border-[#3A3528] restock-price-input" placeholder="0" min="0" step="any">
                <span class="input-group-text bg-[#3A3528] text-[#A89F88] border-[#3A3528]">đ</span>
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
        alert("Giỏ nhập kho đang trống! Vui lòng thêm ít nhất một nguyên liệu.");
        return;
    }
    
    const restockItems = [];
    let hasError = false;
    
    rows.forEach(row => {
        const select = row.querySelector('.restock-ing-select');
        const amountInput = row.querySelector('.restock-amount-input');
        
        const ingId = select.value;
        const amount = parseFloat(amountInput.value);
        
        if (!ingId) {
            hasError = true;
            select.classList.add('border-danger');
        } else {
            select.classList.remove('border-danger');
        }
        
        if (isNaN(amount) || amount <= 0) {
            hasError = true;
            amountInput.classList.add('border-danger');
        } else {
            amountInput.classList.remove('border-danger');
        }
        
        if (ingId && amount > 0) {
            const currentStock = parseFloat(select.options[select.selectedIndex].dataset.stock) || 0;
            const priceInput = row.querySelector('.restock-price-input');
            const unitPrice = parseFloat(priceInput ? priceInput.value : 0) || 0;
            restockItems.push({
                ingredient_id: ingId,
                amount: amount,
                current_stock: currentStock,
                unit_price: unitPrice
            });
        }
    });
    
    if (hasError) {
        alert("Vui lòng kiểm tra lại thông tin nguyên liệu và số lượng nhập.");
        return;
    }
    
    const conf = await customConfirm(`Bạn chắc chắn muốn nhập ${restockItems.length} loại nguyên liệu vào kho?`, "Xác nhận Nhập Kho");
    if (!conf) return;
    
    try {
        const btn = document.getElementById('saveRestockBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Đang xử lý...';
        
        const updates = [];
        const logs = [];
        const reason = note || 'Phiếu nhập kho gộp';
        
        for (const item of restockItems) {
            const newStock = item.current_stock + item.amount;
            
            updates.push(
                supabase.from('ingredients').update({ stock: newStock }).eq('id', item.ingredient_id)
            );
            
            logs.push({
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
        
        createRestockModalInstance.hide();
        
        fetchIngredients();
        loadRestockLogs();
        
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = 'Hoàn thành Phiếu Nhập';
        }, 500);
        
    } catch (e) {
        console.error(e);
        alert("Có lỗi xảy ra khi nhập kho: " + e.message);
        const btn = document.getElementById('saveRestockBtn');
        btn.disabled = false;
        btn.innerHTML = 'Hoàn thành Phiếu Nhập';
    }
}


// --- Customer Management ---
async function fetchCustomers() {
    try {
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        customersList = data;
        renderCustomersTable();
    } catch (e) {
        console.error(e);
        document.getElementById('customers-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>';
    }
}

function renderCustomersTable() {
    const tbody = document.getElementById('customers-table-body');
    tbody.replaceChildren();
    if (customersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có khách hàng nào.</td></tr>';
        return;
    }
    customersList.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${window.escapeHTML(c.phone || '')}</td>
            <td>${window.escapeHTML(c.name || '') || '<i>Khách vô danh</i>'}</td>
            <td class="text-warning fw-bold"><i class="fa-solid fa-star"></i> ${c.current_points || 0}</td>
            <td class="text-success">${(c.total_spent || 0).toLocaleString('vi-VN')} đ</td>
            <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</td>
            <td class="text-end">
                <button class="action-btn edit-btn" title="Chỉnh sửa điểm" onclick="editCustomer('${window.escapeHTML(c.id || '')}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editCustomer(id) {
    const c = customersList.find(x => String(x.id) === String(id));
    if (!c) return;
    document.getElementById('customerId').value = c.id;
    document.getElementById('customerName').value = c.name || '';
    document.getElementById('customerPhone').value = c.phone || '';
    document.getElementById('customerPoints').value = c.current_points || 0;
    customerModalInstance.show();
}

async function saveCustomer() {
    const id = document.getElementById('customerId').value;
    const points = parseInt(document.getElementById('customerPoints').value) || 0;
    try {
        const { error } = await supabase.from('customers').update({ current_points: points }).eq('id', id);
        if (error) throw error;
        logAudit('Sửa điểm KH', `ID: ${id}, Điểm cập nhật: ${points}`);
        customerModalInstance.hide();
        fetchCustomers();
    } catch (e) {
        console.error(e);
        alert('Lỗi cập nhật điểm khách hàng.');
    }
}

// --- Staff Management ---


// --- Audit Logs ---
async function logAudit(action, details) {
    const adminRole = sessionStorage.getItem('cafe_role') || localStorage.getItem('cafe_role') || 'Unknown';
    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Ẩn danh';
    try {
        await supabase.from('audit_logs').insert([{
            admin_identifier: `${staffName} (${adminRole})`,
            action: action,
            details: details
        }]);
    } catch(e) {
        console.error("Lỗi ghi log:", e);
    }
}

async function fetchAuditLogs() {
    try {
        const { data, error } = await supabase.from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
            
        if (error) throw error;
        renderAuditLogs(data);
    } catch (e) {
        console.error("Lỗi lấy nhật ký:", e);
        document.getElementById('audit-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>';
    }
}

function renderAuditLogs(logs) {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;
    tbody.replaceChildren();
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Chưa có nhật ký hoạt động nào.</td></tr>';
        return;
    }
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(log.created_at).toLocaleString('vi-VN')}</td>
            <td><span class="badge bg-secondary">${window.escapeHTML(log.admin_identifier || '')}</span></td>
            <td class="font-bold text-info">${window.escapeHTML(log.action || '')}</td>
            <td class="text-end text-muted small">${window.escapeHTML(log.details || '')}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =============================================================
// PHASE 1.1 — Dashboard KPI Cards
// =============================================================
let shiftStartTime = null;

async function renderDashboardStats() {
    const container = document.getElementById('dashboard-kpi-cards');
    if (!container) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
        const { data: todayOrders } = await supabase
            .from('orders')
            .select('status, total_price, payment_status')
            .gte('created_at', todayStart.toISOString());

        const { data: tablesData } = await supabase
            .from('tables')
            .select('status');

        const total = todayOrders?.length || 0;
        const pending = todayOrders?.filter(o => o.status === 'Pending' || o.status === 'Preparing').length || 0;
        const revenue = todayOrders?.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.total_price || 0), 0) || 0;
        const activeTables = tablesData?.filter(t => t.status === 'occupied').length || 0;

        container.innerHTML = `
            <div class="dashboard-kpi-grid">
                <div class="kpi-card kpi-orders">
                    <div class="kpi-icon"><i class="fa-solid fa-receipt"></i></div>
                    <div class="kpi-body">
                        <div class="kpi-value" id="kpi-total-orders">${total}</div>
                        <div class="kpi-label">Đơn hàng hôm nay</div>
                    </div>
                </div>
                <div class="kpi-card kpi-revenue">
                    <div class="kpi-icon"><i class="fa-solid fa-coins"></i></div>
                    <div class="kpi-body">
                        <div class="kpi-value" id="kpi-revenue">${revenue.toLocaleString('vi-VN')}đ</div>
                        <div class="kpi-label">Doanh thu hôm nay</div>
                    </div>
                </div>
                <div class="kpi-card kpi-pending">
                    <div class="kpi-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                    <div class="kpi-body">
                        <div class="kpi-value" id="kpi-pending">${pending}</div>
                        <div class="kpi-label">Đơn đang xử lý</div>
                    </div>
                </div>
                <div class="kpi-card kpi-tables">
                    <div class="kpi-icon"><i class="fa-solid fa-chair"></i></div>
                    <div class="kpi-body">
                        <div class="kpi-value" id="kpi-active-tables">${activeTables}</div>
                        <div class="kpi-label">Bàn đang phục vụ</div>
                    </div>
                </div>
            </div>
        `;

        // Check low stock after loading dashboard
        checkLowStock();
    } catch (e) {
        console.error('Dashboard stats error:', e);
    }
}

// =============================================================
// PHASE 1.2 — History Date Filter
// =============================================================
let historyFilterRange = 'today';
let historyFilteredData = [];

function initHistoryFilter() {
    const filterBar = document.getElementById('history-filter-bar');
    if (!filterBar) return;

    const searchInput = document.getElementById('history-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => applyHistoryFilters());
    }
}

function setHistoryFilter(range) {
    historyFilterRange = range;
    // Update button active state
    document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`hf-${range}`);
    if (btn) btn.classList.add('active');

    const customDates = document.getElementById('history-custom-dates');
    if (customDates) customDates.style.display = range === 'custom' ? 'flex' : 'none';

    if (range !== 'custom') applyHistoryFilters();
}

function applyHistoryFilters() {
    const now = new Date();
    let startDate = null;

    if (historyFilterRange === 'today') {
        startDate = new Date(now); startDate.setHours(0,0,0,0);
    } else if (historyFilterRange === 'yesterday') {
        startDate = new Date(now); startDate.setDate(startDate.getDate()-1); startDate.setHours(0,0,0,0);
        const endDate = new Date(startDate); endDate.setHours(23,59,59,999);
        historyFilteredData = orderHistory.filter(o => {
            const d = new Date(o.createdAt);
            return d >= startDate && d <= endDate;
        });
        renderFilteredHistory();
        return;
    } else if (historyFilterRange === '7days') {
        startDate = new Date(now); startDate.setDate(startDate.getDate()-7);
    } else if (historyFilterRange === '30days') {
        startDate = new Date(now); startDate.setDate(startDate.getDate()-30);
    } else if (historyFilterRange === 'custom') {
        const s = document.getElementById('hf-start-date')?.value;
        const e = document.getElementById('hf-end-date')?.value;
        if (!s || !e) return;
        const sd = new Date(s + 'T00:00:00');
        const ed = new Date(e + 'T23:59:59');
        historyFilteredData = orderHistory.filter(o => {
            const d = new Date(o.createdAt);
            return d >= sd && d <= ed;
        });
        renderFilteredHistory();
        return;
    }

    historyFilteredData = startDate
        ? orderHistory.filter(o => new Date(o.createdAt) >= startDate)
        : [...orderHistory];

    renderFilteredHistory();
}

function renderFilteredHistory() {
    // Apply search on top of date filter
    const searchTerm = (document.getElementById('history-search-input')?.value || '').toLowerCase().trim();
    let data = historyFilteredData;

    if (searchTerm) {
        data = data.filter(o => {
            const idMatch = (o._id || '').toLowerCase().includes(searchTerm);
            const tableMatch = String(o.tableNumber || '').toLowerCase().includes(searchTerm);
            const itemsMatch = (o.items || []).some(i => i.name.toLowerCase().includes(searchTerm));
            return idMatch || tableMatch || itemsMatch;
        });
    }

    // Temporarily swap orderHistory for rendering
    const original = orderHistory;
    orderHistory = data;
    renderHistoryTable();
    orderHistory = original;
}

// =============================================================
// PHASE 1.4 — Low Stock Alert
// =============================================================
async function checkLowStock() {
    try {
        const { data } = await supabase
            .from('ingredients')
            .select('name, stock, min_stock')
            .gt('min_stock', 0);

        if (!data) return;
        const lowItems = data.filter(i => i.stock <= i.min_stock);

        // Update sidebar badge
        const inventoryTab = document.getElementById('tab-inventory');
        const existingBadge = inventoryTab?.querySelector('.low-stock-badge');
        if (existingBadge) existingBadge.remove();

        if (lowItems.length > 0 && inventoryTab) {
            const badge = document.createElement('span');
            badge.className = 'low-stock-badge ms-auto badge rounded-pill bg-danger text-white text-xs';
            badge.textContent = lowItems.length;
            inventoryTab.appendChild(badge);

            // Show toast only once per session
            const lastWarn = sessionStorage.getItem('lowstock_warned');
            if (!lastWarn) {
                sessionStorage.setItem('lowstock_warned', '1');
                showAdminToast(`⚠️ ${lowItems.length} nguyên liệu sắp hết: ${lowItems.map(i=>i.name).slice(0,3).join(', ')}${lowItems.length > 3 ? '...' : ''}`, 'warning', 8000);
            }
        }
    } catch(e) { console.error('Low stock check error:', e); }
}

function showAdminToast(message, type = 'info', duration = 4000) {
    let toastContainer = document.getElementById('admin-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'admin-toast-container';
        toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:380px;';
        document.body.appendChild(toastContainer);
    }

    const colorMap = { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#C0A062' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:#232018;border:1px solid ${colorMap[type]||colorMap.info};border-left:4px solid ${colorMap[type]||colorMap.info};border-radius:12px;padding:14px 18px;color:#E8DCC4;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:slideInRight 0.3s ease;`;
    toast.textContent = message;

    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOutRight 0.3s ease'; setTimeout(() => toast.remove(), 300); }, duration);
}

// Add toast keyframes
const toastStyle = document.createElement('style');
toastStyle.textContent = `
@keyframes slideInRight { from { transform: translateX(120%); opacity:0; } to { transform: translateX(0); opacity:1; } }
@keyframes slideOutRight { from { transform: translateX(0); opacity:1; } to { transform: translateX(120%); opacity:0; } }
`;
document.head.appendChild(toastStyle);

// =============================================================
// PHASE 3.1 — Export CSV
// =============================================================
window.exportOrdersToCSV = function() {
    const data = historyFilteredData.length > 0 ? historyFilteredData : orderHistory;
    if (!data || data.length === 0) {
        showAdminToast('Không có dữ liệu để xuất.', 'error');
        return;
    }

    const BOM = '\uFEFF';
    const headers = ['Mã đơn', 'Thời gian', 'Bàn', 'Các món', 'Tổng tiền (đ)', 'Giảm giá (đ)', 'TT thanh toán', 'Trạng thái'];
    const rows = data.map(o => [
        (o._id || '').substring(0, 8),
        o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
        `Bàn ${o.tableNumber || '?'}`,
        (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(' | '),
        o.totalPrice || 0,
        o.discountAmount || 0,
        o.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tại quầy',
        o.status || ''
    ]);

    const csvContent = BOM + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nohope_orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAdminToast('✅ Đã xuất file CSV thành công!', 'success');
    logAudit('Xuất CSV đơn hàng', `${data.length} đơn`);
};

window.exportInventoryToCSV = async function() {
    try {
        const { data } = await supabase.from('ingredients').select('*');
        if (!data) return;
        const BOM = '\uFEFF';
        const headers = ['Tên nguyên liệu', 'Tồn kho', 'Đơn vị', 'Tồn kho tối thiểu'];
        const rows = data.map(i => [i.name, i.stock, i.unit || '', i.min_stock || 0]);
        const csv = BOM + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `nohope_inventory_${new Date().toISOString().split('T')[0]}.csv` });
        a.click();
        showAdminToast('✅ Đã xuất kho thành công!', 'success');
    } catch(e) { showAdminToast('Lỗi xuất kho.', 'error'); }
};

// =============================================================
// PHASE 3.2 — Shift Summary Modal
// =============================================================
window.openShiftSummary = async function() {
    if (!shiftStartTime) shiftStartTime = new Date();
    const modal = document.getElementById('shiftSummaryModal');
    if (!modal) return;

    const shiftOrders = orderHistory.filter(o => new Date(o.createdAt) >= shiftStartTime);
    const completed = shiftOrders.filter(o => o.status === 'Completed');
    const totalRevenue = completed.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const cashRevenue = completed.filter(o => o.paymentMethod !== 'transfer').reduce((s, o) => s + (o.totalPrice || 0), 0);
    const transferRevenue = completed.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + (o.totalPrice || 0), 0);
    const cancelled = shiftOrders.filter(o => o.status === 'Cancelled').length;

    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Nhân viên';
    const startStr = shiftStartTime.toLocaleString('vi-VN');
    const endStr = new Date().toLocaleString('vi-VN');

    document.getElementById('shift-summary-content').innerHTML = `
        <div class="shift-summary-header">
            <h4><i class="fa-solid fa-moon me-2 text-[#C0A062]"></i>Tổng kết ca làm việc</h4>
            <div class="shift-meta">
                <span><i class="fa-solid fa-user me-1"></i>${window.escapeHTML(staffName)}</span>
                <span><i class="fa-solid fa-clock me-1"></i>${startStr} → ${endStr}</span>
            </div>
        </div>
        <div class="shift-kpi-row">
            <div class="shift-kpi"><div class="shift-kpi-val">${shiftOrders.length}</div><div class="shift-kpi-lbl">Tổng đơn</div></div>
            <div class="shift-kpi"><div class="shift-kpi-val text-success">${completed.length}</div><div class="shift-kpi-lbl">Hoàn thành</div></div>
            <div class="shift-kpi"><div class="shift-kpi-val text-danger">${cancelled}</div><div class="shift-kpi-lbl">Đã hủy</div></div>
        </div>
        <hr class="border-[#3A3528] my-4">
        <div class="shift-revenue-table">
            <div class="shift-rev-row"><span>Doanh thu tổng</span><strong class="text-[#D4AF37]">${totalRevenue.toLocaleString('vi-VN')} đ</strong></div>
            <div class="shift-rev-row"><span><i class="fa-solid fa-money-bill-wave me-1 text-green-400"></i>Tiền mặt</span><strong>${cashRevenue.toLocaleString('vi-VN')} đ</strong></div>
            <div class="shift-rev-row"><span><i class="fa-solid fa-qrcode me-1 text-blue-400"></i>Chuyển khoản</span><strong>${transferRevenue.toLocaleString('vi-VN')} đ</strong></div>
        </div>
    `;

    let shiftModalInstance = bootstrap.Modal.getOrCreateInstance(modal);
    shiftModalInstance.show();
};

window.printShiftSummary = function() {
    const content = document.getElementById('shift-summary-content')?.innerHTML || '';
    const w = window.open('', '', 'width=500,height=600');
    w.document.write(`<html><head><title>Tổng kết ca</title><style>body{font-family:sans-serif;padding:20px;color:#000;}.shift-summary-header h4{font-size:18px;margin-bottom:8px;}.shift-meta{font-size:12px;color:#666;margin-bottom:20px;}.shift-kpi-row{display:flex;gap:20px;margin-bottom:20px;}.shift-kpi{text-align:center;}.shift-kpi-val{font-size:28px;font-weight:900;}.shift-kpi-lbl{font-size:12px;color:#666;}.shift-rev-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px;}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
};

// =============================================================
// Boot: run dashboard stats and init filter on DOMContentLoaded
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    shiftStartTime = new Date();
    // Run dashboard stats if element exists
    setTimeout(renderDashboardStats, 800);
    // Init history filter
    initHistoryFilter();
    // Set default filter to 'all'
    historyFilteredData = [];
});

// =============================================================
// PHASE 4 — QR Management & Store Settings
// =============================================================

window.generateQRCodes = function() {
    const countInput = document.getElementById('qr-table-count');
    const count = parseInt(countInput.value);
    if (!count || isNaN(count) || count <= 0) {
        if(typeof showAdminToast === 'function') showAdminToast('Vui lòng nhập số lượng bàn hợp lệ.', 'error');
        else alert('Vui lòng nhập số lượng bàn hợp lệ.');
        return;
    }

    const printArea = document.getElementById('qr-print-area');
    printArea.innerHTML = '';
    
    // Base URL for the menu
    const baseUrl = window.location.origin;

    for (let i = 1; i <= count; i++) {
        const tableUrl = `${baseUrl}/?table=${i}`;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'qr-card bg-[#232018] border border-[#3A3528] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-soft relative';
        
        const titleSpan = document.createElement('h5');
        titleSpan.className = 'text-[#C0A062] font-noto font-bold mb-3 text-lg';
        titleSpan.textContent = `Bàn ${i}`;
        
        const qrContainer = document.createElement('div');
        qrContainer.className = 'bg-white p-2 rounded-xl mb-3 flex justify-center w-full';
        
        // Generate QR Code
        new QRCode(qrContainer, {
            text: tableUrl,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        
        const linkElem = document.createElement('a');
        linkElem.href = tableUrl;
        linkElem.target = '_blank';
        linkElem.className = 'text-[10px] text-[#A89F88] break-all truncate w-full hover:text-[#C0A062] transition-colors mt-2';
        linkElem.textContent = tableUrl;
        
        wrapper.appendChild(titleSpan);
        wrapper.appendChild(qrContainer);
        wrapper.appendChild(linkElem);
        
        printArea.appendChild(wrapper);
    }
    
    if(typeof showAdminToast === 'function') showAdminToast(`Đã tạo thành công ${count} mã QR!`, 'success');
};

window.saveStoreSettings = async function(type) {
    let updates = {};
    if (type === 'general') {
        updates = {
            store_name: document.getElementById('setting-store-name').value,
            store_address: document.getElementById('setting-store-address').value,
            wifi_name: document.getElementById('setting-wifi-name').value,
            wifi_pass: document.getElementById('setting-wifi-pass').value
        };
    } else if (type === 'bank') {
        updates = {
            bank_id: document.getElementById('setting-bank-id').value,
            bank_acc: document.getElementById('setting-bank-acc').value,
            bank_name: document.getElementById('setting-bank-name').value
        };
    }
    
    try {
        if (typeof supabase !== 'undefined') {
            const { error } = await supabase.from('store_settings').upsert({ id: 1, ...updates });
            if (error && error.code !== '42P01') console.warn(error);
        }
    } catch (e) {
        console.warn('Supabase context missing or table missing, using localStorage');
    }

    const existing = JSON.parse(localStorage.getItem('store_settings') || '{}');
    const newSettings = { ...existing, ...updates };
    localStorage.setItem('store_settings', JSON.stringify(newSettings));
    
    if(typeof showAdminToast === 'function') showAdminToast(`Đã lưu thiết lập ${type === 'general' ? 'thông tin' : 'thanh toán'} thành công!`, 'success');
    else alert('Đã lưu cài đặt!');
};

window.loadStoreSettings = async function() {
    let settings = {};
    try {
        if (typeof supabase !== 'undefined') {
            const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
            if (data) settings = data;
			else throw new Error("No table");
        } else {
            throw new Error("No supabase client");
        }
    } catch(e) {
        settings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    }
    
    if (document.getElementById('setting-store-name')) document.getElementById('setting-store-name').value = settings.store_name || '';
    if (document.getElementById('setting-store-address')) document.getElementById('setting-store-address').value = settings.store_address || '';
    if (document.getElementById('setting-wifi-name')) document.getElementById('setting-wifi-name').value = settings.wifi_name || '';
    if (document.getElementById('setting-wifi-pass')) document.getElementById('setting-wifi-pass').value = settings.wifi_pass || '';
    if (document.getElementById('setting-bank-id')) document.getElementById('setting-bank-id').value = settings.bank_id || '';
    if (document.getElementById('setting-bank-acc')) document.getElementById('setting-bank-acc').value = settings.bank_acc || '';
    if (document.getElementById('setting-bank-name')) document.getElementById('setting-bank-name').value = settings.bank_name || '';
};
