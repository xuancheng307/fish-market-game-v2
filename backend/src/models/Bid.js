/**
 * Bid Model - 投標記錄模型
 * 返回 snake_case 格式
 */

const { query } = require('../config/database');
const { BID_STATUS } = require('../config/constants');

class Bid {
    static async findById(id) {
        const rows = await query(
            'SELECT * FROM bids WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    static async findByGameDay(gameId, dayNumber, filters = {}) {
        let sql = 'SELECT * FROM bids WHERE game_id = ? AND day_number = ?';
        const params = [gameId, dayNumber];

        if (filters.bid_type) {
            sql += ' AND bid_type = ?';
            params.push(filters.bid_type);
        }

        if (filters.fish_type) {
            sql += ' AND fish_type = ?';
            params.push(filters.fish_type);
        }

        if (filters.team_id) {
            sql += ' AND team_id = ?';
            params.push(filters.team_id);
        }

        // 排序: 買入按價格降序, 賣出按價格升序, 相同價格早提交優先
        if (filters.bid_type === 'buy') {
            sql += ' ORDER BY price DESC, created_at ASC';
        } else if (filters.bid_type === 'sell') {
            sql += ' ORDER BY price ASC, created_at ASC';
        } else {
            sql += ' ORDER BY created_at ASC';
        }

        return await query(sql, params);
    }

    static async findByTeam(teamId, gameId = null) {
        let sql = 'SELECT * FROM bids WHERE team_id = ?';
        const params = [teamId];

        if (gameId) {
            sql += ' AND game_id = ?';
            params.push(gameId);
        }

        sql += ' ORDER BY created_at DESC';
        return await query(sql, params);
    }

    static async create(bidData) {
        const {
            game_id,
            game_day_id,
            day_number,
            team_id,
            bid_type,
            fish_type,
            price,
            quantity_submitted,
            quantity_fulfilled = 0,
            status = BID_STATUS.PENDING
        } = bidData;

        const result = await query(
            `INSERT INTO bids (
                game_id, game_day_id, day_number, team_id,
                bid_type, fish_type, price,
                quantity_submitted, quantity_fulfilled, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                game_id, game_day_id, day_number, team_id,
                bid_type, fish_type, price,
                quantity_submitted, quantity_fulfilled, status
            ]
        );

        return await this.findById(result.insertId);
    }

    static async updateFulfillment(id, quantityFulfilled) {
        const bid = await this.findById(id);
        if (!bid) return null;

        let status;
        if (quantityFulfilled === 0) {
            status = BID_STATUS.FAILED;
        } else if (quantityFulfilled === bid.quantity_submitted) {
            status = BID_STATUS.FULFILLED;
        } else {
            status = BID_STATUS.PARTIAL;
        }

        await query(
            'UPDATE bids SET quantity_fulfilled = ?, status = ? WHERE id = ?',
            [quantityFulfilled, status, id]
        );

        return await this.findById(id);
    }

    static async updateStatus(id, status) {
        await query(
            'UPDATE bids SET status = ? WHERE id = ?',
            [status, id]
        );
        return await this.findById(id);
    }

    static async delete(id) {
        await query('DELETE FROM bids WHERE id = ?', [id]);
    }

    static async deleteByTeamAndDay(teamId, gameId, dayNumber) {
        await query(
            'DELETE FROM bids WHERE team_id = ? AND game_id = ? AND day_number = ? AND status = ?',
            [teamId, gameId, dayNumber, BID_STATUS.PENDING]
        );
    }
}

module.exports = Bid;
