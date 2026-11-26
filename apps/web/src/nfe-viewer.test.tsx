import { buildSampleNfe } from '@sakura-tools/fiscal/sample';
import { NFE_NAMESPACE } from '@sakura-tools/fiscal/nfe';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test-utils';

// Visualizador de NF-e. Só notas fictícias, em homologação.

const EMIT = '11222333000181';
const DEST = '52998224725';
const DATE = new Date(Date.UTC(2026, 10, 26, 15, 0, 0));
const sample = (o: Parameters<typeof buildSampleNfe>[0] = {}) =>
  buildSampleNfe({ emitCnpj: EMIT, destCpf: DEST, date: DATE, ...o });

function xmlFile(content: string, name: string): File {
  const file = new File([content], name, { type: 'application/xml' });
  if (!file.text) Object.assign(file, { text: async () => content });
  return file;
}

async function open(locale: 'pt-BR' | 'en' = 'pt-BR') {
  const user = userEvent.setup();
  renderApp('/tools/nfe-viewer', locale);
  const input = await screen.findByLabelText(
    locale === 'en' ? 'NF-e or NFC-e XML' : 'XML da NF-e ou NFC-e',
  );
  return { user, input: input as HTMLTextAreaElement };
}

async function view(xml: string) {
  const ctx = await open();
  fireEvent.change(ctx.input, { target: { value: xml } });
  await ctx.user.click(screen.getByRole('button', { name: 'Visualizar' }));
  return ctx;
}

const region = () => screen.getByRole('region', { name: 'Nota lida' });

