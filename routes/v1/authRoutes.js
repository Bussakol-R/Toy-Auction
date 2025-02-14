const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require('jsonwebtoken');

const {
  registerRateLimiter,
  loginRateLimiter,
} = require("../../modules/ratelimit/authRatelimiter");

const {
  register,
  login,
  logout,
  refresh,
  dashboard,
  googleCallback,
  lineCallback,
  googleFlutterLogin,
} = require("../../controllers/authControllers");

const {
  verifyAccessToken,
  verifyRefreshToken,
} = require("../../middlewares/auth");

//? Register
router.post("/register", registerRateLimiter, register);

//? Login
router.post("/login", loginRateLimiter, login);

router.post('/login', async (req, res) => {
  const token = jwt.sign({ userId: '12345' }, 'secret_key', { expiresIn: '1h' });
  res.json({ token });
});

//? Logout
router.post("/logout", loginRateLimiter, logout);

router.post("/refresh", verifyRefreshToken, refresh);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleCallback
);

router.post("/google", loginRateLimiter, googleFlutterLogin);

router.get("/line", passport.authenticate("line", { session: false }));

router.get(
  "/line/callback",
  passport.authenticate("line", { session: false }),
  lineCallback
);

module.exports = router;