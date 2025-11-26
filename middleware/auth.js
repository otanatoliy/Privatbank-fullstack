// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: 'Токен не предоставлен' });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Неверный формат токена' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Недействительный токен' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истек' });
        }

        console.error('Ошибка аутентификации:', error);
        res.status(500).json({ error: 'Ошибка при проверке токена' });
    }
};

module.exports = authMiddleware;