# Contribuindo

Obrigado pelo interesse. Contribuições de código, testes, traduções e documentação são bem-vindas.

## Antes de começar

- Para mudanças grandes, abra uma issue primeiro para combinar a abordagem.
- Leia [AGENTS.md](./AGENTS.md) (vale para pessoas também) e [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
- Nova ferramenta: siga [docs/ADDING_A_TOOL.md](./docs/ADDING_A_TOOL.md).

## Fluxo

1. Faça um fork e crie um branch a partir de `main`.
2. `npm install` e `npm run dev`.
3. Escreva testes para o que mudou.
4. Rode `npm run check` e garanta que passa.
5. Abra o pull request preenchendo o template.

## Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat:`, `fix:`,
`docs:`, `test:`, `refactor:`, `chore:`, `perf:`, `build:`, `ci:`.

## Regras que não mudam

- Ferramentas gratuitas não fazem requisições de rede e não salvam a entrada do usuário.
- Nada de documentos fiscais reais, CPFs ou CNPJs de pessoas reais em testes ou exemplos.
- Nada de segredos ou chaves no repositório.

## Licença

Ao contribuir, você concorda que sua contribuição é licenciada sob a [licença MIT](./LICENSE).
