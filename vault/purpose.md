# Project Purpose

## Goal

Ponte AI collega il PC di una persona agli assistenti AI di un'applicazione web, usando la Claude Code già installata e autenticata su quel PC. Il server non ha bisogno di `claude`.

## Key Questions

1. Come si distribuisce Ponte AI su Windows e Linux in modo che Micelio Launcher lo installi?
2. Come si salvano le credenziali senza un portachiavi di sistema?
3. Cosa può fare Claude lanciato dal ponte, e come si limita?

## Scope

**In scope:** `core/` (il ponte), `app/` (Electron), il rilascio e l'integrazione con il launcher.

**Out of scope:** il server dell'applicazione che si collega (ogni progetto ha il suo).
