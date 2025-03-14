import { NextPage } from 'next';
import Head from 'next/head';
import { DeviceList } from '@/components/iot/DeviceList';

const IoTDevicesPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>IoT Devices | Solar Energy Platform</title>
        <meta name="description" content="Manage your IoT devices for solar panel monitoring" />
      </Head>

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <DeviceList />
        </div>
      </main>
    </>
  );
};

export default IoTDevicesPage; 