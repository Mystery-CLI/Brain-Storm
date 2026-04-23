'use client';

import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Navbar />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
