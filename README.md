# Ponte AI

App per Windows e Linux con icona nella barra: collega il tuo PC agli assistenti AI di un'applicazione web, usando il `claude` (Claude Code) già installato e autenticato sul tuo computer.

- `core/` — libreria e riga di comando del ponte (Socket.IO verso il server, lancia `claude`).
- `app/` — app Electron: più connessioni (server + account), codice di abbinamento, avvio con il sistema.

Non installa nulla e non include credenziali: i server si inseriscono a mano (o da un `server.json` preparato dall'IT).

## Uso

    npm install
    npm start          # avvia l'app
    npm test           # test del core
    npm run dist       # installer Windows (da Windows)

Il codice di abbinamento mostrato dall'app va inserito una volta nella pagina web, per collegare il browser a questo PC.

## Licenza

MIT
