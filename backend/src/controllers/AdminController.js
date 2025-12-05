/**
 * AdminController - 管理員控制器
 * ⚠️ 所有回應使用 transformers 轉換為 camelCase
 * ⚠️ 所有階段變更會透過 Socket.IO 廣播到遊戲房間
 */

const GameService = require('../services/GameService');
const Game = require('../models/Game');
const Bid = require('../models/Bid');
const DailyResult = require('../models/DailyResult');
const {
    gameToApi,
    gameDayToApi,
    teamToApi,
    bidToApi,
    dailyResultToApi,
    apiToGame
} = require('../utils/transformers');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 廣播遊戲事件到所有連接的客戶端
 * @param {object} req - Express request 物件
 * @param {number} gameId - 遊戲 ID
 * @param {string} event - 事件名稱
 * @param {object} data - 事件資料
 */
const broadcastToGame = (req, gameId, event, data) => {
    const io = req.app.get('io');
    if (io) {
        io.to(`game-${gameId}`).emit(event, data);
        console.log(`[Socket.IO] 廣播事件 ${event} 到遊戲 ${gameId}`);
    }
};

class AdminController {
    /**
     * POST /api/admin/games - 創建遊戲
     */
    static createGame = asyncHandler(async (req, res) => {
        // ⚠️ 將 camelCase 轉換為 snake_case
        const gameData = apiToGame(req.body);
        const game = await GameService.createGame(gameData);

        res.json({
            success: true,
            message: '遊戲創建成功',
            data: gameToApi(game)  // ⚠️ 轉換為 camelCase
        });
    });

    /**
     * GET /api/admin/games - 獲取所有遊戲
     */
    static getAllGames = asyncHandler(async (req, res) => {
        const games = await Game.findAll();

        res.json({
            success: true,
            data: games.map(game => gameToApi(game))  // ⚠️ 轉換為 camelCase
        });
    });

    /**
     * GET /api/admin/games/:id - 獲取遊戲詳情
     */
    static getGameDetails = asyncHandler(async (req, res) => {
        const { game, currentDay, teams } = await GameService.getGameStatus(req.params.id);

        res.json({
            success: true,
            data: {
                game: gameToApi(game),  // ⚠️ 轉換為 camelCase
                currentDay: gameDayToApi(currentDay),
                teams: teams.map(team => teamToApi(team))
            }
        });
    });

    /**
     * POST /api/admin/games/:id/start-buying - 開始買入投標
     */
    static startBuying = asyncHandler(async (req, res) => {
        const game = await GameService.startBuying(req.params.id, req.body);

        // ⚠️ 廣播階段變更
        broadcastToGame(req, req.params.id, 'phaseChange', {
            phase: game.phase,
            game: gameToApi(game)
        });

        res.json({
            success: true,
            message: '買入投標已開始',
            data: gameToApi(game)  // ⚠️ 返回 game (含 phase)
        });
    });

    /**
     * POST /api/admin/games/:id/close-buying - 關閉買入投標
     */
    static closeBuying = asyncHandler(async (req, res) => {
        const result = await GameService.closeBuying(req.params.id);

        // ⚠️ 廣播階段變更
        broadcastToGame(req, req.params.id, 'phaseChange', {
            phase: result.game.phase,
            game: gameToApi(result.game)
        });

        res.json({
            success: true,
            message: '買入投標已關閉，結算完成',
            data: {
                game: gameToApi(result.game),  // ⚠️ 返回 game (含 phase)
                settlementResults: result.settlementResults
            }
        });
    });

    /**
     * POST /api/admin/games/:id/start-selling - 開始賣出投標
     */
    static startSelling = asyncHandler(async (req, res) => {
        const game = await GameService.startSelling(req.params.id, req.body);

        // ⚠️ 廣播階段變更
        broadcastToGame(req, req.params.id, 'phaseChange', {
            phase: game.phase,
            game: gameToApi(game)
        });

        res.json({
            success: true,
            message: '賣出投標已開始',
            data: gameToApi(game)  // ⚠️ 返回 game (含 phase)
        });
    });

    /**
     * POST /api/admin/games/:id/close-selling - 關閉賣出投標
     */
    static closeSelling = asyncHandler(async (req, res) => {
        const result = await GameService.closeSelling(req.params.id);

        // ⚠️ 廣播階段變更
        broadcastToGame(req, req.params.id, 'phaseChange', {
            phase: result.game.phase,
            game: gameToApi(result.game)
        });

        res.json({
            success: true,
            message: '賣出投標已關閉，結算完成',
            data: {
                game: gameToApi(result.game),  // ⚠️ 返回 game (含 phase)
                settlementResults: result.settlementResults
            }
        });
    });

    /**
     * POST /api/admin/games/:id/settle - 執行每日結算
     */
    static settle = asyncHandler(async (req, res) => {
        const result = await GameService.settle(req.params.id);

        // ⚠️ 廣播結算完成
        broadcastToGame(req, req.params.id, 'settlementComplete', {
            phase: result.game.phase,
            game: gameToApi(result.game),
            results: result.settlementResults
        });

        res.json({
            success: true,
            message: '每日結算完成',
            data: {
                game: gameToApi(result.game),  // ⚠️ 返回 game (含 phase)
                settlementResults: result.settlementResults
            }
        });
    });

