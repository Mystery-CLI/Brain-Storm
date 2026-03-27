'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-6">⚠️</div>
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-gray-500 mb-6 max-w-md">
        An unexpected error occurred. You can try again or go back to the home page.
      </p>
      {error?.message && (
        <p className="text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 mb-6 max-w-md break-all">
          {error.message}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Go Home
        </Button>
      </div>
    </main>
  );
}
