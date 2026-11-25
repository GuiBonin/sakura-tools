import { formatCpf, generateCpf, validateCpf } from '@sakura-tools/tools/brazil';
import { DocumentValidator } from './DocumentValidator';

export default function CpfValidator() {
  return (
    <DocumentValidator
      docName="CPF"
      placeholder="000.000.000-00"
      validate={validateCpf}
      generate={() => generateCpf()}
      format={formatCpf}
      help={{
        pt: 'O CPF tem 9 dígitos base e 2 verificadores calculados por módulo 11. Sequências repetidas como 111.111.111-11 passam no cálculo mas são inválidas.',
        en: 'A CPF has 9 base digits and 2 check digits computed with modulo 11. Repeated sequences like 111.111.111-11 pass the math but are invalid.',
      }}
    />
  );
}
