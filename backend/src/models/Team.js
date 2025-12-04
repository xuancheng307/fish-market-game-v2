/**
 * Team Model - 團隊參與者模型 (game_participants 表)
 * 返回 snake_case 格式
 *
 * ⚠️ 注意: 所有魚相關欄位格式 fish_a_*, fish_b_*
 */

const { query } = require('../config/database');

class Team {
    /**
     * 根據 ID 查找
     */
    static async findById(id) {
        const rows = await query(
            'SELECT * FROM game_participants WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    /**
     * 根據遊戲 ID 和用戶 ID 查找
     */
    static async findByGameAndUser(gameId, userId) {
        const rows = await query(
            'SELECT * FROM game_participants WHERE game_id = ? AND user_id = ?',
            [gameId, userId]
        );
        return rows[0] || null;
    }

    /**
     * 獲取遊戲的所有團隊
     */
    static async findByGame(gameId) {
        return await query(
            'SELECT * FROM game_participants WHERE game_id = ? ORDER BY created_at ASC',
            [gameId]
        );
    }

    /**
     * 創建團隊參與記錄
     */
    static async create(teamData) {
        const {
            game_id,
            user_id,
            team_name,
            team_number = null,
            cash,
            initial_budget
        } = teamData;

        const result = await query(
            `INSERT INTO game_participants (
                game_id, user_id, team_name, team_number,
                cash, initial_budget,
                total_loan, total_loan_principal,
                fish_a_inventory, fish_b_inventory,
                cumulative_profit, roi
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0)`,
            [game_id, user_id, team_name, team_number, cash, initial_budget]
        );

        return await this.findById(result.insertId);
    }

    /**
     * 更新團隊財務狀態
     */
    static async updateFinance(id, data) {
        const {
            cash,
            total_loan,
            total_loan_principal
        } = data;

        await query(
            `UPDATE game_participants
             SET cash = ?, total_loan = ?, total_loan_principal = ?
             WHERE id = ?`,
            [cash, total_loan, total_loan_principal, id]
        );

        return await this.findById(id);
    }

    /**
     * 更新團隊庫存
     */
    static async updateInventory(id, data) {
        const {
            fish_a_inventory,
            fish_b_inventory
        } = data;

        await query(
            `UPDATE game_participants
             SET fish_a_inventory = ?, fish_b_inventory = ?
             WHERE id = ?`,
            [fish_a_inventory, fish_b_inventory, id]
        );

        return await this.findById(id);
    }

    /**
     * 更新累計損益
     */
    static async updateProfit(id, data) {
        const {
            cumulative_profit,
            roi
        } = data;

        await query(
            `UPDATE game_participants
             SET cumulative_profit = ?, roi = ?
             WHERE id = ?`,
            [cumulative_profit, roi, id]
        );

        return await this.findById(id);
    }

    /**
     * 完整更新團隊狀態
     */
    static async update(id, data) {
        const allowedFields = [
            'cash', 'total_loan', 'total_loan_principal',
            'fish_a_inventory', 'fish_b_inventory',
            'cumulative_profit', 'roi'
        ];

        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return await this.findById(id);
        }

        values.push(id);
        await query(
            `UPDATE game_participants SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        return await this.findById(id);
    }

    /**
     * 增加借貸 (投標時借錢，現金增加!)
     */
    static async addLoan(id, loanAmount) {
        const team = await this.findById(id);
        if (!team) return null;

        return await this.update(id, {
            cash: parseFloat(team.cash) + loanAmount,
            total_loan: parseFloat(team.total_loan) + loanAmount,
            total_loan_principal: parseFloat(team.total_loan_principal) + loanAmount
        });
    }

    /**
     * 扣除現金 (結算時扣除)
     */
    static async deductCash(id, amount) {
        const team = await this.findById(id);
        if (!team) return null;

        return await this.update(id, {
            cash: parseFloat(team.cash) - amount
        });
    }

    /**
     * 增加現金 (賣出收入)
     */
    static async addCash(id, amount) {
        const team = await this.findById(id);
        if (!team) return null;

        return await this.update(id, {
            cash: parseFloat(team.cash) + amount
        });
    }

    /**
     * 增加庫存
     */
    static async addInventory(id, fishType, quantity) {
        const team = await this.findById(id);
        if (!team) return null;

        const field = fishType === 'A' ? 'fish_a_inventory' : 'fish_b_inventory';
        return await this.update(id, {
            [field]: team[field] + quantity
        });
    }

    /**
     * 減少庫存
     */
    static async reduceInventory(id, fishType, quantity) {
        const team = await this.findById(id);
        if (!team) return null;

        const field = fishType === 'A' ? 'fish_a_inventory' : 'fish_b_inventory';
        return await this.update(id, {
            [field]: team[field] - quantity
        });
    }

    /**
     * 刪除
     */
    static async delete(id) {
        await query('DELETE FROM game_participants WHERE id = ?', [id]);
    }
}

module.exports = Team;
