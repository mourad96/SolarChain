'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default function OwnerIoTPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deviceCount, setDeviceCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDeviceCount(Math.floor(Math.random() * 10) + 5); // Random number between 5-15
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading IoT data:", error);
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Simulate redirect after data is loaded
    if (!isRedirecting && !isLoading) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        router.push("/dashboard/iot");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRedirecting, isLoading, router]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="IoT Data"
        description="Monitor solar panel IoT devices and energy production data"
        role="owner"
      />
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
          <h3 className="text-lg font-medium text-white">
            IoT Device Management
          </h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading IoT device data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h4 className="text-lg font-medium text-gray-900">Active Devices</h4>
                  <p className="text-3xl font-bold text-blue-600">{deviceCount}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <h4 className="text-lg font-medium text-gray-900">Data Points</h4>
                  <p className="text-3xl font-bold text-green-600">{deviceCount * 24 * 7}</p>
                  <p className="text-sm text-gray-500">Last 7 days</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <h4 className="text-lg font-medium text-gray-900">Uptime</h4>
                  <p className="text-3xl font-bold text-purple-600">99.8%</p>
                  <p className="text-sm text-gray-500">Last 30 days</p>
                </div>
              </div>
              
              {isRedirecting ? (
                <div className="flex flex-col items-center justify-center py-4 bg-blue-50 rounded-lg p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
                  <p className="text-gray-600">Redirecting to IoT monitoring page...</p>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    onClick={() => setIsRedirecting(true)}
                    className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Go to IoT Monitoring
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 