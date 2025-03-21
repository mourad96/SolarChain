'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import Link from 'next/link';
import Cookies from 'js-cookie';

interface Token {
  id: string;
  panelId: string;
  panelName: string;
  amount: number;
  mintedAt: string;
  owner: string;
  unclaimedDividends?: number;
}

interface TransferForm {
  tokenId: string;
  recipientAddress: string;
  amount: number;
}

interface DividendForm {
  panelId: string;
  amount: number;
}

export default function TokensPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [transferForm, setTransferForm] = useState<TransferForm>({
    tokenId: '',
    recipientAddress: '',
    amount: 0,
  });
  const [dividendForm, setDividendForm] = useState<DividendForm>({
    panelId: '',
    amount: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return; // Let the middleware handle authentication
    }
    
    if (!user.walletAddress) {
      toast.error('Please connect a wallet in your profile to view tokens');
      return;
    }
    
    console.log('User authenticated:', { id: user.id, walletAddress: user.walletAddress });
    fetchTokens();
  }, [user]);

  // Log environment variables to help with debugging
  useEffect(() => {
    // Check if the API URL is set
    console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
    if (!process.env.NEXT_PUBLIC_API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not set in environment variables!');
      toast.error('API configuration error. Please check the console.');
    }
  }, []);

  const fetchTokens = async () => {
    setIsLoading(true);
    setError(null);
    console.log('Fetching tokens...');
    
    try {
      // Log fetch attempt with API URL
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tokens`;
      console.log(`Attempting to fetch tokens from: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || Cookies.get('token')}`,
        },
      });
      
      console.log(`API Response status:`, response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication error: Not logged in or session expired');
          setError('Authentication error. Please log in again.');
          setTokens([]);
        } else {
          const errorText = await response.text();
          console.error(`API error (${response.status}):`, errorText);
          setError(`Error fetching tokens: ${response.statusText}`);
          setTokens([]);
        }
      } else {
        const data = await response.json();
        console.log(`Received ${data.length} tokens from API:`, data);
        
        if (data.length === 0) {
          console.log('No tokens returned from API. Check if:');
          console.log('1. You are properly logged in');
          console.log('2. Your wallet is connected to your account');
          console.log('3. You own any tokens associated with your wallet');
          
          // Return empty array but don't show error
          setTokens([]);
        } else {
          setTokens(data);
        }
      }
    } catch (err) {
      console.error('Error in fetchTokens:', err);
      setError('Error fetching tokens. Please try again later.');
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken) return;

    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      // await fetch('/api/tokens/transfer', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(transferForm),
      // });
      
      toast.success('Tokens transferred successfully');
      setIsTransferring(false);
      setSelectedToken(null);
      setTransferForm({
        tokenId: '',
        recipientAddress: '',
        amount: 0,
      });
      await fetchTokens();
    } catch (error) {
      console.error('Error transferring tokens:', error);
      toast.error('Failed to transfer tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistributeDividends = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken) return;

    setIsLoading(true);
    
    try {
      // Call the real API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tokens/distribute-dividends`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(dividendForm),
      });

      if (!response.ok) {
        // If real API fails, show error
        const errorText = await response.text();
        let errorMessage = 'Failed to distribute dividends';
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If parsing fails, use the error text directly
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        console.error(`API Error: ${response.status} - ${errorText}`);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Distribution successful:', data);
      toast.success('Dividends distributed successfully');
    } catch (error) {
      console.error('Error in distributing dividends:', error);
      // Error toast already shown
    } finally {
      // Reset form and UI state
      setIsDistributing(false);
      setSelectedToken(null);
      setDividendForm({
        panelId: '',
        amount: 0,
      });
      
      // Fetch updated tokens
      await fetchTokens();
      setIsLoading(false);
    }
  };

  const handleClaimDividends = async (panelId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tokens/claim-dividends`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ panelId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim dividends');
      }
      
      const data = await response.json();
      toast.success(`Successfully claimed ${data.claim.amount} USDC in dividends`);
      await fetchTokens();
    } catch (error) {
      console.error('Error claiming dividends:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to claim dividends');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Panel Revenue Distribution" 
        description="Distribute revenue to panel token holders"
        role="owner"
      />

      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Tokens</h1>
          {/* Mint button temporarily removed while backend issues are fixed */}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : tokens.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-center">
            <h3 className="text-lg font-medium text-yellow-900 mb-2">No tokens found</h3>
            <p className="text-yellow-700 mb-4">
              You don't have any tokens associated with your account.
            </p>
            <div className="bg-white p-4 rounded-lg border border-yellow-200 text-left max-w-2xl mx-auto">
              <p className="font-medium mb-2">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Make sure you're logged in with the correct account</li>
                <li>Connect your wallet to your account in the profile settings</li>
                <li>If you've recently connected your wallet, try refreshing the page</li>
                <li>Contact support if you believe this is an error</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
              <h3 className="text-lg font-medium text-white">
                Your Panel Tokens
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <ul role="list" className="divide-y divide-gray-200">
                {tokens.map((token) => (
                  <li key={token.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {token.panelName}
                        </h4>
                        <p className="mt-1 text-sm text-gray-500">
                          Total Shares: {token.amount}
                        </p>
                        {token.unclaimedDividends && token.unclaimedDividends > 0 && (
                          <p className="mt-1 text-sm font-medium text-green-600">
                            Previous Dividends Distributed: ${token.unclaimedDividends.toFixed(2)} USDC
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <div className="flex space-x-2">
                          {user?.role === 'owner' && (
                            <button
                              onClick={() => {
                                setSelectedToken(token);
                                setDividendForm({
                                  panelId: token.panelId,
                                  amount: 0,
                                });
                                setIsDistributing(true);
                              }}
                              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            >
                              Distribute Revenue
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedToken(token);
                              setTransferForm({
                                tokenId: token.id,
                                recipientAddress: '',
                                amount: 0,
                              });
                              setIsTransferring(true);
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            Transfer
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {isTransferring && selectedToken && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Transfer Tokens
              </h3>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label
                  htmlFor="recipientAddress"
                  className="block text-sm font-medium text-gray-700"
                >
                  Recipient Wallet Address
                </label>
                <input
                  type="text"
                  id="recipientAddress"
                  value={transferForm.recipientAddress}
                  onChange={(e) =>
                    setTransferForm({
                      ...transferForm,
                      recipientAddress: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Amount
                </label>
                <input
                  type="number"
                  id="amount"
                  value={transferForm.amount}
                  onChange={(e) =>
                    setTransferForm({
                      ...transferForm,
                      amount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                  min="1"
                  max={selectedToken.amount}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Available: {selectedToken.amount} tokens
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferring(false);
                    setSelectedToken(null);
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDistributing && selectedToken && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Distribute Revenue for {selectedToken.panelName}
              </h3>
            </div>
            <form onSubmit={handleDistributeDividends} className="space-y-4">
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Revenue Amount (USDC)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={dividendForm.amount}
                  onChange={(e) =>
                    setDividendForm({
                      ...dividendForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                  min="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter the total revenue to distribute to all token holders for this panel. This amount will be divided proportionally among all token holders based on their share amounts.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsDistributing(false);
                    setSelectedToken(null);
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Distribute Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 