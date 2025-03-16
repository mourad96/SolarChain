'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import Link from 'next/link';

export default function OwnerDashboard() {
  // Mock data - in a real app, this would come from an API
  const stats = [
    { name: 'Total Panels', value: '12' },
    { name: 'Total Capacity', value: '36 kW' },
    { name: 'Monthly Revenue', value: '$2,450' },
    { name: 'Energy Generated', value: '4,200 kWh' },
  ];

  const recentActivity = [
    { id: 1, type: 'Dividend Payment', amount: '$450', date: '2024-03-14' },
    { id: 2, type: 'New Investment', amount: '$2,000', date: '2024-03-12' },
    { id: 3, type: 'Panel Maintenance', amount: '-$200', date: '2024-03-10' },
  ];

  return (
    <DashboardLayout role="owner">
      <DashboardHeader
        title="Owner Dashboard"
        description="Manage your solar panels, monitor energy production, and track revenue"
        role="owner"
      />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/panels"
            className="flex items-center justify-center rounded-lg bg-blue-50 p-6 text-blue-700 hover:bg-blue-100"
          >
            Register New Panel
          </Link>
          <Link
            href="/dashboard/iot"
            className="flex items-center justify-center rounded-lg bg-green-50 p-6 text-green-700 hover:bg-green-100"
          >
            IoT Monitoring
          </Link>
          <Link
            href="/dashboard/tokens"
            className="flex items-center justify-center rounded-lg bg-yellow-50 p-6 text-yellow-700 hover:bg-yellow-100"
          >
            Manage Dividends
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        <div className="mt-4 overflow-hidden rounded-lg bg-white shadow">
          <ul role="list" className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.type}</p>
                    <p className="text-sm text-gray-500">{activity.date}</p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      activity.amount.startsWith('-')
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {activity.amount}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
} 