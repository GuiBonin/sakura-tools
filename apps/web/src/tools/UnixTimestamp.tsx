import { Button, Input, Select } from '@guibonin/sakura-ui';
import {
  formatInZone,
  fromDateString,
  fromTimestamp,
  relativeTime,
  type TimestampInfo,
  type TimestampUnit,
} from '@sakura-tools/tools/timestamp';
import { useEffect, useMemo, useState } from 'react';
import { ResultRow, Segmented, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

const ZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Rio_Branco',
  'America/Noronha',
  'UTC',
  'America/New_York',
  'Europe/Lisbon',
  'Asia/Tokyo',
];

export default function UnixTimestamp() {
  const { t, tr, locale, em } = useI18n();
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [now, setNow] = useState(() => Date.now());
  const [tsInput, setTsInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [unit, setUnit] = useState<'auto' | TimestampUnit>('auto');
  const [dateInput, setDateInput] = useState('');
  const [zone, setZone] = useState(localZone);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fromTs = useMemo((): { info?: TimestampInfo; error?: unknown } => {
    if (!tsInput.trim()) return {};
    try {
      return { info: fromTimestamp(tsInput, unit === 'auto' ? undefined : unit) };
    } catch (e) {
      return { error: e };
    }
  }, [tsInput, unit]);

  const fromDate = useMemo((): { info?: TimestampInfo; error?: unknown } => {
    if (!dateInput.trim()) return {};
    try {
      return { info: fromDateString(dateInput) };
    } catch (e) {
      return { error: e };
    }
  }, [dateInput]);

  const zones = Array.from(new Set([localZone, ...ZONES]));

  return (
    <div className="st-stack">
      <div className="st-now">
        <span>{tr('Agora', 'Now')}</span>
        <code>{Math.floor(now / 1000)}</code>
        <Button size="sm" variant="soft" onClick={() => setTsInput(String(Math.floor(now / 1000)))}>
          {tr('Usar', 'Use')}
        </Button>
      </div>
      <Toolbar>
        <Button
          variant="ghost"
          onClick={() => {
            setTsInput('1764072000');
            setDateInput('2026-11-25T14:30:00-03:00');
          }}
        >
          {t('action.example')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setTsInput('');
            setDateInput('');
          }}
        >
          {t('action.clear')}
        </Button>
      </Toolbar>

      <h2 className="st-h2">{tr('Timestamp → data', 'Timestamp → date')}</h2>
      <Toolbar>
        <Input
          label="Timestamp"
          value={tsInput}
          onChange={(e) => setTsInput(e.target.value)}
          error={em(fromTs.error)}
          inputMode="numeric"
          className="st-mono"
        />
        <Segmented
          label={tr('Unidade', 'Unit')}
          value={unit}
          onChange={setUnit}
          options={[
            { value: 'auto', label: tr('Automático', 'Auto') },
            { value: 'seconds', label: tr('Segundos', 'Seconds') },
            { value: 'milliseconds', label: tr('Milissegundos', 'Milliseconds') },
          ]}
        />
        <Select
          label={tr('Fuso horário', 'Time zone')}
          size="sm"
          value={zone}
          onValueChange={setZone}
          options={zones.map((z) => ({
            value: z,
            label: z === localZone ? `${z} (${tr('seu', 'yours')})` : z,
          }))}
        />
      </Toolbar>
      {fromTs.info && (
        <div className="st-stack-sm">
          <ResultRow label="ISO 8601 (UTC)" value={fromTs.info.iso} />
          <ResultRow
            label={zone}
            value={formatInZone(fromTs.info.date, zone, locale)}
            mono={false}
          />
          <ResultRow
            label={tr('Relativo', 'Relative')}
            value={relativeTime(fromTs.info.date, new Date(now), locale)}
            mono={false}
          />
          <ResultRow label={tr('Segundos', 'Seconds')} value={String(fromTs.info.seconds)} />
          <ResultRow
            label={tr('Milissegundos', 'Milliseconds')}
            value={String(fromTs.info.milliseconds)}
          />
          <p className="st-hint">
            {tr('Unidade usada', 'Unit used')}:{' '}
            {fromTs.info.unit === 'seconds'
              ? tr('segundos', 'seconds')
              : tr('milissegundos', 'milliseconds')}
          </p>
        </div>
      )}

      <h2 className="st-h2">{tr('Data → timestamp', 'Date → timestamp')}</h2>
      <Input
        label={tr('Data (ISO 8601)', 'Date (ISO 8601)')}
        value={dateInput}
        onChange={(e) => setDateInput(e.target.value)}
        error={em(fromDate.error)}
        placeholder="2026-11-25T14:30:00-03:00"
        hint={tr(
          'Sem fuso (Z ou -03:00), a data é lida no seu horário local.',
          'Without an offset (Z or -03:00), the date is read in your local time.',
        )}
      />
      {fromDate.info && (
        <div className="st-stack-sm">
          <ResultRow label={tr('Segundos', 'Seconds')} value={String(fromDate.info.seconds)} />
          <ResultRow
            label={tr('Milissegundos', 'Milliseconds')}
            value={String(fromDate.info.milliseconds)}
          />
          <ResultRow label="ISO 8601 (UTC)" value={fromDate.info.iso} />
        </div>
      )}
    </div>
  );
}
