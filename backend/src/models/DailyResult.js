/**
 * DailyResult Model - 每日結算結果模型
 * 返回 snake_case 格式
 */

const { query } = require('../config/database');

class DailyResult {
    static async findById(id) {
        const rows = await query(
            'SELECT * FROM daily_results WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    static async findByGameDay(gameId, dayNumber) {
        return await query(
            `SELECT dr.*, gp.team_number
             FROM daily_results dr
             LEFT JOIN game_participants gp ON dr.team_id = gp.id
             WHERE dr.game_id = ? AND dr.day_number = ?
             ORDER BY dr.team_id ASC`,
            [gameId, dayNumber]
        );
    }

    static async findByTeam(teamId, gameId = null) {
        let sql = 'SELECT * FROM daily_results WHERE team_id = ?';
        const params = [teamId];

        if (gameId) {
            sql += ' AND game_id = ?';
            params.push(gameId);
        }

        sql += ' ORDER BY day_number ASC';
        return await query(sql, params);
    }

    static async findByTeamAndDay(teamId, gameId, dayNumber) {
        const rows = await query(
            'SELECT * FROM daily_results WHERE team_id = ? AND game_id = ? AND day_number = ?',
            [teamId, gameId, dayNumber]
        );
        return rows[0] || null;
    }

    static async create(resultData) {
        const {
            game_id,
            game_day_id,
            team_id,
            day_number,
            revenue = 0,
            cost = 0,
            profit = 0,
            interest_paid = 0,
            unsold_fee = 0,
            cash,
            total_loan,
            fish_a_inventory = 0,
            fish_b_inventory = 0,
            fish_a_purchased = 0,
            fish_a_sold = 0,
            fish_b_purchased = 0,
            fish_b_sold = 0,
            fish_a_unsold = 0,
            fish_b_unsold = 0,
            cumulative_profit = 0,
            roi = 0
        } = resultData;

        const result = await query(
            `INSERT INTO daily_results (
                game_id, game_day_id, team_id, day_number,
                revenue, cost, profit, interest_paid, unsold_fee,
                cash, total_loan,
                fish_a_inventory, fish_b_inventory,
                fish_a_purchased, fish_a_sold, fish_b_purchased, fish_b_sold,
                fish_a_unsold, fish_b_unsold,
                cumulative_profit, roi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                game_id, game_day_id, team_id, day_number,
                revenue, cost, profit, interest_paid, unsold_fee,
                cash, total_loan,
                fish_a_inventory, fish_b_inventory,
                fish_a_purchased, fish_a_sold, fish_b_purchased, fish_b_sold,
                fish_a_unsold, fish_b_unsold,
                cumulative_profit, roi
            ]
        );

        return await this.findById(result.insertId);
    }

    static async delete(id) {
        await query('DELETE FROM daily_results WHERE id = ?', [id]);
    }

    static async deleteByGameDay(gameId, dayNumber) {
        await query(
            'DELETE FROM daily_results WHERE game_id = ? AND day_number = ?',
            [gameId, dayNumber]
        );
    }

    /**
     * 更新或創建每日結果 (用於買入/賣出結算後立即更新)
     * @param {number} gameId
     * @param {number} gameDayId
     * @param {number} teamId
     * @param {number} dayNumber
     * @param {object} updateData - 要更新的欄位
     */
    static async upsertPartial(gameId, gameDayId, teamId, dayNumber, updateData) {
        // 允許更新的欄位白名單（防止 SQL injection）
        const ALLOWED_FIELDS = [
            'revenue', 'cost', 'profit', 'interest_paid', 'unsold_fee',
            'cash', 'total_loan', 'fish_a_inventory', 'fish_b_inventory',
            'fish_a_purchased', 'fish_a_sold', 'fish_b_purchased', 'fish_b_sold',
            'fish_a_unsold', 'fish_b_unsold', 'cumulative_profit', 'roi'
        ];

        // 檢查是否已存在
        const existing = await this.findByTeamAndDay(teamId, gameId, dayNumber);

        if (existing) {
            // 更新現有記錄
            const fields = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                // 只允許白名單中的欄位
                if (!ALLOWED_FIELDS.includes(key)) {
                    console.warn(`[DailyResult] 忽略不允許的欄位: ${key}`);
                    continue;
                }
                fields.push(`${key} = ?`);
                values.push(value);
            }

            if (fields.length > 0) {
                values.push(existing.id);
                await query(
                    `UPDATE daily_results SET ${fields.join(', ')} WHERE id = ?`,
                    values
                );
            }

            return await this.findById(existing.id);
        } else {
            // 創建新記錄 (使用預設值)
            const result = await query(
                `INSERT INTO daily_results (
                    game_id, game_day_id, team_id, day_number,
                    revenue, cost, profit, interest_paid, unsold_fee,
                    cash, total_loan,
                    fish_a_inventory, fish_b_inventory,
                    fish_a_purchased, fish_a_sold, fish_b_purchased, fish_b_sold,
                    fish_a_unsold, fish_b_unsold,
                    cumulative_profit, roi
                ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, ?, 0, 0, 0, 0)`,
                [
                    gameId, gameDayId, teamId, dayNumber,
                    updateData.fish_a_purchased || 0,
                    updateData.fish_a_sold || 0,
                    updateData.fish_b_purchased || 0,
                    updateData.fish_b_sold || 0
                ]
            );

            return await this.findById(result.insertId);
        }
    }
}

module.exports = DailyResult;
