import { Button, Input, Select } from '@guibonin/sakura-ui';
import { generateQrSvg, wifiPayload, type QrErrorLevel } from '@sakura-tools/tools/qrcode';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Segmented, TextArea, Toolbar, downloadBlob } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

type Kind = 'text' | 'wifi';

async function svgToPng(svg: string, size: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível.');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG.'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function QrCodeGenerator() {
  const { t, tr } = useI18n();
  const [kind, setKind] = useState<Kind>('text');
  const [text, setText] = useState('https://github.com/GuiBonin/sakura-tools');
  const [ssid, setSsid] = useState('');
  const [pass, setPass] = useState('');
  const [security, setSecurity] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [level, setLevel] = useState<QrErrorLevel>('M');
  // O resultado guarda o conteúdo e o nível que o geraram. Enquanto o QR do
  // conteúdo atual não fica pronto, nada é exibido nem baixado.
  const [result, setResult] = useState<{
    payload: string;
    level: QrErrorLevel;
    svg: string;
    error?: string;
  }>();

  const payload = kind === 'text' ? text : ssid ? wifiPayload(ssid, pass, security) : '';
  const fresh = result && result.payload === payload && result.level === level ? result : undefined;
  const svg = payload ? (fresh?.svg ?? '') : '';
  const error = payload ? fresh?.error : undefined;

  useEffect(() => {
    let cancelled = false;
    if (!payload) return;
    generateQrSvg(payload, { errorCorrectionLevel: level })
      .then((s) => {
        if (!cancelled) setResult({ payload, level, svg: s });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setResult({ payload, level, svg: '', error: e instanceof Error ? e.message : String(e) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [payload, level]);

  return (
    <div className="st-qr-layout">
      <div className="st-stack">
        <Segmented
          label={tr('Tipo de conteúdo', 'Content type')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'text', label: tr('Texto ou link', 'Text or link') },
            { value: 'wifi', label: 'Wi-Fi' },
          ]}
        />
        {kind === 'text' ? (
          <TextArea
            label={tr('Conteúdo', 'Content')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            mono={false}
          />
        ) : (
          <>
            <Input
              label={tr('Nome da rede (SSID)', 'Network name (SSID)')}
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
            />
            <Input
              label={tr('Senha', 'Password')}
              type="password"
              autoComplete="off"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              disabled={security === 'nopass'}
            />
            <Select
              label={tr('Segurança', 'Security')}
              value={security}
              onValueChange={(v) => setSecurity(v as typeof security)}
              options={[
                { value: 'WPA', label: 'WPA/WPA2/WPA3' },
                { value: 'WEP', label: 'WEP' },
                { value: 'nopass', label: tr('Aberta', 'Open') },
              ]}
            />
          </>
        )}
        <Select
          label={tr('Correção de erro', 'Error correction')}
          value={level}
          onValueChange={(v) => setLevel(v as QrErrorLevel)}
          options={[
            { value: 'L', label: 'L (7%)' },
            { value: 'M', label: 'M (15%)' },
            { value: 'Q', label: 'Q (25%)' },
            { value: 'H', label: 'H (30%)' },
          ]}
        />
        <Toolbar>
          <Button
            variant="ghost"
            onClick={() => {
              if (kind === 'text') {
                setText('https://github.com/GuiBonin/sakura-tools');
              } else {
                // Rede e senha fictícias, só para demonstrar o formato.
                setSsid('Rede de teste');
                setPass('senha-de-exemplo');
                setSecurity('WPA');
              }
            }}
          >
            {t('action.example')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (kind === 'text') {
                setText('');
              } else {
                setSsid('');
                setPass('');
              }
            }}
          >
            {t('action.clear')}
          </Button>
        </Toolbar>
      </div>
      <div className="st-qr-preview">
        {svg ? (
          // SVG gerado localmente pela biblioteca qrcode a partir de dados, sem HTML do usuário.
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
            alt={tr('QR Code gerado', 'Generated QR code')}
          />
        ) : error ? (
          // O erro fica na prévia, e não embaixo de um campo, para aparecer
          // tanto no modo texto quanto no modo Wi-Fi.
          <p className="st-status st-status--danger" role="alert">
            {error}
          </p>
        ) : payload ? (
          <p className="st-hint" role="status">
            {tr('Gerando QR Code…', 'Generating QR code…')}
          </p>
        ) : (
          <p className="st-hint">
            {tr('Preencha o conteúdo para gerar.', 'Fill in the content to generate.')}
          </p>
        )}
        <Toolbar>
          <Button
            size="sm"
            variant="soft"
            disabled={!svg}
            leftIcon={<Download size={16} />}
            onClick={() => downloadBlob(svg, 'qrcode.svg', 'image/svg+xml')}
          >
            SVG
          </Button>
          <Button
            size="sm"
            variant="soft"
            disabled={!svg}
            leftIcon={<Download size={16} />}
            onClick={async () => downloadBlob(await svgToPng(svg, 1024), 'qrcode.png', 'image/png')}
          >
            PNG
          </Button>
        </Toolbar>
      </div>
    </div>
  );
}
