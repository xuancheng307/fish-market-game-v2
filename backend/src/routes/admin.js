/**
 * 管理員路由
 */

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// 所有管理員路由都需要認證和管理員權限
router.use(verifyToken);
router.use(requireAdmin);

// 遊戲管理
router.post('/games', AdminController.createGame);
router.get('/games', AdminController.getAllGames);
router.get('/games/:id', AdminController.getGameDetails);

// 遊戲流程控制
router.post('/games/:id/start-buying', AdminController.startBuying);
router.post('/games/:id/close-buying', AdminController.closeBuying);
router.post('/games/:id/start-selling', AdminController.startSelling);
router.post('/games/:id/close-selling', AdminController.closeSelling);
router.post('/games/:id/settle', AdminController.settle);
router.post('/games/:id/next-day', AdminController.nextDay);

// 遊戲控制
router.post('/games/:id/force-end', AdminController.forceEnd);
router.post('/games/:id/pause', AdminController.pause);
router.post('/games/:id/resume', AdminController.resume);

// 數據查詢
router.get('/games/:gameId/bids', AdminController.getAllBids);
router.get('/games/:gameId/daily-results', AdminController.getDailyResults);

module.exports = router;
