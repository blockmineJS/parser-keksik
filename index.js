function extractUsernameFromClickEvent(clickEvent) {
    if (clickEvent?.action === 'suggest_command') {
        const commandValue = clickEvent.value;
        const parts = commandValue.trim().split(/\s+/);
        if (parts.length > 1) {
            return parts[1];
        }
    }
    return null;
}

const MAX_CLICK_EVENT_DEPTH = 10;

function extractClickEventRecursive(chatMessage, depth) {
    if (depth > MAX_CLICK_EVENT_DEPTH) {
        return null;
    }
    if (chatMessage.clickEvent) {
        const username = extractUsernameFromClickEvent(chatMessage.clickEvent);
        if (username) {
            return username;
        }
    }
    if (chatMessage.extra && Array.isArray(chatMessage.extra)) {
        for (const part of chatMessage.extra) {
            if (typeof part === 'object' && part !== null) {
                 const username = extractClickEventRecursive(part, depth + 1);
                 if (username) {
                     return username;
                 }
            }
        }
    }
    return null;
}

function extractClickEvent(chatMessage) {
    return extractClickEventRecursive(chatMessage, 0);
}

const serverConfigs = {
    'mc.mineblaze.net': { arrowChar: '→', privatePattern: /\[(.*?)\s+->\s+я\]\s+(.+)/ },
    'mc.masedworld.net': { arrowChar: '⇨', privatePattern: /\[(.*?)\s+->\s+я\]\s+(.+)/ },
    'mc.cheatmine.net': { arrowChar: '⇨', privatePattern: /\[\*\] \[(.*?)\s+([^\[\]\s]+) -> я\] (.+)/, specialPrivateCheck: true },
    'mc.dexland.org': { arrowChar: '→', privatePattern: /\[(.*?)\s+->\s+я\]\s+(.+)/ },
};

module.exports = (bot, options) => {
    const log = bot.sendLog;
    const serverConfig = serverConfigs[bot.config.server.host];
    const settings = options.settings || {};

    if (bot.chatParserMessageHandler) {
        bot.events.removeListener('core:raw_message', bot.chatParserMessageHandler);
        log('[ChatParser] Старый обработчик сообщений удален для перезагрузки.');
    }

    if (!serverConfig) {
        log(`[ChatParser] Конфигурация для сервера ${bot.config.server.host} не найдена. Плагин не будет загружен.`);
        return;
    }

    bot.messageQueue.registerChatType('chat', { prefix: '', delay: settings.localDelay || 1000 });
    bot.messageQueue.registerChatType('global', { prefix: '!', delay: settings.globalDelay || 1000 });
    bot.messageQueue.registerChatType('clan', { prefix: '/cc ', delay: settings.clanDelay || 500 });
    bot.messageQueue.registerChatType('private', { prefix: '/msg ', delay: settings.privateDelay || 1000 });
    log(`[ChatParser] Типы чатов зарегистрированы.`);
    
    bot.chatParserMessageHandler = (rawMessageText, jsonMsg) => {
        try {
            if (!rawMessageText.trim()) return;

            const { arrowChar, privatePattern, specialPrivateCheck } = serverConfig;
            const clanPattern = /КЛАН:\s*(.+?):\s*(.*)/i;
            const cleanedMessageText = rawMessageText.replace(/[\u2764\uFE0F\s]+/gu, ' ').trim();

            let match;
            let result = null;

            if (specialPrivateCheck && /я\]/.test(cleanedMessageText)) {
                match = cleanedMessageText.match(privatePattern);
                if (match) result = { type: 'private', username: extractClickEvent(jsonMsg), message: match[3] };
            } else {
                match = cleanedMessageText.match(privatePattern);
                if (match) result = { type: 'private', username: extractClickEvent(jsonMsg), message: match[2] };
            }
            
            if (!result && /\[[ʟɢ]\]/i.test(cleanedMessageText)) {
                const arrowIndex = cleanedMessageText.indexOf(arrowChar);
                if (arrowIndex !== -1) {
                    const messageContent = cleanedMessageText.substring(arrowIndex + arrowChar.length).trim();
                    const username = extractClickEvent(jsonMsg);
                    if (username) {
                        const type = /\[ʟ\]/i.test(cleanedMessageText) ? 'chat' : 'global';
                        result = { type, username, message: messageContent };
                    }
                }
            }
            
            if (!result && cleanedMessageText.startsWith("КЛАН:")) {
                match = cleanedMessageText.match(clanPattern);
                if (match) {
                    const words = match[1].trim().split(/\s+/);
                    const username = words.length > 1 ? words[words.length - 1] : words[0];
                    result = { type: 'clan', username, message: match[2] };
                }
            }

            if (result && result.username) {
                const eventData = { ...result, jsonMsg: jsonMsg };
                bot.events.emit('chat:message', eventData);
            }

        } catch (error) {
            log(`[ChatParser] Ошибка при парсинге сообщения: ${error.message}`);
        }
    };

    bot.events.on('core:raw_message', bot.chatParserMessageHandler);

    bot.once('end', () => {
        if (bot.chatParserMessageHandler) {
            bot.events.removeListener('core:raw_message', bot.chatParserMessageHandler);
            delete bot.chatParserMessageHandler;
            log('[ChatParser] Обработчик сообщений выгружен.');
        }
    });

    log(`[ChatParser] Плагин-парсер для ${bot.config.server.host} успешно загружен.`);
};
