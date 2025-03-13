//const qrcode = require("qrcode");
//const generatePayload = require("promptpay-qr");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const QRCodeModel = require("../schemas/v1/QRcode.schema");
exports.handleWebhook = (req, res) => {
  console.log('Received Webhook:', req.body);
  res.status(200).send('Webhook received');
};
// ฟังก์ชันสร้าง Payment Intent ใน Stripe
exports.createStripePaymentIntent = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { amount, currency = "thb" } = req.body;

    // ตรวจสอบจำนวนเงิน
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "จำนวนเงินต้องเป็นตัวเลขและมากกว่า 0" });
    }

    // สร้าง Payment Intent บน Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // แปลงเป็นสตางค์
      currency,
      payment_method_types: ["promptpay"], // ใช้ PromptPay ผ่าน Stripe
    });

    // บันทึกลง MongoDB
    const qrCodeData = new QRCodeModel({
      amount: parseFloat(amount),
      stripePaymentId: paymentIntent.id,
      expiresAt: new Date(Date.now() + 3 * 60 * 1000), // หมดอายุใน 3 นาที
      isPaid: false,
      slipImage: null,
    });

    await qrCodeData.save();

    res.status(200).json({
      success: true,
      message: "สร้าง Payment Intent สำเร็จ",
      clientSecret: paymentIntent.client_secret,
      stripePaymentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating Stripe Payment Intent:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
};
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const qrCodeData = await QRCodeModel.findById(id);

    if (!qrCodeData) {
      return res.status(404).json({ error: "ไม่พบ Payment" });
    }

    // ดึงข้อมูลการชำระเงินจาก Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(qrCodeData.stripePaymentId);

    res.status(200).json({
      success: true,
      stripePaymentId: qrCodeData.stripePaymentId,
      isPaid: paymentIntent.status === "succeeded",
      message: paymentIntent.status === "succeeded" ? "การชำระเงินสำเร็จ" : "ยังไม่ได้ชำระเงิน",
    });
  } catch (error) {
    console.error("Error checking payment status:", error.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
};
