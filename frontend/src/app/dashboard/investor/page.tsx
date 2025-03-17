'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import Link from 'next/link';
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
}

export default function InvestorDashboard() {
  // Mock data for portfolio stats - in a real app, this would come from an API
  const portfolioStats = [
    { name: 'Total Invested', value: '$25,000' },
    { name: 'Total Returns', value: '$3,200' },
    { name: 'Active Projects', value: '5' },
    { name: 'Avg. ROI', value: '12.8%' },
  ];

  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
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
          throw new Error('Failed to fetch projects');
        }

        const data = await response.json();
        // Only show the first 2 projects on the dashboard
        setFeaturedProjects(data.slice(0, 2));
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
        // Fallback to mock data if API fails
        setFeaturedProjects([
          {
            id: '1',
            name: 'Solar Farm Alpha',
            location: 'California, USA',
            capacity: '500 kW',
            minInvestment: '$1,000',
            expectedROI: '15%',
            progress: 75,
          },
          {
            id: '2',
            name: 'Green Energy Beta',
            location: 'Texas, USA',
            capacity: '300 kW',
            minInvestment: '$500',
            expectedROI: '12%',
            progress: 45,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <DashboardLayout role="investor">
      <DashboardHeader
        title="Investor Dashboard"
        description="Manage your solar energy investments and track your portfolio performance"
        role="investor"
      />
      
      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {portfolioStats.map((stat) => (
          <div
            key={stat.name}
            className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6"
          >
            <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stat.value}
            </dd>
          </div>
        ))}
      </div>

      {/* Featured Investment Opportunities */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Featured Projects</h2>
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View All Projects
          </Link>
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {isLoading ? (
            <div className="col-span-2 flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            featuredProjects.map((project) => (
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
                    {project.owner && (
                      <div>
                        <p className="text-gray-500">Owner</p>
                        <p className="font-medium text-gray-900">{project.owner}</p>
                      </div>
                    )}
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
                    <Link
                      href={`/dashboard/investor/projects/${project.id}`}
                      className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Quick Links</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/portfolio"
            className="flex items-center justify-center rounded-lg bg-purple-50 p-6 text-purple-700 hover:bg-purple-100"
          >
            View Portfolio
          </Link>
          <Link
            href="/dashboard/projects"
            className="flex items-center justify-center rounded-lg bg-green-50 p-6 text-green-700 hover:bg-green-100"
          >
            Browse Projects
          </Link>
          <Link
            href="/dashboard/investor"
            className="flex items-center justify-center rounded-lg bg-blue-50 p-6 text-blue-700 hover:bg-blue-100"
          >
            Transaction History
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
} 