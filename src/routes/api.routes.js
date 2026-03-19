const express = require('express');
const authController = require('../controllers/auth.controller');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// Auth Routes
router.post('/login', authController.login);

// Webhook Routes (SePay / Casso)
router.post('/webhook/payment', webhookController.handlePaymentWebhook);

// Catch-all for legacy API routes
router.all('/*', (req, res) => {
    res.status(404).json({ error: 'Legacy API route. Database operations moved to Supabase.' });
});

module.exports = router;