describe('Visualizador de NF-e', () => {
  it('nfeProc: tipo do documento, ambiente, chave e resumo', async () => {
    const { xml, key } = sample({ withProtocol: true });
    await view(xml);
    const r = await screen.findByRole('region', { name: 'Nota lida' });
    expect(
      within(r).getByText(/Documento lido: NF-e com protocolo \(nfeProc\)/),
    ).toBeInTheDocument();
    expect(
      within(r).getByRole('heading', { level: 2, name: /NF-e nº 1234 · série 1/ }),
    ).toBeInTheDocument();
    expect(within(r).getByText('Homologação')).toBeInTheDocument();
    expect(within(r).getByText(/cStat 100 · Autorizado o uso da NF-e/)).toBeInTheDocument();
    expect(within(r).getByText(key.match(/.{1,4}/g)!.join(' '))).toBeInTheDocument();
    expect(
      within(r).getByText('Nota emitida em ambiente de homologação (testes).'),
    ).toBeInTheDocument();
    // Resumo com valor em reais e códigos descritos pelo XSD.
    expect(within(r).getByText('R$ 150,00')).toBeInTheDocument();
    expect(within(r).getAllByText(/Homologação \(testes\)/).length).toBeGreaterThan(0);
    expect(
      within(r).getByText('EMPRESA FICTICIA DE TESTE LTDA', { selector: 'dd' }),
    ).toBeInTheDocument();
  });

  it('itens: tabela e detalhes com IBS e CBS', async () => {
    const { user } = await view(sample({ withProtocol: true }).xml);
    await user.click(await screen.findByRole('tab', { name: /Itens \(2\)/ }));
    const table = screen.getByRole('table', { name: 'Itens da nota' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('CAFE TORRADO 500G (EXEMPLO)');
    expect(rows[1]).toHaveTextContent('R$ 50,00');
    expect(rows[2]).toHaveTextContent('09012100');
    await user.click(screen.getByRole('button', { name: /Item 1 · CAFE TORRADO/ }));
    expect(screen.getAllByRole('heading', { name: /IBS e CBS/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alíquota da CBS (%)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ICMS00').length).toBeGreaterThan(0);
  });

  it('totais mostram ICMS e o grupo de IBS e CBS', async () => {
    const { user } = await view(sample().xml);
    await user.click(await screen.findByRole('tab', { name: 'Totais' }));
    expect(screen.getByRole('heading', { name: /Totais do ICMS/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Totais de IBS e CBS/ })).toBeInTheDocument();
    expect(screen.getByText('Base de cálculo do IBS e da CBS')).toBeInTheDocument();
  });

  it('transporte e pagamento com códigos descritos, tPag só como código', async () => {
    const { user } = await view(sample().xml);
    await user.click(await screen.findByRole('tab', { name: 'Transporte e pagamento' }));
    expect(screen.getByText(/Sem transporte/)).toBeInTheDocument();
    expect(screen.getByText('Forma de pagamento (tPag)')).toBeInTheDocument();
    expect(
      screen.getByText(/A forma de pagamento \(tPag\) aparece só como código/),
    ).toBeInTheDocument();
  });

  it('protocolo avisa que não foi verificado', async () => {
    const { user } = await view(sample({ withProtocol: true }).xml);
    await user.click(await screen.findByRole('tab', { name: 'Protocolo' }));
    expect(screen.getByText('Protocolo não verificado')).toBeInTheDocument();
    expect(screen.getByText(/não comprova que a nota foi autorizada/)).toBeInTheDocument();
    expect(screen.getByText('135000000000001')).toBeInTheDocument();
  });

  it('sem protocolo: observação e aba explica', async () => {
    const { user } = await view(sample().xml);
    expect(
      await screen.findByText('O XML não traz protocolo de autorização (protNFe).'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Protocolo' }));
    expect(
      screen.getByText('Este XML não traz protocolo de autorização (protNFe).'),
    ).toBeInTheDocument();
  });

  it('aba XML mostra o XML formatado', async () => {
    const { user } = await view(sample().xml.replace(/>\s+</g, '><'));
    await user.click(await screen.findByRole('tab', { name: 'XML' }));
    const out = screen.getByLabelText('XML formatado') as HTMLTextAreaElement;
    expect(out.value).toContain('\n  <infNFe');
    expect(screen.getByRole('button', { name: 'Baixar XML original' })).toBeInTheDocument();
  });

  it('campo do XML diferente da chave aparece como problema', async () => {
    await view(sample().xml.replace('<nNF>1234</nNF>', '<nNF>999</nNF>'));
    const problems = await screen.findByText('Problemas encontrados');
    expect(problems.closest('.st-notice')).toHaveTextContent(
      'O campo nNF do XML (999) é diferente do que está na chave (000001234).',
    );
  });

  it('chave inválida no Id mostra os detalhes da chave', async () => {
    const { xml, key } = sample();
    const bad = key.slice(0, 43) + (key[43] === '0' ? '1' : '0');
    await view(xml.replace(`NFe${key}`, `NFe${bad}`));
    const details = await screen.findByText('Detalhes da chave');
    expect(details.closest('.st-notice')).toHaveTextContent('O dígito verificador não confere.');
  });

  it('XML mal formado mostra linha, coluna e mensagem', async () => {
    await view('<NFe>\n<infNFe></NFe>');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível ler o XML');
    expect(alert).toHaveTextContent(/Linha \d+, coluna \d+/);
  });

  it('DOCTYPE é recusado', async () => {
    await view(
      '<?xml version="1.0"?><!DOCTYPE NFe [<!ENTITY x SYSTEM "file:///etc/passwd">]><NFe>&x;</NFe>',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('DOCTYPE');
  });

  it('documento que não é NF-e', async () => {
    await view('<cteProc/>');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O elemento raiz <cteProc> não é um documento suportado.',
    );
  });

  it('lote com duas notas permite escolher a nota', async () => {
    const inner = (n: number) => sample({ nNF: n }).xml.replace(/^<\?xml[^>]*>\n/, '');
    const { user } = await view(
      `<enviNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><idLote>7</idLote><indSinc>0</indSinc>${inner(10)}${inner(11)}</enviNFe>`,
    );
    const r = await screen.findByRole('region', { name: 'Nota lida' });
    expect(within(r).getByText(/Lote de envio \(enviNFe\)/)).toBeInTheDocument();
    expect(within(r).getByRole('heading', { level: 2, name: /nº 10 / })).toBeInTheDocument();
    await user.click(within(r).getByRole('combobox', { name: /Nota do lote/ }));
    await user.click(await screen.findByRole('option', { name: /2\. NF-e 11/ }));
    expect(within(region()).getByRole('heading', { level: 2, name: /nº 11 / })).toBeInTheDocument();
  });

  it('retEnviNFe mostra status do lote e protocolo', async () => {
    await view(
      `<retEnviNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><tpAmb>2</tpAmb><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe versao="4.00"><infProt><chNFe>${sample().key}</chNFe><cStat>539</cStat><xMotivo>Rejeição de exemplo</xMotivo></infProt></protNFe></retEnviNFe>`,
    );
    const r = await screen.findByRole('region', { name: 'Nota lida' });
    expect(within(r).getByText(/104 Lote processado/)).toBeInTheDocument();
    expect(within(r).getByText('Rejeição de exemplo')).toBeInTheDocument();
    expect(within(r).getByText('Protocolo não verificado')).toBeInTheDocument();
  });

  it('arquivo enviado é lido na hora e mostra o nome', async () => {
    const { user } = await open();
    const input = document.getElementById('nfe-file') as HTMLInputElement;
    await user.upload(input, xmlFile(sample().xml, 'nota-teste.xml'));
    expect(await screen.findByText('nota-teste.xml')).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Nota lida' })).toBeInTheDocument();
  });

  it('arquivo grande demais é recusado sem ler', async () => {
    const { user } = await open();
    const big = xmlFile('<x/>', 'grande.xml');
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await user.upload(document.getElementById('nfe-file') as HTMLInputElement, big);
    expect(await screen.findByText('Arquivo maior que o limite de 10 MB.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Nota lida' })).not.toBeInTheDocument();
  });

  it('editar o XML esconde o resultado antigo', async () => {
    const { input } = await view(sample().xml);
    expect(await screen.findByRole('region', { name: 'Nota lida' })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: `${input.value} ` } });
    expect(screen.queryByRole('region', { name: 'Nota lida' })).not.toBeInTheDocument();
  });

  it('Exemplo lê uma nota fictícia e Limpar zera tudo', async () => {
    const { user, input } = await open();
    await user.click(screen.getByRole('button', { name: 'Exemplo' }));
    expect(input.value).toContain('EMPRESA FICTICIA DE TESTE LTDA');
    expect(await screen.findByRole('region', { name: 'Nota lida' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(input.value).toBe('');
    expect(screen.queryByRole('region', { name: 'Nota lida' })).not.toBeInTheDocument();
  });

  it('em inglês', async () => {
    const { user, input } = await open('en');
    fireEvent.change(input, {
      target: { value: sample().xml.replace('<nNF>1234</nNF>', '<nNF>9</nNF>') },
    });
    await user.click(screen.getByRole('button', { name: 'View' }));
    expect(await screen.findByText('Problems found')).toBeInTheDocument();
    expect(
      screen.getByText('Field nNF in the XML (9) differs from the key (000001234).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Totals' })).toBeInTheDocument();
  });
});
