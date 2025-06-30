{
  "name": "parser-keksik",
  "version": "1.1.0",
  "description": "Парсит сообщения чата для mineblaze, dexland, masedworld, cheatmine и генерирует события для команд под их сервера.",
  "main": "index.js",
  "botpanel": {
    "supportedHosts": [
      "mc.mineblaze.net",
      "mc.masedworld.net",
      "mc.cheatmine.net",
      "mc.dexland.org"
    ],
  "settings": {
    "localDelay": {
      "type": "number",
      "label": "Задержка локального чата (мс)",
      "description": "Задержка после отправки сообщения в локальный чат.",
      "default": 3000
    },
    "globalDelay": {
      "type": "number",
      "label": "Задержка глобального чата (мс)",
      "description": "Задержка после отправки сообщения в глобальный чат.",
      "default": 1000
    },
    "clanDelay": {
      "type": "number",
      "label": "Задержка кланового чата (мс)",
      "description": "Задержка после отправки сообщения в клановый чат.",
      "default": 500
    },
    "privateDelay": {
      "type": "number",
      "label": "Задержка приватного чата (мс)",
      "description": "Задержка после отправки сообщения в приватный чат чат.",
      "default": 3000
    }
  }
}
}
