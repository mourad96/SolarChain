import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import Link from 'next/link';

interface IoTDevice {
  id: string;
  deviceType: string;
  serialNumber: string;
  status: string;
  lastUpdate: string;
  panel: {
    name: string;
    id: string;
  };
}

export const DeviceList = () => {
  const { data: devices, isLoading } = useQuery<IoTDevice[]>({
    queryKey: ['iot-devices'],
    queryFn: async () => {
      const { data } = await axios.get('/api/iot/devices');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h3 className="text-base font-semibold leading-6 text-gray-900">IoT Devices</h3>
            <p className="mt-2 text-sm text-gray-700">
              A list of all IoT devices connected to your solar panels
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <Link
              href="/iot/register"
              className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
            >
              Register Device
            </Link>
          </div>
        </div>
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      Device Type
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Serial Number
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Panel
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Last Update
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {devices?.map((device) => (
                    <tr key={device.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {device.deviceType}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{device.serialNumber}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{device.panel.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            device.status === 'online'
                              ? 'bg-green-50 text-green-700'
                              : device.status === 'error'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {device.status === 'online' ? (
                            <CheckCircleIcon className="mr-1 h-4 w-4 text-green-400" aria-hidden="true" />
                          ) : device.status === 'error' ? (
                            <ExclamationCircleIcon className="mr-1 h-4 w-4 text-red-400" aria-hidden="true" />
                          ) : (
                            <ArrowPathIcon className="mr-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                          )}
                          {device.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(device.lastUpdate).toLocaleString()}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <Link href={`/iot/devices/${device.id}`} className="text-blue-600 hover:text-blue-900">
                          View<span className="sr-only">, {device.serialNumber}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 