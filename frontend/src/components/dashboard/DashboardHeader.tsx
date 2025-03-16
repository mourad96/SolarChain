'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  role: 'owner' | 'investor';
}

export default function DashboardHeader({ title, description, role }: DashboardHeaderProps) {
  const pathname = usePathname();
  const isMainDashboard = pathname === `/dashboard/${role}`;
  const dashboardPath = `/dashboard/${role}`;

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-3">
        {!isMainDashboard && (
          <Link 
            href={dashboardPath}
            className="inline-flex items-center justify-center p-2 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            aria-label="Back to Dashboard"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        )}
        <Link 
          href={dashboardPath}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <HomeIcon className="h-5 w-5 mr-1" />
          Dashboard
        </Link>
        {!isMainDashboard && (
          <>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">{title}</span>
          </>
        )}
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>
    </div>
  );
} 