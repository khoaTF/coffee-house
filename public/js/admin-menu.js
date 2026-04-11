// =============================================
// ADMIN-MENU — Menu / Product Management
// =============================================
// Dependencies: admin-core.js (products, productModalInstance, quickPromoModalInstance,
//               productsTableBody, ingredients, customConfirm, logAudit, supabase)

async function fetchProducts() {
    try {
        const { data, error } = await supabase.from('products').select('*').eq('tenant_id', window.AdminState.tenantId).order('name');
        if (error) throw error;

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
        img.onerror = function() {
            this.onerror = null;
            this.outerHTML = '<div class="table-avatar bg-slate-100 flex items-center justify-center p-1"><img src="/images/bunny_logo.png" alt="" class="w-full h-full object-contain opacity-50"></div>';
        };
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
        quickPromoBtn.className = 'action-btn text-warning me-2 needs-promo-edit';
        quickPromoBtn.title = 'Giảm giá nhanh';
        const quickPromoIcon = document.createElement('i');
        quickPromoIcon.className = 'fa-solid fa-tag';
        quickPromoBtn.appendChild(quickPromoIcon);
        quickPromoBtn.onclick = () => openQuickPromo(p._id);

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn needs-menu-edit';
        editBtn.title = 'Sửa';
        const editIcon = document.createElement('i');
        editIcon.className = 'fa-solid fa-pen';
        editBtn.appendChild(editIcon);
        editBtn.onclick = () => editProduct(p._id);

        const toggleBtn = document.createElement('button');
        if (isAvail) {
            toggleBtn.className = 'action-btn delete needs-menu-delete';
            toggleBtn.title = 'Ẩn món';
            const hideIcon = document.createElement('i');
            hideIcon.className = 'fa-solid fa-eye-slash';
            toggleBtn.appendChild(hideIcon);
            toggleBtn.onclick = () => deleteProduct(p._id);
        } else {
            toggleBtn.className = 'action-btn text-success needs-menu-delete';
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
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodBestSeller').checked = false;
    document.getElementById('prodPromoPrice').value = '';
    document.getElementById('prodPromoStart').value = '';
    document.getElementById('prodPromoEnd').value = '';
    document.getElementById('options-container').replaceChildren();
    document.getElementById('recipe-container').replaceChildren();
    document.getElementById('combo-groups-container').replaceChildren();
    const prodIsCombo = document.getElementById('prodIsCombo');
    if(prodIsCombo) {
        prodIsCombo.checked = false;
        toggleComboOptions();
    }
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
    
    const prodIsCombo = document.getElementById('prodIsCombo');
    if (prodIsCombo) {
        prodIsCombo.checked = !!product.is_combo;
        toggleComboOptions();
    }

    const promoStartMatch = product.promotional_price && product.promo_start_time ? new Date(product.promo_start_time) : null;
    const promoEndMatch = product.promotional_price && product.promo_end_time ? new Date(product.promo_end_time) : null;

    document.getElementById('prodPromoPrice').value = product.promotional_price || '';

    const formatDateTimeLocal = (date) => {
        if (!date || isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    document.getElementById('prodPromoStart').value = formatDateTimeLocal(promoStartMatch);
    document.getElementById('prodPromoEnd').value = formatDateTimeLocal(promoEndMatch);

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

    document.getElementById('recipe-container').replaceChildren();
    if (product.recipe && product.recipe.length > 0) {
        product.recipe.forEach(r => addRecipeRow(r.ingredientId, r.quantity));
    }

    const comboGroupsContainer = document.getElementById('combo-groups-container');
    if (comboGroupsContainer) {
        comboGroupsContainer.replaceChildren();
        if (product.is_combo && product.combo_items && product.combo_items.length > 0) {
            product.combo_items.forEach(group => {
                const block = addComboGroupBlock(group.name, group.maxSelect);
                if (group.items) {
                    group.items.forEach(item => {
                        addComboItemRow(block, item.id, item.priceExtra);
                    });
                }
            });
        }
    }

    document.getElementById('productModalLabel').innerText = 'Chỉnh sửa món';
    productModalInstance.show();
}

// --- Option & Choice Logic ---
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

    const inputRecipe = document.createElement('input');
    inputRecipe.type = 'hidden';
    inputRecipe.className = 'choice-recipe-data';
    inputRecipe.value = JSON.stringify(recipeData || []);

    const inputAbsolute = document.createElement('input');
    inputAbsolute.type = 'hidden';
    inputAbsolute.className = 'choice-is-absolute';
    inputAbsolute.value = isAbsolute ? 'true' : 'false';
    row.append(inputRecipe, inputAbsolute);

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

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-control form-control-sm recipe-qty';
    input.placeholder = 'Số lượng';
    input.value = qty;
    input.required = true;
    input.style.width = '100px';

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

    const recipeRows = document.querySelectorAll('.recipe-row');
    const recipe = [];
    recipeRows.forEach(row => {
        const ingId = row.querySelector('.recipe-ing').value;
        const qty = parseFloat(row.querySelector('.recipe-qty').value);
        if (ingId && !isNaN(qty)) {
            recipe.push({ ingredientId: ingId, quantity: qty });
        }
    });

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

    const isCombo = document.getElementById('prodIsCombo') ? document.getElementById('prodIsCombo').checked : false;
    const comboGroups = document.querySelectorAll('.combo-group-block');
    const comboItems = [];
    comboGroups.forEach(block => {
        const groupName = block.querySelector('.combo-group-name').value.trim();
        const maxSelect = parseInt(block.querySelector('.combo-max-select').value) || 1;
        if (!groupName) return;

        const itemRows = block.querySelectorAll('.combo-item-row');
        const items = [];
        itemRows.forEach(row => {
            const itemId = row.querySelector('.combo-item-id').value;
            const priceExtra = parseInt(row.querySelector('.combo-item-price').value) || 0;
            if (itemId) {
                items.push({ id: itemId, priceExtra: priceExtra });
            }
        });

        if (items.length > 0) {
            comboItems.push({ name: groupName, maxSelect: maxSelect, items: items });
        }
    });

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
        recipe: isCombo ? [] : recipe,
        options: isCombo ? [] : options,
        is_combo: isCombo,
        combo_items: isCombo ? comboItems : null
    };

    const imageUrl = document.getElementById('prodImg').value;
    if (imageUrl && imageUrl.startsWith('data:')) {
        showAdminToast('Vui lòng nhập URL hình ảnh (bắt đầu bằng https://...) thay vì tải ảnh trực tiếp.\nBạn có thể dùng ảnh từ Unsplash, Imgur.', 'warning');
        return;
    }

    if (!productData.name || isNaN(productData.price)) {
        showAdminToast("Vui lòng điền đầy đủ các thông tin bắt buộc.", 'warning');
        return;
    }

    try {
        if (id) {
            const { error } = await supabase.from('products').update(productData).eq('id', id).eq('tenant_id', window.AdminState.tenantId);
            if (error) throw error;
            logAudit('Cập nhật món', `ID: ${id}, Tên: ${productData.name}`);
        } else {
            productData.tenant_id = window.AdminState.tenantId;
            const { error } = await supabase.from('products').insert([productData]);
            if (error) throw error;
            logAudit('Thêm món mới', `Tên: ${productData.name}`);
        }

        productModalInstance.hide();
        fetchProducts();
    } catch (error) {
        console.error(error);
        showAdminToast("Lưu sản phẩm thất bại.", 'error');
    }
}

// --- Quick Promo ---
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
        const { error } = await supabase.from('products').update(promoData).eq('id', id).eq('tenant_id', window.AdminState.tenantId);
        if (error) throw error;
        logAudit('Cập nhật Quick Promo', `ID món: ${id}, Giá mới: ${priceStr}`);

        quickPromoModalInstance.hide();
        fetchProducts();
    } catch (e) {
        console.error(e);
        showAdminToast('Cập nhật khuyến mãi thất bại', 'error');
    }
}

