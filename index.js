
function extractUsernameFromClickEvent(clickEvent) {
    if (clickEvent?.action === 'suggest_command') {
        const parts = clickEvent.value.trim().split(/\s+/);
        if (parts.length > 1) return parts[1];
    }
    return null;
}

function extractClickEvent(chatMessage) {
    if (chatMessage.clickEvent) {
        const username = extractUsernameFromClickEvent(chatMessage.clickEvent);
        if (username) return username;
    }
    if (chatMessage.extra) {
        for (const part of chatMessage.extra) {
            const username = extractClickEvent(part);
            if (username) return username;
        }
    }
    return null;
}

const serverConfigs = {
    'mc.mineblaze.net': {
        arrowChar: '→',
        privatePattern: /\[(.*?)\s+->\s+я\]\s+(.+)/,
    },
    'mc.masedworld.net': {
        arrowChar: '⇨',
        privatePattern: /\[(.*?)\s+->\s+я\]\s+(.+)/,
    },
    'mc.cheatmine.net': {
        arrowChar: '⇨',
        privatePattern: /\[\*\] \[(.*?)\s+([^\[\]\s]+) -> я\] (.+)/,
        specialPrivateCheck: true,
    },
    'mc.dexland.org': {
        arrowChar: '→',
        privatePattern: /\[(.*?)\s+->\s+я\]\s+(.+)/,
    },
};

module.exports = (bot, options) => {
    const log = bot.sendLog;
    const serverConfig = serverConfigs[bot.config.server.host];
    const settings = options.settings || {};

    if (!serverConfig) {
        log(`[ChatParser] Конфигурация для сервера ${bot.config.server.host} не найдена. Плагин не будет загружен.`);
        return;
    }

    bot.messageQueue.registerChatType('chat', { 
        prefix: '', 
        delay: settings.localDelay || 3000
    });

    bot.messageQueue.registerChatType('global', { 
        prefix: '!', 
        delay: settings.globalDelay || 3000
    });
    bot.messageQueue.registerChatType('clan', { 
        prefix: '/cc ', 
        delay: settings.clanDelay || 500 
    });

    bot.messageQueue.registerChatType('private', { 
        prefix: '', 
        delay: settings.privateDelay || 3000
    });

    log(`[ChatParser] Типы чатов 'global' и 'clan' зарегистрированы.`);
    
    const messageHandler = (rawMessageText, jsonMsg) => {
        try {
            const { arrowChar, privatePattern, specialPrivateCheck } = serverConfig;
            const clanPattern = /КЛАН:\s*(.+?):\s*(.*)/i;
            const cleanedMessageText = rawMessageText.replace(/❤\s?/u, '').trim();

            log(jsonMsg.toAnsi())

            let match;
            let result = null;

            if (specialPrivateCheck && /я\]/.test(rawMessageText)) {
                match = rawMessageText.match(privatePattern);
                if (match) result = { type: 'private', username: extractClickEvent(jsonMsg), message: match[3] };
            } else {
                match = cleanedMessageText.match(privatePattern);
                if (match) result = { type: 'private', username: extractClickEvent(jsonMsg), message: match[2] };
            }
            
            if (result && result.username) {
                bot.events.emit('chat:message', result);
                return;
            }

            if (/\[[ʟɢ]\]/i.test(cleanedMessageText)) {
                const arrowIndex = cleanedMessageText.indexOf(arrowChar);
                if (arrowIndex !== -1) {
                    const messageContent = cleanedMessageText.substring(arrowIndex + arrowChar.length).trim();
                    const username = extractClickEvent(jsonMsg);
                    if (username) {
                        const type = /\[ʟ\]/i.test(cleanedMessageText) ? 'local' : 'global';
                        result = { type, username, message: messageContent };
                        bot.events.emit('chat:message', result);
                        return;
                    }
                }
            }
            
            if (cleanedMessageText.startsWith("КЛАН:")) {
                match = cleanedMessageText.match(clanPattern);
                if (match) {
                    const words = match[1].trim().split(/\s+/);
                    const username = words.length > 1 ? words[words.length - 1] : words[0];
                    result = { type: 'clan', username, message: match[2] };
                    bot.events.emit('chat:message', result);
                    return;
                }
            }
        } catch (error) {
            log(`[ChatParser] Ошибка при парсинге сообщения: ${error.message}`);
        }
    };

    bot.events.on('core:raw_message', messageHandler);

    bot.once('end', () => {
        bot.events.removeListener('core:raw_message', messageHandler);
    });

    log(`[ChatParser] Плагин-парсер для ${bot.config.server.host} успешно загружен.`);
};
