require('dotenv').config();

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const verificationCodes = new Map();
const users = new Map();

// ПРЯМАЯ НАСТРОЙКА (без .env для надёжности)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'destructivshop@gmail.com',
        pass: 'qcjjhdnuisfmwjuq'
    }
});

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/send-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email обязателен' });
        }

        if (users.has(email)) {
            return res.status(400).json({ error: 'Пользователь уже зарегистрирован' });
        }

        const code = generateCode();
        verificationCodes.set(email, {
            code,
            expires: Date.now() + 10 * 60 * 1000
        });

        console.log('📧 Отправка кода на:', email);
        console.log('📱 Код:', code);

        await transporter.sendMail({
            from: `"DESTRUCTIV Shop" <destructivshop@gmail.com>`,
            to: email,
            subject: '🔐 Код подтверждения',
            html: `
                <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a12; color: #fff;">
                    <h2 style="color: #ff003c; text-align: center;">DESTRUCTIV Shop</h2>
                    <p style="text-align: center;">Ваш код подтверждения:</p>
                    <div style="background: #1a1a2a; padding: 30px; border-radius: 15px; text-align: center; margin: 30px 0; border: 2px solid #7000ff;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #ffd700;">${code}</span>
                    </div>
                    <p style="color: #888; text-align: center;">Код действителен 10 минут.</p>
                </div>
            `
        });

        console.log(`✅ Код отправлен на ${email}`);
        res.json({ success: true, message: 'Код отправлен' });

    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ 
            error: 'Не удалось отправить код',
            details: error.message
        });
    }
});

router.post('/verify-code', async (req, res) => {
    try {
        const { email, code, password, nick } = req.body;
        
        const verification = verificationCodes.get(email);
        if (!verification) {
            return res.status(400).json({ error: 'Код не найден или истёк' });
        }
        
        if (Date.now() > verification.expires) {
            verificationCodes.delete(email);
            return res.status(400).json({ error: 'Срок действия кода истёк' });
        }
        
        if (verification.code !== code) {
            return res.status(400).json({ error: 'Неверный код' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            id: Date.now().toString(),
            email,
            name: nick,
            password: hashedPassword,
            balance: 500,
            avatar: '👤',
            orders: [],
            lastSpin: 0,
            verified: true,
            createdAt: new Date()
        };
        
        users.set(email, user);
        verificationCodes.delete(email);

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '7d' }
        );

        const { password: _, ...userWithoutPass } = user;
        
        console.log(`✅ Пользователь ${nick} зарегистрирован`);
        res.json({
            success: true,
            message: 'Регистрация успешна!',
            token,
            user: userWithoutPass
        });

    } catch (error) {
        console.error('❌ Ошибка верификации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.get(email);
        
        if (!user) {
            return res.status(400).json({ error: 'Пользователь не найден' });
        }

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '7d' }
        );

        const { password: _, ...userWithoutPass } = user;
        
        console.log(`✅ Пользователь ${email} вошёл в систему`);
        res.json({ 
            success: true, 
            message: 'Успешный вход!',
            token, 
            user: userWithoutPass 
        });

    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
        const user = users.get(decoded.email);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const { password: _, ...userWithoutPass } = user;
        res.json({ success: true, user: userWithoutPass });

    } catch (error) {
        console.error('❌ Ошибка получения профиля:', error);
        res.status(401).json({ error: 'Неверный токен' });
    }
});

module.exports = router;