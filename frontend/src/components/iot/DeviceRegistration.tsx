import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Panel {
  id: string;
  name: string;
}

interface DeviceRegistrationForm {
  panelId: string;
  deviceType: string;
  serialNumber: string;
}

export const DeviceRegistration = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeviceRegistrationForm>();

  const { data: panels } = useQuery<Panel[]>({
    queryKey: ['panels'],
    queryFn: async () => {
      const { data } = await axios.get('/api/panels');
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: DeviceRegistrationForm) => {
      const response = await axios.post('/api/iot/devices', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Device registered successfully');
      router.push('/iot/devices');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to register device');
    },
  });

  const onSubmit = (data: DeviceRegistrationForm) => {
    mutation.mutate(data);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Register IoT Device</h3>
            <p className="mt-1 text-sm text-gray-500">
              Register a new IoT device to monitor your solar panel performance.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="panelId" className="block text-sm font-medium leading-6 text-gray-900">
                  Solar Panel
                </label>
                <div className="mt-2">
                  <select
                    id="panelId"
                    {...register('panelId', { required: 'Please select a panel' })}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  >
                    <option value="">Select a panel</option>
                    {panels?.map((panel) => (
                      <option key={panel.id} value={panel.id}>
                        {panel.name}
                      </option>
                    ))}
                  </select>
                  {errors.panelId && (
                    <p className="mt-2 text-sm text-red-600">{errors.panelId.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="deviceType" className="block text-sm font-medium leading-6 text-gray-900">
                  Device Type
                </label>
                <div className="mt-2">
                  <select
                    id="deviceType"
                    {...register('deviceType', { required: 'Please select a device type' })}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  >
                    <option value="">Select a device type</option>
                    <option value="inverter">Inverter</option>
                    <option value="meter">Smart Meter</option>
                    <option value="sensor">Environmental Sensor</option>
                  </select>
                  {errors.deviceType && (
                    <p className="mt-2 text-sm text-red-600">{errors.deviceType.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="serialNumber" className="block text-sm font-medium leading-6 text-gray-900">
                  Serial Number
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="serialNumber"
                    {...register('serialNumber', {
                      required: 'Serial number is required',
                      pattern: {
                        value: /^[A-Za-z0-9-]+$/,
                        message: 'Serial number can only contain letters, numbers, and hyphens',
                      },
                    })}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Enter device serial number"
                  />
                  {errors.serialNumber && (
                    <p className="mt-2 text-sm text-red-600">{errors.serialNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}; 