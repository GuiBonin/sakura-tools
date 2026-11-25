import { formatCnpj, generateCnpj, validateCnpj } from '@sakura-tools/tools/brazil';
import { DocumentValidator } from './DocumentValidator';

export default function CnpjValidator() {
  return (
    <DocumentValidator
      docName="CNPJ"
      placeholder="00.000.000/0000-00"
      validate={validateCnpj}
      generate={(alphanumeric) => generateCnpj({ alphanumeric })}
      format={formatCnpj}
      supportsAlphanumeric
      help={{
        pt: 'Aceita o CNPJ numérico e o alfanumérico (IN RFB nº 2.229/2024), em que as 12 primeiras posições podem ter letras e os 2 dígitos verificadores continuam numéricos. O cálculo é módulo 11 com o valor ASCII de cada caractere menos 48.',
        en: 'Accepts numeric and alphanumeric CNPJ (RFB Normative Instruction 2,229/2024), where the first 12 positions may contain letters and the 2 check digits remain numeric. The math is modulo 11 using each character ASCII value minus 48.',
      }}
    />
  );
}
