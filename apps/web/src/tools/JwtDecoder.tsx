import { Badge, Button } from '@guibonin/sakura-ui';
import { decodeJwt, type DecodedJwt } from '@sakura-tools/tools/jwt';
import { useMemo, useState } from 'react';
import { Notice, Output, TextArea, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

// Token de exemplo público (jwt.io), sem valor real.
const EXAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export default function JwtDecoder() {
  const { t, tr, locale, em } = useI18n();
  const [token, setToken] = useState('');

  const result = useMemo((): { data?: DecodedJwt; error?: unknown } => {
    if (!token.trim()) return {};
    try {
      return { data: decodeJwt(token) };
    } catch (e) {
      return { error: e };
    }
  }, [token]);

  const d = result.data;
  const fmt = (date?: Date) => (date ? date.toLocaleString(locale) : '—');

  return (
    <div className="st-stack">
      <Notice tone="warning" title={tr('Decodificar não é validar', 'Decoding is not validating')}>
        {tr(
          'Qualquer pessoa consegue criar um JWT com o conteúdo que quiser. Esta ferramenta só lê o conteúdo e não verifica a assinatura. Um token decodificado aqui pode ser falso.',
          'Anyone can create a JWT with any content. This tool only reads the content and does not verify the signature. A token decoded here may be forged.',
        )}
      </Notice>
      <TextArea
        label="JWT"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        error={em(result.error)}
        rows={5}
        hint={tr(
          'O token não sai do seu navegador e não é salvo.',
          'The token never leaves your browser and is not saved.',
        )}
      />
      <Toolbar>
        <Button variant="ghost" onClick={() => setToken(EXAMPLE)}>
          {t('action.example')}
        </Button>
        <Button variant="ghost" onClick={() => setToken('')}>
          {t('action.clear')}
        </Button>
      </Toolbar>
      {d && (
        <>
          <Toolbar>
            <Badge tone="neutral">alg: {String(d.header.alg ?? '?')}</Badge>
            {d.temporal.includes('expired') && (
              <Badge tone="danger">{tr('Expirado', 'Expired')}</Badge>
            )}
            {d.temporal.includes('not-yet-valid') && (
              <Badge tone="warning">{tr('Ainda não vigente (nbf)', 'Not yet valid (nbf)')}</Badge>
            )}
            {d.temporal.includes('within-window') && (
              <Badge tone="info">{tr('Dentro do prazo (exp)', 'Within exp window')}</Badge>
            )}
            {d.temporal.includes('no-exp') && (
              <Badge tone="neutral">{tr('Sem exp', 'No exp')}</Badge>
            )}
            {d.temporal.includes('invalid-exp') && (
              <Badge tone="danger">{tr('exp inválido', 'Invalid exp')}</Badge>
            )}
            <Badge tone="warning">
              {tr('Assinatura não verificada', 'Signature not verified')}
            </Badge>
          </Toolbar>
          {d.warnings.map((w) => (
            <Notice key={w.code + JSON.stringify(w.params ?? {})} tone="danger">
              {em(w)}
            </Notice>
          ))}
          <div className="st-grid-2">
            <Output label="Header" value={JSON.stringify(d.header, null, 2)} rows={6} />
            <Output label="Payload" value={JSON.stringify(d.payload, null, 2)} rows={6} />
          </div>
          <dl className="st-dl">
            <dt>iat ({tr('emitido em', 'issued at')})</dt>
            <dd>{fmt(d.times.issuedAt)}</dd>
            <dt>nbf ({tr('válido a partir de', 'not before')})</dt>
            <dd>{fmt(d.times.notBefore)}</dd>
            <dt>exp ({tr('expira em', 'expires at')})</dt>
            <dd>{fmt(d.times.expiresAt)}</dd>
          </dl>
        </>
      )}
    </div>
  );
}
