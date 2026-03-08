// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// НАСТРОЙКИ TELEGRAM БОТА
// ==========================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Функция отправки сообщения в Telegram
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('⚠️ Telegram credentials not set');
        return false;
    }
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        
        console.log('✅ Уведомление отправлено в Telegram');
        return true;
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error.message);
        return false;
    }
}

// Уведомление о новом заказе
async function notifyNewOrder(orderData) {
    const message = `
🛒 <b>НОВЫЙ ЗАКАЗ!</b>

👤 <b>Клиент:</b> ${orderData.userName || 'Не указан'}
📧 <b>Email:</b> ${orderData.email || 'Не указан'}
📱 <b>Контакты:</b> ${orderData.phone || orderData.telegram || 'Не указаны'}

🎮 <b>Услуга:</b> ${orderData.service}
💰 <b>Сумма:</b> ${orderData.price}₽

📝 <b>Доп. требования:</b>
${orderData.notes || 'Нет'}

⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
    `;
    
    return await sendTelegramMessage(message);
}

// Уведомление об оплате
async function notifyPayment(orderData) {
    const message = `
✅ <b>ОПЛАТА ПОЛУЧЕНА!</b>

👤 <b>Клиент:</b> ${orderData.userName}
💰 <b>Сумма:</b> ${orderData.price}₽
🎮 <b>Услуга:</b> ${orderData.service}

🔔 <b>Можно приступать к работе!</b>
    `;
    
    return await sendTelegramMessage(message);
}

// Тестовое сообщение
async function sendTestMessage() {
    const message = `
✅ <b>Telegram бот работает!</b>

🤖 Бот успешно подключен к сайту DESTRUCTIV Shop.

⏰ ${new Date().toLocaleString('ru-RU')}
    `;
    
    return await sendTelegramMessage(message);
}

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ВРЕМЕННОЕ ХРАНИЛИЩЕ (замена базы данных)
// ==========================================
const verificationCodes = new Map();
const users = new Map();
const orders = new Map();

// ==========================================
// МАРШРУТЫ АВТОРИЗАЦИИ
// ==========================================
app.post('/api/auth/send-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email обязателен' });
        }
        
        // Генерация 6-значного кода
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Сохранение кода (в реальном проекте — в базе данных)
        verificationCodes.set(email, {
            code,
            expires: Date.now() + 10 * 60 * 1000 // 10 минут
        });
        
        // В реальном проекте: отправка email через nodemailer
        console.log(`📧 Код подтверждения для ${email}: ${code}`);
        
        res.json({ 
            success: true, 
            message: 'Код отправлен на email',
            // Для тестов: раскомментируйте строку ниже
            // testCode: code 
        });
    } catch (error) {
        console.error('Send verification error:', error);
        res.status(500).json({ error: 'Ошибка отправки кода' });
    }
});

