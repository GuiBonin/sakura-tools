import { Button, Input, Switch } from '@guibonin/sakura-ui';
import { generateUuids, inspectUuid, uuidV7 } from '@sakura-tools/tools/uuid';
import { useMemo, useState } from 'react';
import { Output, Segmented, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

export default function UuidGenerator() {
  const { tr, t, locale } = useI18n();
  const [version, setVersion] = useState<'4' | '7'>('4');
  const [count, setCount] = useState('5');
  const [upper, setUpper] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [ids, setIds] = useState<string[]>(() => generateUuids(5));
  const [probe, setProbe] = useState('');
  const info = useMemo(() => (probe.trim() ? inspectUuid(probe) : null), [probe]);

  const shown = ids
    .map((id) => (hyphens ? id : id.replace(/-/g, '')))
    .map((id) => (upper ? id.toUpperCase() : id))
    .join('\n');

  return (
    <div className="st-stack">
      <Toolbar>
        <Segmented
          label={tr('Versão', 'Version')}
          value={version}
          onChange={setVersion}
          options={[
            { value: '4', label: tr('v4 (aleatório)', 'v4 (random)') },
            { value: '7', label: tr('v7 (ordenável por tempo)', 'v7 (time-ordered)') },
          ]}
        />
        <Input
          label={tr('Quantidade (até 1000)', 'Amount (up to 1000)')}
          type="number"
          min={1}
          max={1000}
          size="sm"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          wrapperClassName="st-input-narrow"
        />
        <Switch label={tr('Maiúsculas', 'Uppercase')} checked={upper} onCheckedChange={setUpper} />
        <Switch
          label={tr('Com hífens', 'Hyphens')}
          checked={hyphens}
          onCheckedChange={setHyphens}
        />
        <Button onClick={() => setIds(generateUuids(Number(count) || 1, version === '4' ? 4 : 7))}>
          {t('action.generate')}
        </Button>
        <Button variant="ghost" onClick={() => setIds([])} disabled={ids.length === 0}>
          {t('action.clear')}
        </Button>
      </Toolbar>
      {ids.length > 0 && (
        <Output
          label={tr('UUIDs gerados', 'Generated UUIDs')}
          value={shown}
          rows={Math.min(12, ids.length + 1)}
        />
      )}

      <h2 className="st-h2">{tr('Inspecionar UUID', 'Inspect UUID')}</h2>
      <Input
        label="UUID"
        value={probe}
        onChange={(e) => setProbe(e.target.value)}
        placeholder="018f…"
      />
      <Toolbar>
        <Button variant="ghost" onClick={() => setProbe(uuidV7())}>
          {t('action.example')}
        </Button>
        <Button variant="ghost" onClick={() => setProbe('')}>
          {t('action.clear')}
        </Button>
      </Toolbar>
      {info &&
        (info.valid ? (
          <p className="st-status st-status--success" role="status">
            {info.nil
              ? tr('UUID nulo (nil).', 'Nil UUID.')
              : `${tr('Versão', 'Version')} ${info.version}, ${tr('variante', 'variant')} ${info.variant}` +
                (info.timestamp ? ` · ${info.timestamp.toLocaleString(locale)}` : '')}
          </p>
        ) : (
          <p className="st-status st-status--danger" role="status">
            {tr('Formato de UUID inválido.', 'Invalid UUID format.')}
          </p>
        ))}
    </div>
  );
}
