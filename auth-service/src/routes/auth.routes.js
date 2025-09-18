const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controllers');
const rateLimit = require('express-rate-limit');
const {
  validate,
  registerSchema,
  loginSchema,
  updatePasswordSchema,
  updateEmailSchema,
  forgotPasswordSchema,
  resetPasswordOtpSchema,
} = require("../middleware/validation.middleware");

const authenticateToken = require("../middleware/auth.middleware");

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many login attemps for this IP, plear try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders:false,
});

router.post("/register", authRateLimiter,validate(registerSchema), authController.register);

router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

router.post('/token/refresh', authRateLimiter, authController.refreshAccessToken);

router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

router.post('/reset-password-otp', authRateLimiter, validate(resetPasswordOtpSchema), authController.resetPasswordWithOTP);

router.get('/profile', authenticateToken, authController.getUserProfile);

router.put('/profile', authenticateToken, authController.updateProfile);

router.put('/update-password', authenticateToken, validate(updatePasswordSchema), authController.updatePassword);

router.put('/update-email', authenticateToken, validate(updateEmailSchema), authController.updateEmail);

router.post('/logout', authenticateToken, authController.logout);


module.exports = router;
