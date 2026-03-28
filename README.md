# SwiftLab

Documentação interativa de estudo para **Swift**, **SwiftUI**, **SwiftData**, **concorrência**, **Combine**, **testes**, **acessibilidade** e **carreira iOS**. Material educacional independente: não substitui a [documentação oficial da Apple](https://developer.apple.com/documentation/).

## Como abrir

Por causa de `fetch()` e do *service worker*, abra com um servidor HTTP local (não use `file://`):

```bash
cd /Users/jessicaserqueira/Desktop/SwiftLab
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

A trilha inclui **Design system e por baixo dos panos** ([`content/modules/m15-design-system.json`](content/modules/m15-design-system.json)) logo após Layout: HIG, SF Symbols, linguagem visual e visão de alto nível do SwiftUI com pontes UIKit.

## Estrutura

| Caminho | Função |
|--------|--------|
| `index.html`, `styles.css`, `app.js` | Casca: menu, tema, busca, progresso (`localStorage`), modais |
| `content/catalog.json` | Ordem e arquivos dos módulos |
| `content/modules/*.json` | Conteúdo por módulo; blocos `code` usam `language` como info string de fenced Markdown (ex.: `swift` gera `class="language-swift"` e rótulo Swift) |
| `content/glossary.json` | Glossário global |
| `content/flashcards.json`, `content/quiz.json`, `content/logic-exercises.json` | Interativos por `moduleId/sectionId` (lógica Swift em `logic-exercises`) |
| `generate_logic_exercises.py` | Script opcional para regenerar `logic-exercises.json` a partir da lista de seções |
| `content/schema/module-section.schema.json` | Esquema JSON das lições |
| `content/GUIA-COMUNICACAO.md` | Regras de texto: jargão explicado, parênteses, blocos curtos |
| `manifest.json`, `sw.js` | PWA / uso offline após primeira carga |
| `icons/` | Ícones do manifest |

## Fontes e curadoria

- Prioridade: páginas oficiais da Apple citadas em cada seção.
- Complemento: links **Hacking with Swift** onde indicado.
- Texto dos módulos é didático e resumido; confira sempre a doc para assinaturas exatas de API.

## Licença de ícones

Os PNGs em `icons/` foram copiados do projeto local CTFL-Lab como placeholder visual. Substitua por arte própria se for publicar publicamente.
