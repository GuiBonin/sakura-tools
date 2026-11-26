import { describe, expect, it } from 'vitest';
import { childOf, childrenOf, decodeXmlText, parseXmlTree, pathOf, textOf } from './xmlTree';
import { XmlError } from './xml';

const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';
const DS_NS = 'http://www.w3.org/2000/09/xmldsig#';

describe('decodeXmlText', () => {
  it('decodifica entidades predefinidas e referências numéricas', () => {
    expect(decodeXmlText('Caf&#233; &amp; p&#xE3;o &lt;1&gt; &quot;a&quot; &apos;b&apos;')).toBe(
      `Café & pão <1> "a" 'b'`,
    );
  });

  it('referência fora do BMP', () => {
    expect(decodeXmlText('&#x1F338;')).toBe('🌸');
  });
});

describe('parseXmlTree', () => {
  it('monta elementos, atributos, texto e namespaces', () => {
    const root = parseXmlTree(
      `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="${NFE_NS}" versao="4.00">
  <NFe><infNFe Id="NFe123" versao="4.00"><ide><nNF>42</nNF></ide></infNFe>
    <Signature xmlns="${DS_NS}"><SignatureValue>abc</SignatureValue></Signature>
  </NFe>
</nfeProc>`,
    );
    expect(root.local).toBe('nfeProc');
    expect(root.ns).toBe(NFE_NS);
    expect(root.attrs).toEqual({ versao: '4.00' });
    const nfe = childOf(root, 'NFe')!;
    expect(childOf(nfe, 'infNFe')?.attrs).toEqual({ Id: 'NFe123', versao: '4.00' });
    expect(textOf(nfe, 'infNFe/ide/nNF')).toBe('42');
    const sig = childOf(nfe, 'Signature')!;
    expect(sig.ns).toBe(DS_NS);
    expect(childOf(sig, 'SignatureValue')?.ns).toBe(DS_NS);
  });

  it('resolve prefixos e não guarda xmlns como atributo', () => {
    const root = parseXmlTree(`<a xmlns:ds="${DS_NS}" x="1"><ds:Signature/><b/></a>`);
    expect(root.attrs).toEqual({ x: '1' });
    expect(root.ns).toBe('');
    const [sig, b] = root.children;
    expect(sig).toMatchObject({ name: 'ds:Signature', local: 'Signature', ns: DS_NS });
    expect(b?.ns).toBe('');
  });

  it('prefixo sem declaração é erro', () => {
    expect(() => parseXmlTree('<a><x:b/></a>')).toThrow(XmlError);
  });

  it('decodifica texto, atributos e CDATA', () => {
    const root = parseXmlTree(
      `<a t="&quot;x&quot; &amp; y"><b>Caf&#233; &amp; leite</b><c><![CDATA[<tag> & cia]]></c></a>`,
    );
    expect(root.attrs.t).toBe('"x" & y');
    expect(textOf(root, 'b')).toBe('Café & leite');
    expect(textOf(root, 'c')).toBe('<tag> & cia');
  });

  it('texto só dos filhos não sobe para o pai', () => {
    const root = parseXmlTree('<a> <b>1</b> <b>2</b> </a>');
    expect(root.text.trim()).toBe('');
    expect(childrenOf(root, 'b').map((b) => b.text)).toEqual(['1', '2']);
  });

  it('textOf devolve undefined para caminho ausente ou vazio', () => {
    const root = parseXmlTree('<a><b>  </b><c/></a>');
    expect(textOf(root, 'b')).toBeUndefined();
    expect(textOf(root, 'c')).toBeUndefined();
    expect(textOf(root, 'x/y')).toBeUndefined();
    expect(pathOf(root, 'x/y')).toBeUndefined();
    expect(childrenOf(undefined, 'b')).toEqual([]);
  });

  it('recusa DOCTYPE e entidade declarada (XXE)', () => {
    expect(() =>
      parseXmlTree(
        '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>',
      ),
    ).toThrow(XmlError);
  });

  it('recusa XML mal formado com a mensagem do validador', () => {
    try {
      parseXmlTree('<a><b></a>');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(XmlError);
      expect((e as XmlError).toolMessage.code).toBe('xml.mismatchedClose');
    }
  });

  it('elemento autofechado vira folha', () => {
    const root = parseXmlTree('<a><b x="1"/></a>');
    expect(root.children[0]).toEqual({
      name: 'b',
      local: 'b',
      ns: '',
      attrs: { x: '1' },
      children: [],
      text: '',
    });
  });
});
