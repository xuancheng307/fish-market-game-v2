/**
 * AuthController - 認證控制器
 * ⚠️ 使用 transformers 轉換 API 回應為 camelCase
 */

const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { userToApi } = require('../utils/transformers');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { ERROR_CODES } = require('../config/constants');

class AuthController {
    /**
     * 登入
     */
    static login = asyncHandler(async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            throw new AppError('用戶名和密碼不能為空', ERROR_CODES.VALIDATION_ERROR, 400);
        }

        // 驗證用戶
        const user = await User.verifyPassword(username, password);
        if (!user) {
            throw new AppError('用戶名或密碼錯誤', ERROR_CODES.INVALID_CREDENTIALS, 401);
        }

        // 生成 Token
        const token = generateToken(user);

        // ⚠️ 使用 transformers 轉換為 camelCase
        const userApi = userToApi(user);

        res.json({
            success: true,
            message: '登入成功',
            data: {
                user: userApi,
                token
            }
        });
    });

    /**
     * 登出
     */
    static logout = asyncHandler(async (req, res) => {
        // JWT 無狀態，客戶端刪除 token 即可
        res.json({
            success: true,
            message: '登出成功'
        });
    });

    /**
     * 獲取當前用戶資訊
     */
    static me = asyncHandler(async (req, res) => {
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new AppError('用戶不存在', ERROR_CODES.GAME_NOT_FOUND, 404);
        }

        // ⚠️ 使用 transformers 轉換為 camelCase
        const userApi = userToApi(user);

        res.json({
            success: true,
            data: userApi
        });
    });

    /**
     * 重置密碼（管理員功能）
     */
    static resetPasswords = asyncHandler(async (req, res) => {
        const { userIds, newPassword } = req.body;

        if (!userIds || !Array.isArray(userIds) || !newPassword) {
            throw new AppError('參數錯誤', ERROR_CODES.VALIDATION_ERROR, 400);
        }

        const results = [];
        for (const userId of userIds) {
            try {
                await User.updatePassword(userId, newPassword);
                results.push({ userId, success: true });
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
            }
        }

        res.json({
            success: true,
            message: '密碼重置完成',
            data: results
        });
    });

    /**
     * 重置所有團隊密碼（管理員功能）
     */
    static resetAllPasswords = asyncHandler(async (req, res) => {
        // 獲取所有團隊用戶
        const teamUsers = await User.getAllTeams();

        const results = [];
        for (const user of teamUsers) {
            try {
                // 密碼重置為帳號名稱（01, 02, ...）
                await User.updatePassword(user.id, user.username);
                results.push({ userId: user.id, username: user.username, success: true });
            } catch (error) {
                results.push({ userId: user.id, username: user.username, success: false, error: error.message });
            }
        }

        res.json({
            success: true,
            message: '所有團隊密碼已重置',
            data: results
        });
    });
}

module.exports = AuthController;
