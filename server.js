// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Импорт роутов
const cardsRouter = require('./routes/cards');
const authRouter = require('./routes/auth');

// Инициализация базы данных
const db = require('./database');
db.initDatabase();

// Роуты
app.use('/api/auth', authRouter);
app.use('/api/cards', cardsRouter);

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Что-то пошло не так!',
        message: err.message 
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   🚀 Сервер ПриватБанк запущен!         ║
╠══════════════════════════════════════════╣
║   📡 URL: http://localhost:${PORT}        ║
║   📊 API: http://localhost:${PORT}/api   ║
╚══════════════════════════════════════════╝
    `);
});