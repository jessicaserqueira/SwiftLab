# Guia de comunicação — conteúdo SwiftLab

Regras para textos dos módulos (e para quem for editar o JSON).

## Obrigatório

1. **Jargão sempre explicado** — Na primeira vez que um termo técnico aparece numa seção, use **parênteses** logo em seguida com uma frase curta em linguagem simples.
2. **Um conceito por bloco** — Evite parágrafos longos; prefira vários blocos `text` / `heading` / `list`.
3. **Objetivo em português claro** — O campo `objective` deve dizer *para que serve* antes de citar nomes de API; se citar API, explique entre parênteses.
4. **Checklist e erros comuns** — Cada item deve ser compreensível sozinho; se houver sigla ou termo raro, explique na mesma linha.

## Exemplos de padrão

- Ruim: “Use `@State` para estado local.”
- Bom: “Use `@State` (armazenamento de estado só da tela, gerenciado pelo SwiftUI) para valores locais da View.”

- Ruim: “Configure o `ModelContainer`.”
- Bom: “Configure o `ModelContainer` (objeto que diz ao SwiftData onde e como salvar seus `@Model`).”

## Glossário

O glossário ao fim da seção **reforça** o termo; ainda assim, na primeira menção no texto, mantenha o parêntese curto.

## Formato para respostas do mentor (IA ou humana)

Ao orientar a estudante, usar a estrutura:

- Objetivo  
- O que existe hoje  
- Problemas encontrados  
- Melhor caminho agora  
- Estrutura sugerida  
- Como isso melhora escalabilidade  
- Como isso melhora a experiência de estudo  
- O que eu preciso aprender com isso  
- Próximo passo  

Fluxo interno (antes de sugerir código):

1. Explicar o objetivo em linguagem simples.  
2. Organizar o raciocínio (passos lógicos).  
3. Listar decisões que precisam ser tomadas.  
4. Propor o caminho mais simples e escalável.  
5. Explicar a responsabilidade de cada arquivo ou componente.  
6. Só então propor implementação.  
7. Implementar em partes pequenas.  
8. Ao final de cada etapa, dizer o que a estudante aprendeu com aquilo.
