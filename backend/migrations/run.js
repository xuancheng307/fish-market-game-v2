/**
 * Migration 執行腳本
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigrations() {
    // 從環境變數獲取資料庫連接資訊
    // 優先使用 DATABASE_URL（Railway 標準環境變數）
    const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;

    let connection;
    if (databaseUrl) {
        // 解析 DATABASE_URL 或 MYSQL_PUBLIC_URL
        const url = new URL(databaseUrl);
        connection = await mysql.createConnection({
            host: url.hostname,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1), // 移除開頭的 /
            port: parseInt(url.port) || 3306
        });
        console.log(`[Migration] 使用 URL 連接: ${url.hostname}:${url.port}/${url.pathname.slice(1)}`);
    } else {
        connection = await mysql.createConnection({
            host: process.env.MYSQLHOST || 'localhost',
            user: process.env.MYSQLUSER || 'root',
            password: process.env.MYSQLPASSWORD || '',
            database: process.env.MYSQLDATABASE || 'railway',
            port: process.env.MYSQLPORT || 3306
        });
        console.log(`[Migration] 使用個別環境變數連接`);
    }

    try {
        console.log('[Migration] 連接到資料庫...');

        // 讀取 migration SQL 文件
        const sqlFile = path.join(__dirname, '001_initial_schema.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // 分割成多個語句（以分號分隔）
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`[Migration] 執行 ${statements.length} 個 SQL 語句...`);

        // 逐個執行
        for (let i = 0; i < statements.length; i++) {
            try {
                await connection.query(statements[i]);
                console.log(`[Migration] ✓ 語句 ${i + 1}/${statements.length} 執行成功`);
            } catch (error) {
                // 忽略 "table already exists" 錯誤
                if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`[Migration] ⚠ 語句 ${i + 1}/${statements.length} - 表已存在，跳過`);
                } else {
                    throw error;
                }
            }
        }

        console.log('[Migration] ✓ 所有 migration 執行完成！');

    } catch (error) {
        console.error('[Migration] ✗ 錯誤:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runMigrations();
