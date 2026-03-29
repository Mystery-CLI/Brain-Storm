import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ClientProviders } from '@/components/ClientProviders';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Brain-Storm - Blockchain Education on Stellar',
  description:
    'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'es')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            {/* Skip-to-content — first focusable element on every page */}
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            {children}
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
