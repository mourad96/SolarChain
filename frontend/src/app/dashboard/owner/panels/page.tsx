'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OwnerPanelsPage() {
  const router = useRouter();

  useEffect(() => {
    // Use a more reliable redirection method with a small delay
    const redirectTimer = setTimeout(() => {
      window.location.href = '/dashboard/panels';
    }, 100);
    
    return () => clearTimeout(redirectTimer);
  }, []);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );
} 