    /**
     * POST /api/admin/games/:id/next-day - 推進到下一天
     */
    static nextDay = asyncHandler(async (req, res) => {
        const result = await GameService.nextDay(req.params.id);

        // ⚠️ 廣播遊戲更新（進入下一天或遊戲結束）
        broadcastToGame(req, req.params.id, 'gameUpdate', {
            phase: result.game.phase,
            game: gameToApi(result.game),
            finished: result.finished
        });

        if (result.finished) {
            res.json({
                success: true,
                message: '遊戲已完成',
                data: {
                    game: gameToApi(result.game),
                    finished: true
                }
            });
        } else {
            res.json({
                success: true,
                message: `已推進到第 ${result.game.current_day} 天`,
                data: {
                    game: gameToApi(result.game),  // ⚠️ game 已包含 phase
                    finished: false
                }
            });
        }
    });

    /**
     * POST /api/admin/games/:id/force-end - 強制結束遊戲
     */
    static forceEnd = asyncHandler(async (req, res) => {
        const game = await GameService.forceEnd(req.params.id);

        // ⚠️ 廣播遊戲強制結束
        broadcastToGame(req, req.params.id, 'gameUpdate', {
            phase: game.phase,
            game: gameToApi(game),
            status: game.status,
            forceEnded: true
        });

        res.json({
            success: true,
            message: '遊戲已強制結束',
            data: gameToApi(game)
        });
    });

    /**
     * POST /api/admin/games/:id/pause - 暫停遊戲
     */
    static pause = asyncHandler(async (req, res) => {
        const game = await GameService.pause(req.params.id);

        // ⚠️ 廣播遊戲暫停
        broadcastToGame(req, req.params.id, 'gameUpdate', {
            phase: game.phase,
            game: gameToApi(game),
            status: game.status,
            paused: true
        });

        res.json({
            success: true,
            message: '遊戲已暫停',
            data: gameToApi(game)
        });
    });

    /**
     * POST /api/admin/games/:id/resume - 恢復遊戲
     */
    static resume = asyncHandler(async (req, res) => {
        const game = await GameService.resume(req.params.id);

        // ⚠️ 廣播遊戲恢復
        broadcastToGame(req, req.params.id, 'gameUpdate', {
            phase: game.phase,
            game: gameToApi(game),
            status: game.status,
            resumed: true
        });

        res.json({
            success: true,
            message: '遊戲已恢復',
            data: gameToApi(game)
        });
    });

    /**
     * GET /api/admin/games/:gameId/bids - 獲取所有團隊投標記錄（管理員）
     */
    static getAllBids = asyncHandler(async (req, res) => {
        const gameId = parseInt(req.params.gameId);
        const { dayNumber, fishType, bidType } = req.query;

        // 構建篩選條件
        const filters = {};
        if (fishType) filters.fish_type = fishType;
        if (bidType) filters.bid_type = bidType;

        // 如果有指定天數，查詢該天的投標；否則查詢整個遊戲的投標
        let bids;
        if (dayNumber) {
            bids = await Bid.findByGameDay(gameId, parseInt(dayNumber), filters);
        } else {
            // 查詢遊戲所有投標
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: '遊戲不存在'
                });
            }

            // 查詢所有天數的投標
            const allBids = [];
            for (let day = 1; day <= game.current_day; day++) {
                const dayBids = await Bid.findByGameDay(gameId, day, filters);
                allBids.push(...dayBids);
            }
            bids = allBids;
        }

        res.json({
            success: true,
            data: bids.map(bid => bidToApi(bid))
        });
    });

    /**
     * GET /api/admin/games/:gameId/daily-results - 獲取每日統計結果（管理員）
     */
    static getDailyResults = asyncHandler(async (req, res) => {
        const gameId = parseInt(req.params.gameId);
        const { dayNumber } = req.query;

        let results;
        if (dayNumber) {
            // 查詢指定天數的所有團隊結果
            results = await DailyResult.findByGameDay(gameId, parseInt(dayNumber));
        } else {
            // 查詢遊戲所有天數的結果
            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: '遊戲不存在'
                });
            }

            const allResults = [];
            for (let day = 1; day <= game.current_day; day++) {
                const dayResults = await DailyResult.findByGameDay(gameId, day);
                allResults.push(...dayResults);
            }
            results = allResults;
        }

        // 如果是查詢特定天數，進行排名
        if (dayNumber && results.length > 0) {
            // 按 ROI 降序排序並添加排名（安全處理 null/undefined/字串）
            results.sort((a, b) => {
                const roiA = parseFloat(a.roi) || 0;
                const roiB = parseFloat(b.roi) || 0;
                return roiB - roiA;
            });
            results = results.map((result, index) => ({
                ...result,
                rank: index + 1
            }));
        }

        res.json({
            success: true,
            data: results.map(result => dailyResultToApi(result))
        });
    });
}

module.exports = AdminController;
