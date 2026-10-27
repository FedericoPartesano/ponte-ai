# Wiki Schema — ponte-ai

Convenzione di pi-claude (llm_wiki): fonti grezze in `raw/`, wiki in `wiki/` mantenuta dal modello, regole in questo file e in `purpose.md`.

## Page Types

| Type | Directory | Purpose |
|---|---|---|
| entity | wiki/entities/ | Cose con un nome: componenti, strumenti esterni |
| concept | wiki/concepts/ | Regole, tecniche, decisioni |
| source | wiki/sources/ | Riassunto di una fonte |
| query | wiki/queries/ | Domande aperte |
| comparison | wiki/comparisons/ | Confronti fra alternative |
| synthesis | wiki/synthesis/ | Sintesi e conclusioni |
| overview | wiki/ | Una sola pagina: `wiki/overview.md` |

## Naming

File in `kebab-case.md`. Concetti: frase nominale descrittiva.

## Frontmatter

```yaml
---
type: entity | concept | source | query | comparison | synthesis | overview
title: Titolo leggibile
tags: []
related: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

## Index e log

`wiki/index.md`: voci `- [[slug]] — descrizione di una riga`, raggruppate per tipo.
`wiki/log.md`: `## [AAAA-MM-GG] ingest | <fonte>` seguito dalle pagine create.

## Convenzioni

- Lingua delle pagine: italiano; chiavi del frontmatter e `type` in inglese.
- Niente segreti, indirizzi interni o password: il repository è pubblico.
- Ogni regola del launcher cita dove è stata letta (file del launcher) o la prova che l'ha confermata.
