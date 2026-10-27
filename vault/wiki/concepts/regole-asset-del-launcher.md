---
type: concept
title: Regole degli asset per Micelio Launcher
tags: [rilascio, launcher]
related: [productversion-uguale-alla-versione, workflow-di-rilascio]
created: 2026-10-27
updated: 2026-10-27
---


- **I file di una release si scoprono da `SHA256SUMS.txt`.** Senza, il launcher non vede nessun file e scrive "Not available". Lo genera il job `somme` del workflow.
- **Nomi accettati:** `<id>-<versione>-<os>-<arch><suffisso>`, con `<id>` = `ponte-ai` (id nel catalogo del launcher).
- **Su Windows solo due formati:** `.msi` oppure `…-windows-x64-portable.zip`. Un `…-windows-x64.zip` viene scartato. L'installer NSIS `.exe` resta per chi scarica a mano, il launcher non lo usa.
- **Su Linux:** `…-linux-x86_64.AppImage`.
- **Lo zip portabile** deve avere `ponte-ai.exe` alla radice.
- **`ProductVersion` dell'exe = versione della release.** Il launcher lo legge senza avviare il programma; se non coincide, annulla con "The portable executable does not match the selected version".

Fonte: `micelio-launcher/crates/core/src/platform.rs` (`parse_asset_name`, `suffix`, `pick_asset`). Sintomo di un nome sbagliato: "Not available" accanto all'app.
