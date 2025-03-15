'use client';

import MainLayout from '@/components/layout/MainLayout';
import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const role = searchParams?.get('role') as 'owner' | 'investor';

  return (
    <MainLayout title="Login - IOFY">
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <AuthForm mode="login" role={role} />
      </div>
    </MainLayout>
  );
} 