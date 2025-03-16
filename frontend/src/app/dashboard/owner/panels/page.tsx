'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function OwnerPanelsPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Simulate redirect after 1 second
    if (!isRedirecting) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        router.push("/dashboard/panels");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isRedirecting, router]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Solar Panels"
        description="Manage your solar panel installations and monitor their performance"
        role="owner"
      />
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
          <h3 className="text-lg font-medium text-white">
            Solar Panel Management
          </h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Redirecting to Panels page...</p>
          </div>
        </div>
      </div>
    </div>
  );
} 