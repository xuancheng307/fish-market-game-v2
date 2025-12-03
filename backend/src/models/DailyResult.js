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
            'SELECT * FROM daily_results WHERE game_id = ? AND day_number = ? ORDER BY team_id ASC',
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
            team_id,
            day_number,
            revenue = 0,
            cost = 0,
            profit = 0,
            interest_paid = 0,
            unsold_fee = 0,
            current_budget,
            total_loan,
            fish_a_inventory = 0,
            fish_b_inventory = 0,
            fish_a_purchased = 0,
            fish_a_sold = 0,
            fish_b_purchased = 0,
            fish_b_sold = 0,
            cumulative_profit = 0,
            roi = 0
        } = resultData;

        const result = await query(
            `INSERT INTO daily_results (
                game_id, team_id, day_number,
                revenue, cost, profit, interest_paid, unsold_fee,
                current_budget, total_loan,
                fish_a_inventory, fish_b_inventory,
                fish_a_purchased, fish_a_sold, fish_b_purchased, fish_b_sold,
                cumulative_profit, roi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                game_id, team_id, day_number,
                revenue, cost, profit, interest_paid, unsold_fee,
                current_budget, total_loan,
                fish_a_inventory, fish_b_inventory,
                fish_a_purchased, fish_a_sold, fish_b_purchased, fish_b_sold,
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
}

module.exports = DailyResult;
