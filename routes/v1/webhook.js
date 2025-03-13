const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const QRCodeModel = require("../schemas/v1/QRcode.shema");

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;

  try {
    event = JSON.parse(req.body);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ตรวจสอบประเภทของ Event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    // อัปเดตสถานะการชำระเงิน
    const qrCodeData = await QRCodeModel.findOne({ stripePaymentId: paymentIntent.id });

    if (qrCodeData) {
      qrCodeData.isPaid = true;
      await qrCodeData.save();
      console.log(`✅ ชำระเงินสำเร็จสำหรับ QR Code ID: ${qrCodeData._id}`);
    }
  }

  res.json({ received: true });
});

module.exports = router;