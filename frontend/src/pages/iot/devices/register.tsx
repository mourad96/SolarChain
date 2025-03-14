import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { DeviceRegistration } from '@/components/iot/DeviceRegistration';

const RegisterDevicePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Register IoT Device | Solar Energy Platform</title>
        <meta name="description" content="Register a new IoT device for solar panel monitoring" />
      </Head>

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/iot/devices"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="mr-1 h-5 w-5" />
              Back to Devices
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Register New IoT Device
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Add a new IoT device to monitor your solar panel performance
              </p>
            </div>

            <DeviceRegistration />
          </div>
        </div>
      </main>
    </>
  );
};

export default RegisterDevicePage; 