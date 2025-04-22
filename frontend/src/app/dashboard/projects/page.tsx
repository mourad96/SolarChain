'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  location: string;
  capacity: string;
  minInvestment: string;
  expectedROI: string;
  progress: number;
  owner?: string;
  blockchainData?: {
    tokenId: string;
    totalSupply: string;
    availableSupply: string;
    isMockData?: boolean;
  } | null;
  isMockData?: boolean;
  mockDataFields?: string[];
  isBlockchainVerified?: boolean;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panels/blockchain/all`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const data = await response.json();
        console.log('Raw API data:', data);
        
        // Process the data to identify mock fields
        const processedData = data.map((project: Project) => {
          console.log('Processing project:', project);
          console.log('Blockchain data:', project.blockchainData);
          
          // Check if project has blockchain data
          const hasRealBlockchainData = project.blockchainData && !project.blockchainData.isMockData;
          console.log('Has real blockchain data:', hasRealBlockchainData);
          
          // If has real blockchain data, mark fields as real
          if (hasRealBlockchainData) {
            return {
              ...project,
              isMockData: false,
              isBlockchainVerified: true,
              mockDataFields: [] // Clear any mock data fields
            };
          }
          
          // Otherwise, mark as mock data
          return {
            ...project,
            isMockData: true,
            mockDataFields: ['minimum investment', 'expected ROI', 'progress', 'owner'],
          };
        });
        
        console.log('Processed data:', processedData);
        setProjects(processedData);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
        // Fallback to mock data if API fails
        const mockProjects = [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Solar Farm Alpha',
            location: 'California, USA',
            capacity: '500 kW',
            minInvestment: '$1,000',
            expectedROI: '15%',
            progress: 75,
            isMockData: true,
            mockDataFields: ['all data'],
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Green Energy Beta',
            location: 'Texas, USA',
            capacity: '300 kW',
            minInvestment: '$500',
            expectedROI: '12%',
            progress: 45,
            isMockData: true,
            mockDataFields: ['all data'],
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'Sunshine Valley',
            location: 'Arizona, USA',
            capacity: '750 kW',
            minInvestment: '$2,000',
            expectedROI: '18%',
            progress: 30,
            isMockData: true,
            mockDataFields: ['all data'],
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            name: 'Urban Rooftop Solar',
            location: 'New York, USA',
            capacity: '100 kW',
            minInvestment: '$250',
            expectedROI: '10%',
            progress: 90,
            isMockData: true,
            mockDataFields: ['all data'],
          },
        ];
        setProjects(mockProjects);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
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
                      <p className="font-medium text-gray-900">
                        {project.minInvestment}
                        {project.mockDataFields?.includes('minimum investment') && (
                          <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expected ROI</p>
                      <p className="font-medium text-green-600">
                        {project.expectedROI}
                        {project.mockDataFields?.includes('expected ROI') && (
                          <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock)</span>
                        )}
                      </p>
                    </div>
                    {project.owner && (
                      <div>
                        <p className="text-gray-500">Owner</p>
                        <p className="font-medium text-gray-900">
                          {project.owner}
                          {project.mockDataFields?.includes('owner') && (
                            <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock)</span>
                          )}
                        </p>
                      </div>
                    )}
                    {/* Show either mock data warning or blockchain verified badge */}
                    <div className="col-span-2 mt-2">
                      {project.isBlockchainVerified ? (
                        <p className="text-sm bg-green-100 text-green-800 p-2 rounded-md font-medium">
                          ✓ Blockchain verified data
                        </p>
                      ) : (
                        <p className="text-sm bg-red-100 text-red-800 p-2 rounded-md font-bold">
                          ⚠️ MOCK DATA INDICATOR - This should be visible
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Funding Progress</span>
                      <span className="font-medium text-gray-900">
                        {project.blockchainData ? (
                          <>
                            {Math.round(
                              ((parseInt(project.blockchainData.totalSupply) - parseInt(project.blockchainData.availableSupply)) /
                                parseInt(project.blockchainData.totalSupply)) *
                                100
                            )}%
                          </>
                        ) : (
                          <>
                            {project.progress}%
                            {project.mockDataFields?.includes('progress') && (
                              <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock)</span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{
                          width: `${
                            project.blockchainData
                              ? Math.round(
                                  ((parseInt(project.blockchainData.totalSupply) - parseInt(project.blockchainData.availableSupply)) /
                                    parseInt(project.blockchainData.totalSupply)) *
                                    100
                                )
                              : project.progress
                          }%`,
                        }}
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