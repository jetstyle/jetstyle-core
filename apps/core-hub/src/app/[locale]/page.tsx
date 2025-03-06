import {useTranslations} from 'next-intl';

export default function Index() {
  const t = useTranslations('App');
  return <h1>{t('name')}</h1>;
}

