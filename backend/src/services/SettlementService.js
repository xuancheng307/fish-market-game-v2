/**
 * SettlementService - 結算邏輯服務
 *
 * ⚠️ 核心商業邏輯：
 * 1. 現金扣除發生在結算時 (不是投標時!)
 * 2. 只扣除成交數量的金額
 * 3. 未成交部分不退款
 * 4. 優先順序: 價格優先，相同價格早提交優先
 * 5. 固定滯銷 2.5%
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
     * ⚠️ 關鍵：現金扣除發生在這裡！
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

        return results;
    }

    /**
     * 買入結算 - 單一魚種
     */
    static async _settleBuyingForFishType(gameId, dayNumber, fishType, game, gameDay) {
        // 1. 取得所有買入投標 (按價格降序、時間升序)
        const bids = await Bid.findByGameDay(gameId, dayNumber, {
            bid_type: 'buy',
            fish_type: fishType
        });

        if (bids.length === 0) {
            return { totalFulfilled: 0, totalCost: 0 };
        }

        // 2. 計算固定滯銷 (2.5%)
        const supply = fishType === FISH_TYPE.A ? gameDay.fish_a_supply : gameDay.fish_b_supply;
        const fixedUnsoldRatio = parseFloat(game.fixed_unsold_ratio);
        const unsoldQuantity = Math.floor(supply * fixedUnsoldRatio);
        let remainingSupply = supply - unsoldQuantity;

        let totalFulfilled = 0;
        let totalCost = 0;

        // 3. 分配魚貨給投標者
        for (const bid of bids) {
            const team = await Team.findById(bid.team_id);
            if (!team) continue;

            // 計算成交數量
            const fulfilledQty = Math.min(bid.quantity_submitted, remainingSupply);

            if (fulfilledQty > 0) {
                // ⚠️ 關鍵: 結算時扣除現金 (只扣除成交部分!)
                const transactionAmount = parseFloat(bid.price) * fulfilledQty;

                await Team.update(team.id, {
                    cash: parseFloat(team.cash) - transactionAmount,
                    [fishType === FISH_TYPE.A ? 'fish_a_inventory' : 'fish_b_inventory']:
                        (fishType === FISH_TYPE.A ? team.fish_a_inventory : team.fish_b_inventory) + fulfilledQty
                });

                // 更新投標狀態
                await Bid.updateFulfillment(bid.id, fulfilledQty);

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
            unsoldQuantity,
            remainingSupply
        };
    }

    /**
     * 賣出結算 (團隊 → 餐廳)
     * ⚠️ 關鍵：現金增加、庫存減少、滯銷費用扣除
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

        return results;
    }

    /**
     * 賣出結算 - 單一魚種
     */
    static async _settleSellingForFishType(gameId, dayNumber, fishType, game, gameDay) {
        // 1. 取得所有賣出投標 (按價格升序、時間升序)
        const bids = await Bid.findByGameDay(gameId, dayNumber, {
            bid_type: 'sell',
            fish_type: fishType
        });

        if (bids.length === 0) {
            return { totalSold: 0, totalRevenue: 0, totalUnsold: 0, totalUnsoldFee: 0 };
        }

        // 2. 計算固定滯銷 (2.5%) - 最高價優先滯銷
        const totalQuantity = bids.reduce((sum, b) => sum + b.quantity_submitted, 0);
        const fixedUnsoldRatio = parseFloat(game.fixed_unsold_ratio);
        const unsoldQuantity = Math.floor(totalQuantity * fixedUnsoldRatio);

        // 找出最高價投標
        const sortedByPriceDesc = [...bids].sort((a, b) => {
            if (parseFloat(b.price) === parseFloat(a.price)) {
                return new Date(a.created_at) - new Date(b.created_at); // 早提交優先
            }
            return parseFloat(b.price) - parseFloat(a.price);
        });

        // 標記滯銷
        const bidUnsoldMap = new Map();
        let remainingUnsold = unsoldQuantity;

        for (const bid of sortedByPriceDesc) {
            if (remainingUnsold <= 0) break;

            const unsoldForThisBid = Math.min(bid.quantity_submitted, remainingUnsold);
            bidUnsoldMap.set(bid.id, unsoldForThisBid);
            remainingUnsold -= unsoldForThisBid;
        }

        // 3. 處理滯銷費用
        const unsoldFeePerKg = parseFloat(game.unsold_fee_per_kg);
        let totalUnsold = 0;
        let totalUnsoldFee = 0;

        for (const [bidId, unsoldQty] of bidUnsoldMap.entries()) {
            const bid = bids.find(b => b.id === bidId);
            const team = await Team.findById(bid.team_id);

            const unsoldFee = unsoldQty * unsoldFeePerKg;

            await Team.update(team.id, {
                cash: parseFloat(team.cash) - unsoldFee,
                [fishType === FISH_TYPE.A ? 'fish_a_inventory' : 'fish_b_inventory']:
                    (fishType === FISH_TYPE.A ? team.fish_a_inventory : team.fish_b_inventory) - unsoldQty
            });

            totalUnsold += unsoldQty;
            totalUnsoldFee += unsoldFee;
        }

        // 4. 分配給餐廳買家
        const restaurantBudget = fishType === FISH_TYPE.A ?
            parseFloat(gameDay.fish_a_restaurant_budget) :
            parseFloat(gameDay.fish_b_restaurant_budget);

        let remainingBudget = restaurantBudget;
        let totalSold = 0;
        let totalRevenue = 0;

        for (const bid of bids) {
            const team = await Team.findById(bid.team_id);
            if (!team) continue;

            // 扣除滯銷部分
            const unsoldForThisBid = bidUnsoldMap.get(bid.id) || 0;
            const sellableQty = bid.quantity_submitted - unsoldForThisBid;

            if (sellableQty <= 0) {
                await Bid.updateFulfillment(bid.id, 0);
                continue;
            }

            // 計算可買數量 (受餐廳預算限制)
            const price = parseFloat(bid.price);
            const maxAffordable = Math.floor(remainingBudget / price);
            const fulfilledQty = Math.min(sellableQty, maxAffordable);

            if (fulfilledQty > 0) {
                // 增加現金、減少庫存
                const revenue = price * fulfilledQty;

                await Team.update(team.id, {
                    cash: parseFloat(team.cash) + revenue,
                    [fishType === FISH_TYPE.A ? 'fish_a_inventory' : 'fish_b_inventory']:
                        (fishType === FISH_TYPE.A ? team.fish_a_inventory : team.fish_b_inventory) - fulfilledQty
                });

                await Bid.updateFulfillment(bid.id, fulfilledQty);

                remainingBudget -= revenue;
                totalSold += fulfilledQty;
                totalRevenue += revenue;
            } else {
                await Bid.updateFulfillment(bid.id, 0);
            }

            if (remainingBudget <= 0) break;
        }

        // 5. ⚠️ 關鍵遊戲規則：當日結束，所有剩餘庫存歸零！
        // 不論有沒有賣出，當天所有庫存都要清空
        const allTeams = await Team.findByGame(gameId);
        for (const clearTeam of allTeams) {
            await Team.update(clearTeam.id, {
                [fishType === FISH_TYPE.A ? 'fish_a_inventory' : 'fish_b_inventory']: 0
            });
        }

        return {
            totalSold,
            totalRevenue,
            totalUnsold,
            totalUnsoldFee
        };
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
            const currentBudget = interestResult.newBudget;
            const totalLoan = interestResult.newTotalLoan;
            const cumulativeProfit = currentBudget + totalLoan - parseFloat(game.initial_budget);

            // 3. 計算 ROI
            const totalInvestment = parseFloat(game.initial_budget) + parseFloat(team.total_loan_principal);
            const roi = totalInvestment > 0 ? (cumulativeProfit / totalInvestment) * 100 : 0;

            // 4. 計算當日魚類交易量統計
            const { BID_TYPE, FISH_TYPE } = require('../config/constants');
            const teamBids = await Bid.findByGameDay(gameId, dayNumber, { team_id: team.id });

            let fishAPurchased = 0, fishASold = 0, fishBPurchased = 0, fishBSold = 0;

            for (const bid of teamBids) {
                const qty = bid.quantity_fulfilled || 0;
                if (bid.bid_type === BID_TYPE.BUY) {
                    if (bid.fish_type === FISH_TYPE.A) {
                        fishAPurchased += qty;
                    } else if (bid.fish_type === FISH_TYPE.B) {
                        fishBPurchased += qty;
                    }
                } else if (bid.bid_type === BID_TYPE.SELL) {
                    if (bid.fish_type === FISH_TYPE.A) {
                        fishASold += qty;
                    } else if (bid.fish_type === FISH_TYPE.B) {
                        fishBSold += qty;
                    }
                }
            }

            // 5. 計算滯銷數量 (買入 - 賣出 = 滯銷)
            const fishAUnsold = Math.max(0, fishAPurchased - fishASold);
            const fishBUnsold = Math.max(0, fishBPurchased - fishBSold);

            // 6. 更新團隊狀態
            await Team.update(team.id, {
                cumulative_profit: cumulativeProfit,
                roi: roi
            });

            // 7. 保存每日結果（包含交易量統計、滯銷數量、game_day_id）
            const dailyResult = await DailyResult.create({
                game_id: gameId,
                game_day_id: gameDay ? gameDay.id : null,
                team_id: team.id,
                day_number: dayNumber,
                interest_paid: interestResult.interest,
                cash: currentBudget,
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
                interestPaid: interestResult.interest,
                currentBudget,
                totalLoan,
                cumulativeProfit,
                roi
            });
        }

        return results;
    }
}

module.exports = SettlementService;
