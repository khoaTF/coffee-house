const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// Webhook Routes (SePay / Casso)
router.post('/webhook/payment', webhookController.handlePaymentWebhook);

// Catch-all for legacy API routes
router.use((req, res) => {
    res.status(404).json({ error: 'Legacy API route. Database operations moved to Supabase.' });
});

module.exports = router;
