'use client';

import { useEffect } from 'react';

// Replaces the root layout, so global styles and the theme class are unavailable here.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          colorScheme: 'light dark',
        }}
      >
        <title>MoneyPilot · Hata</title>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Bir şeyler ters gitti</h1>
        <p style={{ maxWidth: '24rem', fontSize: '0.875rem', lineHeight: 1.6, opacity: 0.75 }}>
          MoneyPilot beklenmeyen bir hatayla karşılaştı. Lütfen tekrar deneyin.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1.25rem',
            border: 0,
            borderRadius: '0.75rem',
            background: '#1f4fd1',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
