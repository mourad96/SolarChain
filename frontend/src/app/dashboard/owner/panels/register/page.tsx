'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface PanelFormData {
  panelId: string;
  installationDate: string;
  capacity: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  manufacturer: string;
  model: string;
}

export default function RegisterPanel() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PanelFormData>({
    panelId: '',
    installationDate: '',
    capacity: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    manufacturer: '',
    model: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement API call to register panel
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      router.push('/dashboard/owner/panels');
    } catch (error) {
      console.error('Failed to register panel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    locationField?: string
  ) => {
    if (locationField) {
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [locationField]: e.target.value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [field]: e.target.value,
      });
    }
  };

  return (
    <DashboardLayout role="owner">
      <div className="mx-auto max-w-2xl">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Register New Solar Panel
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Basic Information */}
          <div className="space-y-6 rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="panelId" className="block text-sm font-medium text-gray-700">
                  Panel ID
                </label>
                <input
                  type="text"
                  id="panelId"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.panelId}
                  onChange={(e) => handleInputChange(e, 'panelId')}
                />
              </div>
              <div>
                <label htmlFor="installationDate" className="block text-sm font-medium text-gray-700">
                  Installation Date
                </label>
                <input
                  type="date"
                  id="installationDate"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.installationDate}
                  onChange={(e) => handleInputChange(e, 'installationDate')}
                />
              </div>
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                  Capacity (kW)
                </label>
                <input
                  type="number"
                  id="capacity"
                  required
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange(e, 'capacity')}
                />
              </div>
              <div>
                <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
                  Manufacturer
                </label>
                <input
                  type="text"
                  id="manufacturer"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.manufacturer}
                  onChange={(e) => handleInputChange(e, 'manufacturer')}
                />
              </div>
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                  Model
                </label>
                <input
                  type="text"
                  id="model"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.model}
                  onChange={(e) => handleInputChange(e, 'model')}
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-6 rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <input
                  type="text"
                  id="address"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.location.address}
                  onChange={(e) => handleInputChange(e, 'location', 'address')}
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.location.city}
                  onChange={(e) => handleInputChange(e, 'location', 'city')}
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.location.state}
                  onChange={(e) => handleInputChange(e, 'location', 'state')}
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.location.country}
                  onChange={(e) => handleInputChange(e, 'location', 'country')}
                />
              </div>
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={formData.location.zipCode}
                  onChange={(e) => handleInputChange(e, 'location', 'zipCode')}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isSubmitting ? 'Registering...' : 'Register Panel'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 