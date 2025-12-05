/**
 * Game Model - 遊戲資料模型
 * 返回 snake_case 格式 (資料庫原生格式)
 *
 * ⚠️ 注意: games 表的名稱欄位是 name，不是 game_name！
 */

const { query, transaction } = require('../config/database');
const { DEFAULT_GAME_PARAMS, GAME_STATUS } = require('../config/constants');

class Game {
    /**
     * 根據 ID 查找遊戲
     */
    static async findById(id) {
        const rows = await query(
            'SELECT * FROM games WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    /**
     * 獲取所有遊戲
     */
    static async findAll(filters = {}) {
        let sql = 'SELECT * FROM games WHERE 1=1';
        const params = [];

        if (filters.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }

        sql += ' ORDER BY created_at DESC';

        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
        }

        return await query(sql, params);
    }

    /**
     * 創建新遊戲
     */
    static async create(gameData) {
        const {
            name,
            description = '',
            total_days = DEFAULT_GAME_PARAMS.TOTAL_DAYS,
            num_teams = DEFAULT_GAME_PARAMS.NUM_TEAMS,
            initial_budget = DEFAULT_GAME_PARAMS.INITIAL_BUDGET,
            daily_interest_rate = DEFAULT_GAME_PARAMS.DAILY_INTEREST_RATE,
            loan_interest_rate = DEFAULT_GAME_PARAMS.LOAN_INTEREST_RATE,
            max_loan_ratio = DEFAULT_GAME_PARAMS.MAX_LOAN_RATIO,
            unsold_fee_per_kg = DEFAULT_GAME_PARAMS.UNSOLD_FEE_PER_KG,
            fixed_unsold_ratio = DEFAULT_GAME_PARAMS.FIXED_UNSOLD_RATIO,
            distributor_floor_price_a = DEFAULT_GAME_PARAMS.DISTRIBUTOR_FLOOR_PRICE_A,
            distributor_floor_price_b = DEFAULT_GAME_PARAMS.DISTRIBUTOR_FLOOR_PRICE_B,
            target_price_a = DEFAULT_GAME_PARAMS.TARGET_PRICE_A,
            target_price_b = DEFAULT_GAME_PARAMS.TARGET_PRICE_B,
            // 新增：預設每日供給量和餐廳資金池
            default_fish_a_supply = 100,
            default_fish_b_supply = 100,
            default_fish_a_restaurant_budget = 50000,
            default_fish_b_restaurant_budget = 50000,
            buying_duration = DEFAULT_GAME_PARAMS.BUYING_DURATION,
            selling_duration = DEFAULT_GAME_PARAMS.SELLING_DURATION,
            // 新增：庫存設定
            clear_inventory_daily = 1,
            team_names = null
        } = gameData;

        const result = await query(
            `INSERT INTO games (
                name, description, status, total_days, current_day, num_teams,
                initial_budget, daily_interest_rate, loan_interest_rate, max_loan_ratio,
                unsold_fee_per_kg, fixed_unsold_ratio,
                distributor_floor_price_a, distributor_floor_price_b,
                target_price_a, target_price_b,
                default_fish_a_supply, default_fish_b_supply,
                default_fish_a_restaurant_budget, default_fish_b_restaurant_budget,
                buying_duration, selling_duration, clear_inventory_daily, team_names
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, description, GAME_STATUS.ACTIVE, total_days, 1, num_teams,
                initial_budget, daily_interest_rate, loan_interest_rate, max_loan_ratio,
                unsold_fee_per_kg, fixed_unsold_ratio,
                distributor_floor_price_a, distributor_floor_price_b,
                target_price_a, target_price_b,
                default_fish_a_supply, default_fish_b_supply,
                default_fish_a_restaurant_budget, default_fish_b_restaurant_budget,
                buying_duration, selling_duration, clear_inventory_daily,
                team_names ? JSON.stringify(team_names) : null
            ]
        );

        return await this.findById(result.insertId);
    }

    /**
     * 更新遊戲
     */
    static async update(id, fields) {
        const allowedFields = [
            'name', 'description', 'status', 'current_day',
            'is_force_ended', 'force_ended_at', 'force_end_day'
        ];

        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(fields)) {
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
            `UPDATE games SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        return await this.findById(id);
    }

    /**
     * 更新當前天數
     */
    static async updateCurrentDay(id, dayNumber) {
        await query(
            'UPDATE games SET current_day = ? WHERE id = ?',
            [dayNumber, id]
        );
        return await this.findById(id);
    }

    /**
     * 更新遊戲狀態
     */
    static async updateStatus(id, status) {
        await query(
            'UPDATE games SET status = ? WHERE id = ?',
            [status, id]
        );
        return await this.findById(id);
    }

    /**
     * 強制結束遊戲
     */
    static async forceEnd(id, dayNumber) {
        await query(
            `UPDATE games
             SET status = ?, is_force_ended = TRUE, force_ended_at = NOW(), force_end_day = ?
             WHERE id = ?`,
            [GAME_STATUS.FORCE_ENDED, dayNumber, id]
        );
        return await this.findById(id);
    }

    /**
     * 暫停遊戲
     */
    static async pause(id) {
        return await this.updateStatus(id, GAME_STATUS.PAUSED);
    }

    /**
     * 恢復遊戲
     */
    static async resume(id) {
        return await this.updateStatus(id, GAME_STATUS.ACTIVE);
    }

    /**
     * 完成遊戲
     */
    static async finish(id) {
        return await this.updateStatus(id, GAME_STATUS.FINISHED);
    }

    /**
     * 刪除遊戲
     */
    static async delete(id) {
        await query('DELETE FROM games WHERE id = ?', [id]);
    }
}

module.exports = Game;
