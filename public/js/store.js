// Central State Store for Cafe QR App
// This helps manage the global state without relying on window object.

export const store = {
    // Menu Data
    categories: [],
    menuItems: [],
    ingredientStock: [],

    // Cart Data
    cart: [],
    checkoutOption: null, // 'pay_now' or 'pay_later'
    cartNotes: "",
    deliveryAddress: null, // For delivery orders
    deliveryDistance: null,

    // Session Data
    tableNumber: null,
    sessionId: null,
    activeOrderId: null,

    // Ad banners
    adBanners: []
};

// --- Mutations ---

export function updateTableNumber(number) {
    store.tableNumber = number;
}

export function updateSessionId(id) {
    store.sessionId = id;
}

export function setCategories(data) {
    store.categories = data;
}

export function setMenuItems(data) {
    store.menuItems = data;
}

export function setIngredientStock(data) {
    store.ingredientStock = data;
}

export function setAdBanners(data) {
    store.adBanners = data;
}

// Cart operations
export function addToCart(item) {
    const existingItem = store.cart.find(i => 
        i.id === item.id && 
        i.size === item.size && 
        JSON.stringify(i.toppings || []) === JSON.stringify(item.toppings || [])
    );

    if (existingItem) {
        existingItem.quantity += item.quantity || 1;
    } else {
        store.cart.push({
            ...item,
            quantity: item.quantity || 1,
            size: item.size || 'M',
            toppings: item.toppings || []
        });
    }
}

export function updateCartQuantity(index, quantity) {
    if (store.cart[index]) {
        if (quantity <= 0) {
            store.cart.splice(index, 1);
        } else {
            store.cart[index].quantity = quantity;
        }
    }
}

export function clearCart() {
    store.cart = [];
}

export function updateCheckoutOption(option) {
    store.checkoutOption = option;
}

export function setActiveOrderId(id) {
    store.activeOrderId = id;
}

// Delivery setup
export function setDeliveryData(address, distance) {
    store.deliveryAddress = address;
    store.deliveryDistance = distance;
}
