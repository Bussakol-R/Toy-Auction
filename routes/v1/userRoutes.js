const express = require("express");
const router = express.Router();

// ตัวอย่าง Endpoint
router.get("/", (req, res) => {
  res.status(200).json({ message: "User endpoint working!" });
});

module.exports = router;
