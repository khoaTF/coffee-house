// ====================================================
// customer-config.js — Shared state, constants, DOM refs
// ====================================================

// URL params & table
export const queryParams = new URLSearchParams(window.location.search);
export const TABLE_NUMBER = queryParams.get('table') || '1';
export const STORE_SLUG = queryParams.get('store') || 'legacy'; // Multi-tenant route

// Mutable shared state (exported as object so mutations propagate)
export const state = {
    tenantId: null,
    menuItems: [],
    cart: [],
    activeOrderId: null,
    trackedOrderId: null,
    ingredientStock: {},
    sessionOrders: [],
    customerHistoryOrders: [],
    suggestedItems: [],
    currentComboItem: null,
    currentComboSelections: {},
    currentFeedbackOrderId: null,
    currentOptionsItem: null,
    appliedPromo: null,
    currentDiscountAmount: 0,
    currentPaymentMethod: 'cash',
    selectedRating: 0,
    popupSelectedRating: 0
};

// Per-table session
export const sessionKey = 'cafe_session_' + TABLE_NUMBER;
export let sessionId = localStorage.getItem(sessionKey) || null;
export function setSessionId(id) { sessionId = id; localStorage.setItem(sessionKey, id); }

// Window globals for cross-module compat
window.currentCustomerPhone = localStorage.getItem('customerPhone') || null;
window.currentCustomerPoints = 0;
window.loyaltyDiscountApplied = false;
window.upsellShown = false;

// Status Map
export const statusMap = {
    'Pending':    { text: 'Đang chờ',    class: 'text-primary' },
    'Preparing':  { text: 'Đang làm',    class: 'text-warning font-bold', color: '#ecc94b' },
    'Ready':      { text: 'Đã xong',     class: 'text-success font-bold' },
    'Completed':  { text: 'Hoàn thành',  class: 'text-muted' },
    'Cancelled':  { text: 'Đã Hủy',     class: 'text-danger font-bold' }
};

// DOM Elements
export const dom = {
    menuContainer:        document.getElementById('menu-container'),
    loader:               document.getElementById('loader'),
    floatingCart:          document.getElementById('floating-cart'),
    topCartCount:          document.getElementById('cart-count'),
    dockedCartSummary:     document.getElementById('docked-cart-summary'),
    cartItemCountDocked:   document.getElementById('cart-item-count-docked'),
    cartTotalPriceDocked:  document.getElementById('cart-total-price-docked'),
    viewCartBtnDocked:     document.getElementById('view-cart-btn-docked'),
    cartModal:             document.getElementById('cart-modal'),
    optionsModal:          document.getElementById('options-modal'),
    closeOptionsBtn:       document.getElementById('close-options-modal'),
    confirmOptionsBtn:     document.getElementById('confirm-options-btn'),
    closeModalBtn:         document.getElementById('close-modal'),
    cartItemsContainer:    document.getElementById('cart-items-container'),
    checkoutTotal:         document.getElementById('checkout-total'),
    checkoutCashBtn:       document.getElementById('checkout-cash-btn'),
    checkoutTransferBtn:   document.getElementById('checkout-transfer-btn'),
    liveOrderBanner:       document.getElementById('live-order-banner'),
    liveStatus:            document.getElementById('live-status'),
    historyModal:          document.getElementById('order-history-modal'),
    closeHistoryModalBtn:  document.getElementById('close-history-modal'),
    historyItemsContainer: document.getElementById('history-items-container'),
    myOrdersBtn:           document.getElementById('my-orders-btn')
};
