'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';

interface Investment {
  id: number;
  projectName: string;
  investmentDate: string;
  amount: string;
  tokens: number;
  currentValue: string;
  roi: string;
}

export default function PortfolioPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioStats, setPortfolioStats] = useState({
    totalInvested: '$0',
    currentValue: '$0',
    totalReturn: '$0',
    averageROI: '0%',
  });

  useEffect(() => {
    // In a real app, fetch portfolio data from an API
    // For now, use mock data
    const mockInvestments = [
      {
        id: 1,
        projectName: 'Solar Farm Alpha',
        investmentDate: '2023-10-15',
        amount: '$5,000',
        tokens: 500,
        currentValue: '$5,750',
        roi: '+15%',
      },
      {
        id: 2,
        projectName: 'Green Energy Beta',
        investmentDate: '2023-11-20',
        amount: '$3,000',
        tokens: 300,
        currentValue: '$3,360',
        roi: '+12%',
      },
      {
        id: 3,
        projectName: 'Sunshine Valley',
        investmentDate: '2024-01-05',
        amount: '$10,000',
        tokens: 1000,
        currentValue: '$10,800',
        roi: '+8%',
      },
    ];

    setInvestments(mockInvestments);
    setPortfolioStats({
      totalInvested: '$18,000',
      currentValue: '$19,910',
      totalReturn: '$1,910',
      averageROI: '+10.6%',
    });
    setIsLoading(false);
  }, []);

  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Investment Portfolio</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track your solar energy investments and returns
          </p>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Total Invested</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {portfolioStats.totalInvested}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Current Value</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {portfolioStats.currentValue}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Total Return</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">
              {portfolioStats.totalReturn}
            </dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Average ROI</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">
              {portfolioStats.averageROI}
            </dd>
          </div>
        </div>

        {/* Investments Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Your Investments</h3>
            </div>
            <div className="border-t border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Project
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Tokens
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Current Value
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        ROI
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {investments.map((investment) => (
                      <tr key={investment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{investment.projectName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{investment.investmentDate}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{investment.amount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{investment.tokens}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{investment.currentValue}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-green-600 font-medium">{investment.roi}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/investor/projects/${investment.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Details
                          </Link>
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
    </DashboardLayout>
  );
} 