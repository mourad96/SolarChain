'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

interface IoTDevice {
  id: string;
  panelId: string;
  panelName: string;
  status: 'online' | 'offline' | 'error';
  lastUpdate: string;
}

interface IoTReading {
  id: string;
  deviceId: string;
  timestamp: string;
  energyOutput: number;
  temperature: number;
  voltage: number;
  current: number;
}

export default function IoTPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [readings, setReadings] = useState<IoTReading[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchReadings(selectedDevice, timeRange);
    }
  }, [selectedDevice, timeRange]);

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/iot/devices`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }

      const data = await response.json();
      setDevices(data);

      // Select the first device by default if available
      if (data.length > 0) {
        setSelectedDevice(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load IoT devices');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReadings = async (deviceId: string, range: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/iot/devices/${deviceId}/readings?range=${range}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch readings');
      }

      const data = await response.json();
      setReadings(data);
    } catch (error) {
      console.error('Error fetching readings:', error);
      toast.error('Failed to load device readings');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && devices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="IoT Monitoring" 
        description="Monitor your solar panel IoT devices and energy production data"
        role="owner"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
              <h3 className="text-lg font-medium text-white">
                IoT Devices
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <ul role="list" className="divide-y divide-gray-200">
                {devices.map((device) => (
                  <li
                    key={device.id}
                    className={`px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedDevice === device.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedDevice(device.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {device.panelName}
                        </h4>
                        <p className="mt-1 text-xs text-gray-500">
                          Last update:{' '}
                          {new Date(device.lastUpdate).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          device.status
                        )}`}
                      >
                        {device.status.charAt(0).toUpperCase() +
                          device.status.slice(1)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">
                Energy Production Data
              </h3>
              <div className="flex space-x-1 bg-blue-400 bg-opacity-30 rounded-lg p-1">
                {(['1h', '24h', '7d', '30d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      timeRange === range
                        ? 'bg-white text-blue-700'
                        : 'text-white hover:bg-blue-400'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">
                        Latest Readings
                      </h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {readings.length > 0 && (
                          <>
                            <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-green-500">
                              <p className="text-sm text-gray-500">
                                Energy Output
                              </p>
                              <p className="text-2xl font-semibold text-gray-900">
                                {readings[0].energyOutput.toFixed(2)} W
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-red-500">
                              <p className="text-sm text-gray-500">
                                Temperature
                              </p>
                              <p className="text-2xl font-semibold text-gray-900">
                                {readings[0].temperature.toFixed(1)}°C
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-yellow-500">
                              <p className="text-sm text-gray-500">
                                Voltage
                              </p>
                              <p className="text-2xl font-semibold text-gray-900">
                                {readings[0].voltage.toFixed(1)} V
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-blue-500">
                              <p className="text-sm text-gray-500">
                                Current
                              </p>
                              <p className="text-2xl font-semibold text-gray-900">
                                {readings[0].current.toFixed(2)} A
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Timestamp
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Energy Output (W)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Temperature (°C)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Voltage (V)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Current (A)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {readings.map((reading) => (
                            <tr key={reading.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(reading.timestamp).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reading.energyOutput.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reading.temperature.toFixed(1)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reading.voltage.toFixed(1)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reading.current.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 