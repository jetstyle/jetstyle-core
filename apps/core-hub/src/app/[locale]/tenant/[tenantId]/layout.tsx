import { NextIntlClientProvider } from "next-intl";
import TenantClientLayout from "@jetstyle/ui/components/TenantClientLayout";
import { AuthProvider } from "@jetstyle/ui/hooks/use-auth";

import { UIStateProvider } from '@jetstyle/ui/hooks/use-ui-state'

import { notFound } from "next/navigation";

async function getMessages(locale: string) {
  try {
    return (await import(`../../../../../messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }
}

export default async function TenantLayout({ params, children }: any) {
  const { locale } = params;
  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <UIStateProvider>
            <TenantClientLayout>
              {children}
            </TenantClientLayout>
        </UIStateProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  )
}
