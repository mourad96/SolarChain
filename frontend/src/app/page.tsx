import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Welcome to IOFY
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Manage your solar panels and energy tokens with ease. Monitor performance, trade energy shares, and contribute to a sustainable future.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/auth/login"
              className="btn btn-primary"
            >
              Get Started
            </Link>
            <Link
              href="/about"
              className="btn btn-secondary"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-32">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Solar Panel Management */}
            <div className="relative p-6 bg-white rounded-2xl shadow-sm">
              <div className="absolute top-6 left-6 h-12 w-12 flex items-center justify-center rounded-lg bg-primary-100">
                <svg
                  className="h-6 w-6 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  />
                </svg>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  Solar Panel Management
                </h3>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  Register and monitor your solar panels. Track performance metrics and energy production in real-time.
                </p>
              </div>
            </div>

            {/* Energy Token Trading */}
            <div className="relative p-6 bg-white rounded-2xl shadow-sm">
              <div className="absolute top-6 left-6 h-12 w-12 flex items-center justify-center rounded-lg bg-primary-100">
                <svg
                  className="h-6 w-6 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  Energy Token Trading
                </h3>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  Mint and trade energy tokens backed by your solar panel production. Create a marketplace for sustainable energy.
                </p>
              </div>
            </div>

            {/* IoT Integration */}
            <div className="relative p-6 bg-white rounded-2xl shadow-sm">
              <div className="absolute top-6 left-6 h-12 w-12 flex items-center justify-center rounded-lg bg-primary-100">
                <svg
                  className="h-6 w-6 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  IoT Integration
                </h3>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  Connect your solar panels to our IoT platform. Get detailed analytics and optimize your energy production.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 