app.post('/api/auth/verify-code', async (req, res) => {
    try {
        const { email, code, password, nick } = req.body;
        
        const verification = verificationCodes.get(email);
        
        if (!verification) {
            return res.status(400).json({ error: 'Код не найден или истёк' });
        }
        
        if (verification.code !== code) {
            return res.status(400).json({ error: 'Неверный код' });
        }
        
        if (Date.now() > verification.expires) {
            verificationCodes.delete(email);
            return res.status(400).json({ error: 'Код истёк' });
        }
        
        // Создание пользователя
        const userId = Date.now().toString();
        const user = {
            id: userId,
            email,
            name: nick || email.split('@')[0],
            avatar: '👤',
            balance: 0,
            orders: [],
            createdAt: new Date().toISOString()
        };
        
        users.set(userId, user);
        verificationCodes.delete(email);
        
        // Генерация токена (в реальном проекте — JWT)
        const token = `token_${userId}_${Date.now()}`;
        
        // Уведомление в Telegram о новом пользователе
        await sendTelegramMessage(`
👤 <b>НОВАЯ РЕГИСТРАЦИЯ!</b>

📧 Email: ${email}
👤 Ник: ${nick}
⏰ ${new Date().toLocaleString('ru-RU')}
        `);
        
        res.json({
            success: true,
            message: 'Регистрация успешна',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ error: 'Ошибка подтверждения' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Поиск пользователя (в реальном проекте — запрос к БД)
        const user = Array.from(users.values()).find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        
        // Проверка пароля (в реальном проекте — bcrypt.compare)
        // Для демо: любой пароль подходит
        if (password.length < 6) {
            return res.status(401).json({ error: 'Неверный пароль' });
        }
        
        // Генерация токена
        const token = `token_${user.id}_${Date.now()}`;
        
        res.json({
            success: true,
            message: 'Вход успешен',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                balance: user.balance,
                orders: user.orders
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// ==========================================
// МАРШРУТЫ ЗАКАЗОВ
// ==========================================

// Создание нового заказа
app.post('/api/orders/create', async (req, res) => {
    try {
        const { service, price, notes, userName, email, phone, telegram } = req.body;
        
        if (!service || !price) {
            return res.status(400).json({ error: 'Услуга и цена обязательны' });
        }
        
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        const order = {
            id: orderId,
            service,
            price,
            notes: notes || '',
            userName: userName || '',
            email: email || '',
            phone: phone || '',
            telegram: telegram || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Сохранение заказа
        orders.set(orderId, order);
        
        // Отправка уведомления в Telegram
        await notifyNewOrder(order);
        
        res.json({
            success: true,
            message: 'Заказ создан',
            order: {
                id: order.id,
                service: order.service,
                price: order.price,
                status: order.status
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Ошибка создания заказа' });
    }
});

// Получение списка заказов (для админки)
app.get('/api/orders', (req, res) => {
    try {
        const orderList = Array.from(orders.values()).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        res.json({
            success: true,
            orders: orderList,
            count: orderList.length
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Ошибка получения заказов' });
    }
});

// Получение заказа по ID
app.get('/api/orders/:orderId', (req, res) => {
    try {
        const { orderId } = req.params;
        const order = orders.get(orderId);
        
        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Ошибка получения заказа' });
    }
});

// Обновление статуса заказа
app.patch('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        const order = orders.get(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        order.status = status;
        order.updatedAt = new Date().toISOString();
        
        // Уведомление об изменении статуса
        if (status === 'paid') {
            await notifyPayment(order);
        }
        
        res.json({
            success: true,
            message: 'Статус обновлён',
            order
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
});

// ==========================================
// МАРШРУТЫ ПЛАТЕЖЕЙ (подготовка под ЮKassa)
// ==========================================

// Создание платежа (заглушка для ЮKassa)
app.post('/api/payment/create', async (req, res) => {
    try {
        const { amount, description, orderId } = req.body;
        
        if (!amount || amount < 100) {
            return res.status(400).json({ error: 'Минимальная сумма 100₽' });
        }
        
        // В реальном проекте: создание платежа через ЮKassa API
        // const payment = await yookassa.createPayment({...});
        
        // Для демо: возвращаем тестовую ссылку
        res.json({
            success: true,
            paymentUrl: `https://yookassa.ru/demo/${orderId}`,
            paymentId: `demo_${orderId}`,
            amount,
            description
        });
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Ошибка создания платежа' });
    }
});

// Webhook для уведомлений об оплате (заглушка)
app.post('/api/payment/webhook', async (req, res) => {
    try {
        const { event, object } = req.body;
        
        if (event === 'payment.succeeded') {
            const orderId = object?.metadata?.order_id;
            console.log(`✅ Оплата получена: ${orderId}`);
            
            // Обновление статуса заказа
            if (orderId && orders.has(orderId)) {
                const order = orders.get(orderId);
                order.status = 'paid';
                await notifyPayment(order);
            }
        }
        
        res.json({ result: true });
    } catch (error) {
        console.error('Payment webhook error:', error);
        res.status(500).json({ error: 'Ошибка webhook' });
    }
});

// ==========================================
// ТЕЛЕГРАМ ТЕСТОВЫЙ МАРШРУТ
// ==========================================
app.get('/api/test-telegram', async (req, res) => {
    try {
        const result = await sendTestMessage();
        
        if (result) {
            res.json({ success: true, message: '✅ Тестовое сообщение отправлено!' });
        } else {
            res.status(500).json({ success: false, message: '❌ Ошибка отправки' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// HEALTH CHECK И СТАТИКА
// ==========================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Сервер работает!',
        timestamp: new Date().toLocaleString('ru-RU'),
        telegram: TELEGRAM_BOT_TOKEN ? 'подключен' : 'не подключен'
    });
});

// Раздача статических файлов (фронтенд)
app.use(express.static(path.join(__dirname, '../frontend')));

// Обработка всех остальных запросов — отдаём index.html (для SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==========================================
// ОБРАБОТКА ОШИБОК
// ==========================================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🚀 DESTRUCTIV SHOP SERVER            ║
║                                       ║
║  📍 Адрес: http://localhost:${PORT}    ║
║  📂 API: http://localhost:${PORT}/api  ║
║  🤖 Telegram: ${TELEGRAM_BOT_TOKEN ? '✅' : '❌'}        ║
║                                       ║
║  ✅ Всё готово к работе!              ║
╚═══════════════════════════════════════╝
    `);
});