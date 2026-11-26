import type { Locale } from '@sakura-tools/core';

/**
 * Mensagens dos pacotes de lógica em pt-BR e en.
 *
 * A lógica devolve um código com parâmetros, e a interface escolhe o idioma.
 * `{nome}` no texto é trocado pelo parâmetro de mesmo nome. Os objetos são
 * serializáveis, então atravessam o Web Worker sem perder o código.
 */
const MESSAGES = {
  // Base64
  'base64.invalidChars': {
    'pt-BR': 'Texto contém caracteres que não pertencem ao Base64.',
    en: 'Text contains characters that are not part of Base64.',
  },
  'base64.invalidLength': {
    'pt-BR': 'Tamanho inválido para Base64.',
    en: 'Invalid length for Base64.',
  },
  'base64.notUtf8': {
    'pt-BR': 'O conteúdo decodificado não é texto UTF-8 (pode ser um arquivo binário).',
    en: 'The decoded content is not UTF-8 text (it may be a binary file).',
  },
  // URL
  'url.badPercent': {
    'pt-BR': 'Sequência % inválida. Confira se o texto está mesmo codificado.',
    en: 'Invalid % sequence. Check that the text is really encoded.',
  },
  // JSON
  'json.tooLarge': {
    'pt-BR': 'Entrada maior que o limite de {max} caracteres.',
    en: 'Input exceeds the limit of {max} characters.',
  },
  'json.empty': { 'pt-BR': 'Entrada vazia.', en: 'Empty input.' },
  'json.tooDeep': {
    'pt-BR': 'Aninhamento maior que o limite de {max} níveis.',
    en: 'Nesting exceeds the limit of {max} levels.',
  },
  // XML
  'xml.tooLarge': {
    'pt-BR': 'Documento maior que o limite de {max} caracteres.',
    en: 'Document exceeds the limit of {max} characters.',
  },
  'xml.commentNotClosed': { 'pt-BR': 'Comentário não fechado.', en: 'Unclosed comment.' },
  'xml.commentDoubleDash': {
    'pt-BR': 'Comentário não pode conter "--".',
    en: 'A comment cannot contain "--".',
  },
  'xml.cdataNotClosed': { 'pt-BR': 'Bloco CDATA não fechado.', en: 'Unclosed CDATA section.' },
  'xml.doctype': {
    'pt-BR':
      'DOCTYPE e declarações de entidade não são aceitos por segurança (XXE e expansão de entidades).',
    en: 'DOCTYPE and entity declarations are rejected for security (XXE and entity expansion).',
  },
  'xml.piNotClosed': {
    'pt-BR': 'Instrução de processamento não fechada.',
    en: 'Unclosed processing instruction.',
  },
  'xml.declNotFirst': {
    'pt-BR': 'A declaração <?xml ?> só pode aparecer no início.',
    en: 'The <?xml ?> declaration can only appear at the start.',
  },
  'xml.closeTagIncomplete': {
    'pt-BR': 'Tag de fechamento incompleta.',
    en: 'Incomplete closing tag.',
  },
  'xml.openTagIncomplete': {
    'pt-BR': 'Tag de abertura incompleta.',
    en: 'Incomplete opening tag.',
  },
  'xml.badTagName': {
    'pt-BR': 'Nome de tag inválido: "{name}".',
    en: 'Invalid tag name: "{name}".',
  },
  'xml.badAttribute': { 'pt-BR': 'Atributo malformado.', en: 'Malformed attribute.' },
  'xml.badAttributeName': {
    'pt-BR': 'Nome de atributo inválido: "{name}".',
    en: 'Invalid attribute name: "{name}".',
  },
  'xml.duplicateAttribute': {
    'pt-BR': 'Atributo repetido: "{name}".',
    en: 'Duplicate attribute: "{name}".',
  },
  'xml.ltInAttribute': {
    'pt-BR': 'Valor de atributo não pode conter "<".',
    en: 'An attribute value cannot contain "<".',
  },
  'xml.badEntity': {
    'pt-BR': 'Referência de entidade inválida ou não suportada: "{ref}".',
    en: 'Invalid or unsupported entity reference: "{ref}".',
  },
  'xml.multipleRoots': { 'pt-BR': 'Mais de um elemento raiz.', en: 'More than one root element.' },
  'xml.tooDeep': {
    'pt-BR': 'Profundidade maior que {max} níveis.',
    en: 'Depth exceeds {max} levels.',
  },
  'xml.mismatchedClose': {
    'pt-BR': 'Esperado </{expected}>, encontrado </{found}>.',
    en: 'Expected </{expected}>, found </{found}>.',
  },
  'xml.unopenedClose': {
    'pt-BR': 'Fechamento </{name}> sem abertura.',
    en: 'Closing </{name}> without an opening tag.',
  },
  'xml.contentOutsideRoot': {
    'pt-BR': 'Conteúdo fora do elemento raiz.',
    en: 'Content outside the root element.',
  },
  'xml.unclosedTag': { 'pt-BR': 'Tag <{name}> não fechada.', en: 'Tag <{name}> is not closed.' },
  'xml.noElement': { 'pt-BR': 'Nenhum elemento encontrado.', en: 'No element found.' },
  // Senha
  'password.noSets': {
    'pt-BR': 'Selecione pelo menos um tipo de caractere.',
    en: 'Select at least one character type.',
  },
  'password.badLength': {
    'pt-BR': 'O tamanho deve ficar entre {min} e {max}.',
    en: 'Length must be between {min} and {max}.',
  },
  'password.failed': {
    'pt-BR': 'Não foi possível gerar a senha. Aumente o tamanho.',
    en: 'Could not generate the password. Increase the length.',
  },
  // Regex
  'regex.badFlags': { 'pt-BR': 'Flags inválidas: "{flags}".', en: 'Invalid flags: "{flags}".' },
  'regex.tooLarge': {
    'pt-BR': 'Texto maior que o limite de {max} caracteres.',
    en: 'Text exceeds the limit of {max} characters.',
  },
  'regex.timeout': {
    'pt-BR':
      'A expressão demorou mais de {ms} ms e foi interrompida. Ela pode ter backtracking catastrófico.',
    en: 'The expression took longer than {ms} ms and was stopped. It may have catastrophic backtracking.',
  },
  'regex.workerFailed': {
    'pt-BR': 'Falha ao executar a expressão.',
    en: 'Failed to run the expression.',
  },
  // Diff
  'diff.tooLarge': {
    'pt-BR': 'Cada texto pode ter no máximo {max} caracteres.',
    en: 'Each text can have at most {max} characters.',
  },
  // Timestamp
  'timestamp.outOfRange': {
    'pt-BR': 'Data fora do intervalo suportado.',
    en: 'Date outside the supported range.',
  },
  'timestamp.invalid': {
    'pt-BR': 'Data inválida. Use, por exemplo, 2026-11-25T14:30:00Z.',
    en: 'Invalid date. Use, for example, 2026-11-25T14:30:00Z.',
  },
  'timestamp.nonexistent': {
    'pt-BR': 'Data inexistente: {date}.',
    en: 'This date does not exist: {date}.',
  },
  'timestamp.badTime': {
    'pt-BR': 'Horário inválido. Horas vão de 00 a 23 e minutos e segundos de 00 a 59.',
    en: 'Invalid time. Hours go from 00 to 23, minutes and seconds from 00 to 59.',
  },
  // QR Code
  'qr.empty': { 'pt-BR': 'Informe o conteúdo do QR Code.', en: 'Enter the QR Code content.' },
  'qr.tooLarge': {
    'pt-BR': 'Conteúdo grande demais para um QR Code (máximo {max} bytes).',
    en: 'Content too large for a QR Code (maximum {max} bytes).',
  },
  // UUID
  'uuid.v7Range': {
    'pt-BR': 'Timestamp fora do intervalo do UUID v7 (inteiro entre 0 e 2^48 − 1 ms).',
    en: 'Timestamp outside the UUID v7 range (integer between 0 and 2^48 − 1 ms).',
  },
  // JWT
  'jwt.jwe': {
    'pt-BR':
      'Este token tem 5 partes: é um JWE (criptografado). O conteúdo não pode ser lido sem a chave.',
    en: 'This token has 5 parts: it is a JWE (encrypted). Its content cannot be read without the key.',
  },
  'jwt.parts': {
    'pt-BR': 'Um JWT tem 3 partes separadas por ponto: header.payload.signature.',
    en: 'A JWT has 3 parts separated by dots: header.payload.signature.',
  },
  'jwt.notBase64Url': {
    'pt-BR': 'O {part} não é Base64URL válido.',
    en: 'The {part} is not valid Base64URL.',
  },
  'jwt.notJson': {
    'pt-BR': 'O {part} não contém JSON válido.',
    en: 'The {part} does not contain valid JSON.',
  },
  'jwt.notObject': {
    'pt-BR': 'O {part} precisa ser um objeto JSON.',
    en: 'The {part} must be a JSON object.',
  },
  'jwt.noAlg': {
    'pt-BR': 'O header não informa o algoritmo (alg).',
    en: 'The header does not state the algorithm (alg).',
  },
  'jwt.algNone': {
    'pt-BR': 'alg "none" significa token sem assinatura. Nunca aceite isso em produção.',
    en: 'alg "none" means an unsigned token. Never accept it in production.',
  },
  'jwt.emptySignature': { 'pt-BR': 'A assinatura está vazia.', en: 'The signature is empty.' },
  'jwt.claimNotNumber': {
    'pt-BR': 'A claim "{claim}" deveria ser um número (segundos desde 1970).',
    en: 'The "{claim}" claim should be a number (seconds since 1970).',
  },
  'jwt.claimOutOfRange': {
    'pt-BR': 'A claim "{claim}" tem um valor fora da faixa de datas válidas.',
    en: 'The "{claim}" claim has a value outside the range of valid dates.',
  },
  // CPF e CNPJ
  'cpf.badChars': {
    'pt-BR': 'O CPF só pode ter números, pontos e traço.',
    en: 'A CPF can only contain digits, dots and a dash.',
  },
  'cpf.badLength': {
    'pt-BR': 'O CPF tem 11 dígitos. Foram informados {count}.',
    en: 'A CPF has 11 digits. {count} were given.',
  },
  'cpf.repeated': {
    'pt-BR': 'Sequências repetidas (ex.: 111.111.111-11) não são CPFs válidos.',
    en: 'Repeated sequences (e.g. 111.111.111-11) are not valid CPFs.',
  },
  'cnpj.badChars': {
    'pt-BR': 'O CNPJ contém caracteres não permitidos.',
    en: 'The CNPJ contains characters that are not allowed.',
  },
  'cnpj.badLength': {
    'pt-BR': 'O CNPJ tem 14 caracteres. Foram informados {count}.',
    en: 'A CNPJ has 14 characters. {count} were given.',
  },
  'cnpj.checkNotDigits': {
    'pt-BR': 'Os dois últimos caracteres (dígitos verificadores) precisam ser números.',
    en: 'The last two characters (check digits) must be numbers.',
  },
  'cnpj.repeated': {
    'pt-BR': 'Sequências repetidas não são CNPJs válidos.',
    en: 'Repeated sequences are not valid CNPJs.',
  },
  'doc.checkDigits': {
    'pt-BR': 'Os dígitos verificadores não conferem.',
    en: 'The check digits do not match.',
  },
  // Chave de acesso (NF-e e NFC-e)
  'accessKey.badChars': {
    'pt-BR': 'A chave só pode ter números e, no trecho do CNPJ, letras.',
    en: 'The key can only contain digits and, in the CNPJ part, letters.',
  },
  'accessKey.badLength': {
    'pt-BR': 'A chave de acesso tem 44 caracteres. Foram informados {count}.',
    en: 'An access key has 44 characters. {count} were given.',
  },
  'accessKey.lettersOutsideCnpj': {
    'pt-BR':
      'Letras só são aceitas nas 12 primeiras posições do CNPJ (posições 7 a 18 da chave). O resto da chave é só número.',
    en: 'Letters are only accepted in the first 12 CNPJ positions (key positions 7 to 18). The rest of the key is digits only.',
  },
  'accessKey.badUf': {
    'pt-BR': 'O código de UF {code} não existe na tabela do IBGE.',
    en: 'State code {code} does not exist in the IBGE table.',
  },
  'accessKey.badMonth': {
    'pt-BR': 'O mês de emissão {month} não existe. O mês vai de 01 a 12.',
    en: 'Issue month {month} does not exist. Months go from 01 to 12.',
  },
  'accessKey.futureDate': {
    'pt-BR': 'O mês de emissão ({aamm}) ainda não chegou.',
    en: 'The issue month ({aamm}) is in the future.',
  },
  'accessKey.emitterInvalid': {
    'pt-BR': 'As posições 7 a 20 ({value}) não formam um CNPJ nem um CPF válido.',
    en: 'Positions 7 to 20 ({value}) are neither a valid CNPJ nor a valid CPF.',
  },
  'accessKey.cnpjInvalid': {
    'pt-BR': 'O CNPJ alfanumérico do emitente ({value}) não é válido.',
    en: 'The issuer alphanumeric CNPJ ({value}) is not valid.',
  },
  'accessKey.emitterAmbiguous': {
    'pt-BR':
      'As posições do emitente formam um CNPJ válido e também um CPF válido com zeros à esquerda. A chave foi lida como CNPJ.',
    en: 'The issuer positions form a valid CNPJ and also a valid zero-padded CPF. The key was read as a CNPJ.',
  },
  'accessKey.alphanumericBeforeStart': {
    'pt-BR':
      'O CNPJ alfanumérico só é aceito nos documentos fiscais a partir de julho de 2026 (NT 2025.001). A SEFAZ rejeita chave com CNPJ alfanumérico emitida antes disso.',
    en: 'Alphanumeric CNPJ is only accepted in tax documents from July 2026 (NT 2025.001). SEFAZ rejects keys with an alphanumeric CNPJ issued before that.',
  },
  'accessKey.otherModel': {
    'pt-BR':
      'O modelo {mod} não é NF-e (55) nem NFC-e (65). Só a estrutura geral e o dígito verificador foram conferidos.',
    en: 'Model {mod} is neither NF-e (55) nor NFC-e (65). Only the general structure and the check digit were checked.',
  },
  'accessKey.zeroNumber': {
    'pt-BR': 'O número da nota não pode ser zero.',
    en: 'The invoice number cannot be zero.',
  },
  'accessKey.badTpEmis': {
    'pt-BR': 'A forma de emissão {value} não existe. Os valores são 1 a 7 e 9.',
    en: 'Issue type {value} does not exist. Valid values are 1 to 7 and 9.',
  },
  'accessKey.scanDisabled': {
    'pt-BR': 'A forma de emissão 3 (SCAN) está desativada.',
    en: 'Issue type 3 (SCAN) has been deactivated.',
  },
  'accessKey.offlineOnlyNfce': {
    'pt-BR': 'A forma de emissão 9 (contingência off-line) é usada na NFC-e, não na NF-e.',
    en: 'Issue type 9 (offline contingency) is used for NFC-e, not for NF-e.',
  },
  'accessKey.weakCnf': {
    'pt-BR':
      'O código numérico {value} é proibido por ser uma sequência fraca (Rejeição 897, NT 2019.001).',
    en: 'Numeric code {value} is not allowed because it is a weak sequence (Rejection 897, NT 2019.001).',
  },
  'accessKey.cnfEqualsNumber': {
    'pt-BR': 'O código numérico não pode ser igual ao número da nota (Rejeição 897, NT 2019.001).',
    en: 'The numeric code cannot equal the invoice number (Rejection 897, NT 2019.001).',
  },
  'accessKey.badDv': {
    'pt-BR': 'O dígito verificador não confere. Esperado {expected}, informado {found}.',
    en: 'The check digit does not match. Expected {expected}, got {found}.',
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type MessageCode = keyof typeof MESSAGES;
export type MessageParams = Record<string, string | number>;

/** Mensagem com código e parâmetros, traduzida só na hora de mostrar. */
export interface ToolMessage {
  code: MessageCode;
  params?: MessageParams;
}

/**
 * Texto que pode ser uma mensagem nossa (traduzível) ou um texto pronto vindo
 * do motor JavaScript, como o erro de sintaxe de uma regex. O texto do motor
 * sai no idioma do navegador e não é traduzido aqui.
 */
export type MessageLike = ToolMessage | string;

export function msg(code: MessageCode, params?: MessageParams): ToolMessage {
  return params ? { code, params } : { code };
}

export function formatMessage(m: MessageLike, locale: Locale = 'pt-BR'): string {
  if (typeof m === 'string') return m;
  const template: string = MESSAGES[m.code][locale];
  return template.replace(/\{(\w+)\}/g, (all, key: string) =>
    m.params && key in m.params ? String(m.params[key]) : all,
  );
}

/** Erro lançado pelos pacotes. `message` fica em pt-BR para logs e testes. */
export class ToolError extends Error {
  override name = 'ToolError';
  readonly toolMessage: ToolMessage;
  constructor(code: MessageCode, params?: MessageParams) {
    const m = msg(code, params);
    super(formatMessage(m, 'pt-BR'));
    this.toolMessage = m;
  }
}

export function isToolMessage(v: unknown): v is ToolMessage {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { code?: unknown }).code === 'string' &&
    (v as { code: string }).code in MESSAGES
  );
}

/** Texto de qualquer erro capturado, traduzido quando é um erro dos pacotes. */
export function errorText(err: unknown, locale: Locale = 'pt-BR'): string {
  if (err instanceof ToolError) return formatMessage(err.toolMessage, locale);
  if (isToolMessage(err)) return formatMessage(err, locale);
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Exposto para o teste que confere se todo código tem os dois idiomas. */
export const MESSAGE_CATALOG: Readonly<Record<MessageCode, Record<Locale, string>>> = MESSAGES;
