import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import ClientProviders from '@/providers/client-providers';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"

// const META_THEME_COLORS = {
//   light: '#ffffff',
//   dark: '#09090b',
// };

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Gentaur Dashboard',
  description: 'made with ❤️ by m.mj',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isScaled = activeThemeValue?.endsWith('-scaled');

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'bg-background overscroll-none font-sans antialiased',
          geistSans.variable,
          activeThemeValue ? `theme-${activeThemeValue}` : '',
          isScaled ? 'theme-scaled' : ''
        )}
      >
        <ClientProviders>{children}</ClientProviders>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
