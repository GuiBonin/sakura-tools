import { describe, expect, it } from 'vitest';
import { CSTAT_TABLE, findCStat, searchCStat } from './rejections';

// Valores conferidos contra o PDF do Anexo I (versão 7.03), itens 4.4.1 a 4.4.3.

describe('Tabela de cStat', () => {
  it('tem as três tabelas do Anexo I com as quantidades do documento', () => {
    const count = (k: string) => CSTAT_TABLE.filter((e) => e.kind === k).length;
    expect(count('result')).toBe(24);
    expect(count('rejection')).toBe(591);
    expect(count('denial')).toBe(3);
  });

  it('todo código tem 3 dígitos e todo texto está preenchido', () => {
    for (const e of CSTAT_TABLE) {
      expect(e.code, e.text).toMatch(/^\d{3}$/);
      expect(e.text.trim(), e.code).not.toBe('');
    }
  });

  it('rejeições começam com "Rejeição" e denegações com "Uso Denegado:"', () => {
    // O 903 aparece no documento sem os dois-pontos; o texto fica como está.
    expect(findCStat('903')[0]?.text).toMatch(/^Rejeição Versão informada no QR-Code/);
    for (const e of CSTAT_TABLE) {
      if (e.kind === 'rejection') expect(e.text, e.code).toMatch(/^Rejeição:? /);
      if (e.kind === 'denial') expect(e.text, e.code).toMatch(/^Uso Denegado: /);
    }
  });

  it('textos de referência', () => {
    expect(findCStat('100')).toEqual([
      { code: '100', kind: 'result', text: 'Autorizado o uso da NF-e' },
    ]);
    expect(findCStat('204')).toEqual([
      {
        code: '204',
        kind: 'rejection',
        text: 'Rejeição: Duplicidade de NF-e [nRec:999999999999999]',
      },
    ]);
    expect(findCStat('301')[0]?.text).toBe('Uso Denegado: Irregularidade fiscal do emitente');
    expect(findCStat('999')[0]?.text).toMatch(/^Rejeição: Erro não catalogado/);
  });

  it('texto quebrado em duas linhas no PDF fica inteiro', () => {
    expect(findCStat('935')[0]?.text).toBe(
      'Rejeição: Valor total da Base de Cálculo superior ao valor limite estabelecido [Valor Limite: R$ XXX.XXX,XX] (valor definido pela UF) [NT 2019.001]',
    );
  });

  it('código com mais de um texto traz todos', () => {
    expect(findCStat('489').map((e) => e.text)).toEqual([
      'Rejeição: CNPJ informado inválido (DV ou zeros)',
      'Rejeição: CNPJ informado inválido (DV ou zeros) [nItem: 999]',
    ]);
    expect(findCStat('142').map((e) => e.kind)).toEqual(['result', 'rejection']);
  });

  it('código inexistente', () => {
    expect(findCStat('000')).toEqual([]);
    expect(findCStat(' 204 ')).toHaveLength(1);
  });
});

describe('searchCStat', () => {
  it('número busca pelo começo do código', () => {
    const codes = searchCStat('20').map((e) => e.code);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every((c) => c.startsWith('20'))).toBe(true);
    expect(codes).toContain('204');
  });

  it('texto sem acento e em qualquer caixa', () => {
    const codes = searchCStat('DUPLICIDADE nfe').map((e) => e.code);
    expect(codes).toContain('204');
    expect(codes).toContain('539');
    expect(searchCStat('rejeicao schema').map((e) => e.code)).toEqual(
      expect.arrayContaining(['215', '225']),
    );
  });

  it('todas as palavras precisam aparecer', () => {
    expect(searchCStat('duplicidade cancelamento-que-nao-existe')).toEqual([]);
  });

  it('filtra por tipo', () => {
    expect(searchCStat('', ['denial']).map((e) => e.code)).toEqual(['301', '302', '303']);
    expect(searchCStat('autorizado', ['result']).map((e) => e.code)).toContain('100');
    expect(searchCStat('autorizado', ['result']).every((e) => e.kind === 'result')).toBe(true);
  });

  it('busca vazia devolve a tabela inteira', () => {
    expect(searchCStat('  ')).toHaveLength(CSTAT_TABLE.length);
  });
});
