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
- 19 ferramentas locais: JSON, XML, Base64, URL, UUID, senhas, cores, regex, diff, Unix timestamp,
  QR Code, hash, JWT, CPF, CNPJ, chave de acesso, visualizador e comparador de NF-e e consulta de
  rejeições.
- Conversor de cores com CMYK (fórmula simples, sem perfil ICC), inclusive como entrada.
- Páginas de planos, roadmap, changelog, documentação, contribuição, privacidade e termos
  (rascunhos para revisão jurídica).
- Exemplo e Limpar em todas as ferramentas, remover arquivo no hash, copiar o diff e áreas de
  toque de 44 px no celular.
- Testes E2E com Playwright (desktop e 375 px) e verificação de acessibilidade com axe.
- Content Security Policy no build e headers de segurança para Cloudflare Pages.
- Logo oficial como favicon e no cabeçalho.
- Mensagens de erro em português e inglês, seguindo o idioma da interface.
- Menu do celular modal: com ele aberto, o Tab não alcança o resto da tela.
- Validador de chave de acesso da NF-e e da NFC-e: confere UF, mês, CNPJ ou CPF do emitente,
  modelo, número, forma de emissão, código numérico (regra B03-10 da NT 2019.001) e dígito
  verificador com CNPJ alfanumérico (NT 2025.001).
- Visualizador de NF-e e NFC-e: lê NFe, nfeProc, enviNFe, retEnviNFe e protNFe no layout 4.00 em
  Web Worker, com resumo, emitente, destinatário, itens, impostos (inclusive IBS, CBS e Imposto
  Seletivo), totais, transporte, cobrança, pagamento, protocolo e XML formatado. Confere a chave
  do Id contra os campos da nota e contra o protocolo.
- Pacote `packages/fiscal` e árvore XML com namespaces (`parseXmlTree`) em `packages/tools`.
- Consulta de rejeições: tabela oficial de cStat do MOC 7.0, Anexo I (versão 7.03), com busca por
  código ou texto e filtro por tipo. O visualizador mostra o texto oficial do cStat de protocolos
  e retornos.
- Visualizador: eventos (procEventoNFe, evento e retEvento) com conferência do Id, busca no XML,
  download em JSON e itens em CSV.
- Comparador de XML de NF-e campo a campo, ignorando a assinatura por padrão.
- Ferramentas fiscais em `/fiscal/:slug`, com redirecionamento de `/tools/` e
  `/fiscal/nfce-viewer`.
