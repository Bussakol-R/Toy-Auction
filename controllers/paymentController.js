const qrcode = require("qrcode");
const generatePayload = require("promptpay-qr");
const QRCodeModel = require("../schemas/v1/QRcode.schema");
const stripe = require("stripe")("sk_test_51QrCtrP7PVqCIUzGNdOXSKHCBWRx73YiJgPXwasJDbQ58ZVFGDZCIEQEniy9IR5hcr26eTq5Ovm1Om2SLqWmN1UW00eDJq54sp"); // ใช้ Stripe
const omise = require("omise")({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY,
});

// ฟังก์ชันสร้าง QR Code พร้อมเพย์
exports.generatePromptPayQR = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { recipient, amount } = req.body;

    // ตรวจสอบเบอร์โทรหรือเลขบัตรประชาชน
    if (!recipient || (!/^\d{10}$/.test(recipient) && !/^\d{13}$/.test(recipient))) {
      return res.status(400).json({ error: "หมายเลขพร้อมเพย์ต้องมี 10 หลัก (เบอร์โทรศัพท์) หรือ 13 หลัก (บัตรประชาชน)" });
    }

    // ตรวจสอบจำนวนเงิน
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "จำนวนเงินต้องเป็นตัวเลขและมากกว่า 0" });
    }

    // สร้าง QR Code
    const payload = generatePayload(recipient, { amount: parseFloat(amount) });
    const qrCode = await qrcode.toDataURL(payload);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // หมดอายุใน 3 นาที

    // บันทึกลง MongoDB
    const qrCodeData = new QRCodeModel({
      recipient,
      amount: parseFloat(amount),
      payload,
      qrCode,
      expiresAt,
      isPaid: false,
      slipImage: null, // เพิ่มคอลัมน์สำหรับอัปโหลดสลิป
    });
    const newQR = new QRCodeModel(qrCodeData);
    await qrCodeData.save();

    res.status(200).json({
      success: true,
      message: "สร้าง QR Code สำเร็จ",
      qrCode,
      payload,
      expiresAt,
      id: newQR.id
    });
  } catch (error) {
    console.error("Error generating QR Code:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
};
// ฟังก์ชันสำหรับชำระเงินผ่านบัตรเครดิต (Stripe)
exports.payWithCreditCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { token, amount } = req.body;

    if (!token || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // สร้างการชำระเงินผ่าน Stripe
    const charge = await stripe.charges.create({
      amount: amount *100 , // หน่วยเป็นสตางค์
      currency: "thb",
      source: token,
      description: `Payment for Order ID: ${id}`,
    });

    res.status(200).json({ success: true, charge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ฟังก์ชันสำหรับชำระเงินผ่าน Omise e-Wallet (TrueMoney Wallet)
exports.payWithEWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { phoneNumber, amount } = req.body;

    const qrCodeData = await QRCodeModel.findById(id);
    if (!qrCodeData) {
      return res.status(404).json({ error: "ไม่พบ QR Code" });
    }

    const charge = await omise.charges.create({
      amount: amount * 100, // แปลงเป็นสตางค์
      currency: "thb",
      source: {
        type: "truemoney",
        phone_number: phoneNumber,
      },
      description: `Payment for QR Code ${id}`,
    });

    if (charge.status === "successful") {
      qrCodeData.isPaid = true;
      await qrCodeData.save();
      return res.status(200).json({ success: true, message: "ชำระเงินสำเร็จผ่าน TrueMoney Wallet" });
    } else {
      return res.status(400).json({ error: "การชำระเงินล้มเหลว" });
    }
  } catch (error) {
    console.error("Error processing e-Wallet payment:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
};

// ฟังก์ชันตรวจสอบสถานะการชำระเงิน
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const qrCodeData = await QRCodeModel.findById(id);

    if (!qrCodeData) {
      return res.status(404).json({ error: "ไม่พบ QR Code" });
    }

    // ตรวจสอบว่า QR Code หมดอายุหรือยัง
    if (new Date() > qrCodeData.expiresAt) {
      qrCodeData.isPaid = false;
      await qrCodeData.save();
      return res.status(400).json({ error: "QR Code หมดอายุแล้ว" });
    }
    
    res.status(200).json({
      success: true,
      qrCodeId: id,
      isPaid: qrCodeData.isPaid,
      slipImage: qrCodeData.slipImage,
      message: qrCodeData.isPaid ? "การชำระเงินสำเร็จ" : "ยังไม่ได้ทำการชำระเงิน",
    });
  } catch (error) {
    console.error("Error checking payment status:", error.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
};

// ฟังก์ชันสำหรับอัปโหลดสลิป
exports.uploadSlip = async (req, res) => {
  try {
    const { id } = req.params;
    const slipImage = req.file ? req.file.path : null; // ใช้ multer เพื่ออัปโหลดไฟล์

    if (!slipImage) {
      return res.status(400).json({ error: "กรุณาอัปโหลดรูปภาพสลิป" });
    }

    const qrCodeData = await QRCodeModel.findById(id);

    if (!qrCodeData) {
      return res.status(404).json({ error: "ไม่พบ QR Code" });
    }

    // อัปเดตข้อมูลสลิปในฐานข้อมูล
    qrCodeData.slipImage = slipImage;
    qrCodeData.isPaid = true;
    await qrCodeData.save();

    res.status(200).json({
      success: true,
      message: "อัปโหลดสลิปสำเร็จ",
      slipImage,
    });
  } catch (error) {
    console.error("Error uploading slip:", error.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
};
