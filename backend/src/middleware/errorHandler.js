/**
 * 錯誤處理中介層
 */

const { ERROR_CODES } = require('../config/constants');

/**
 * 自定義應用錯誤類別
 */
class AppError extends Error {
    constructor(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = 500, details = null) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 錯誤處理中介層
 */
function errorHandler(err, req, res, next) {
    // 設定預設值
    let statusCode = err.statusCode || 500;
    let message = err.message || '伺服器內部錯誤';
    let code = err.code || ERROR_CODES.INTERNAL_ERROR;
    let details = err.details || null;

    // 處理特定類型的錯誤
    if (err.name === 'ValidationError') {
        statusCode = 400;
        code = ERROR_CODES.VALIDATION_ERROR;
        message = '輸入驗證失敗';
        details = err.errors;
    } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = ERROR_CODES.UNAUTHORIZED;
        message = '未授權訪問';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = ERROR_CODES.TOKEN_EXPIRED;
        message = '登入已過期';
    } else if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        code = ERROR_CODES.DUPLICATE_BID;
        message = '資料重複';
    } else if (err.code && err.code.startsWith('ER_')) {
        // MySQL 錯誤
        statusCode = 500;
        code = ERROR_CODES.DATABASE_ERROR;
        message = '資料庫錯誤';
        // 始終在日誌中記錄 SQL 錯誤詳情
        console.error('[MySQL Error]', err.code, err.sqlMessage, err.sql);
        details = process.env.NODE_ENV === 'development' ? { sqlError: err.code, sqlMessage: err.sqlMessage } : null;
    }

    // 記錄錯誤
    console.error('錯誤:', {
        message: err.message,
        code: code,
        statusCode: statusCode,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        details: details,
        originalError: err.code && err.code.startsWith('ER_') ? { code: err.code, sqlMessage: err.sqlMessage } : undefined
    });

    // 返回錯誤響應
    res.status(statusCode).json({
        success: false,
        error: {
            code: code,
            message: message,
            details: details,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
}

/**
 * 404 處理
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: '找不到請求的資源',
            details: {
                method: req.method,
                url: req.url
            }
        }
    });
}

/**
 * 非同步路由錯誤包裝器
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
    asyncHandler
};
