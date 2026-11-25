# Propostas para a Sakura UI

Componentes que o Sakura Tools precisou criar localmente porque a Sakura UI 0.2.0 não tem.
Nenhuma alteração foi feita no repositório da Sakura UI. Cada item é uma proposta para o fundador
avaliar e abrir no repositório certo.

| Proposta                                                | Implementação local              | Motivo                                                                                                                         |
| ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `TextArea` com `label`, `hint`, `error` e variante mono | `apps/web/src/components/ui.tsx` | Quase toda ferramenta tem entrada multilinha. API espelhando `Input`                                                           |
| `SegmentedControl` (radiogroup)                         | `Segmented` em `ui.tsx`          | Alternar modos (encode/decode, unidade, versão)                                                                                |
| `Callout`/`Alert` estático com tons                     | `Notice` em `ui.tsx`             | Avisos permanentes (ex.: "decodificar não é validar"). `Toast` é efêmero                                                       |
| `CommandPalette`/`Combobox`                             | `components/CommandPalette.tsx`  | Busca global Ctrl+K com `aria-activedescendant`                                                                                |
| `CopyButton`                                            | `ui.tsx`                         | Padrão repetido em toda ferramenta. A documentação da Sakura UI tem um interno (`docs-kit/CopyButton.tsx`) que não é exportado |
| Token de fundo secundário (`#211A29`)                   | `--st-bg-2` em `styles/app.css`  | Está na paleta da marca mas não nos tokens                                                                                     |

Quando algum desses entrar na Sakura UI, trocar a implementação local pelo componente da
biblioteca e remover a linha desta tabela.

## Contraste do primary como texto

O `--sk-primary` (`#d88ca5`) não serve como cor de texto no tema claro (2,42:1). O app criou
`--st-brand-text` (`#a8486a`). Proposta: a Sakura UI expor um token de texto da marca, como já faz
com `--sk-indicator-start` para indicadores gráficos.
