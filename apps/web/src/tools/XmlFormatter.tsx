import { Button } from '@guibonin/sakura-ui';
import { formatXml, minifyXml, validateXml, type XmlValidation } from '@sakura-tools/tools/xml';
import { useState } from 'react';
import { ToolHelp } from '../components/ToolShell';
import { Notice, Output, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

// Exemplo fictício e incompleto, só para demonstrar a formatação.
const EXAMPLE =
  '<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe00000000000000000000000000000000000000000000" versao="4.00"><ide><cUF>35</cUF><natOp>VENDA (EXEMPLO FICTICIO)</natOp><mod>55</mod><serie>1</serie><nNF>1</nNF><tpAmb>2</tpAmb></ide><det nItem="1"><prod><cProd>001</cProd><xProd>Produto de teste</xProd><NCM>00000000</NCM><CFOP>5102</CFOP><vProd>10.00</vProd></prod></det></infNFe></NFe></nfeProc>';

export default function XmlFormatter() {
  const { t, tr } = useI18n();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [info, setInfo] = useState<XmlValidation | null>(null);

  const run = (mode: 'format' | 'minify') => {
    const r = mode === 'format' ? formatXml(input) : minifyXml(input);
    setInfo(validateXml(input));
    setOutput(r.ok ? r.output : '');
  };

  const err = info && !info.ok ? info.error : undefined;

  return (
    <div className="st-stack">
      <TextArea
        label={tr('XML de entrada', 'Input XML')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        error={
          err
            ? `${tr('Linha', 'Line')} ${err.line}, ${tr('coluna', 'column')} ${err.column}: ${err.message}`
            : undefined
        }
        placeholder="<raiz><item>valor</item></raiz>"
      />
      <Toolbar>
        <Button onClick={() => run('format')} disabled={!input.trim()}>
          {tr('Formatar', 'Format')}
        </Button>
        <Button variant="soft" onClick={() => run('minify')} disabled={!input.trim()}>
          {tr('Minificar', 'Minify')}
        </Button>
        <Button variant="soft" onClick={() => setInfo(validateXml(input))} disabled={!input.trim()}>
          {tr('Validar estrutura', 'Validate structure')}
        </Button>
        <Button variant="ghost" onClick={() => setInput(EXAMPLE)}>
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setInput('');
            setOutput('');
            setInfo(null);
          }}
        >
          {t('action.clear')}
        </Button>
      </Toolbar>
      {info?.ok && (
        <p className="st-status st-status--success" role="status">
          {tr(
            `XML bem formado. Raiz <${info.rootName}>, ${info.elementCount} elementos, profundidade ${info.maxDepth}.`,
            `Well-formed XML. Root <${info.rootName}>, ${info.elementCount} elements, depth ${info.maxDepth}.`,
          )}
        </p>
      )}
      {output && <Output label={tr('Resultado', 'Result')} value={output} rows={16} />}
      <ToolHelp>
        <Notice tone="info" title={tr('O que esta validação cobre', 'What this validation covers')}>
          {tr(
            'Só a boa formação (tags, atributos, entidades). Não valida contra o schema XSD da NF-e nem confirma autorização na SEFAZ. DOCTYPE e entidades customizadas são recusados por segurança.',
            'Only well-formedness (tags, attributes, entities). It does not validate against the NF-e XSD schema or confirm SEFAZ authorization. DOCTYPE and custom entities are rejected for security.',
          )}
        </Notice>
      </ToolHelp>
    </div>
  );
}
