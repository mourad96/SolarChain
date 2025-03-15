import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';

export default function Home() {
  return (
    <MainLayout>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl text-center">
          <h1 className="mb-8 text-5xl font-bold text-gray-900">
            Welcome to IOFY
          </h1>
          <p className="mb-12 text-xl text-gray-600">
            Connect solar energy producers with investors for a sustainable future
          </p>
          
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <h2 className="mb-4 text-2xl font-semibold text-gray-900">Solar Panel Owner</h2>
              <p className="mb-6 text-gray-600">
                Register your solar panels and manage your energy production
              </p>
              <Link
                href="/auth/login?role=owner"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
              >
                Continue as Owner
              </Link>
            </div>

            <div className="rounded-xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <h2 className="mb-4 text-2xl font-semibold text-gray-900">Investor</h2>
              <p className="mb-6 text-gray-600">
                Invest in solar energy projects and earn sustainable returns
              </p>
              <Link
                href="/auth/login?role=investor"
                className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white transition-colors hover:bg-green-700"
              >
                Continue as Investor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 