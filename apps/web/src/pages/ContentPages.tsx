import { Badge, Card } from '@guibonin/sakura-ui';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { REPO_URL } from '../components/Layout';
import { Notice } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/messages';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { registry } from '../registry';

function Page({ titleKey, children }: { titleKey: MessageKey; children: ReactNode }) {
  const { t } = useI18n();
  useDocumentMeta(t(titleKey));
  return (
    <article className="st-page st-narrow st-prose">
      <h1 className="st-h1">{t(titleKey)}</h1>
      {children}
    </article>
  );
}

export function Pricing() {
  const { tr } = useI18n();
  const plans = [
    {
      name: 'Free',
      status: 'active' as const,
      items: [
        tr('Todas as ferramentas gratuitas', 'All free tools'),
        tr('Processamento local, sem login', 'Local processing, no login'),
        tr('Favoritos e recentes no navegador', 'Favorites and recents in your browser'),
        tr('Código aberto (MIT)', 'Open source (MIT)'),
      ],
    },
    {
      name: 'Pro',
      status: 'planned' as const,
      items: [
        tr('Processamento em lote', 'Batch processing'),
        tr('Diagnóstico fiscal avançado', 'Advanced tax diagnostics'),
        tr('Histórico sincronizado', 'Synced history'),
        tr('Sakura AI com créditos mensais', 'Sakura AI with monthly credits'),
      ],
    },
    {
      name: 'Business',
      status: 'planned' as const,
      items: [
        tr('Organizações e membros', 'Organizations and members'),
        tr('Permissões e auditoria', 'Permissions and audit'),
        tr('API comercial', 'Commercial API'),
        tr('Limites compartilhados', 'Shared limits'),
      ],
    },
  ];
  return (
    <Page titleKey="nav.pricing">
      <Notice tone="info">
        {tr(
          'Os planos Pro e Business estão em planejamento. Nenhum pagamento é aceito hoje, e preços serão anunciados quando os recursos estiverem prontos.',
          'Pro and Business plans are being planned. No payments are accepted today, and prices will be announced when features are ready.',
        )}
      </Notice>
      <div className="st-plans">
        {plans.map((p) => (
          <Card key={p.name} variant={p.status === 'active' ? 'elevated' : 'outlined'}>
            <Card.Header
              title={p.name}
              action={
                p.status === 'active' ? (
                  <Badge tone="success">{tr('Disponível', 'Available')}</Badge>
                ) : (
                  <Badge tone="neutral">{tr('Planejado', 'Planned')}</Badge>
                )
              }
              description={
                p.status === 'active' ? tr('Gratuito', 'Free') : tr('Em breve', 'Coming later')
              }
            />
            <Card.Body>
              <ul className="st-checklist">
                {p.items.map((i) => (
                  <li key={i}>
                    <Check size={16} aria-hidden="true" /> {i}
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        ))}
      </div>
      <p>
        {tr(
          'A versão gratuita é completa dentro da sua proposta e não terá limitações artificiais.',
          'The free version is complete within its scope and will not have artificial limits.',
        )}
      </p>
    </Page>
  );
}

export function Roadmap() {
  const { tr, lt } = useI18n();
  const phases: Array<[string, string, 'done' | 'current' | 'next']> = [
    [
      tr('Fase 0 · Descoberta e arquitetura', 'Phase 0 · Discovery and architecture'),
      tr('Concluída', 'Done'),
      'done',
    ],
    [
      tr('Fase 1 · Núcleo gratuito e 15 ferramentas', 'Phase 1 · Free core and 15 tools'),
      tr('Em andamento', 'In progress'),
      'current',
    ],
    [
      tr(
        'Fase 2 · Módulo fiscal gratuito (NF-e, NFC-e)',
        'Phase 2 · Free tax module (NF-e, NFC-e)',
      ),
      tr('Próxima', 'Next'),
      'next',
    ],
    [
      tr('Fase 3 · Lançamento open source', 'Phase 3 · Open source launch'),
      tr('Planejada', 'Planned'),
      'next',
    ],
    [
      tr(
        'Fases 4 a 8 · Pro, Sakura AI, assinaturas e Business',
        'Phases 4 to 8 · Pro, Sakura AI, subscriptions and Business',
      ),
      tr('Planejadas', 'Planned'),
      'next',
    ],
  ];
  return (
    <Page titleKey="nav.roadmap">
      <ol className="st-timeline">
        {phases.map(([name, status, kind]) => (
          <li key={name} className={`st-timeline__item is-${kind}`}>
            <strong>{name}</strong>
            <Badge
              tone={kind === 'done' ? 'success' : kind === 'current' ? 'primary' : 'neutral'}
              size="sm"
            >
              {status}
            </Badge>
          </li>
        ))}
      </ol>
      <h2 className="st-h2">{tr('Ferramentas planejadas', 'Planned tools')}</h2>
      <ul className="st-planned-list">
        {registry.planned().map((t) => (
          <li key={t.id}>{lt(t.name)}</li>
        ))}
      </ul>
    </Page>
  );
}

export function Changelog() {
  const { tr } = useI18n();
  return (
    <Page titleKey="nav.changelog">
      <h2 className="st-h2">0.1.0 · {tr('não lançada', 'unreleased')}</h2>
      <ul>
        <li>
          {tr(
            'Núcleo com registro de ferramentas, busca, favoritos e recentes.',
            'Core with tool registry, search, favorites and recents.',
          )}
        </li>
        <li>{tr('17 ferramentas locais iniciais.', '17 initial local tools.')}</li>
        <li>
          {tr(
            'Temas claro e escuro, português e inglês.',
            'Light and dark themes, Portuguese and English.',
          )}
        </li>
      </ul>
    </Page>
  );
}

export function Docs() {
  const { tr } = useI18n();
  return (
    <Page titleKey="nav.docs">
      <p>
        {tr(
          'O Sakura Tools é um monorepo com o app web e pacotes de lógica pura. Toda ferramenta gratuita roda no navegador.',
          'Sakura Tools is a monorepo with the web app and pure logic packages. Every free tool runs in the browser.',
        )}
      </p>
      <h2 className="st-h2">{tr('Atalhos', 'Shortcuts')}</h2>
      <ul>
        <li>
          <kbd>Ctrl</kbd> + <kbd>K</kbd> · {tr('busca global', 'global search')}
        </li>
        <li>
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd> ·{' '}
          {tr('formatar no Formatador de JSON', 'format in JSON Formatter')}
        </li>
      </ul>
      <h2 className="st-h2">{tr('Para desenvolvedores', 'For developers')}</h2>
      <p>
        {tr(
          'A documentação técnica fica no repositório, na pasta docs/.',
          'Technical documentation lives in the repository, in docs/.',
        )}{' '}
        <a href={`${REPO_URL}/tree/main/docs`} target="_blank" rel="noopener noreferrer">
          docs/
        </a>
      </p>
    </Page>
  );
}

export function Contribute() {
  const { tr } = useI18n();
  return (
    <Page titleKey="nav.contribute">
      <p>
        {tr(
          'Contribuições são bem-vindas: novas ferramentas, correções, traduções e testes. Leia o CONTRIBUTING.md antes de abrir um pull request.',
          'Contributions are welcome: new tools, fixes, translations and tests. Read CONTRIBUTING.md before opening a pull request.',
        )}
      </p>
      <ul>
        <li>
          <a
            href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            CONTRIBUTING.md
          </a>
        </li>
        <li>
          <a
            href={`${REPO_URL}/blob/main/docs/ADDING_A_TOOL.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr('Como adicionar uma ferramenta', 'How to add a tool')}
          </a>
        </li>
        <li>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
            Issues
          </a>
        </li>
      </ul>
    </Page>
  );
}

function DraftNotice() {
  const { tr } = useI18n();
  return (
    <Notice tone="warning">
      {tr(
        'Rascunho inicial, pendente de revisão jurídica profissional. Não representa declaração de conformidade com a LGPD.',
        'Initial draft, pending professional legal review. It is not a statement of LGPD compliance.',
      )}
    </Notice>
  );
}

export function Privacy() {
  const { tr } = useI18n();
  return (
    <Page titleKey="nav.privacy">
      <DraftNotice />
      <h2 className="st-h2">{tr('O que fica no seu navegador', 'What stays in your browser')}</h2>
      <p>
        {tr(
          'As ferramentas gratuitas processam tudo localmente. O que você digita, cola ou envia não é transmitido para nenhum servidor.',
          'Free tools process everything locally. What you type, paste or upload is not sent to any server.',
        )}
      </p>
      <h2 className="st-h2">{tr('O que é salvo', 'What is saved')}</h2>
      <p>
        {tr(
          'Só preferências no localStorage do seu navegador: tema, idioma, IDs das ferramentas favoritas e recentes. Nenhuma entrada de ferramenta é salva. Você pode apagar tudo em Configurações.',
          'Only preferences in your browser localStorage: theme, language, IDs of favorite and recent tools. No tool input is saved. You can delete everything in Settings.',
        )}{' '}
        <Link to="/settings">{tr('Configurações', 'Settings')}</Link>
      </p>
      <h2 className="st-h2">{tr('Telemetria e cookies', 'Telemetry and cookies')}</h2>
      <p>
        {tr(
          'Não há telemetria, analytics nem cookies de rastreamento.',
          'There is no telemetry, analytics or tracking cookies.',
        )}
      </p>
      <h2 className="st-h2">{tr('Recursos futuros', 'Future features')}</h2>
      <p>
        {tr(
          'Recursos comerciais que precisarem enviar dados (ex.: Sakura AI) vão pedir consentimento específico antes de cada envio e permitir revisar e anonimizar o conteúdo.',
          'Commercial features that need to send data (e.g. Sakura AI) will ask for specific consent before each submission and allow reviewing and anonymizing content.',
        )}
      </p>
    </Page>
  );
}

export function Terms() {
  const { tr } = useI18n();
  return (
    <Page titleKey="nav.terms">
      <DraftNotice />
      <p>
        {tr(
          'O Sakura Tools é oferecido "como está", sem garantias, conforme a licença MIT. Os resultados das ferramentas são auxiliares e não substituem validações oficiais.',
          'Sakura Tools is provided "as is", without warranty, under the MIT license. Tool results are auxiliary and do not replace official validations.',
        )}
      </p>
      <p>
        {tr(
          'Validações de CPF, CNPJ e documentos fiscais verificam apenas estrutura e dígitos. Não comprovam existência, situação cadastral nem autorização na SEFAZ.',
          'CPF, CNPJ and tax document validations only check structure and digits. They do not prove existence, registration status or SEFAZ authorization.',
        )}
      </p>
      <p>
        {tr(
          'Os geradores de dados fictícios existem para testes de software. É proibido usá-los para fraude ou para se passar por terceiros.',
          'Fake data generators exist for software testing. Using them for fraud or impersonation is forbidden.',
        )}
      </p>
    </Page>
  );
}
