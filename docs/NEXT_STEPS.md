# Próximos passos

Em ordem. Marque com a data ao concluir e mova o resumo para PROJECT_STATE.md.

## Fechar a Fase 1

1. ~~Conferir a interface manualmente~~ (feito no Chrome em 25/11/2026).
2. ~~Playwright~~ e ~~axe~~ (feito em 25/11/2026, `e2e/app.spec.ts`).
3. ~~Separar o planejamento comercial do repositório público~~ (feito em 25/11/2026).
4. Traduzir as mensagens de erro dos pacotes por código de erro (D-005).
5. Tornar o menu do celular modal (`inert` no conteúdo principal enquanto aberto).

## Fase 2: módulo fiscal gratuito

1. Estudar nas fontes oficiais (Portal Nacional da NF-e, MOC, schemas XSD vigentes, notas técnicas
   de IBS/CBS) antes de escrever regra. Registrar fonte e versão de cada regra.
2. Criar `packages/fiscal` reaproveitando o tokenizador seguro de `packages/tools/src/xml.ts`
   (estender para gerar árvore de elementos com namespace).
3. Validador de chave de acesso (44 dígitos, DV módulo 11, cUF, AAMM, CNPJ/CPF do emitente,
   modelo 55/65, série, número, tpEmis, cNF). Atenção ao CNPJ alfanumérico na chave.
4. Visualizador NF-e/NFC-e: identificar `NFe`, `nfeProc`, `enviNFe`, `retEnviNFe`, `protNFe`;
   parse em Web Worker; seções de emitente, destinatário, itens, impostos, totais, transporte,
   pagamentos, protocolo. Campos ausentes são normais.
5. Fixtures só fictícias, geradas para teste. Nunca XML real de cliente.
6. Comparador de XML, exportação JSON/CSV, consulta local de rejeições documentadas.
7. Rotas `/fiscal/*` conforme PRODUCT_SPEC §13.

## Fase 3: lançamento open source

- Pré-renderizar `/tools/:slug` (e `/fiscal/*`) em HTML estático; gerar `sitemap.xml`.
- Screenshots reais no README.
- Reduzir o bundle principal (`manualChunks`, avaliar carregar framer-motion depois).
- Build dos pacotes `core` e `tools` para publicação versionada (D-002).
- Deploy no Cloudflare Pages (precisa de autorização e conta do fundador).
- Habilitar secret scanning e reporte privado de vulnerabilidades no GitHub.

## Fase 4 em diante

Versão comercial, planejada fora deste repositório. Nada comercial aqui.
