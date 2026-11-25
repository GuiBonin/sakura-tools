# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento
[SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Monorepo com `apps/web`, `packages/core` e `packages/tools`.
- Registro de ferramentas com busca sem acento, categorias e contratos de extensão comercial
  (entitlements, `SakuraExtension`, `AIProvider`).
- Layout com sidebar responsiva, busca global (Ctrl+K), favoritos e recentes locais, temas claro
  e escuro, português e inglês.
- 15 ferramentas locais: JSON, XML, Base64, URL, UUID, senhas, cores, regex, diff, Unix timestamp,
  QR Code, hash, JWT, CPF e CNPJ.
- Conversor de cores com CMYK (fórmula simples, sem perfil ICC), inclusive como entrada.
- Páginas de planos, roadmap, changelog, documentação, contribuição, privacidade e termos
  (rascunhos para revisão jurídica).
- Exemplo e Limpar em todas as ferramentas, remover arquivo no hash, copiar o diff e áreas de
  toque de 44 px no celular.
- Testes E2E com Playwright (desktop e 375 px) e verificação de acessibilidade com axe.
- Content Security Policy no build e headers de segurança para Cloudflare Pages.
