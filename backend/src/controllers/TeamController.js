/**
 * TeamController - 團隊控制器
 * ⚠️ 所有回應使用 transformers 轉換為 camelCase
 */

const BidService = require('../services/BidService');
const GameService = require('../services/GameService');
const Game = require('../models/Game');
const Team = require('../models/Team');
const LoanService = require('../services/LoanService');
const {
    bidToApi,
    teamToApi,
    gameToApi,
    gameDayToApi
} = require('../utils/transformers');
const { asyncHandler } = require('../middleware/errorHandler');

class TeamController {
    /**
     * GET /api/team/active-game - 獲取當前進行中的遊戲
     * ⚠️ 只返回該用戶有參與的 active 遊戲
     */
    static getActiveGame = asyncHandler(async (req, res) => {
        const games = await Game.findAll();
        const activeGames = games.filter(g => g.status === 'active');

        if (activeGames.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: '沒有進行中的遊戲'
            });
        }

        // 找到用戶有參與的 active 遊戲
        let myActiveGame = null;
        for (const game of activeGames) {
            const team = await Team.findByGameAndUser(game.id, req.user.id);
            if (team) {
                myActiveGame = game;
                break;
            }
        }

        if (!myActiveGame) {
            return res.json({
                success: true,
                data: null,
                message: '您未參與任何進行中的遊戲'
            });
        }

        res.json({
            success: true,
            data: gameToApi(myActiveGame),
            message: '獲取成功'
        });
    });

    /**
     * POST /api/bids - 提交投標
     */
    static submitBid = asyncHandler(async (req, res) => {
        const result = await BidService.submitBid(req.user.id, req.body);

        res.json({
            success: true,
            message: '投標提交成功',
            data: {
                bid: bidToApi(result.bid),  // ⚠️ 轉換為 camelCase
                loanInfo: result.loanInfo
            }
        });
    });

    /**
     * GET /api/games/:gameId/bids - 獲取投標記錄
     */
    static getTeamBids = asyncHandler(async (req, res) => {
        const { gameId } = req.params;
        const { dayNumber } = req.query;

        const bids = await BidService.getTeamBids(
            req.user.id,
            parseInt(gameId),
            dayNumber ? parseInt(dayNumber) : null
        );

        res.json({
            success: true,
            data: bids.map(bid => bidToApi(bid))  // ⚠️ 轉換為 camelCase
        });
    });

    /**
     * PUT /api/bids/:id - 更新投標
     */
    static updateBid = asyncHandler(async (req, res) => {
        const bid = await BidService.updateBid(req.params.id, req.user.id, req.body);

        res.json({
            success: true,
            message: '投標更新成功',
            data: bidToApi(bid)
        });
    });

    /**
     * DELETE /api/bids/:id - 刪除投標
     */
    static deleteBid = asyncHandler(async (req, res) => {
        await BidService.deleteBid(req.params.id, req.user.id);

        res.json({
            success: true,
            message: '投標已刪除'
        });
    });

    /**
     * GET /api/games/:id/my-status - 獲取我的狀態
     */
    static getMyStatus = asyncHandler(async (req, res) => {
        const { game, currentDay, teams } = await GameService.getGameStatus(req.params.id);

        // 找到當前用戶的團隊
        const myTeam = teams.find(t => t.user_id === req.user.id);

        if (!myTeam) {
            return res.json({
                success: false,
                message: '您未參與此遊戲'
            });
        }

        // 獲取借貸狀態
        const loanStatus = await LoanService.getLoanStatus(myTeam.id);

        // 獲取當前天數的投標記錄
        const bids = await BidService.getTeamBids(req.user.id, parseInt(req.params.id), game.current_day);

        // 獲取歷史每日結果
        const DailyResult = require('../models/DailyResult');
        const { dailyResultToApi } = require('../utils/transformers');
        const dailyResults = await DailyResult.findByTeam(myTeam.id, parseInt(req.params.id));

        res.json({
            success: true,
            data: {
                game: gameToApi(game),  // ⚠️ 轉換為 camelCase
                currentDay: gameDayToApi(currentDay),
                myTeam: teamToApi(myTeam),
                loanStatus,
                myBids: bids.map(bid => bidToApi(bid)),
                dailyResults: dailyResults.map(dr => dailyResultToApi(dr))  // 新增：歷史每日結果
            }
        });
    });

    /**
     * GET /api/games/:id/teams - 獲取所有團隊狀態
     */
    static getAllTeams = asyncHandler(async (req, res) => {
        const teams = await Team.findByGame(parseInt(req.params.id));

        res.json({
            success: true,
            data: teams.map(team => teamToApi(team))  // ⚠️ 轉換為 camelCase
        });
    });

    /**
     * GET /api/games/:id/status - 獲取遊戲狀態（公開）
     */
    static getGameStatus = asyncHandler(async (req, res) => {
        const { game, currentDay } = await GameService.getGameStatus(req.params.id);

        res.json({
            success: true,
            data: {
                game: gameToApi(game),
                currentDay: gameDayToApi(currentDay)
            }
        });
    });
}

module.exports = TeamController;
