
import Loader from '@/app/loader';
import { ActiveThemeProvider } from '@/components/active-theme';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthStoreProvider } from '@/store/AuthProvider';
import { cookies } from 'next/headers';
import { Suspense } from 'react';

export default async function ClientProviders({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isScaled = activeThemeValue?.endsWith('-scaled');
  return (
    <Suspense fallback={<Loader />}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        <ActiveThemeProvider initialTheme={activeThemeValue}>
          <AuthStoreProvider>{children}</AuthStoreProvider>
        </ActiveThemeProvider>
      </ThemeProvider>
    </Suspense>
  );
}
