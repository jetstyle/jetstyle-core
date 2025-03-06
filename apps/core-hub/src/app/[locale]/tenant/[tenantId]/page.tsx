import Link from 'next/link';
import { useTranslations } from 'next-intl'
import { createUri } from '@jetstyle/ui/helpers/nav'

export default function TenantPage() {
    const t = useTranslations('App')
    return (
        <main className="flex flex-col items-center justify-center min-h-screen">
            <div className="mt-4 p-4 rounded w-[400px] flex flex-col">
                <div className="mb-4">
                    {t('WelcomeMessage')}
                </div>
                {/* <Link className="btn" href={createUri('/files')}>
                    {t('WelcomeMessageCTA')}
                </Link> */}
            </div>
        </main>
    )
}
