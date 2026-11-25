import { Link } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export default function NotFound() {
  const { t } = useI18n();
  useDocumentMeta(t('common.notFoundTitle'));
  return (
    <div className="st-page st-center">
      <h1 className="st-h1">404</h1>
      <p>{t('common.notFoundTitle')}</p>
      <Link to="/">{t('common.backHome')}</Link>
    </div>
  );
}
