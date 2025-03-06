import '../globals.css'
import "@jetstyle/ui/styles.css";
import "@jetstyle/ui//dist/index.css";

import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

// Can be imported from a shared config
const locales = ['ru', 'en'];

export default function LocaleLayout({ children, params: { locale } }:any ){
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale)) notFound();

  return (
      <html lang={locale}>
      <body className={inter.className}>
      <script
          dangerouslySetInnerHTML={{
            __html: `
                        try {
                            document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') ?? 'light');
                        } catch (error) {

                        }
                    `,
          }}
      />
      {children}
      </body>
      </html>
  );
}


export async function generateMetadata({ params: { locale }}:any) {
  const t = await getTranslations({locale, namespace: 'App'});

  return {
    title: t('name'),
    description: t('description')
  };
}
