
// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Временное хранилище (вместо базы данных)
const verificationCodes = new Map();
const users = new Map();

// Импорт маршрутов
const authRoutes = require('./auth');

// Подключение маршрутов
app.use('/api/auth', authRoutes);

// Тестовый эндпоинт
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Сервер работает!',
        timestamp: new Date().toLocaleString('ru-RU')
    });
});

// Раздача статических файлов (фронтенд)
app.use(express.static(path.join(__dirname, '../frontend')));

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🚀 СЕРВЕР ЗАПУЩЕН!                   ║
║                                       ║
║  📍 Адрес: http://localhost:${PORT}    ║
║  📂 API: http://localhost:${PORT}/api  ║
║                                       ║
║  ✅ Всё готово к работе!              ║
╚═══════════════════════════════════════╝
    `);
});