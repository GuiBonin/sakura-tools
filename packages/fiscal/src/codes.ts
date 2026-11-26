/**
 * Tabelas de códigos da NF-e e da NFC-e com descrição em pt-BR e en.
 *
 * Fonte: documentação dos campos no schema `leiauteNFe_v4.00.xsd` do pacote
 * de liberação PL_010h (layout 4.00 com os grupos da reforma tributária).
 * Só entram aqui os campos cuja documentação no XSD lista todos os códigos.
 * Campos como `tPag` (forma de pagamento) e `orig` (origem da mercadoria)
 * têm tabela em informe técnico ou no MOC, que muda com frequência, e por
 * isso aparecem só com o código.
 */
import type { Locale } from '@sakura-tools/core';

type Table = Readonly<Record<string, Readonly<Record<Locale, string>>>>;

const t = (pt: string, en: string) => ({ 'pt-BR': pt, en });

export const CODE_TABLES: Readonly<Record<string, Table>> = {
  tpAmb: {
    '1': t('Produção', 'Production'),
    '2': t('Homologação (testes)', 'Homologation (testing)'),
  },
  tpNF: { '0': t('Entrada', 'Inbound'), '1': t('Saída', 'Outbound') },
  idDest: {
    '1': t('Operação interna', 'Intrastate'),
    '2': t('Operação interestadual', 'Interstate'),
    '3': t('Operação com exterior', 'International'),
  },
  finNFe: {
    '1': t('NF-e normal', 'Regular NF-e'),
    '2': t('NF-e complementar', 'Complementary NF-e'),
    '3': t('NF-e de ajuste', 'Adjustment NF-e'),
    '4': t('Devolução ou retorno', 'Return'),
    '5': t('Nota de crédito', 'Credit note'),
    '6': t('Nota de débito', 'Debit note'),
  },
  indFinal: {
    '0': t('Não é consumidor final', 'Not a final consumer'),
    '1': t('Consumidor final', 'Final consumer'),
  },
  indPres: {
    '0': t('Não se aplica', 'Not applicable'),
    '1': t('Operação presencial', 'In person'),
    '2': t('Não presencial, internet', 'Remote, internet'),
    '3': t('Não presencial, teleatendimento', 'Remote, phone'),
    '4': t(
      'Não presencial, NFC-e ou DANFE Simplificado Tipo 2 com entrega',
      'Remote, NFC-e or Simplified DANFE Type 2 with delivery',
    ),
    '5': t('Presencial, fora do estabelecimento', 'In person, outside the store'),
    '9': t('Não presencial, outros', 'Remote, other'),
  },
  tpEmis: {
    '1': t('Emissão normal', 'Normal issue'),
    '2': t('Contingência FS', 'FS contingency'),
    '3': t('Regime Especial NFF (NT 2021.002)', 'NFF special regime (NT 2021.002)'),
    '4': t('Contingência DPEC', 'DPEC contingency'),
    '5': t('Contingência FSDA', 'FSDA contingency'),
    '6': t('Contingência SVC-AN', 'SVC-AN contingency'),
    '7': t('Contingência SVC-RS', 'SVC-RS contingency'),
    '9': t(
      'Contingência off-line da NFC-e e da NF-e com DANFE Simplificado Tipo 2',
      'Offline contingency for NFC-e and NF-e with Simplified DANFE Type 2',
    ),
  },
  tpImp: {
    '0': t('Sem DANFE', 'No DANFE'),
    '1': t('DANFE retrato', 'Portrait DANFE'),
    '2': t('DANFE paisagem', 'Landscape DANFE'),
    '3': t('DANFE simplificado', 'Simplified DANFE'),
    '4': t('DANFE NFC-e', 'NFC-e DANFE'),
    '5': t('DANFE NFC-e em mensagem eletrônica', 'NFC-e DANFE by electronic message'),
    '6': t('DANFE Simplificado Tipo 2', 'Simplified DANFE Type 2'),
  },
  procEmi: {
    '0': t('Aplicativo do contribuinte', 'Taxpayer software'),
    '1': t('Avulsa pelo Fisco', 'Issued by the tax authority'),
    '2': t(
      'Avulsa pelo contribuinte no site do Fisco',
      'Issued by the taxpayer on the tax authority site',
    ),
    '3': t('Aplicativo fornecido pelo Fisco', 'Software provided by the tax authority'),
    '4': t(
      'Provedor de Assinatura e Autorização (PAA)',
      'Signing and Authorization Provider (PAA)',
    ),
  },
  CRT: {
    '1': t('Simples Nacional', 'Simples Nacional'),
    '2': t(
      'Simples Nacional, excesso de sublimite de receita bruta',
      'Simples Nacional, gross revenue sublimit exceeded',
    ),
    '3': t('Regime normal', 'Regular regime'),
    '4': t('Simples Nacional, MEI', 'Simples Nacional, MEI'),
  },
  indIEDest: {
    '1': t('Contribuinte do ICMS', 'ICMS taxpayer'),
    '2': t('Contribuinte isento de inscrição', 'Taxpayer exempt from registration'),
    '9': t('Não contribuinte', 'Not a taxpayer'),
  },
  modFrete: {
    '0': t('Por conta do remetente (CIF)', 'Paid by the sender (CIF)'),
    '1': t('Por conta do destinatário (FOB)', 'Paid by the recipient (FOB)'),
    '2': t('Por conta de terceiros', 'Paid by third parties'),
    '3': t('Transporte próprio do remetente', 'Sender own transport'),
    '4': t('Transporte próprio do destinatário', 'Recipient own transport'),
    '9': t('Sem transporte', 'No transport'),
  },
  indPag: { '0': t('À vista', 'Cash'), '1': t('A prazo', 'Installments') },
  tpIntegra: {
    '1': t('Integrado à automação comercial', 'Integrated with the POS system'),
    '2': t('Não integrado', 'Not integrated'),
  },
};

/** Descrição do código no idioma pedido, ou `undefined` se o campo ou o código não estão na tabela. */
export function describeCode(field: string, code: string, locale: Locale): string | undefined {
  return CODE_TABLES[field]?.[code]?.[locale];
}
