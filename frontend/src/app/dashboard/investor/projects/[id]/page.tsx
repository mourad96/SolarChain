'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from 'react-hot-toast';
import InvestmentModal from '@/components/investor/InvestmentModal';

interface ProjectDetail {
  id: string;
  name: string;
  location: string;
  capacity: string;
  minInvestment: string;
  expectedROI: string;
  progress: number;
  owner: string;
  blockchainData?: {
    tokenId: string;
    totalSupply: string;
    availableSupply: string;
    isMockData?: boolean;
  } | null;
  createdAt: string;
  isMockData?: boolean;
  mockDataFields?: string[];
  isBlockchainVerified?: boolean;
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panels/projects/investors`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }

        const projects = await response.json();
        const projectDetail = projects.find((p: any) => p.id === params.id);
        
        if (!projectDetail) {
          throw new Error('Project not found');
        }
        
        // Process the project to identify mock fields
        const mockDataFields: string[] = [];
        let isMockData = false;
        let isBlockchainVerified = false;
        
        // Check if project has real blockchain data
        if (projectDetail.blockchainData && !projectDetail.blockchainData.isMockData) {
          isBlockchainVerified = true;
          isMockData = false;
        } else {
          // Check if each field is mock data
          if (!projectDetail.blockchainData) {
            mockDataFields.push('blockchain data');
            isMockData = true;
            
            // If blockchain data is missing, consider several fields as mock
            mockDataFields.push('progress');
            
            // Default values often indicate mock data
            if (projectDetail.minInvestment === '$1,000' || projectDetail.minInvestment === '$500' || 
                projectDetail.minInvestment === '$2,000' || projectDetail.minInvestment === '$250') {
              mockDataFields.push('minimum investment');
            }
            
            if (projectDetail.expectedROI === '12%' || projectDetail.expectedROI === '15%' || 
                projectDetail.expectedROI === '18%' || projectDetail.expectedROI === '10%') {
              mockDataFields.push('expected ROI');
            }
          }
          
          // If owner is missing or default
          if (!projectDetail.owner || projectDetail.owner === 'Unknown') {
            mockDataFields.push('owner');
            isMockData = true;
          }
          
          // Make sure we always show some mock data indicator for testing (remove in production)
          if (!isMockData) {
            isMockData = true;
            if (mockDataFields.length === 0) {
              // Add at least one mock field for testing
              mockDataFields.push('progress');
            }
          }
        }
        
        const processedProject = {
          ...projectDetail,
          isMockData,
          mockDataFields,
          isBlockchainVerified
        };
        
        setProject(processedProject);
      } catch (error) {
        console.error('Error fetching project details:', error);
        toast.error('Failed to load project details');
        // Redirect to projects page after error
        setTimeout(() => {
          router.push('/dashboard/projects');
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [params.id, router]);

  // Extract fetchProjectDetails function so it can be called elsewhere
  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panels/projects/investors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }

      const projects = await response.json();
      const projectDetail = projects.find((p: any) => p.id === params.id);
      
      if (!projectDetail) {
        throw new Error('Project not found');
      }
      
      // Process the project to identify mock fields
      const mockDataFields: string[] = [];
      let isMockData = false;
      let isBlockchainVerified = false;
      
      // Check if project has real blockchain data
      if (projectDetail.blockchainData && !projectDetail.blockchainData.isMockData) {
        isBlockchainVerified = true;
        isMockData = false;
      } else {
        // Check if each field is mock data
        if (!projectDetail.blockchainData) {
          mockDataFields.push('blockchain data');
          isMockData = true;
          
          // If blockchain data is missing, consider several fields as mock
          mockDataFields.push('progress');
          
          // Default values often indicate mock data
          if (projectDetail.minInvestment === '$1,000' || projectDetail.minInvestment === '$500' || 
              projectDetail.minInvestment === '$2,000' || projectDetail.minInvestment === '$250') {
            mockDataFields.push('minimum investment');
          }
          
          if (projectDetail.expectedROI === '12%' || projectDetail.expectedROI === '15%' || 
              projectDetail.expectedROI === '18%' || projectDetail.expectedROI === '10%') {
            mockDataFields.push('expected ROI');
          }
        }
        
        // If owner is missing or default
        if (!projectDetail.owner || projectDetail.owner === 'Unknown') {
          mockDataFields.push('owner');
          isMockData = true;
        }
        
        // Make sure we always show some mock data indicator for testing (remove in production)
        if (!isMockData) {
          isMockData = true;
          if (mockDataFields.length === 0) {
            // Add at least one mock field for testing
            mockDataFields.push('progress');
          }
        }
      }
      
      const processedProject = {
        ...projectDetail,
        isMockData,
        mockDataFields,
        isBlockchainVerified
      };
      
      setProject(processedProject);
    } catch (error) {
      console.error('Error fetching project details:', error);
      toast.error('Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="investor">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout role="investor">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Project Not Found</h2>
          <p className="mt-2 text-gray-500">The project you're looking for doesn't exist or you don't have access to it.</p>
          <button 
            onClick={() => router.push('/dashboard/projects')}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{project.location}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Projects
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Project Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Investment information and specifications</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Project name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{project.name}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{project.location}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Capacity</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{project.capacity}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Owner</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {project.owner}
                  {project.mockDataFields?.includes('owner') && (
                    <span className="ml-2 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock data)</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Minimum investment</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {project.minInvestment}
                  {project.mockDataFields?.includes('minimum investment') && (
                    <span className="ml-2 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock data)</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Expected ROI</dt>
                <dd className="mt-1 text-sm text-green-600 sm:mt-0 sm:col-span-2">
                  {project.expectedROI}
                  {project.mockDataFields?.includes('expected ROI') && (
                    <span className="ml-2 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock data)</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Funding progress</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span>
                      {project.progress}%
                      {project.mockDataFields?.includes('progress') && (
                        <span className="ml-2 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock data)</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                  </div>
                </dd>
              </div>
              {!project.blockchainData && project.isMockData && (
                <div className="py-4 sm:py-5 sm:px-6">
                  <p className="text-sm bg-amber-100 text-amber-800 p-2 rounded-md font-medium">
                    ⚠️ Blockchain data is not available for this project. Some information displayed is mock data.
                  </p>
                </div>
              )}
              {project.isBlockchainVerified && (
                <div className="py-4 sm:py-5 sm:px-6">
                  <p className="text-sm bg-green-100 text-green-800 p-2 rounded-md font-medium">
                    ✓ This project data is verified on the blockchain
                  </p>
                </div>
              )}
              {project.blockchainData && (
                <>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Token ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{project.blockchainData.tokenId}</dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Total supply</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{project.blockchainData.totalSupply} tokens</dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Available supply</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{project.blockchainData.availableSupply} tokens</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        <div className="mt-6">
          <button
            className="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => setIsInvestmentModalOpen(true)}
          >
            Invest in this Project
          </button>
        </div>

        {isInvestmentModalOpen && project && (
          <InvestmentModal
            project={project}
            onClose={() => setIsInvestmentModalOpen(false)}
            onInvest={(shareCount: number) => {
              // Show success message
              toast.success(`Successfully invested in ${shareCount} shares of ${project.name}!`);
              
              // Refresh the project details
              setTimeout(() => {
                fetchProjectDetails();
              }, 2000);
              
              setIsInvestmentModalOpen(false);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
} 