'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  id: number;
  name: string;
  location: string;
  capacity: string;
  minInvestment: string;
  expectedROI: string;
  progress: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch projects from an API
    // For now, use mock data
    const mockProjects = [
      {
        id: 1,
        name: 'Solar Farm Alpha',
        location: 'California, USA',
        capacity: '500 kW',
        minInvestment: '$1,000',
        expectedROI: '15%',
        progress: 75,
      },
      {
        id: 2,
        name: 'Green Energy Beta',
        location: 'Texas, USA',
        capacity: '300 kW',
        minInvestment: '$500',
        expectedROI: '12%',
        progress: 45,
      },
      {
        id: 3,
        name: 'Sunshine Valley',
        location: 'Arizona, USA',
        capacity: '750 kW',
        minInvestment: '$2,000',
        expectedROI: '18%',
        progress: 30,
      },
      {
        id: 4,
        name: 'Urban Rooftop Solar',
        location: 'New York, USA',
        capacity: '100 kW',
        minInvestment: '$250',
        expectedROI: '10%',
        progress: 90,
      },
    ];

    setProjects(mockProjects);
    setIsLoading(false);
  }, []);

  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Investment Projects</h2>
            <p className="mt-1 text-sm text-gray-500">
              Browse available solar energy projects for investment
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="overflow-hidden rounded-lg bg-white shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">{project.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Capacity</p>
                      <p className="font-medium text-gray-900">{project.capacity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Min. Investment</p>
                      <p className="font-medium text-gray-900">{project.minInvestment}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expected ROI</p>
                      <p className="font-medium text-green-600">{project.expectedROI}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Funding Progress</span>
                      <span className="font-medium text-gray-900">{project.progress}%</span>
                    </div>
                    <div className="mt-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => router.push(`/dashboard/investor/projects/${project.id}`)}
                      className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 