async function deleteProduct(id) {
    const confirmed = await customConfirm('Bạn có chắc chắn muốn ẩn món này không?', 'Ẩn món khỏi thực đơn');
    if (!confirmed) return;

    try {
        const { error } = await supabase.from('products').update({ is_available: false }).eq('id', id).eq('tenant_id', window.AdminState.tenantId);
        if (error) throw error;
        fetchProducts();
    } catch (e) {
        console.error(e);
        showAdminToast("Lỗi kết nối máy chủ.", 'error');
    }
}

async function restoreProduct(id) {
    const confirmed = await customConfirm('Bạn có muốn hiển thị lại món này trên thực đơn không?', 'Hiện lại món');
    if (!confirmed) return;

    try {
        const { error } = await supabase.from('products').update({ is_available: true }).eq('id', id).eq('tenant_id', window.AdminState.tenantId);
        if (error) throw error;
        fetchProducts();
    } catch (e) {
        console.error(e);
        showAdminToast("Lỗi kết nối máy chủ.", 'error');
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

    let cachedInput = document.getElementById('currentChoiceRowId');
    if (!cachedInput) {
        cachedInput = document.createElement('input');
        cachedInput.type = 'hidden';
        cachedInput.id = 'currentChoiceRowId';
        document.querySelector('#choiceRecipeModal .modal-body').appendChild(cachedInput);
    }
    cachedInput.value = rowId;

    const isAbsolute = row.querySelector('.choice-is-absolute').value === 'true';
    const recipeData = JSON.parse(row.querySelector('.choice-recipe-data').value || '[]');

    document.getElementById('choiceIsAbsolute').checked = isAbsolute;

    const container = document.getElementById('choice-recipe-container');
    container.replaceChildren();

    if (recipeData && recipeData.length > 0) {
        recipeData.forEach(r => addChoiceRecipeRow(r.ingredientId, r.quantity));
    } else {
        addChoiceRecipeRow();
    }

    document.getElementById('choiceRecipeModalLabel').textContent = 'Công thức: ' + (row.querySelector('.choice-name').value || 'Tùy chọn');
    choiceRecipeModalInstance.show();
}

function addChoiceRecipeRow(ingId = '', qty = '') {
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 mb-2 choice-recipe-row';

    const select = document.createElement('select');
    select.className = 'form-select form-select-sm choice-recipe-ing bg-white text-slate-800 border-slate-200';
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
    input.className = 'form-control form-control-sm choice-recipe-qty bg-white text-slate-800 border-slate-200';
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

    row.querySelector('.choice-is-absolute').value = isAbsolute ? 'true' : 'false';
    row.querySelector('.choice-recipe-data').value = JSON.stringify(recipe);

    const btn = row.querySelector('.fa-spoon').parentElement;
    if (recipe.length > 0) {
        btn.className = 'btn btn-sm btn-info text-white';
    } else {
        btn.className = 'btn btn-sm btn-outline-info';
    }

    choiceRecipeModalInstance.hide();
}

// --- Combo Logic ---
function toggleComboOptions() {
    const isCombo = document.getElementById('prodIsCombo').checked;
    const normalSection = document.getElementById('normal-options-section');
    const comboSection = document.getElementById('combo-setup-section');
    
    if (isCombo) {
        if(normalSection) normalSection.classList.add('d-none');
        if(comboSection) comboSection.classList.remove('d-none');
    } else {
        if(normalSection) normalSection.classList.remove('d-none');
        if(comboSection) comboSection.classList.add('d-none');
    }
}

function addComboGroupBlock(groupName = '', maxSelect = 1) {
    const block = document.createElement('div');
    block.className = 'combo-group-block mb-3 p-3 bg-white border border-info rounded shadow-sm';

    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between align-items-center mb-2';

    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.className = 'form-control form-control-sm combo-group-name fw-bold';
    inputName.placeholder = 'Tên nhóm (VD: Chọn 1 Nước)';
    inputName.value = groupName;
    inputName.style.maxWidth = '250px';

    const inputMaxWrapper = document.createElement('div');
    inputMaxWrapper.className = 'd-flex align-items-center ms-2';
    inputMaxWrapper.innerHTML = '<span class="small me-2 text-muted text-nowrap">Chọn tối đa:</span>';
    
    const inputMax = document.createElement('input');
    inputMax.type = 'number';
    inputMax.className = 'form-control form-control-sm combo-max-select';
    inputMax.style.width = '70px';
    inputMax.min = 1;
    inputMax.value = maxSelect;
    
    inputMaxWrapper.appendChild(inputMax);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-sm btn-outline-danger ms-auto';
    delBtn.textContent = 'Xóa Nhóm';
    delBtn.onclick = () => block.remove();

    header.append(inputName, inputMaxWrapper, delBtn);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'combo-items-container mb-2';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-sm btn-outline-secondary mt-2';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Thêm món con';
    addBtn.onclick = () => addComboItemRow(block);

    block.append(header, itemsContainer, addBtn);
    document.getElementById('combo-groups-container').appendChild(block);
    return block;
}

function addComboItemRow(block, itemId = '', priceExtra = 0) {
    const container = block.querySelector('.combo-items-container');
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 mb-2 combo-item-row align-items-center';

    const select = document.createElement('select');
    select.className = 'form-select form-select-sm combo-item-id';
    select.required = true;
    
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Chọn món --';
    select.appendChild(defaultOpt);
    
    products.forEach(p => {
        if (!p.is_combo) { // Cannot put a combo inside a combo
            const opt = document.createElement('option');
            opt.value = p._id;
            opt.textContent = `${p.name} (${p.price.toLocaleString('vi-VN')}đ)`;
            if (p._id == itemId || String(p.id) === String(itemId)) opt.selected = true;
            select.appendChild(opt);
        }
    });

    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group input-group-sm';
    inputGroup.style.width = '180px';

    const span1 = document.createElement('span');
    span1.className = 'input-group-text';
    span1.textContent = '+';

    const inputPrice = document.createElement('input');
    inputPrice.type = 'number';
    inputPrice.className = 'form-control combo-item-price';
    inputPrice.placeholder = 'Kèm giá';
    inputPrice.value = priceExtra;

    const span2 = document.createElement('span');
    span2.className = 'input-group-text';
    span2.textContent = 'đ';

    inputGroup.append(span1, inputPrice, span2);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-sm btn-outline-danger';
    delBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
    delBtn.onclick = () => row.remove();

    row.append(select, inputGroup, delBtn);
    container.appendChild(row);
}
