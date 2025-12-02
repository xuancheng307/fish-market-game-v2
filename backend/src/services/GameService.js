/**
 * GameService - 遊戲管理服務
 * 使用 SettlementService 執行結算
 *
 * ⚠️ 注意：所有狀態使用 game_days.status (唯一狀態源)
 */

const Game = require('../models/Game');
const GameDay = require('../models/GameDay');
const Team = require('../models/Team');
const User = require('../models/User');
const SettlementService = require('./SettlementService');
const { AppError } = require('../middleware/errorHandler');
const { ERROR_CODES, GAME_STATUS, DAY_STATUS } = require('../config/constants');
const { transaction } = require('../config/database');

class GameService {
    /**
     * 創建遊戲
     */
    static async createGame(gameData) {
        const {
            name,
            description,
            total_days,
            num_teams,
            team_names,
            initial_budget,
            loan_interest_rate,
            max_loan_ratio,
            unsold_fee_per_kg,
            fixed_unsold_ratio,
            buying_duration,
            selling_duration
        } = gameData;

        return await transaction(async (conn) => {
            // 1. 創建遊戲
            const game = await Game.create({
                name,
                description,
                total_days,
                num_teams,
                initial_budget,
                loan_interest_rate,
                max_loan_ratio,
                unsold_fee_per_kg,
                fixed_unsold_ratio,
                buying_duration,
                selling_duration,
                team_names
            });

            // 2. 創建第一天（status = pending）
            await GameDay.create({
                game_id: game.id,
                day_number: 1,
                status: DAY_STATUS.PENDING
            });

            // 3. 創建團隊參與記錄
            if (team_names && Array.isArray(team_names)) {
                for (const teamName of team_names) {
                    // 查找或創建用戶
                    const username = teamName.toLowerCase().replace(/\s+/g, '');
                    let user = await User.findByUsername(username);

                    if (!user) {
                        user = await User.create({
                            username,
                            password: 'password123', // 預設密碼
                            role: 'team',
                            display_name: teamName
                        });
                    }

                    // 創建團隊參與記錄
                    await Team.create({
                        game_id: game.id,
                        user_id: user.id,
                        team_name: teamName,
                        current_budget: initial_budget,
                        initial_budget: initial_budget
                    });
                }
            }

            return game;
        });
    }

