// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/lib/auth/authContext';
import { ProjectsProvider } from '@/lib/contexts/projectsContext';
import RoutePrefetch from '@/components/RoutePrefetch';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Unused data cached for 10 minutes
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectsProvider>
          <RoutePrefetch />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#2e2e2e',
                color: '#fff',
                borderRadius: '999px',
              },
            }}
          />
        </ProjectsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}