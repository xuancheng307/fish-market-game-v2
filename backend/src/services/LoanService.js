/**
 * LoanService - 借貸邏輯服務
 *
 * ⚠️ 核心商業邏輯：
 * 1. 借貸發生在投標時 (不是結算時!)
 * 2. 借貸時現金增加: currentBudget += loanNeeded
 * 3. 無退款機制: 借的錢持續計息直到遊戲結束
 */

const Team = require('../models/Team');
const Game = require('../models/Game');
const { AppError } = require('../middleware/errorHandler');
const { ERROR_CODES } = require('../config/constants');

class LoanService {
    /**
     * 計算可用資金 (現金 + 可借貸額度)
     */
    static async calculateAvailableFunds(teamId) {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new AppError('團隊不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const game = await Game.findById(team.game_id);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        // 最大借貸額度
        const maxLoan = parseFloat(game.initial_budget) * parseFloat(game.max_loan_ratio);

        // 已使用的借貸
        const currentLoan = parseFloat(team.total_loan);

        // 剩餘可借貸額度
        const remainingLoanCapacity = Math.max(0, maxLoan - currentLoan);

        // 可用資金 = 現金 + 剩餘借貸額度
        const availableFunds = parseFloat(team.current_budget) + remainingLoanCapacity;

        return {
            currentBudget: parseFloat(team.current_budget),
            totalLoan: currentLoan,
            maxLoan,
            remainingLoanCapacity,
            availableFunds
        };
    }

    /**
     * 檢查是否需要借貸，並執行借貸 (投標時調用)
     * ⚠️ 關鍵邏輯：借貸時現金增加！
     */
    static async checkAndBorrow(teamId, requiredAmount) {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new AppError('團隊不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const currentBudget = parseFloat(team.current_budget);

        // 1. 如果現金足夠，不需要借貸
        if (currentBudget >= requiredAmount) {
            return {
                borrowed: false,
                loanAmount: 0,
                newBudget: currentBudget
            };
        }

        // 2. 現金不足，需要借貸
        const loanNeeded = requiredAmount - currentBudget;

        // 3. 檢查借貸額度是否足夠
        const fundsInfo = await this.calculateAvailableFunds(teamId);

        if (fundsInfo.availableFunds < requiredAmount) {
            throw new AppError(
                '資金不足，無法投標',
                ERROR_CODES.INSUFFICIENT_FUNDS,
                400,
                {
                    required: requiredAmount,
                    currentBudget: fundsInfo.currentBudget,
                    available: fundsInfo.availableFunds,
                    maxLoan: fundsInfo.maxLoan,
                    currentLoan: fundsInfo.totalLoan
                }
            );
        }

        // 4. 執行借貸 (現金增加!)
        const updatedTeam = await Team.update(team.id, {
            current_budget: currentBudget + loanNeeded,
            total_loan: fundsInfo.totalLoan + loanNeeded,
            total_loan_principal: parseFloat(team.total_loan_principal) + loanNeeded
        });

        return {
            borrowed: true,
            loanAmount: loanNeeded,
            newBudget: parseFloat(updatedTeam.current_budget),
            totalLoan: parseFloat(updatedTeam.total_loan)
        };
    }

    /**
     * 計算並扣除利息 (每日結算時調用)
     * ⚠️ 複利計算: totalLoan += interest
     */
    static async calculateAndDeductInterest(teamId, gameId) {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new AppError('團隊不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const game = await Game.findById(gameId);
        if (!game) {
            throw new AppError('遊戲不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        const totalLoan = parseFloat(team.total_loan);
        const loanInterestRate = parseFloat(game.loan_interest_rate);

        // 計算利息
        const interest = totalLoan * loanInterestRate;

        // 複利: 利息加到本金
        const newTotalLoan = totalLoan + interest;

        // 從現金扣除利息
        const newBudget = parseFloat(team.current_budget) - interest;

        // 更新團隊狀態
        const updatedTeam = await Team.update(team.id, {
            current_budget: newBudget,
            total_loan: newTotalLoan
        });

        return {
            interest,
            newBudget: parseFloat(updatedTeam.current_budget),
            newTotalLoan: parseFloat(updatedTeam.total_loan)
        };
    }

    /**
     * 獲取團隊借貸狀態摘要
     */
    static async getLoanStatus(teamId) {
        const fundsInfo = await this.calculateAvailableFunds(teamId);
        const team = await Team.findById(teamId);

        return {
            currentBudget: fundsInfo.currentBudget,
            totalLoan: fundsInfo.totalLoan,
            totalLoanPrincipal: parseFloat(team.total_loan_principal),
            maxLoan: fundsInfo.maxLoan,
            remainingLoanCapacity: fundsInfo.remainingLoanCapacity,
            availableFunds: fundsInfo.availableFunds,
            loanUtilization: fundsInfo.maxLoan > 0 ? (fundsInfo.totalLoan / fundsInfo.maxLoan * 100).toFixed(2) : 0
        };
    }
}

module.exports = LoanService;