    /**
     * 開始買入投標
     * ⚠️ 更新 game_days.status = 'buying_open'
     */
    static async startBuying(gameId, supplyData) {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const gameDay = await GameDay.findByGameAndDay(gameId, game.current_day);
        if (!gameDay) {
            throw new AppError('找不到遊戲天數', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        if (gameDay.status !== DAY_STATUS.PENDING) {
            throw new AppError('當前階段不允許開始買入', ERROR_CODES.INVALID_PHASE, 400);
        }

        // 更新供給和狀態
        await GameDay.updateSupplyAndBudget(gameDay.id, {
            fish_a_supply: supplyData.fishASupply || 0,
            fish_a_restaurant_budget: 0,
            fish_b_supply: supplyData.fishBSupply || 0,
            fish_b_restaurant_budget: 0
        });

        await GameDay.updateStatus(gameDay.id, DAY_STATUS.BUYING_OPEN);

        return await GameDay.findById(gameDay.id);
    }

    /**
     * 關閉買入投標並結算
     * ⚠️ 更新 game_days.status = 'buying_closed'
     * ⚠️ 執行買入結算
     */
    static async closeBuying(gameId) {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const gameDay = await GameDay.findByGameAndDay(gameId, game.current_day);
        if (!gameDay || gameDay.status !== DAY_STATUS.BUYING_OPEN) {
            throw new AppError('當前不在買入投標階段', ERROR_CODES.INVALID_PHASE, 400);
        }

        // 執行買入結算
        const settlementResults = await SettlementService.settleBuyingPhase(gameId, game.current_day);

        // 更新狀態
        await GameDay.updateStatus(gameDay.id, DAY_STATUS.BUYING_CLOSED);

        return {
            gameDay: await GameDay.findById(gameDay.id),
            settlementResults
        };
    }

    /**
     * 開始賣出投標
     * ⚠️ 更新 game_days.status = 'selling_open'
     */
    static async startSelling(gameId, budgetData) {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const gameDay = await GameDay.findByGameAndDay(gameId, game.current_day);
        if (!gameDay || gameDay.status !== DAY_STATUS.BUYING_CLOSED) {
            throw new AppError('當前階段不允許開始賣出', ERROR_CODES.INVALID_PHASE, 400);
        }

        // 更新餐廳預算
        await GameDay.updateSupplyAndBudget(gameDay.id, {
            fish_a_supply: gameDay.fish_a_supply,
            fish_a_restaurant_budget: budgetData.fishARestaurantBudget || 0,
            fish_b_supply: gameDay.fish_b_supply,
            fish_b_restaurant_budget: budgetData.fishBRestaurantBudget || 0
        });

        await GameDay.updateStatus(gameDay.id, DAY_STATUS.SELLING_OPEN);

        return await GameDay.findById(gameDay.id);
    }

    /**
     * 關閉賣出投標並結算
     * ⚠️ 更新 game_days.status = 'selling_closed'
     * ⚠️ 執行賣出結算
     */
    static async closeSelling(gameId) {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const gameDay = await GameDay.findByGameAndDay(gameId, game.current_day);
        if (!gameDay || gameDay.status !== DAY_STATUS.SELLING_OPEN) {
            throw new AppError('當前不在賣出投標階段', ERROR_CODES.INVALID_PHASE, 400);
        }

        // 執行賣出結算
        const settlementResults = await SettlementService.settleSellingPhase(gameId, game.current_day);

        // 更新狀態
        await GameDay.updateStatus(gameDay.id, DAY_STATUS.SELLING_CLOSED);

        return {
            gameDay: await GameDay.findById(gameDay.id),
            settlementResults
        };
    }

    /**
     * 執行每日結算
     * ⚠️ 更新 game_days.status = 'settled'
     * ⚠️ 計算利息、ROI
     */
    static async settle(gameId) {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const gameDay = await GameDay.findByGameAndDay(gameId, game.current_day);
        if (!gameDay || gameDay.status !== DAY_STATUS.SELLING_CLOSED) {
            throw new AppError('當前階段不允許結算', ERROR_CODES.INVALID_PHASE, 400);
        }

        // 執行每日結算
        const settlementResults = await SettlementService.dailySettlement(gameId, game.current_day);

        // 更新狀態
        await GameDay.updateStatus(gameDay.id, DAY_STATUS.SETTLED);

        return {
            gameDay: await GameDay.findById(gameDay.id),
            settlementResults
        };
    }

    /**
     * 推進到下一天
     * ⚠️ current_day++
     * ⚠️ 創建新的 game_days (status = pending)
     */
    static async nextDay(gameId) {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const gameDay = await GameDay.findByGameAndDay(gameId, game.current_day);
        if (!gameDay || gameDay.status !== DAY_STATUS.SETTLED) {
            throw new AppError('當日尚未結算完成', ERROR_CODES.INVALID_PHASE, 400);
        }

        // 檢查是否已到最後一天
        if (game.current_day >= game.total_days) {
            await Game.updateStatus(gameId, GAME_STATUS.FINISHED);
            return {
                game: await Game.findById(gameId),
                finished: true
            };
        }

        // 推進到下一天
        const nextDayNumber = game.current_day + 1;
        await Game.updateCurrentDay(gameId, nextDayNumber);

        // 創建新的一天
        const newGameDay = await GameDay.create({
            game_id: gameId,
            day_number: nextDayNumber,
            status: DAY_STATUS.PENDING
        });

        return {
            game: await Game.findById(gameId),
            gameDay: newGameDay,
            finished: false
        };
    }

    /**
     * 強制結束遊戲
     */
    static async forceEnd(gameId) {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        await Game.forceEnd(gameId, game.current_day);

        return await Game.findById(gameId);
    }

    /**
     * 暫停遊戲
     */
    static async pause(gameId) {
        await Game.pause(gameId);
        return await Game.findById(gameId);
    }

    /**
     * 恢復遊戲
     */
    static async resume(gameId) {
        await Game.resume(gameId);
        return await Game.findById(gameId);
    }

    /**
     * 獲取遊戲完整狀態
     */
    static async getGameStatus(gameId) {
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const gameDay = await GameDay.findByGameAndDay(gameId, game.current_day);
        const teams = await Team.findByGame(gameId);

        return {
            game,
            currentDay: gameDay,
            teams
        };
    }
}

module.exports = GameService;
