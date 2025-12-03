/**
 * 資料庫連線配置
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// 解析資料庫連線 URL 或使用個別環境變數
function getDatabaseConfig() {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
        // 解析 DATABASE_URL
        const url = new URL(databaseUrl);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1), // 移除開頭的 /
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        };
    } else {
        // 使用個別環境變數
        return {
            host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
            port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
            user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
            password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
            database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'railway',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        };
    }
}

// 資料庫連線配置
const dbConfig = getDatabaseConfig();

// 創建連線池
let pool = null;

/**
 * 獲取資料庫連線池
 */
function getPool() {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
        console.log('資料庫連線池已創建');
    }
    return pool;
}

/**
 * 測試資料庫連線
 */
async function testConnection() {
    try {
        const connection = await getPool().getConnection();
        console.log('✅ 資料庫連線成功');
        console.log(`   連線到: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ 資料庫連線失敗:');
        console.error('   錯誤:', error.message);
        console.error('   Host:', dbConfig.host);
        console.error('   Port:', dbConfig.port);
        console.error('   Database:', dbConfig.database);
        return false;
    }
}

/**
 * 執行查詢
 * @param {string} sql - SQL 語句
 * @param {Array} params - 參數
 */
async function query(sql, params = []) {
    const connection = await getPool().getConnection();
    try {
        const [rows] = await connection.execute(sql, params);
        return rows;
    } finally {
        connection.release();
    }
}

/**
 * 執行事務
 * @param {Function} callback - 事務回調函數
 */
async function transaction(callback) {
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 關閉連線池
 */
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('資料庫連線池已關閉');
    }
}

module.exports = {
    getPool,
    testConnection,
    query,
    transaction,
    closePool
};
