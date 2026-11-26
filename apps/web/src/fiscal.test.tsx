import { NFE_NAMESPACE } from '@sakura-tools/fiscal/nfe';
import { buildSampleCancelEvent, buildSampleNfe } from '@sakura-tools/fiscal/sample';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from './test-utils';

// Fase 2: rejeições, comparador, eventos, busca e exportação no visualizador e
// rotas /fiscal/*. Tudo fictício, em homologação.

const DATE = new Date(Date.UTC(2026, 10, 26, 15, 0, 0));
const sample = (o: Parameters<typeof buildSampleNfe>[0] = {}) =>
  buildSampleNfe({ emitCnpj: '11222333000181', destCpf: '52998224725', date: DATE, ...o });

/** Captura o conteúdo dos downloads feitos com downloadBlob. */
function captureDownloads() {
  const blobs: { blob: Blob; name: string }[] = [];
  let last: Blob | null = null;
  const create = vi.fn((b: Blob) => {
    last = b;
    return 'blob:teste';
  });
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    if (last) blobs.push({ blob: last, name: this.download });
  });
  return { blobs, restore: () => click.mockRestore() };
}

const blobText = (b: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(b);
  });

const blobBytes = (b: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.readAsArrayBuffer(b);
  });

afterEach(() => vi.restoreAllMocks());

