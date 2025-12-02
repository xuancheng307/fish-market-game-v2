/**
 * GameDay Model - 每日資料模型
 * 返回 snake_case 格式
 *
 * ⚠️ 注意: status 是唯一狀態來源！
 */

const { query } = require('../config/database');
const { DAY_STATUS } = require('../config/constants');

class GameDay {
    /**
     * 根據 ID 查找
     */
    static async findById(id) {
        const rows = await query(
            'SELECT * FROM game_days WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    /**
     * 根據遊戲 ID 和天數查找
     */
    static async findByGameAndDay(gameId, dayNumber) {
        const rows = await query(
            'SELECT * FROM game_days WHERE game_id = ? AND day_number = ?',
            [gameId, dayNumber]
        );
        return rows[0] || null;
    }

    /**
     * 獲取遊戲的所有天數
     */
    static async findByGame(gameId) {
        return await query(
            'SELECT * FROM game_days WHERE game_id = ? ORDER BY day_number ASC',
            [gameId]
        );
    }

    /**
     * 創建新的一天
     */
    static async create(gameDayData) {
        const {
            game_id,
            day_number,
            status = DAY_STATUS.PENDING,
            fish_a_supply = 0,
            fish_a_restaurant_budget = 0,
            fish_b_supply = 0,
            fish_b_restaurant_budget = 0
        } = gameDayData;

        const result = await query(
            `INSERT INTO game_days (
                game_id, day_number, status,
                fish_a_supply, fish_a_restaurant_budget,
                fish_b_supply, fish_b_restaurant_budget
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                game_id, day_number, status,
                fish_a_supply, fish_a_restaurant_budget,
                fish_b_supply, fish_b_restaurant_budget
            ]
        );

        return await this.findById(result.insertId);
    }

    /**
     * 更新狀態 (唯一狀態來源!)
     */
    static async updateStatus(id, status) {
        await query(
            'UPDATE game_days SET status = ? WHERE id = ?',
            [status, id]
        );
        return await this.findById(id);
    }

    /**
     * 更新供給和預算
     */
    static async updateSupplyAndBudget(id, data) {
        const {
            fish_a_supply,
            fish_a_restaurant_budget,
            fish_b_supply,
            fish_b_restaurant_budget
        } = data;

        await query(
            `UPDATE game_days
             SET fish_a_supply = ?, fish_a_restaurant_budget = ?,
                 fish_b_supply = ?, fish_b_restaurant_budget = ?
             WHERE id = ?`,
            [
                fish_a_supply, fish_a_restaurant_budget,
                fish_b_supply, fish_b_restaurant_budget,
                id
            ]
        );

        return await this.findById(id);
    }

    /**
     * 獲取最新的一天
     */
    static async findLatest(gameId) {
        const rows = await query(
            `SELECT * FROM game_days
             WHERE game_id = ?
             ORDER BY day_number DESC
             LIMIT 1`,
            [gameId]
        );
        return rows[0] || null;
    }

    /**
     * 刪除
     */
    static async delete(id) {
        await query('DELETE FROM game_days WHERE id = ?', [id]);
    }
}

module.exports = GameDay;
