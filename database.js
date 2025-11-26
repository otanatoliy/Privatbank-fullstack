// backend/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'cards.db');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
    db.serialize(() => {
        // Таблица пользователей
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица карт
        db.run(`
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                card_number TEXT NOT NULL,
                card_holder TEXT NOT NULL,
                expiry_date TEXT NOT NULL,
                cvv TEXT NOT NULL,
                card_type TEXT DEFAULT 'Universal',
                balance REAL DEFAULT 0,
                currency TEXT DEFAULT 'UAH',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица транзакций
        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (card_id) REFERENCES cards(id)
            )
        `);

        console.log('✅ База данных инициализирована');
    });
};

const createUser = (username, email, hashedPassword) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, username, email });
            }
        );
    });
};

const getUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const getUserById = (id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT id, username, email FROM users WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const createCard = (userId, cardData) => {
    return new Promise((resolve, reject) => {
        const { cardNumber, cardHolder, expiryDate, cvv, cardType, balance } = cardData;
        db.run(
            `INSERT INTO cards (user_id, card_number, card_holder, expiry_date, cvv, card_type, balance) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, cardNumber, cardHolder, expiryDate, cvv, cardType || 'Universal', balance || 0],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...cardData });
            }
        );
    });
};

const getCardsByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM cards WHERE user_id = ? AND is_active = 1', [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getCardById = (cardId, userId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM cards WHERE id = ? AND user_id = ?', [cardId, userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const updateCard = (cardId, userId, updates) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), cardId, userId];
        
        db.run(`UPDATE cards SET ${fields} WHERE id = ? AND user_id = ?`, values, function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
};

const deleteCard = (cardId, userId) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE cards SET is_active = 0 WHERE id = ? AND user_id = ?', [cardId, userId], function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
};

const createTransaction = (cardId, type, amount, description) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO transactions (card_id, type, amount, description) VALUES (?, ?, ?, ?)',
            [cardId, type, amount, description],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            }
        );
    });
};

const getTransactionsByCardId = (cardId) => {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM transactions WHERE card_id = ? ORDER BY created_at DESC',
            [cardId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

module.exports = {
    db,
    initDatabase,
    createUser,
    getUserByEmail,
    getUserById,
    createCard,
    getCardsByUserId,
    getCardById,
    updateCard,
    deleteCard,
    createTransaction,
    getTransactionsByCardId
};