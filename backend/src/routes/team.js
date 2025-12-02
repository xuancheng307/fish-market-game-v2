/**
 * 團隊路由
 */

const express = require('express');
const router = express.Router();
const TeamController = require('../controllers/TeamController');
const { verifyToken } = require('../middleware/auth');

// 所有團隊路由都需要認證
router.use(verifyToken);

// 投標相關
router.post('/bids', TeamController.submitBid);
router.get('/games/:gameId/bids', TeamController.getTeamBids);
router.put('/bids/:id', TeamController.updateBid);
router.delete('/bids/:id', TeamController.deleteBid);

// 遊戲狀態
router.get('/games/:id/my-status', TeamController.getMyStatus);
router.get('/games/:id/teams', TeamController.getAllTeams);
router.get('/games/:id/status', TeamController.getGameStatus);

module.exports = router;