describe('Consulta de rejeições', () => {
  it('busca por código mostra o texto oficial e o tipo', async () => {
    renderApp('/fiscal/rejection-codes');
    fireEvent.change(await screen.findByLabelText('Código ou texto'), { target: { value: '204' } });
    const table = screen.getByRole('table', { name: 'Códigos de status (cStat)' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('204');
    expect(rows[1]).toHaveTextContent('Rejeição: Duplicidade de NF-e');
    expect(within(rows[1]!).getByText('Rejeição', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 código encontrado.');
  });

  it('busca por texto sem acento e filtro por tipo', async () => {
    const user = userEvent.setup();
    renderApp('/fiscal/rejection-codes');
    fireEvent.change(await screen.findByLabelText('Código ou texto'), {
      target: { value: 'irregularidade fiscal' },
    });
    // 240 (rejeição), 301 e 302 (denegação).
    expect(screen.getByRole('status')).toHaveTextContent('3 códigos encontrados.');
    await user.click(screen.getByRole('radio', { name: 'Rejeição' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 código encontrado.');
    await user.click(screen.getByRole('radio', { name: 'Resultado' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum código encontrado.');
    await user.click(screen.getByRole('radio', { name: 'Denegação' }));
    expect(screen.getByRole('status')).toHaveTextContent('2 códigos encontrados.');
  });

  it('lista longa pagina de 100 em 100', async () => {
    const user = userEvent.setup();
    renderApp('/fiscal/rejection-codes');
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(101);
    await user.click(screen.getByRole('button', { name: /Mostrar mais/ }));
    expect(within(table).getAllByRole('row')).toHaveLength(201);
  });

  it('Exemplo e Limpar', async () => {
    const user = userEvent.setup();
    renderApp('/fiscal/rejection-codes');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    expect(screen.getByLabelText('Código ou texto')).toHaveValue('539');
    expect(
      screen.getByText(/Duplicidade de NF-e com diferença na Chave de Acesso/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.getByLabelText('Código ou texto')).toHaveValue('');
  });

  it('informa a fonte e a versão da tabela', async () => {
    renderApp('/fiscal/rejection-codes');
    expect(await screen.findByText(/versão 7\.03 \(outubro de 2020\)/)).toBeInTheDocument();
  });
});

describe('Comparador de XML de NF-e', () => {
  async function compare(a: string, b: string) {
    const user = userEvent.setup();
    renderApp('/fiscal/nfe-compare');
    fireEvent.change(await screen.findByLabelText('XML A'), { target: { value: a } });
    fireEvent.change(screen.getByLabelText('XML B'), { target: { value: b } });
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    return user;
  }

  it('mostra valores alterados, só no A e só no B', async () => {
    const { xml } = sample();
    const right = xml
      .replace('<vNF>150.00</vNF>', '<vNF>151.00</vNF>')
      .replace('<xFant>LOJA EXEMPLO</xFant>', '');
    const user = await compare(xml, right);
    const region = screen.getByRole('region', { name: 'Diferenças' });
    expect(within(region).getByRole('status')).toHaveTextContent(
      /2 diferença\(s\) em \d+ valores: 1 alterada\(s\), 1 só no A, 0 só no B\./,
    );
    const table = within(region).getByRole('table');
    expect(within(table).getByText('NFe/infNFe/total/ICMSTot/vNF')).toBeInTheDocument();
    expect(within(table).getByText('151.00')).toBeInTheDocument();
    await user.click(within(region).getByRole('radio', { name: 'Só no A' }));
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('NFe/infNFe/emit/xFant')).toBeInTheDocument();
  });

  it('documentos iguais', async () => {
    const { xml } = sample();
    await compare(xml, xml);
    expect(screen.getByRole('status')).toHaveTextContent(
      /Nenhuma diferença em \d+ valores comparados/,
    );
  });

  it('erro diz qual lado não foi lido', async () => {
    await compare(sample().xml, '<a><b></a>');
    expect(screen.getByRole('alert')).toHaveTextContent('XML B');
  });

  it('assinatura pode entrar na comparação', async () => {
    const sig = (v: string) =>
      sample().xml.replace(
        '</infNFe>',
        `</infNFe><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignatureValue>${v}</SignatureValue></Signature>`,
      );
    const user = await compare(sig('A'), sig('B'));
    expect(screen.getByRole('status')).toHaveTextContent(/Nenhuma diferença/);
    await user.click(screen.getByRole('switch', { name: /Ignorar a assinatura/ }));
    // Mudar a opção esconde o resultado antigo até comparar de novo.
    expect(screen.queryByRole('region', { name: 'Diferenças' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(screen.getByText('NFe/Signature/SignatureValue')).toBeInTheDocument();
  });

  it('Exemplo compara duas notas fictícias com diferenças; Limpar zera', async () => {
    const user = userEvent.setup();
    renderApp('/fiscal/nfe-compare');
    await user.click(await screen.findByRole('button', { name: 'Exemplo' }));
    const region = screen.getByRole('region', { name: 'Diferenças' });
    expect(within(region).getByText('NFe/infNFe/transp/modFrete')).toBeInTheDocument();
    expect(within(region).getByRole('status')).toHaveTextContent('3 diferença(s)');
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.getByLabelText('XML A')).toHaveValue('');
    expect(screen.queryByRole('region', { name: 'Diferenças' })).not.toBeInTheDocument();
  });
});

describe('Visualizador: eventos, cStat oficial, busca e exportação', () => {
  async function view(xml: string) {
    const user = userEvent.setup();
    renderApp('/fiscal/nfe-viewer');
    fireEvent.change(await screen.findByLabelText('XML da NF-e ou NFC-e'), {
      target: { value: xml },
    });
    await user.click(screen.getByRole('button', { name: 'Visualizar' }));
    await screen.findByRole('region', { name: 'Nota lida' });
    return user;
  }

  it('evento de cancelamento com retorno e texto oficial do cStat', async () => {
    const { key } = sample();
    await view(buildSampleCancelEvent({ key, date: DATE, withReturn: true }));
    expect(screen.getByText(/Evento com retorno \(procEventoNFe\)/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Evento Cancelamento (110111)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Retorno não verificado')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Tabela oficial \(MOC 7\.0, Anexo I\): Evento registrado e vinculado a NF-e/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Cancelamento de nota ficticia de teste')).toBeInTheDocument();
    // Sem NF-e no documento, o XML aparece numa seção própria.
    expect(screen.getByRole('heading', { name: 'XML do documento' })).toBeInTheDocument();
  });

  it('cStat fora da tabela é avisado', async () => {
    await view(
      `<protNFe xmlns="${NFE_NAMESPACE}" versao="4.00"><infProt><cStat>997</cStat><xMotivo>X</xMotivo></infProt></protNFe>`,
    );
    expect(screen.getByText(/O cStat 997 não está na tabela do MOC 7\.0/)).toBeInTheDocument();
  });

  it('protocolo da nota mostra o texto oficial do 100', async () => {
    const user = await view(sample({ withProtocol: true }).xml);
    await user.click(screen.getByRole('tab', { name: 'Protocolo' }));
    expect(
      screen.getByText(/Tabela oficial \(MOC 7\.0, Anexo I\): Autorizado o uso da NF-e/),
    ).toBeInTheDocument();
  });

  it('busca no XML lista as linhas com número', async () => {
    const user = await view(sample().xml);
    await user.click(screen.getByRole('tab', { name: 'XML' }));
    fireEvent.change(screen.getByLabelText('Buscar no XML'), { target: { value: 'vprod' } });
    const list = screen.getByRole('list', { name: 'Linhas encontradas' });
    const items = within(list).getAllByRole('listitem');
    // vProd dos dois itens e do total.
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('<vProd>50.00</vProd>');
    fireEvent.change(screen.getByLabelText('Buscar no XML'), { target: { value: 'nada-disso' } });
    expect(screen.getByText('Nenhuma linha encontrada.')).toBeInTheDocument();
  });

  it('baixa JSON do documento e CSV dos itens', async () => {
    const dl = captureDownloads();
    const user = await view(sample().xml);
    await user.click(screen.getByRole('tab', { name: 'XML' }));
    await user.click(screen.getByRole('button', { name: 'Baixar em JSON' }));
    await user.click(screen.getByRole('tab', { name: /Itens/ }));
    await user.click(screen.getByRole('button', { name: 'Baixar itens em CSV' }));
    await waitFor(() => expect(dl.blobs).toHaveLength(2));
    const [json, csv] = dl.blobs;
    expect(json!.name).toMatch(/^\d{44}\.json$/);
    const parsed = JSON.parse(await blobText(json!.blob)) as {
      NFe: { infNFe: { ide: { nNF: string } } };
    };
    expect(parsed.NFe.infNFe.ide.nNF).toBe('1234');
    expect(csv!.name).toMatch(/^\d{44}-itens\.csv$/);
    // BOM (EF BB BF) para o Excel reconhecer UTF-8.
    expect([...(await blobBytes(csv!.blob)).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = await blobText(csv!.blob);
    expect(text.split('\r\n')[0]).toBe('nItem;cProd;xProd;NCM;CFOP;uCom;qCom;vUnCom;vProd;vDesc');
    dl.restore();
  });
});

describe('Rotas /fiscal/*', () => {
  it.each([
    ['/fiscal/nfe-viewer', 'Visualizador de NF-e e NFC-e'],
    ['/fiscal/nfce-viewer', 'Visualizador de NF-e e NFC-e'],
    ['/fiscal/rejection-codes', 'Consulta de rejeições'],
    ['/fiscal/access-key-validator', 'Validador de chave de acesso'],
    ['/fiscal/nfe-compare', 'Comparador de XML de NF-e'],
  ])('%s abre a ferramenta', async (path, title) => {
    renderApp(path);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('/tools/ de ferramenta fiscal leva para /fiscal/', async () => {
    renderApp('/tools/access-key-validator');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Validador de chave de acesso' }),
    ).toBeInTheDocument();
    const link = screen.getAllByRole('link', { name: /Validador de chave de acesso/ })[0]!;
    expect(link).toHaveAttribute('href', '/fiscal/access-key-validator');
  });

  it('/fiscal/ de ferramenta não fiscal leva para /tools/', async () => {
    renderApp('/fiscal/json-formatter');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Formatador de JSON' }),
    ).toBeInTheDocument();
  });

  it('alias só vale em /fiscal/', async () => {
    renderApp('/tools/nfce-viewer');
    expect(await screen.findByText(/não encontrada|not found/i)).toBeInTheDocument();
  });

  it('menu e busca apontam ferramentas fiscais para /fiscal/', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    const links = screen.getAllByRole('link', { name: /Consulta de rejeições/ });
    expect(links.every((a) => a.getAttribute('href') === '/fiscal/rejection-codes')).toBe(true);
    expect(screen.getAllByRole('link', { name: /Formatador de JSON/ })[0]).toHaveAttribute(
      'href',
      '/tools/json-formatter',
    );
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'rejeicoes');
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Consulta de rejeições' }),
    ).toBeInTheDocument();
  });
});
