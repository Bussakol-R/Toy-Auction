const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/paymentController'); // ✅ import ไฟล์ controller ถูกต้อง

// ตั้งค่า Webhook สำหรับ Stripe
router.post('/webhook', paymentController.handleWebhook); 

// Route สำหรับสร้าง Payment Intent
router.post('/create-payment-intent', paymentController.createStripePaymentIntent);

// Route สำหรับเช็คสถานะการชำระเงิน
router.get('/check-payment/:id', paymentController.checkPaymentStatus);

module.exports = router;
