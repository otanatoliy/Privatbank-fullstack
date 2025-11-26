// backend/routes/cards.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Получить все карты
router.get('/', async (req, res) => {
    try {
        const cards = await db.getCardsByUserId(req.userId);
        const maskedCards = cards.map(card => ({
            ...card,
            card_number: maskCardNumber(card.card_number),
            cvv: '***'
        }));
        res.json({ cards: maskedCards });
    } catch (error) {
        console.error('Ошибка получения карт:', error);
        res.status(500).json({ error: 'Ошибка при получении карт' });
    }
});

// Получить одну карту
router.get('/:id', async (req, res) => {
    try {
        const card = await db.getCardById(req.params.id, req.userId);
        if (!card) {
            return res.status(404).json({ error: 'Карта не найдена' });
        }
        res.json({
            card: {
                ...card,
                card_number: maskCardNumber(card.card_number),
                cvv: '***'
            }
        });
    } catch (error) {
        console.error('Ошибка получения карты:', error);
        res.status(500).json({ error: 'Ошибка при получении карты' });
    }
});

// Создать карту
router.post('/', async (req, res) => {
    try {
        const { cardNumber, cardHolder, expiryDate, cvv, cardType, balance } = req.body;

        if (!cardNumber || !cardHolder || !expiryDate || !cvv) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        if (!validateCardNumber(cardNumber.replace(/\s/g, ''))) {
            return res.status(400).json({ error: 'Недействительный номер карты' });
        }

        const card = await db.createCard(req.userId, {
            cardNumber,
            cardHolder,
            expiryDate,
            cvv,
            cardType,
            balance: balance || 0
        });

        res.status(201).json({
            message: 'Карта успешно создана',
            card: {
                ...card,
                card_number: maskCardNumber(card.cardNumber),
                cvv: '***'
            }
        });
    } catch (error) {
        console.error('Ошибка создания карты:', error);
        res.status(500).json({ error: 'Ошибка при создании карты' });
    }
});

// Обновить карту
router.put('/:id', async (req, res) => {
    try {
        const allowedUpdates = ['card_holder', 'expiry_date', 'card_type'];
        const updates = {};

        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        const result = await db.updateCard(req.params.id, req.userId, updates);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Карта не найдена' });
        }

        res.json({ message: 'Карта успешно обновлена' });
    } catch (error) {
        console.error('Ошибка обновления карты:', error);
        res.status(500).json({ error: 'Ошибка при обновлении карты' });
    }
});

// Удалить карту
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.deleteCard(req.params.id, req.userId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Карта не найдена' });
        }

        res.json({ message: 'Карта успешно удалена' });
    } catch (error) {
        console.error('Ошибка удаления карты:', error);
        res.status(500).json({ error: 'Ошибка при удалении карты' });
    }
});

// Получить транзакции
router.get('/:id/transactions', async (req, res) => {
    try {
        const card = await db.getCardById(req.params.id, req.userId);
        if (!card) {
            return res.status(404).json({ error: 'Карта не найдена' });
        }

        const transactions = await db.getTransactionsByCardId(req.params.id);
        res.json({ transactions });
    } catch (error) {
        console.error('Ошибка получения транзакций:', error);
        res.status(500).json({ error: 'Ошибка при получении транзакций' });
    }
});

// Создать транзакцию
router.post('/:id/transactions', async (req, res) => {
    try {
        const { type, amount, description } = req.body;

        if (!type || !amount) {
            return res.status(400).json({ error: 'Тип и сумма обязательны' });
        }

        if (!['debit', 'credit'].includes(type)) {
            return res.status(400).json({ error: 'Тип должен быть debit или credit' });
        }

        const card = await db.getCardById(req.params.id, req.userId);
        if (!card) {
            return res.status(404).json({ error: 'Карта не найдена' });
        }

        if (type === 'debit' && card.balance < amount) {
            return res.status(400).json({ error: 'Недостаточно средств' });
        }

        const transaction = await db.createTransaction(req.params.id, type, amount, description);

        const newBalance = type === 'credit' ? card.balance + amount : card.balance - amount;
        await db.updateCard(req.params.id, req.userId, { balance: newBalance });

        res.status(201).json({
            message: 'Транзакция успешно создана',
            transaction,
            newBalance
        });
    } catch (error) {
        console.error('Ошибка создания транзакции:', error);
        res.status(500).json({ error: 'Ошибка при создании транзакции' });
    }
});

function maskCardNumber(number) {
    return number.replace(/\d(?=\d{4})/g, '*');
}

function validateCardNumber(number) {
    const digits = number.split('').reverse().map(d => parseInt(d));
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        let digit = digits[i];
        if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    return sum % 10 === 0;
}

module.exports = router;