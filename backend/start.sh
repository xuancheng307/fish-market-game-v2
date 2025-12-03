#!/bin/bash
# 啟動腳本 - 先執行 migration 再啟動伺服器

echo "[Start] 執行資料庫 migrations..."
node migrations/run.js

if [ $? -eq 0 ]; then
    echo "[Start] Migrations 完成，啟動伺服器..."
    node src/server.js
else
    echo "[Start] Migrations 失敗，但仍嘗試啟動伺服器..."
    node src/server.js
fi
