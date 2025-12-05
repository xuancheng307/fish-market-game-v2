/**
 * SettlementService - 結算邏輯服務
 *
 * ⚠️ 核心商業邏輯：
 * 1. 現金扣除發生在結算時 (不是投標時!)
 * 2. 只扣除成交數量的金額
 * 3. 買入：高價優先成交，無滯銷
 * 4. 賣出：先扣最高價2.5%滯銷，再從低價開始用餐廳資金購買
 * 5. 當日結束所有庫存清零
 */

const Bid = require('../models/Bid');
const Team = require('../models/Team');
const GameDay = require('../models/GameDay');
const Game = require('../models/Game');
const DailyResult = require('../models/DailyResult');
const LoanService = require('./LoanService');
const { AppError } = require('../middleware/errorHandler');
const { ERROR_CODES, FISH_TYPE } = require('../config/constants');

class SettlementService {
    /**
     * 買入結算 (批發商 → 團隊)
     * ⚠️ 關鍵：高價優先成交，無滯銷
     * ⚠️ 結算後立即更新 daily_results 的買入成交量
     */
    static async settleBuyingPhase(gameId, dayNumber) {
        const gameDay = await GameDay.findByGameAndDay(gameId, dayNumber);
        if (!gameDay) {
            throw new AppError('找不到遊戲天數', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const game = await Game.findById(gameId);

        const results = {
            fishA: await this._settleBuyingForFishType(gameId, dayNumber, FISH_TYPE.A, game, gameDay),
            fishB: await this._settleBuyingForFishType(gameId, dayNumber, FISH_TYPE.B, game, gameDay)
        };

        // ⚠️ 立即更新 daily_results 的買入成交量
        await this._updateBuyingResults(gameId, gameDay.id, dayNumber);

        return results;
    }

    /**
     * 更新每隊的買入成交量到 daily_results
     */
    static async _updateBuyingResults(gameId, gameDayId, dayNumber) {
        const teams = await Team.findByGame(gameId);
        const { BID_TYPE, FISH_TYPE } = require('../config/constants');

        for (const team of teams) {
            // 從 bids 表彙總買入成交量
            const bids = await Bid.findByGameDay(gameId, dayNumber, { team_id: team.id, bid_type: BID_TYPE.BUY });

            let fishAPurchased = 0;
            let fishBPurchased = 0;

            for (const bid of bids) {
                const qty = bid.quantity_fulfilled || 0;
                if (bid.fish_type === FISH_TYPE.A) {
                    fishAPurchased += qty;
                } else if (bid.fish_type === FISH_TYPE.B) {
                    fishBPurchased += qty;
                }
            }

            // 更新或創建 daily_results 記錄
            await DailyResult.upsertPartial(gameId, gameDayId, team.id, dayNumber, {
                fish_a_purchased: fishAPurchased,
                fish_b_purchased: fishBPurchased
            });
        }
    }

    /**
     * 買入結算 - 單一魚種
     * ⚠️ 高價優先成交，直到供給賣完，無滯銷
     */
    static async _settleBuyingForFishType(gameId, dayNumber, fishType, game, gameDay) {
        // 1. 取得所有買入投標 (按價格降序、時間升序 - 高價優先)
        const bids = await Bid.findByGameDay(gameId, dayNumber, {
            bid_type: 'buy',
            fish_type: fishType
        });

        if (bids.length === 0) {
            return { totalFulfilled: 0, totalCost: 0, remainingSupply: 0 };
        }

        // 2. 取得供給量（買入無滯銷！）
        const supply = fishType === FISH_TYPE.A ? gameDay.fish_a_supply : gameDay.fish_b_supply;
        let remainingSupply = supply;

        let totalFulfilled = 0;
        let totalCost = 0;

        // 3. 按價格高到低分配魚貨（bids 已經按價格降序排列）
        let highestPrice = null;  // 最高成交價
        let lowestPrice = null;   // 最低成交價

        for (const bid of bids) {
            const team = await Team.findById(bid.team_id);
            if (!team) continue;

            // 計算成交數量
            const fulfilledQty = Math.min(bid.quantity_submitted, remainingSupply);

            if (fulfilledQty > 0) {
                // ⚠️ 關鍵: 結算時扣除現金 (只扣除成交部分!)
                const transactionAmount = parseFloat(bid.price) * fulfilledQty;
                const price = parseFloat(bid.price);

                await Team.update(team.id, {
                    cash: parseFloat(team.cash) - transactionAmount,
                    [fishType === FISH_TYPE.A ? 'fish_a_inventory' : 'fish_b_inventory']:
                        (fishType === FISH_TYPE.A ? team.fish_a_inventory : team.fish_b_inventory) + fulfilledQty
                });

                // 更新投標狀態
                await Bid.updateFulfillment(bid.id, fulfilledQty);

                // 追蹤成交價格範圍
                if (highestPrice === null || price > highestPrice) highestPrice = price;
                if (lowestPrice === null || price < lowestPrice) lowestPrice = price;

                remainingSupply -= fulfilledQty;
                totalFulfilled += fulfilledQty;
                totalCost += transactionAmount;
            } else {
                // 未成交
                await Bid.updateFulfillment(bid.id, 0);
            }

            if (remainingSupply <= 0) break;
        }

        return {
            totalFulfilled,
            totalCost,
            remainingSupply,
            highestPrice,
            lowestPrice
        };
    }

    /**
     * 賣出結算 (團隊 → 餐廳)
     * ⚠️ 關鍵邏輯：
     * 1. 先從最高價扣除 2.5% 作為滯銷
     * 2. 從最低價開始用餐廳資金購買
     * 3. 餐廳沒錢後剩餘的不成交
     * 4. 當日結束所有庫存清零
     * ⚠️ 結算後立即更新 daily_results 的賣出成交量
     */
    static async settleSellingPhase(gameId, dayNumber) {
        const gameDay = await GameDay.findByGameAndDay(gameId, dayNumber);
        if (!gameDay) {
            throw new AppError('找不到遊戲天數', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const game = await Game.findById(gameId);

        const results = {
            fishA: await this._settleSellingForFishType(gameId, dayNumber, FISH_TYPE.A, game, gameDay),
            fishB: await this._settleSellingForFishType(gameId, dayNumber, FISH_TYPE.B, game, gameDay)
        };

        // ⚠️ 立即更新 daily_results 的賣出成交量
        await this._updateSellingResults(gameId, gameDay.id, dayNumber);

        return results;
    }

    /**
     * 更新每隊的賣出成交量到 daily_results
     */
    static async _updateSellingResults(gameId, gameDayId, dayNumber) {
        const teams = await Team.findByGame(gameId);
        const { BID_TYPE, FISH_TYPE } = require('../config/constants');

        for (const team of teams) {
            // 從 bids 表彙總賣出成交量
            const bids = await Bid.findByGameDay(gameId, dayNumber, { team_id: team.id, bid_type: BID_TYPE.SELL });

            let fishASold = 0;
            let fishBSold = 0;

            for (const bid of bids) {
                const qty = bid.quantity_fulfilled || 0;
                if (bid.fish_type === FISH_TYPE.A) {
                    fishASold += qty;
                } else if (bid.fish_type === FISH_TYPE.B) {
                    fishBSold += qty;
                }
            }

            // 更新 daily_results 記錄 (應該已存在，由買入結算創建)
            await DailyResult.upsertPartial(gameId, gameDayId, team.id, dayNumber, {
                fish_a_sold: fishASold,
                fish_b_sold: fishBSold
            });
        }
    }

    /**
     * 賣出結算 - 單一魚種
     * ⚠️ 邏輯：
     * 1. 先從最高價扣除 2.5% 滯銷（扣庫存、扣滯銷費）
     * 2. 從最低價開始用餐廳資金購買（加現金、扣庫存）
     * 3. 餐廳沒錢後剩餘不成交（不加錢、但庫存當天清零）
     */
    static async _settleSellingForFishType(gameId, dayNumber, fishType, game, gameDay) {
        // 1. 取得所有賣出投標
        const bids = await Bid.findByGameDay(gameId, dayNumber, {
            bid_type: 'sell',
            fish_type: fishType
        });

        if (bids.length === 0) {
            // 即使沒有賣出投標，也要清空所有庫存
            await this._clearInventoryForFishType(gameId, fishType);
            return { totalSold: 0, totalRevenue: 0, totalUnsold: 0, totalUnsoldPenalty: 0 };
        }

        // 2. 計算總投標量和滯銷量 (2.5%)
        const totalQuantity = bids.reduce((sum, b) => sum + b.quantity_submitted, 0);
        const fixedUnsoldRatio = parseFloat(game.fixed_unsold_ratio);
        const totalUnsoldQuantity = Math.floor(totalQuantity * fixedUnsoldRatio);

        // 3. 按價格降序排列，從最高價開始分配滯銷
        const sortedByPriceDesc = [...bids].sort((a, b) => {
            const priceDiff = parseFloat(b.price) - parseFloat(a.price);
            if (priceDiff !== 0) return priceDiff;
            return new Date(a.created_at) - new Date(b.created_at); // 同價早提交優先滯銷
        });

        // 標記每筆投標的滯銷數量
        const bidUnsoldMap = new Map();
        let remainingUnsold = totalUnsoldQuantity;

        for (const bid of sortedByPriceDesc) {
            if (remainingUnsold <= 0) break;
            const unsoldForThisBid = Math.min(bid.quantity_submitted, remainingUnsold);
            bidUnsoldMap.set(bid.id, unsoldForThisBid);
            remainingUnsold -= unsoldForThisBid;
        }

        // 4. 處理滯銷（扣庫存、扣滯銷費）
        const unsoldFeePerKg = parseFloat(game.unsold_fee_per_kg);
        let totalUnsold = 0;
        let totalUnsoldPenalty = 0;

        for (const [bidId, unsoldQty] of bidUnsoldMap.entries()) {
            if (unsoldQty <= 0) continue;

            const bid = bids.find(b => b.id === bidId);
            const team = await Team.findById(bid.team_id);
            if (!team) continue;

            const unsoldPenalty = unsoldQty * unsoldFeePerKg;
            const inventoryField = fishType === FISH_TYPE.A ? 'fish_a_inventory' : 'fish_b_inventory';
            const currentInventory = fishType === FISH_TYPE.A ? team.fish_a_inventory : team.fish_b_inventory;

            await Team.update(team.id, {
                cash: parseFloat(team.cash) - unsoldPenalty,
                [inventoryField]: currentInventory - unsoldQty
            });

            totalUnsold += unsoldQty;
            totalUnsoldPenalty += unsoldPenalty;
        }

        // 5. 按價格升序排列，從最低價開始用餐廳資金購買
        const sortedByPriceAsc = [...bids].sort((a, b) => {
            const priceDiff = parseFloat(a.price) - parseFloat(b.price);
            if (priceDiff !== 0) return priceDiff;
            return new Date(a.created_at) - new Date(b.created_at); // 同價早提交優先
        });

        const restaurantBudget = fishType === FISH_TYPE.A ?
            parseFloat(gameDay.fish_a_restaurant_budget) :
            parseFloat(gameDay.fish_b_restaurant_budget);

        let remainingBudget = restaurantBudget;
        let totalSold = 0;
        let totalRevenue = 0;
        let highestPrice = null;  // 最高成交價
        let lowestPrice = null;   // 最低成交價

        for (const bid of sortedByPriceAsc) {
            const team = await Team.findById(bid.team_id);
            if (!team) continue;

            // 計算可賣數量（扣除滯銷部分）
            const unsoldForThisBid = bidUnsoldMap.get(bid.id) || 0;
            const sellableQty = bid.quantity_submitted - unsoldForThisBid;

            if (sellableQty <= 0) {
                await Bid.updateFulfillment(bid.id, 0);
                continue;
            }

            // 計算餐廳能買多少（受預算限制）
            const price = parseFloat(bid.price);
            const maxAffordable = price > 0 ? Math.floor(remainingBudget / price) : 0;
            const fulfilledQty = Math.min(sellableQty, maxAffordable);

            if (fulfilledQty > 0) {
                const revenue = price * fulfilledQty;
                const inventoryField = fishType === FISH_TYPE.A ? 'fish_a_inventory' : 'fish_b_inventory';
                const currentInventory = fishType === FISH_TYPE.A ? team.fish_a_inventory : team.fish_b_inventory;

                await Team.update(team.id, {
                    cash: parseFloat(team.cash) + revenue,
                    [inventoryField]: currentInventory - fulfilledQty
                });

                await Bid.updateFulfillment(bid.id, fulfilledQty);

                // 追蹤成交價格範圍
                if (highestPrice === null || price > highestPrice) highestPrice = price;
                if (lowestPrice === null || price < lowestPrice) lowestPrice = price;

                remainingBudget -= revenue;
                totalSold += fulfilledQty;
                totalRevenue += revenue;
            } else {
                // 餐廳沒錢了，標記為未成交
                await Bid.updateFulfillment(bid.id, 0);
            }
        }

        // 6. ⚠️ 根據遊戲設定決定是否清空庫存
        if (game.clear_inventory_daily !== false && game.clear_inventory_daily !== 0) {
            await this._clearInventoryForFishType(gameId, fishType);
        }

        return {
            totalSold,
            totalRevenue,
            totalUnsold,
            totalUnsoldPenalty,
            remainingBudget,
            highestPrice,
            lowestPrice
        };
    }

    /**
     * 清空指定魚種的所有團隊庫存
     * @param {number} gameId
     * @param {string} fishType
     */
    static async _clearInventoryForFishType(gameId, fishType) {
        const allTeams = await Team.findByGame(gameId);
        const inventoryField = fishType === FISH_TYPE.A ? 'fish_a_inventory' : 'fish_b_inventory';

        for (const team of allTeams) {
            await Team.update(team.id, {
                [inventoryField]: 0
            });
        }
    }

    /**
     * 每日結算 (計算利息、ROI、保存結果)
     */
    static async dailySettlement(gameId, dayNumber) {
        const teams = await Team.findByGame(gameId);
        const game = await Game.findById(gameId);
        const gameDay = await GameDay.findByGameAndDay(gameId, dayNumber);
        const results = [];

        for (const team of teams) {
            // 1. 計算並扣除利息
            const interestResult = await LoanService.calculateAndDeductInterest(team.id, gameId);

            // 2. 計算累計損益
            const cash = interestResult.cash;
            const totalLoan = interestResult.totalLoan;
            const cumulativeProfit = cash + totalLoan - parseFloat(game.initial_budget);

            // 3. 計算 ROI
            const totalInvestment = parseFloat(game.initial_budget) + parseFloat(team.total_loan_principal);
            const roi = totalInvestment > 0 ? (cumulativeProfit / totalInvestment) * 100 : 0;

            // 4. 計算當日魚類交易量統計和財務數據
            const { BID_TYPE, FISH_TYPE } = require('../config/constants');
            const teamBids = await Bid.findByGameDay(gameId, dayNumber, { team_id: team.id });

            let fishAPurchased = 0, fishASold = 0, fishBPurchased = 0, fishBSold = 0;
            let totalRevenue = 0, totalCost = 0;

            for (const bid of teamBids) {
                const qty = bid.quantity_fulfilled || 0;
                const price = parseFloat(bid.price);
                const amount = price * qty;

                if (bid.bid_type === BID_TYPE.BUY) {
                    if (bid.fish_type === FISH_TYPE.A) {
                        fishAPurchased += qty;
                    } else if (bid.fish_type === FISH_TYPE.B) {
                        fishBPurchased += qty;
                    }
                    totalCost += amount;
                } else if (bid.bid_type === BID_TYPE.SELL) {
                    if (bid.fish_type === FISH_TYPE.A) {
                        fishASold += qty;
                    } else if (bid.fish_type === FISH_TYPE.B) {
                        fishBSold += qty;
                    }
                    totalRevenue += amount;
                }
            }

            // 5. 計算滯銷數量 (買入 - 賣出 = 滯銷)
            const fishAUnsold = Math.max(0, fishAPurchased - fishASold);
            const fishBUnsold = Math.max(0, fishBPurchased - fishBSold);

            // 6. 計算滯銷費用
            const unsoldFeePerKg = parseFloat(game.unsold_fee_per_kg);
            const totalUnsoldFee = (fishAUnsold + fishBUnsold) * unsoldFeePerKg;

            // 7. 計算當日利潤
            const dailyProfit = totalRevenue - totalCost - totalUnsoldFee - interestResult.interest;

            // 8. 更新團隊狀態
            await Team.update(team.id, {
                cumulative_profit: cumulativeProfit,
                roi: roi
            });

            // 9. 更新每日結果（記錄已在買入/賣出結算時創建，這裡更新財務數據）
            const dailyResult = await DailyResult.upsertPartial(gameId, gameDay ? gameDay.id : null, team.id, dayNumber, {
                revenue: totalRevenue,
                cost: totalCost,
                profit: dailyProfit,
                interest_paid: interestResult.interest,
                unsold_fee: totalUnsoldFee,
                cash: cash,
                total_loan: totalLoan,
                fish_a_inventory: team.fish_a_inventory,
                fish_b_inventory: team.fish_b_inventory,
                fish_a_purchased: fishAPurchased,
                fish_a_sold: fishASold,
                fish_b_purchased: fishBPurchased,
                fish_b_sold: fishBSold,
                fish_a_unsold: fishAUnsold,
                fish_b_unsold: fishBUnsold,
                cumulative_profit: cumulativeProfit,
                roi: roi
            });

            results.push({
                teamId: team.id,
                teamName: team.team_name,
                loanInterest: interestResult.interest,
                cash,
                totalLoan,
                cumulativeProfit,
                roi
            });
        }

        return results;
    }
}

module.exports = SettlementService;
