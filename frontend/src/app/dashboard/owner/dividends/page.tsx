'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

interface Distribution {
  id: string;
  date: string;
  amount: number;
  recipients: number;
  transactionHash: string;
}

export default function OwnerDividendsPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [dividendAmount, setDividendAmount] = useState<number>(0.001);
  const [isDistributing, setIsDistributing] = useState<boolean>(false);
  const [dividendHistory, setDividendHistory] = useState<Distribution[]>([
    {
      id: "1",
      date: "2023-06-15T10:30:00Z",
      amount: 0.5,
      recipients: 12,
      transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
    {
      id: "2",
      date: "2023-07-01T14:45:00Z",
      amount: 0.75,
      recipients: 15,
      transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    },
  ]);

  useEffect(() => {
    // Simulate redirect after 1 second
    if (!isRedirecting) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        router.push("/dashboard/tokens");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isRedirecting, router]);

  const handleDistributeDividends = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDistributing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add to history
      const newDistribution: Distribution = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        amount: dividendAmount,
        recipients: Math.floor(Math.random() * 10) + 10, // Random number between 10-20
        transactionHash: "0x" + Math.random().toString(16).substring(2, 66),
      };
      
      setDividendHistory([newDistribution, ...dividendHistory]);
      setDividendAmount(0.001);
      alert("Dividends distributed successfully!");
    } catch (error) {
      console.error("Error distributing dividends:", error);
      alert("Failed to distribute dividends. Please try again.");
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Dividends" 
        description="Manage your energy dividends and token distributions"
        role="owner"
      />
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
          <h3 className="text-lg font-medium text-white">
            Dividend Distribution
          </h3>
        </div>
        <div className="p-4">
          <form onSubmit={handleDistributeDividends} className="space-y-4">
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Amount (ETH)
              </label>
              <input
                type="number"
                id="amount"
                value={dividendAmount}
                onChange={(e) => setDividendAmount(parseFloat(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                min="0.001"
                step="0.001"
              />
            </div>
            <div>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={isDistributing}
              >
                {isDistributing ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  "Distribute Dividends"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
          <h3 className="text-lg font-medium text-white">
            Distribution History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
                  Amount (ETH)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Recipients
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Transaction
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dividendHistory.length > 0 ? (
                dividendHistory.map((distribution) => (
                  <tr key={distribution.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(distribution.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                        {distribution.amount} ETH
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {distribution.recipients}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${distribution.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        View on Etherscan
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                  >
                    No dividend distributions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 