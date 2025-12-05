/**
 * 魚市場遊戲 - 主伺服器
 * 整合 Express + Socket.IO
 */

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/team');

// 初始化 Express 和 Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態文件服務（前端）
const frontendPath = path.join(__dirname, '../../../frontend');
app.use(express.static(frontendPath));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);

// 健康檢查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Socket.IO 事件處理
io.on('connection', (socket) => {
    console.log(`[Socket.IO] 新連接: ${socket.id}`);

    // 加入遊戲房間（支援兩種格式：物件或純數字）
    socket.on('joinGame', (data) => {
        const gameId = typeof data === 'object' ? data.gameId : data;
        socket.join(`game-${gameId}`);
        console.log(`[Socket.IO] ${socket.id} 加入遊戲 ${gameId}`);
    });

    // 離開遊戲房間（支援兩種格式）
    socket.on('leaveGame', (data) => {
        const gameId = typeof data === 'object' ? data.gameId : data;
        socket.leave(`game-${gameId}`);
        console.log(`[Socket.IO] ${socket.id} 離開遊戲 ${gameId}`);
    });

    // 斷線
    socket.on('disconnect', () => {
        console.log(`[Socket.IO] 斷線: ${socket.id}`);
    });
});

// 將 io 實例掛載到 app，讓其他模組可以存取
app.set('io', io);

// 錯誤處理（必須放在最後）
app.use(notFoundHandler);
app.use(errorHandler);

// 啟動伺服器
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // 測試資料庫連線
        await testConnection();
        console.log('[Database] 資料庫連線成功');

        // 啟動伺服器
        server.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════╗
║   🐟 魚市場交易遊戲伺服器已啟動          ║
║                                          ║
║   Port: ${PORT.toString().padEnd(32)} ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(23)} ║
║   Time: ${new Date().toLocaleString('zh-TW').padEnd(25)} ║
╚══════════════════════════════════════════╝
            `);
            console.log(`[Server] HTTP 伺服器運行於 http://localhost:${PORT}`);
            console.log(`[Server] Socket.IO 已啟用`);
            console.log(`[Server] 前端路徑: ${frontendPath}`);
        });
    } catch (error) {
        console.error('[Server] 啟動失敗:', error);
        process.exit(1);
    }
}

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('[Server] 收到 SIGTERM 信號，正在關閉...');
    server.close(() => {
        console.log('[Server] HTTP 伺服器已關閉');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[Server] 收到 SIGINT 信號，正在關閉...');
    server.close(() => {
        console.log('[Server] HTTP 伺服器已關閉');
        process.exit(0);
    });
});

// 啟動
startServer();

// 匯出 io 實例供其他模組使用（如 GameService 需要即時通知）
module.exports = { io };
