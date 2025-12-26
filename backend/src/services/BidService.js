/**
 * BidService - 投標業務邏輯服務
 * 使用 LoanService 處理借貸
 *
 * ⚠️ 借款邏輯 (buy_bid_total):
 * - 每次提交買入標單時，累加到 buy_bid_total
 * - 當 buy_bid_total > cash 時，借款差額
 * - 刪除標單時減少 buy_bid_total，但不退款（借了就是借了）
 */

const Bid = require('../models/Bid');
const Team = require('../models/Team');
const Game = require('../models/Game');
const GameDay = require('../models/GameDay');
const DailyResult = require('../models/DailyResult');
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

        // 2. 檢查當前階段是否允許投標（使用 game.phase）
        if (bidType === BID_TYPE.BUY && game.phase !== DAY_STATUS.BUYING_OPEN) {
            throw new AppError('當前不在買入投標階段', ERROR_CODES.INVALID_PHASE, 400);
        }

        if (bidType === BID_TYPE.SELL && game.phase !== DAY_STATUS.SELLING_OPEN) {
            throw new AppError('當前不在賣出投標階段', ERROR_CODES.INVALID_PHASE, 400);
        }

        // 3. 獲取團隊資訊
        const team = await Team.findByGameAndUser(gameId, teamId);
        if (!team) {
            throw new AppError('找不到團隊，請確認您已加入此遊戲', ERROR_CODES.UNAUTHORIZED, 404);
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

            // ⚠️ 新借款邏輯：使用 buy_bid_total 判斷
            const bidAmount = price * quantity;

            // 獲取當前 buy_bid_total
            const dailyResult = await DailyResult.findByTeamAndDay(team.id, gameId, game.current_day);
            const currentBuyBidTotal = dailyResult ? parseFloat(dailyResult.buy_bid_total || 0) : 0;
            const newBuyBidTotal = currentBuyBidTotal + bidAmount;

            // 檢查是否需要借款：當 buy_bid_total > cash 時借款差額
            const cash = parseFloat(team.cash);
            let loanResult = { borrowed: false, loanAmount: 0, cash: cash };

            if (newBuyBidTotal > cash) {
                // 需要借款的金額 = 新的 buy_bid_total - cash
                // 但如果之前已經借過（currentBuyBidTotal > cash），只借這次增加造成的差額
                const previousShortfall = Math.max(0, currentBuyBidTotal - cash);
                const newShortfall = newBuyBidTotal - cash;
                const loanNeeded = newShortfall - previousShortfall;

                if (loanNeeded > 0) {
                    loanResult = await LoanService.checkAndBorrow(team.id, cash + loanNeeded);
                }
            }

            // 更新 daily_results 的 buy_bid_total
            await DailyResult.upsertPartial(gameId, gameDay.id, team.id, game.current_day, {
                buy_bid_total: newBuyBidTotal
            });

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
                loanInfo: loanResult,
                buyBidTotal: newBuyBidTotal
            };
        }

        // 6. 賣出投標：檢查庫存（累計當天已投標數量）
        if (bidType === BID_TYPE.SELL) {
            const inventoryField = fishType === 'A' ? 'fish_a_inventory' : 'fish_b_inventory';
            const currentInventory = team[inventoryField];

            // ⚠️ 累計當天該魚種已投標的數量（existingBids 已在上面查詢過）
            const alreadyBidQuantity = existingBids.reduce((sum, b) => sum + b.quantity_submitted, 0);
            const totalAfterThisBid = alreadyBidQuantity + quantity;

            if (totalAfterThisBid > currentInventory) {
                throw new AppError(
                    `投標數量超過可用庫存（已投標 ${alreadyBidQuantity} kg + 本次 ${quantity} kg = ${totalAfterThisBid} kg，庫存僅 ${currentInventory} kg）`,
                    ERROR_CODES.INSUFFICIENT_INVENTORY,
                    400,
                    {
                        requested: quantity,
                        alreadyBid: alreadyBidQuantity,
                        totalWouldBe: totalAfterThisBid,
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
            throw new AppError('找不到團隊，請確認您已加入此遊戲', ERROR_CODES.UNAUTHORIZED, 404);
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
            throw new AppError('投標不存在', ERROR_CODES.INVALID_BID, 404);
        }

        const team = await Team.findById(bid.team_id);
        if (!team) {
            throw new AppError('團隊不存在', ERROR_CODES.UNAUTHORIZED, 404);
        }
        if (team.user_id !== teamId) {
            throw new AppError('無權修改此投標', ERROR_CODES.UNAUTHORIZED, 403);
        }

        if (bid.status !== 'pending') {
            throw new AppError('只能修改待處理的投標', ERROR_CODES.INVALID_BID, 400);
        }

        // 處理買入投標的資金檢查和 buy_bid_total 更新
        if (bid.bid_type === BID_TYPE.BUY && (updates.price || updates.quantity)) {
            const oldPrice = parseFloat(bid.price);
            const oldQuantity = bid.quantity_submitted;
            const oldAmount = oldPrice * oldQuantity;

            const newPrice = updates.price !== undefined ? updates.price : oldPrice;
            const newQuantity = updates.quantity !== undefined ? updates.quantity : oldQuantity;
            const newAmount = newPrice * newQuantity;

            // ⚠️ 更新 buy_bid_total（增減差額）
            const difference = newAmount - oldAmount;

            if (difference !== 0) {
                const game = await Game.findById(bid.game_id);
                const dailyResult = await DailyResult.findByTeamAndDay(bid.team_id, bid.game_id, game.current_day);
                const currentBuyBidTotal = dailyResult ? parseFloat(dailyResult.buy_bid_total || 0) : 0;
                const newBuyBidTotal = Math.max(0, currentBuyBidTotal + difference);

                // 更新 buy_bid_total
                const gameDay = await GameDay.findByGameAndDay(bid.game_id, game.current_day);
                await DailyResult.upsertPartial(bid.game_id, gameDay.id, bid.team_id, game.current_day, {
                    buy_bid_total: newBuyBidTotal
                });

                // ⚠️ 如果增加金額且 newBuyBidTotal > cash，需要借款
                if (difference > 0) {
                    const cash = parseFloat(team.cash);
                    if (newBuyBidTotal > cash) {
                        // 計算需要借款的金額（只借新增的差額）
                        const previousShortfall = Math.max(0, currentBuyBidTotal - cash);
                        const newShortfall = newBuyBidTotal - cash;
                        const loanNeeded = newShortfall - previousShortfall;

                        if (loanNeeded > 0) {
                            await LoanService.checkAndBorrow(team.id, cash + loanNeeded);
                        }
                    }
                }
            }
            // difference < 0 時只更新 buy_bid_total，不退款（遊戲規則：借了就是借了）
        }

        // 處理賣出投標的庫存檢查（累計當天其他投標數量）
        if (bid.bid_type === BID_TYPE.SELL && updates.quantity !== undefined) {
            const inventoryField = bid.fish_type === 'A' ? 'fish_a_inventory' : 'fish_b_inventory';
            const currentInventory = team[inventoryField];

            // ⚠️ 查詢當天同魚種的所有賣出投標，排除當前這筆
            const allSellBids = await Bid.findByGameDay(bid.game_id, bid.day_number, {
                team_id: bid.team_id,
                bid_type: BID_TYPE.SELL,
                fish_type: bid.fish_type
            });
            const otherBidsQuantity = allSellBids
                .filter(b => b.id !== bid.id)
                .reduce((sum, b) => sum + b.quantity_submitted, 0);
            const totalAfterUpdate = otherBidsQuantity + updates.quantity;

            if (totalAfterUpdate > currentInventory) {
                throw new AppError(
                    `投標數量超過可用庫存（其他投標 ${otherBidsQuantity} kg + 本次 ${updates.quantity} kg = ${totalAfterUpdate} kg，庫存僅 ${currentInventory} kg）`,
                    ERROR_CODES.INSUFFICIENT_INVENTORY,
                    400,
                    {
                        requested: updates.quantity,
                        otherBids: otherBidsQuantity,
                        totalWouldBe: totalAfterUpdate,
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
     * 刪除投標（僅限當天、當前階段、pending 狀態）
     * ⚠️ 刪除買入標單時會減少 buy_bid_total，但不會退還借款
     */
    static async deleteBid(bidId, teamId) {
        const bid = await Bid.findById(bidId);
        if (!bid) {
            throw new AppError('投標不存在', ERROR_CODES.INVALID_BID, 404);
        }

        const team = await Team.findById(bid.team_id);
        if (!team) {
            throw new AppError('團隊不存在', ERROR_CODES.UNAUTHORIZED, 404);
        }
        if (team.user_id !== teamId) {
            throw new AppError('無權刪除此投標', ERROR_CODES.UNAUTHORIZED, 403);
        }

        if (bid.status !== 'pending') {
            throw new AppError('只能刪除待處理的投標', ERROR_CODES.INVALID_BID, 400);
        }

        // ⚠️ 檢查是否為當天的投標，且在對應的投標階段
        const game = await Game.findById(bid.game_id);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        // 只能刪除當天的投標
        if (bid.day_number !== game.current_day) {
            throw new AppError(
                `只能刪除當天的投標（目前是第 ${game.current_day} 天，該投標是第 ${bid.day_number} 天）`,
                ERROR_CODES.INVALID_PHASE,
                400
            );
        }

        // 買入投標只能在 buying_open 階段刪除
        if (bid.bid_type === BID_TYPE.BUY && game.phase !== DAY_STATUS.BUYING_OPEN) {
            throw new AppError(
                '買入投標只能在買入階段刪除',
                ERROR_CODES.INVALID_PHASE,
                400
            );
        }

        // 賣出投標只能在 selling_open 階段刪除
        if (bid.bid_type === BID_TYPE.SELL && game.phase !== DAY_STATUS.SELLING_OPEN) {
            throw new AppError(
                '賣出投標只能在賣出階段刪除',
                ERROR_CODES.INVALID_PHASE,
                400
            );
        }

        // ⚠️ 如果是買入標單，減少 buy_bid_total（但不退款）
        if (bid.bid_type === BID_TYPE.BUY) {
            const bidAmount = parseFloat(bid.price) * bid.quantity_submitted;
            const dailyResult = await DailyResult.findByTeamAndDay(bid.team_id, bid.game_id, bid.day_number);

            if (dailyResult) {
                const currentBuyBidTotal = parseFloat(dailyResult.buy_bid_total || 0);
                const newBuyBidTotal = Math.max(0, currentBuyBidTotal - bidAmount);

                await DailyResult.upsertPartial(bid.game_id, bid.game_day_id, bid.team_id, bid.day_number, {
                    buy_bid_total: newBuyBidTotal
                });
            }
        }

        await Bid.delete(bidId);

        return { success: true, deletedBid: bid };
    }
}

module.exports = BidService;
