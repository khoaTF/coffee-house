const express = require('express');
const webhookController = require('../controllers/webhook.controller');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

// Webhook Routes (SePay / Casso)
router.post('/webhook/payment', webhookController.handlePaymentWebhook);

// Notification Integration Routes
router.post('/notifications/test-telegram', notificationController.testTelegram);
router.post('/notifications/test-webhook', notificationController.testWebhook);
router.post('/notifications/save-config', notificationController.saveConfig);
router.post('/notifications/send', notificationController.sendManual);

// Catch-all for legacy API routes
router.use((req, res) => {
    res.status(404).json({ error: 'Legacy API route. Database operations moved to Supabase.' });
});

module.exports = router;
