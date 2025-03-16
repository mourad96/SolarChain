'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams?.get('role') as 'owner' | 'investor' | null;
  const redirect = searchParams?.get('redirect');

  // If no role is specified, show role selection
  if (!role) {
    return (
      <MainLayout title="Login - IOFY">
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
            <div>
              <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
                Choose Account Type
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Select the type of account you want to sign in to
              </p>
            </div>
            <div className="mt-8 space-y-4">
              <Link
                href={`/auth/login?role=owner${redirect ? `&redirect=${redirect}` : ''}`}
                className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
              >
                Sign in as Owner
              </Link>
              <Link
                href={`/auth/login?role=investor${redirect ? `&redirect=${redirect}` : ''}`}
                className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700"
              >
                Sign in as Investor
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Login as ${role.charAt(0).toUpperCase() + role.slice(1)} - IOFY`}>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <AuthForm mode="login" role={role} />
      </div>
    </MainLayout>
  );
} 