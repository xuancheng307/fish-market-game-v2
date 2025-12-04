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

        // 讀取所有 migration SQL 文件（按檔名排序）
        const migrationFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`[Migration] 發現 ${migrationFiles.length} 個 migration 文件: ${migrationFiles.join(', ')}`);

        let totalStatements = 0;
        let executedStatements = 0;

        // 逐個執行每個 migration 文件
        for (const migrationFile of migrationFiles) {
            console.log(`[Migration] 執行 ${migrationFile}...`);

            const sqlFile = path.join(__dirname, migrationFile);
            const sql = fs.readFileSync(sqlFile, 'utf8');

            // 分割成多個語句（以分號分隔）
            const statements = sql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);

            totalStatements += statements.length;

            // 逐個執行語句
            for (let i = 0; i < statements.length; i++) {
                try {
                    await connection.query(statements[i]);
                    executedStatements++;
                    console.log(`[Migration] ✓ ${migrationFile} - 語句 ${i + 1}/${statements.length} 執行成功`);
                } catch (error) {
                    // 忽略 "table already exists", "column already exists", "duplicate key/constraint" 錯誤
                    if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
                        error.code === 'ER_DUP_FIELDNAME' ||
                        error.code === 'ER_DUP_KEYNAME' ||
                        error.message.includes('Duplicate foreign key constraint')) {
                        console.log(`[Migration] ⚠ ${migrationFile} - 語句 ${i + 1}/${statements.length} - 已存在，跳過`);
                    } else {
                        console.error(`[Migration] ✗ ${migrationFile} - 語句 ${i + 1} 執行失敗:`, error.message);
                        throw error;
                    }
                }
            }
        }

        console.log(`[Migration] ✓ 所有 migration 執行完成！共 ${executedStatements}/${totalStatements} 個語句執行成功`);


    } catch (error) {
        console.error('[Migration] ✗ 錯誤:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runMigrations();
