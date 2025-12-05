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
            initial_budget,
            loan_interest_rate,
            max_loan_ratio,
            unsold_fee_per_kg,
            fixed_unsold_ratio,
            buying_duration,
            selling_duration,
            distributor_floor_price_a,
            distributor_floor_price_b,
            target_price_a,
            target_price_b,
            // 新增：預設每日供給量和餐廳資金池
            default_fish_a_supply,
            default_fish_b_supply,
            default_fish_a_restaurant_budget,
            default_fish_b_restaurant_budget,
            // 新增：庫存設定
            clear_inventory_daily
        } = gameData;

        // 如果沒有提供 team_names，根據 num_teams 自動生成
        let team_names = gameData.team_names;
        if (!team_names && num_teams) {
            team_names = [];
            for (let i = 1; i <= num_teams; i++) {
                team_names.push(`第 ${String(i).padStart(2, '0')} 組`);
            }
        }

        return await transaction(async (conn) => {
            // 1. 創建遊戲（只傳入有值的欄位，讓 Model 使用預設值處理 undefined）
            const createData = {};
            if (name !== undefined) createData.name = name;
            if (description !== undefined) createData.description = description;
            if (total_days !== undefined) createData.total_days = total_days;
            if (num_teams !== undefined) createData.num_teams = num_teams;
            if (initial_budget !== undefined) createData.initial_budget = initial_budget;
            if (loan_interest_rate !== undefined) createData.loan_interest_rate = loan_interest_rate;
            if (max_loan_ratio !== undefined) createData.max_loan_ratio = max_loan_ratio;
            if (unsold_fee_per_kg !== undefined) createData.unsold_fee_per_kg = unsold_fee_per_kg;
            if (fixed_unsold_ratio !== undefined) createData.fixed_unsold_ratio = fixed_unsold_ratio;
            if (buying_duration !== undefined) createData.buying_duration = buying_duration;
            if (selling_duration !== undefined) createData.selling_duration = selling_duration;
            if (distributor_floor_price_a !== undefined) createData.distributor_floor_price_a = distributor_floor_price_a;
            if (distributor_floor_price_b !== undefined) createData.distributor_floor_price_b = distributor_floor_price_b;
            if (target_price_a !== undefined) createData.target_price_a = target_price_a;
            if (target_price_b !== undefined) createData.target_price_b = target_price_b;
            // 新增：預設每日供給量和餐廳資金池
            if (default_fish_a_supply !== undefined) createData.default_fish_a_supply = default_fish_a_supply;
            if (default_fish_b_supply !== undefined) createData.default_fish_b_supply = default_fish_b_supply;
            if (default_fish_a_restaurant_budget !== undefined) createData.default_fish_a_restaurant_budget = default_fish_a_restaurant_budget;
            if (default_fish_b_restaurant_budget !== undefined) createData.default_fish_b_restaurant_budget = default_fish_b_restaurant_budget;
            // 新增：庫存設定
            if (clear_inventory_daily !== undefined) createData.clear_inventory_daily = clear_inventory_daily;
            if (team_names !== undefined) createData.team_names = team_names;

            const game = await Game.create(createData);

            // 2. 創建第一天（status = pending）
            await GameDay.create({
                game_id: game.id,
                day_number: 1,
                status: DAY_STATUS.PENDING
            });

            // 3. 創建團隊參與記錄
            if (team_names && Array.isArray(team_names)) {
                for (let i = 0; i < team_names.length; i++) {
                    const teamName = team_names[i];
                    const teamNumber = i + 1; // 團隊編號從 1 開始

                    // 預設帳號和密碼使用兩位數團隊編號 (01, 02, ..., 12)
                    const teamNumberStr = String(teamNumber).padStart(2, '0');
                    const username = teamNumberStr;
                    const defaultPassword = teamNumberStr;

                    // 查找或創建用戶
                    let user = await User.findByUsername(username);

                    if (!user) {
                        user = await User.create({
                            username,
                            password: defaultPassword, // 預設密碼為兩位數團隊編號
                            role: 'team',
                            display_name: teamName
                        });
                    } else {
                        // 如果用戶已存在，更新 display_name 以確保對應正確
                        await User.update(user.id, { display_name: teamName });
                    }

                    // 創建團隊參與記錄（包含 team_number）
                    // 使用遊戲的初始預算（從剛創建的遊戲記錄中取得）
                    await Team.create({
                        game_id: game.id,
                        user_id: user.id,
                        team_name: teamName,
                        team_number: teamNumber,
                        cash: game.initial_budget,
                        initial_budget: game.initial_budget
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
