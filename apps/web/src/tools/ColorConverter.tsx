import { Button, Input } from '@guibonin/sakura-ui';
import { contrastRatio, formatColorAll, parseColor } from '@sakura-tools/tools/color';
import { useMemo, useState } from 'react';
import { ResultRow, Toolbar } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

function wcag(ratio: number) {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA (texto grande)' : '✗';
}

export default function ColorConverter() {
  const { t, tr } = useI18n();
  const [value, setValue] = useState('#D88CA5');
  const rgb = useMemo(() => parseColor(value), [value]);
  const all = rgb ? formatColorAll(rgb) : null;

  return (
    <div className="st-stack">
      <div className="st-color-input">
        <Input
          label={tr('Cor (HEX, RGB, HSL ou CMYK)', 'Color (HEX, RGB, HSL or CMYK)')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={
            value.trim() && !rgb
              ? tr('Formato de cor não reconhecido.', 'Unrecognized color format.')
              : undefined
          }
          hint="#9265b5 · rgb(146 101 181) · hsl(273 35% 55%) · cmyk(19% 44% 0% 29%)"
        />
        <input
          type="color"
          aria-label={tr('Seletor de cor', 'Color picker')}
          className="st-color-picker"
          value={all ? all.hex.slice(0, 7) : '#000000'}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Toolbar>
        <Button variant="ghost" onClick={() => setValue('#D88CA5')}>
          {t('action.example')}
        </Button>
        <Button variant="ghost" onClick={() => setValue('')}>
          {t('action.clear')}
        </Button>
      </Toolbar>
      {rgb && all && (
        <>
          <div
            className="st-swatch"
            style={{ background: all.rgb, opacity: 1 }}
            aria-hidden="true"
          />
          <ResultRow label="HEX" value={all.hex} />
          <ResultRow label="RGB" value={all.rgb} />
          <ResultRow label="HSL" value={all.hsl} />
          <ResultRow label="CMYK" value={all.cmyk} />
          <p className="st-hint">
            {tr(
              'CMYK calculado pela fórmula simples, sem perfil de cor (ICC). Serve de referência; para impressão, use o perfil indicado pela gráfica.',
              'CMYK uses the simple formula, without a color profile (ICC). Use it as a reference; for print, use the profile your print shop recommends.',
            )}
          </p>
          <div className="st-table-wrap">
            <table className="st-table">
              <caption>{tr('Contraste WCAG 2.x', 'WCAG 2.x contrast')}</caption>
              <thead>
                <tr>
                  <th scope="col">{tr('Sobre', 'On')}</th>
                  <th scope="col">{tr('Razão', 'Ratio')}</th>
                  <th scope="col">{tr('Nível', 'Level')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [tr('Branco', 'White'), contrastRatio(rgb, WHITE)] as const,
                  [tr('Preto', 'Black'), contrastRatio(rgb, BLACK)] as const,
                ].map(([name, ratio]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className="st-mono">{ratio}:1</td>
                    <td>{wcag(ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rgb.a < 1 && (
            <p className="st-hint">
              {tr(
                'O contraste ignora a transparência (alfa).',
                'Contrast ignores transparency (alpha).',
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
