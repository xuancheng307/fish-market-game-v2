/**
 * JWT 認證中介層
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { ERROR_CODES } = require('../config/constants');

/**
 * 驗證 JWT Token
 */
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        throw new AppError('未提供認證令牌', ERROR_CODES.UNAUTHORIZED, 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new AppError('認證令牌已過期', ERROR_CODES.TOKEN_EXPIRED, 401);
        }
        throw new AppError('無效的認證令牌', ERROR_CODES.UNAUTHORIZED, 401);
    }
}

/**
 * 檢查是否為管理員
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        throw new AppError('需要管理員權限', ERROR_CODES.UNAUTHORIZED, 403);
    }
    next();
}

/**
 * 檢查是否為團隊
 */
function requireTeam(req, res, next) {
    if (!req.user || req.user.role !== 'team') {
        throw new AppError('需要團隊權限', ERROR_CODES.UNAUTHORIZED, 403);
    }
    next();
}

/**
 * 生成 JWT Token
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
    );
}

module.exports = {
    verifyToken,
    requireAdmin,
    requireTeam,
    generateToken
};
