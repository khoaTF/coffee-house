// ====================================================
// customer-ui.js — Shared UI utilities (alert, confirm)
// ====================================================

// Custom confirm for customer page (avoid native confirm() which can be blocked)
export function customerConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const body = document.getElementById('confirmModalBody');
        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');

        if (!modal || !body || !okBtn || !cancelBtn) { console.error("Confirm modal not found"); return resolve(false); }

        body.textContent = message;
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        const closeModal = (result) => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            resolve(result);
        };

        newOk.addEventListener('click', () => closeModal(true), { once: true });
        newCancel.addEventListener('click', () => closeModal(false), { once: true });
    });
}

export function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Custom alert for mobile friendliness
export function customerAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const body = document.getElementById('confirmModalBody');
        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');
        
        if (!modal || !body || !okBtn || !cancelBtn) return resolve(true);

        body.textContent = message;
        
        const titleEl = modal.querySelector('h5');
        const prevTitleHTML = titleEl.innerHTML;
        titleEl.innerHTML = '<i class="fa-solid fa-circle-info text-[#FF7A00] mr-2"></i>Thông báo';

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newOk.className = 'bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white py-2.5 rounded-full font-bold active:scale-95 transition-transform shadow-lg shadow-[#FF7A00]/20 col-span-2';
        newOk.textContent = 'Đóng';
        newCancel.style.display = 'none';

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            newOk.className = 'bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white py-2.5 rounded-full font-bold active:scale-95 transition-transform shadow-lg shadow-[#FF7A00]/20';
            newOk.textContent = 'Đồng ý';
            newCancel.style.display = 'block';
            titleEl.innerHTML = prevTitleHTML;
            resolve(true);
        };

        newOk.addEventListener('click', () => closeModal(), { once: true });
    });
}
