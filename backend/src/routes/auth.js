/**
 * 認證路由
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// 公開路由
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

// 需要認證的路由
router.get('/me', verifyToken, AuthController.me);

// 管理員功能
router.post('/reset-passwords', verifyToken, requireAdmin, AuthController.resetPasswords);

module.exports = router;
