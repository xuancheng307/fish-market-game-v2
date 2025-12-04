/**
 * BidService - 投標業務邏輯服務
 * 使用 LoanService 處理借貸
 */

const Bid = require('../models/Bid');
const Team = require('../models/Team');
const Game = require('../models/Game');
const GameDay = require('../models/GameDay');
const LoanService = require('./LoanService');
const { AppError } = require('../middleware/errorHandler');
const { ERROR_CODES, DAY_STATUS, BID_TYPE } = require('../config/constants');

class BidService {
    /**
     * 提交投標（買入或賣出）
     */
    static async submitBid(teamId, bidData) {
        const { gameId, fishType, bidType, price, quantity } = bidData;

        // 1. 驗證遊戲和天數
        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const gameDay = await GameDay.findByGameAndDay(gameId, game.current_day);
        if (!gameDay) {
            throw new AppError('找不到遊戲天數', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        // 2. 檢查當前階段是否允許投標
        if (bidType === BID_TYPE.BUY && gameDay.status !== DAY_STATUS.BUYING_OPEN) {
            throw new AppError('當前不在買入投標階段', ERROR_CODES.INVALID_PHASE, 400);
        }

        if (bidType === BID_TYPE.SELL && gameDay.status !== DAY_STATUS.SELLING_OPEN) {
            throw new AppError('當前不在賣出投標階段', ERROR_CODES.INVALID_PHASE, 400);
        }

        // 3. 獲取團隊資訊
        const team = await Team.findByGameAndUser(gameId, teamId);
        if (!team) {
            throw new AppError('找不到團隊', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        // 4. 檢查每種魚最多2個不同價格限制
        const existingBids = await Bid.findByGameDay(gameId, game.current_day, {
            team_id: team.id,
            bid_type: bidType,
            fish_type: fishType
        });

        const existingPrices = new Set(existingBids.map(b => parseFloat(b.price)));

        if (existingPrices.has(parseFloat(price))) {
            throw new AppError(
                `${fishType}魚該價格已有投標`,
                ERROR_CODES.DUPLICATE_BID,
                400
            );
        }

        if (existingPrices.size >= 2) {
            throw new AppError(
                '每種魚最多2個不同價格',
                ERROR_CODES.TOO_MANY_BIDS,
                400
            );
        }

        // 5. 買入投標：檢查底價和資金
        if (bidType === BID_TYPE.BUY) {
            // ⚠️ 檢查價格是否低於底價（保護漁民利益）
            const floorPrice = fishType === 'A' ?
                parseFloat(game.distributor_floor_price_a) :
                parseFloat(game.distributor_floor_price_b);

            if (price < floorPrice) {
                throw new AppError(
                    `價格不得低於底價 $${floorPrice}`,
                    ERROR_CODES.INVALID_PRICE,
                    400,
                    { fishType, price, floorPrice }
                );
            }

            const requiredAmount = price * quantity;
            const loanResult = await LoanService.checkAndBorrow(team.id, requiredAmount);

            // 創建投標記錄
            const bid = await Bid.create({
                game_id: gameId,
                game_day_id: gameDay.id,
                day_number: game.current_day,
                team_id: team.id,
                bid_type: bidType,
                fish_type: fishType,
                price,
                quantity_submitted: quantity
            });

            return {
                bid,
                loanInfo: loanResult
            };
        }

        // 5. 賣出投標：檢查庫存
        if (bidType === BID_TYPE.SELL) {
            const inventoryField = fishType === 'A' ? 'fish_a_inventory' : 'fish_b_inventory';
            const currentInventory = team[inventoryField];

            if (currentInventory < quantity) {
                throw new AppError(
                    '庫存不足',
                    ERROR_CODES.INSUFFICIENT_INVENTORY,
                    400,
                    {
                        required: quantity,
                        available: currentInventory,
                        fishType
                    }
                );
            }

            // 創建投標記錄
            const bid = await Bid.create({
                game_id: gameId,
                game_day_id: gameDay.id,
                day_number: game.current_day,
                team_id: team.id,
                bid_type: bidType,
                fish_type: fishType,
                price,
                quantity_submitted: quantity
            });

            return {
                bid,
                loanInfo: null
            };
        }
    }

    /**
     * 獲取團隊的投標記錄
     */
    static async getTeamBids(teamId, gameId, dayNumber = null) {
        const team = await Team.findByGameAndUser(gameId, teamId);
        if (!team) {
            throw new AppError('找不到團隊', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        if (dayNumber) {
            return await Bid.findByGameDay(gameId, dayNumber, { team_id: team.id });
        }

        return await Bid.findByTeam(team.id, gameId);
    }

    /**
     * 更新投標（僅限 pending 狀態）
     */
    static async updateBid(bidId, teamId, updates) {
        const bid = await Bid.findById(bidId);
        if (!bid) {
            throw new AppError('投標不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const team = await Team.findById(bid.team_id);
        if (team.user_id !== teamId) {
            throw new AppError('無權修改此投標', ERROR_CODES.UNAUTHORIZED, 403);
        }

        if (bid.status !== 'pending') {
            throw new AppError('只能修改待處理的投標', ERROR_CODES.INVALID_BID, 400);
        }

        // 處理買入投標的資金檢查
        if (bid.bid_type === BID_TYPE.BUY && (updates.price || updates.quantity)) {
            const oldPrice = parseFloat(bid.price);
            const oldQuantity = bid.quantity_submitted;
            const oldAmount = oldPrice * oldQuantity;

            const newPrice = updates.price !== undefined ? updates.price : oldPrice;
            const newQuantity = updates.quantity !== undefined ? updates.quantity : oldQuantity;
            const newAmount = newPrice * newQuantity;

            // ⚠️ 只借差額，不是全額
            const difference = newAmount - oldAmount;

            if (difference > 0) {
                // 需要額外借款
                await LoanService.checkAndBorrow(team.id, difference);
            }
            // difference < 0 時不處理退款（遊戲規則：借了就是借了）
        }

        // 處理賣出投標的庫存檢查
        if (bid.bid_type === BID_TYPE.SELL && updates.quantity !== undefined) {
            const inventoryField = bid.fish_type === 'A' ? 'fish_a_inventory' : 'fish_b_inventory';
            const currentInventory = team[inventoryField];

            if (currentInventory < updates.quantity) {
                throw new AppError(
                    '庫存不足',
                    ERROR_CODES.INSUFFICIENT_INVENTORY,
                    400,
                    {
                        required: updates.quantity,
                        available: currentInventory,
                        fishType: bid.fish_type
                    }
                );
            }
        }

        // 檢查底價限制（買入投標）
        if (bid.bid_type === BID_TYPE.BUY && updates.price !== undefined) {
            const game = await Game.findById(bid.game_id);
            const floorPrice = bid.fish_type === 'A' ?
                parseFloat(game.distributor_floor_price_a) :
                parseFloat(game.distributor_floor_price_b);

            if (updates.price < floorPrice) {
                throw new AppError(
                    `價格不得低於底價 $${floorPrice}`,
                    ERROR_CODES.INVALID_PRICE,
                    400,
                    { fishType: bid.fish_type, price: updates.price, floorPrice }
                );
            }
        }

        // 執行更新
        const updatedBid = await Bid.update(bidId, {
            price: updates.price,
            quantity_submitted: updates.quantity
        });

        return updatedBid;
    }

    /**
     * 刪除投標（僅限 pending 狀態）
     */
    static async deleteBid(bidId, teamId) {
        const bid = await Bid.findById(bidId);
        if (!bid) {
            throw new AppError('投標不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const team = await Team.findById(bid.team_id);
        if (team.user_id !== teamId) {
            throw new AppError('無權刪除此投標', ERROR_CODES.UNAUTHORIZED, 403);
        }

        if (bid.status !== 'pending') {
            throw new AppError('只能刪除待處理的投標', ERROR_CODES.INVALID_BID, 400);
        }

        await Bid.delete(bidId);

        return { success: true };
    }
}

module.exports = BidService;
