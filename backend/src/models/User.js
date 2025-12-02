/**
 * User Model - 用戶資料模型
 * 返回 snake_case 格式 (資料庫原生格式)
 */

const { query } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    /**
     * 根據 ID 查找用戶
     */
    static async findById(id) {
        const rows = await query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    /**
     * 根據用戶名查找用戶
     */
    static async findByUsername(username) {
        const rows = await query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0] || null;
    }

    /**
     * 創建新用戶
     */
    static async create({ username, password, role = 'team', display_name = null }) {
        // 密碼加密
        const password_hash = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO users (username, password_hash, role, display_name)
             VALUES (?, ?, ?, ?)`,
            [username, password_hash, role, display_name]
        );

        return await this.findById(result.insertId);
    }

    /**
     * 更新用戶
     */
    static async update(id, fields) {
        const allowedFields = ['display_name', 'password_hash'];
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
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        return await this.findById(id);
    }

    /**
     * 驗證密碼
     */
    static async verifyPassword(username, password) {
        const user = await this.findByUsername(username);
        if (!user) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        return isValid ? user : null;
    }

    /**
     * 更新密碼
     */
    static async updatePassword(id, newPassword) {
        const password_hash = await bcrypt.hash(newPassword, 10);
        return await this.update(id, { password_hash });
    }

    /**
     * 獲取所有團隊用戶
     */
    static async getAllTeams() {
        return await query(
            `SELECT id, username, display_name, created_at
             FROM users
             WHERE role = 'team'
             ORDER BY created_at ASC`
        );
    }

    /**
     * 批量創建團隊用戶
     */
    static async createTeams(teamNames, defaultPassword = 'password123') {
        const created = [];

        for (const teamName of teamNames) {
            const username = teamName.toLowerCase().replace(/\s+/g, '');
            const user = await this.create({
                username,
                password: defaultPassword,
                role: 'team',
                display_name: teamName
            });
            created.push(user);
        }

        return created;
    }

    /**
     * 刪除用戶
     */
    static async delete(id) {
        await query('DELETE FROM users WHERE id = ?', [id]);
    }
}

module.exports = User;
