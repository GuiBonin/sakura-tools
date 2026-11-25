# Política de segurança

## Versões suportadas

O projeto ainda não tem release. Correções de segurança entram no branch `main`.

## Como reportar

Não abra issue pública para vulnerabilidades. Use o
[reporte privado de vulnerabilidades do GitHub](https://github.com/GuiBonin/sakura-tools/security/advisories/new)
(aba Security → Report a vulnerability).

Inclua passos para reproduzir, impacto esperado e, se possível, uma sugestão de correção. A
resposta inicial deve vir em até 7 dias.

## Escopo

Interessa especialmente: execução de script (XSS), vazamento de dados para fora do navegador,
falhas no parser de XML (XXE, expansão de entidades), negação de serviço por entrada maliciosa
e geração de números aleatórios previsíveis.

Detalhes técnicos das proteções em [docs/SECURITY.md](./docs/SECURITY.md).
