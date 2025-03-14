import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { DeviceDetails } from '@/components/iot/DeviceDetails';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Device {
  id: string;
  deviceType: string;
  serialNumber: string;
  status: string;
  panel: {
    name: string;
  };
}

const DeviceDetailsPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const { data: device, isLoading } = useQuery<Device>({
    queryKey: ['device', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/iot/devices/${id}`);
      return data;
    },
    enabled: !!id,
  });

  if (!id || isLoading) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{device?.serialNumber ? `${device.serialNumber} | ` : ''}IoT Device | Solar Energy Platform</title>
        <meta name="description" content="View IoT device details and readings" />
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

          {device && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                  {device.deviceType} - {device.serialNumber}
                </h1>
                <p className="mt-2 text-sm text-gray-500">Connected to panel: {device.panel.name}</p>
              </div>

              <DeviceDetails deviceId={id as string} />
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default DeviceDetailsPage; 