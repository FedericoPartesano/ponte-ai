---
type: concept
title: Scheda Attività (traffico in entrata e uscita)
tags: [app, ui]
related: [ponte-ai-app, ponte-ai-core]
created: 2026-10-27
updated: 2026-10-27
---

# Scheda Attività

Dalla 0.1.8 l'app ha due schede: «Connessioni» e «Attività». Attività è un terminale in stile ngrok con una riga per ogni messaggio da/verso il server.

- **Riga:** ora, direzione (`←` entrata, `→` uscita, `•` evento di connessione), nome connessione, tipo, id breve della richiesta (8 caratteri), durata. Errori in rosso.
- **Tipi:** `collegato`, `scollegato`, `errore connessione`, `run`, `cancel`, `strumento <nome> avvio/fine`, `risposta in corso`, `risposta completa`, `error`.
- **Mai il contenuto** di prompt e risposte (scelta di riservatezza). Il testo in streaming è una sola riga per richiesta.
- **Storico:** ultime 500 voci, solo in memoria in `app/main.mjs`; si azzera alla chiusura dell'app.
- **Comandi:** Pausa (le righe nuove restano nel buffer e riappaiono con Riprendi), Svuota, contatore delle righe non lette sulla scheda Connessioni.

## Come è fatto

- `core/ponte.mjs`: opzione `onTraffico({ ts, dir, tipo, runId, dettaglio, ms, errore })` di `creaPonte`; un'eccezione della UI non ferma il ponte.
- `app/main.mjs`: buffer, canale IPC `traffico`, `traffico-svuota`; `app/preload.cjs` li espone come `window.ponte.traffico/svuotaTraffico/onTraffico`.
- `app/ui/`: `app.js` disegna la lista, `stile.css` il terminale.

## Verifica

Provato nell'app Electron con un server Socket.IO finto e `claude` vero (richieste, cancel, Pausa, Riprendi, Svuota, contatore). Non provato con strumenti MCP reali.
