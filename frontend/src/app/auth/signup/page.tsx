'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams?.get('role') as 'owner' | 'investor' | null;
  const redirect = searchParams?.get('redirect');

  // If no role is specified, show role selection
  if (!role) {
    return (
      <MainLayout title="Sign Up - IOFY">
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
            <div>
              <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
                Choose Account Type
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Select the type of account you want to create
              </p>
            </div>
            <div className="mt-8 space-y-4">
              <Link
                href={`/auth/signup?role=owner${redirect ? `&redirect=${redirect}` : ''}`}
                className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
              >
                <div>
                  <div className="font-medium">Sign up as Owner</div>
                  <div className="text-xs opacity-80">For solar panel owners</div>
                </div>
              </Link>
              <Link
                href={`/auth/signup?role=investor${redirect ? `&redirect=${redirect}` : ''}`}
                className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700"
              >
                <div>
                  <div className="font-medium">Sign up as Investor</div>
                  <div className="text-xs opacity-80">For energy token investors</div>
                </div>
              </Link>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href={`/auth/login${redirect ? `?redirect=${redirect}` : ''}`}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // If role is invalid, show error
  if (!['owner', 'investor'].includes(role)) {
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
      </div>
    </MainLayout>
  );
} 