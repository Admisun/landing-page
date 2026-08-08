"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function ReportRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      router.replace(`/dashboard?id=${id}`);
    } else {
      router.replace('/dashboard');
    }
  }, [router, searchParams]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', gap: '1rem' }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading submission details...</p>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p>Loading...</p>
      </div>
    }>
      <ReportRedirectContent />
    </Suspense>
  );
}
