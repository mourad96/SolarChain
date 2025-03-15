'use client';

import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';

export default function SignupPage() {
  const searchParams = useSearchParams();
  const role = searchParams?.get('role') as 'owner' | 'investor';

  if (!role || !['owner', 'investor'].includes(role)) {
    return (
      <MainLayout title="Invalid Role - IOFY">
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Invalid Role</h1>
            <p className="mt-2 text-gray-600">Please select a valid role from the home page.</p>
            <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-500">
              Return to Home
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Sign Up as ${role.charAt(0).toUpperCase() + role.slice(1)} - IOFY`}>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <AuthForm mode="signup" role={role} />
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href={`/auth/login?role=${role}`} className="font-medium text-blue-600 hover:text-blue-500">
            Sign in here
          </Link>
        </p>
      </div>
    </MainLayout>
  );
} 