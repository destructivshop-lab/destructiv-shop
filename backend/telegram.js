const axios = require('axios');

// Токен и chat_id из переменных окружения
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Функция отправки сообщения в Telegram
async function sendTelegramMessage(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'  // Позволяет использовать HTML теги для форматирования
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

// Уведомление о регистрации нового пользователя
async function notifyNewUser(userData) {
    const message = `
👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ!</b>

📧 <b>Email:</b> ${userData.email}
👤 <b>Никнейм:</b> ${userData.nick}

⏰ <b>Время регистрации:</b> ${new Date().toLocaleString('ru-RU')}
    `;
    
    return await sendTelegramMessage(message);
}

// Тестовое сообщение (для проверки)
async function sendTestMessage() {
    const message = `
✅ <b>Telegram бот работает!</b>

🤖 Бот успешно подключен к сайту DESTRUCTIV Shop.

⏰ ${new Date().toLocaleString('ru-RU')}
    `;
    
    return await sendTelegramMessage(message);
}

module.exports = {
    notifyNewOrder,
    notifyPayment,
    notifyNewUser,
    sendTestMessage
};