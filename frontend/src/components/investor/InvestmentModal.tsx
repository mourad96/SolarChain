import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ProjectDetail {
  id: string;
  name: string;
  location: string;
  capacity: string;
  price: string;
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

interface InvestmentModalProps {
  project: ProjectDetail;
  onClose: () => void;
  onInvest: (shareCount: number) => void;
}

export default function InvestmentModal({ project, onClose, onInvest }: InvestmentModalProps) {
  const [shareCount, setShareCount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate cost based on price
  const sharePrice = parseFloat(project.price.replace('$', ''));
  const totalCost = sharePrice * shareCount;

  const availableShares = project.blockchainData?.availableSupply 
    ? parseInt(project.blockchainData.availableSupply) 
    : 100;

  // Handle share count input change
  const handleShareCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value <= 0) {
      setShareCount(1);
    } else if (value > availableShares) {
      setShareCount(availableShares);
    } else {
      setShareCount(value);
    }
  };

  // Handle investment submission
  const handleInvest = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the API to invest in the project
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panels/${project.id}/invest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shares: shareCount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process investment');
      }

      const result = await response.json();
      
      // Show success toast
      toast.success('Investment successful!');
      
      // Call the onInvest callback
      onInvest(shareCount);
    } catch (error: any) {
      console.error('Investment error:', error);
      setError(error.message || 'Failed to process investment');
      toast.error(error.message || 'Failed to process investment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Invest in {project.name}</h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4 space-y-6">
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-blue-700">
                    Expected ROI: <span className="font-bold">{project.expectedROI}</span>
                  </p>
                </div>
              </div>
            </div>
            
            {project.isMockData && !project.isBlockchainVerified && (
              <div className="rounded-md bg-amber-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-700">
                      This is a demo project with mock data. No real investment will be processed.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Share Price</label>
                <div className="mt-1 text-lg font-semibold">{project.price}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Available Shares</label>
                <div className="mt-1 text-lg font-semibold">{availableShares}</div>
              </div>
            </div>
            
            <div>
              <label htmlFor="shareCount" className="block text-sm font-medium text-gray-700">
                Number of Shares
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  id="shareCount"
                  value={shareCount}
                  onChange={handleShareCountChange}
                  min="1"
                  max={availableShares}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Total Cost</span>
                <span className="text-lg font-semibold text-gray-900">${totalCost.toFixed(2)}</span>
              </div>
            </div>
            
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-5 sm:mt-6 flex space-x-3">
              <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                onClick={handleInvest}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Confirm Investment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 