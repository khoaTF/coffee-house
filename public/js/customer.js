// ====================================================
// customer.js — Thin Entry Point (v3.0)
// ====================================================
// This file serves as the minimal bootstrap for the customer-facing app.
// All logic has been extracted into ES modules under /js/modules/.
//
// Module Map:
//   customer-config.js   — Shared state, constants, DOM refs
//   customer-session.js  — Session management, auto-transfer, heartbeat, init()
//   customer-ui.js       — UI utilities (customerAlert, customerConfirm)
//   customer-menu.js     — Menu fetching, rendering, categories, store hours
//   customer-cart.js     — Cart CRUD, UI updates, upsell logic
//   customer-modal.js    — Modal open/close, event listeners
//   customer-order.js    — Order placement, RPC calls, realtime, history
//   customer-loyalty.js  — VIP tiers, phone verification, loyalty, promo codes
//   customer-feedback.js — Feedback, FAB, staff requests, PWA, dark mode
// ====================================================

import { init } from './modules/customer-session.js';

// Side-effect imports: these modules attach window globals & event listeners
import './modules/customer-feedback.js';

// Boot the app
init();
