# Segurança e privacidade (documentação técnica)

Para reportar vulnerabilidades, veja o [SECURITY.md da raiz](../SECURITY.md).

## Princípios do núcleo gratuito

- **Nada sai do navegador.** CSP com `connect-src 'self'` no build. Sem telemetria, analytics ou
  cookies de rastreamento.
- **Entradas não são persistidas.** Só preferências e IDs de ferramentas vão para o localStorage.
  Teste automatizado verifica que o texto digitado numa ferramenta não aparece no storage.
- **Aleatoriedade criptográfica.** Senhas, UUIDs, CPF/CNPJ de teste usam `crypto.getRandomValues`
  com amostragem por rejeição. Regra de lint proíbe `Math.random`.
- **Nenhum segredo no repositório.** `.env.example` não tem valores. O app público não lê variáveis
  de ambiente com segredo.

## Ameaças tratadas

| Ameaça                    | Tratamento                                                                                                           | Onde                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| XXE / billion laughs      | DOCTYPE e ENTITY recusados; só entidades predefinidas e numéricas                                                    | `packages/tools/src/xml.ts` |
| XML gigante ou profundo   | Limite de 10 MB e 256 níveis                                                                                         | `xml.ts`                    |
| ReDoS                     | Regex em Web Worker com timeout de 1,5 s; limite de 1 MB de texto e 1000 matches                                     | `lib/regexRunner.ts`        |
| Entradas enormes          | Limites por ferramenta (JSON 5 MB, diff 500 mil caracteres, arquivo para hash 512 MB)                                | cada módulo                 |
| XSS                       | React escapa texto. Nenhum `dangerouslySetInnerHTML`. QR Code exibido como `<img>` de data URI SVG gerado localmente | `QrCodeGenerator.tsx`       |
| Clickjacking              | `frame-ancestors 'none'` e `X-Frame-Options: DENY`                                                                   | `public/_headers`           |
| JWT falsificado           | A ferramenta não diz que o token é válido; aviso fixo e selo "assinatura não verificada"; alerta para `alg: none`    | `jwt.ts`, `JwtDecoder.tsx`  |
| Uso indevido de geradores | Avisos de "dados de teste" e termos de uso                                                                           | CPF/CNPJ                    |

## Pendências

- Habilitar secret scanning e reporte privado de vulnerabilidades no GitHub (Dependabot já está
  configurado em `.github/`).
- Requisitos de segurança dos módulos comerciais ficam nos repositórios privados deles.

## LGPD

Os textos de privacidade e termos são rascunhos para revisão jurídica. O projeto não declara
conformidade com a LGPD.
