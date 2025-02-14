const express = require("express");
const paymentController = require("../../controllers/paymentController"); // นำเข้า controller
const router = express.Router();

// เส้นทาง POST /generate-qr สำหรับสร้าง QR Code
router.post("/generate-qr", paymentController.generatePromptPayQR);

// เส้นทาง POST /pay/creditcard/:id สำหรับชำระเงินผ่านบัตรเครดิต
router.post("/pay/creditcard/:id", paymentController.payWithCreditCard);

// เส้นทาง POST /pay/ewallet/:id สำหรับชำระเงินผ่าน TrueMoney Wallet
router.post("/pay/ewallet/:id", paymentController.payWithEWallet);

// เส้นทาง GET /payment-status/:id สำหรับตรวจสอบสถานะการชำระเงิน
router.get("/payment-status/:id", paymentController.checkPaymentStatus);

router.post("/create-payment-intent", async (req, res) => {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000, // จำนวนเงิน (หน่วยเป็นสตางค์) -> 1000 = 10 บาท
        currency: "thb",
      });
  
      res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });
  


// เส้นทาง POST /upload-slip/:id สำหรับอัปโหลดสลิปการชำระเงิน
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // กำหนดโฟลเดอร์อัปโหลด
router.post("/upload-slip/:id", upload.single("slipImage"), paymentController.uploadSlip);

module.exports = router;
