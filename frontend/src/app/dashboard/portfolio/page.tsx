'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
// Remove the ShareToken__factory import and add minimal ABI
const SHARE_TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

interface Panel {
  id: string;
  name: string;
  location: string;
  capacity: string;
  minInvestment: string;
  expectedROI: string;
  progress: number;
  owner?: string;
  blockchainData?: {
    tokenId: string;
    totalSupply: string;
    availableSupply: string;
    isMockData?: boolean;
    shareTokenAddress?: string;
  } | null;
  isMockData?: boolean;
  mockDataFields?: string[];
  isBlockchainVerified?: boolean;
  totalShares?: string;
  blockchainPanelId?: string;
  unclaimedDividends?: string;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const checkMetaMaskConnection = async () => {
      try {
        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined') {
          // Request account access
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length > 0) {
            setUserAddress(accounts[0]);
          }
        } else {
          toast.error('Please install MetaMask to view your portfolio');
        }
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        toast.error('Failed to connect to MetaMask');
      }
    };

    checkMetaMaskConnection();
  }, []);

  useEffect(() => {
    const fetchPanelsAndDividends = async () => {
      if (!userAddress) return;

      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Fetch panels
        const panelsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panels/blockchain/all`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!panelsResponse.ok) {
          throw new Error('Failed to fetch panels');
        }

        const panelsData = await panelsResponse.json();
        console.log('Panels data:', panelsData);

        // Fetch unclaimed dividends
        const dividendsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tokens/unclaimed-dividends`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!dividendsResponse.ok) {
          throw new Error('Failed to fetch unclaimed dividends');
        }

        const dividendsData = await dividendsResponse.json();
        console.log('Dividends data:', dividendsData);

        // Merge panels with their unclaimed dividends
        const panelsWithDividends = panelsData.map((panel: Panel) => {
          console.log('Processing panel:', {
            panelId: panel.id,
            blockchainPanelId: panel.blockchainPanelId
          });
          
          // Find matching dividend info by checking all possible ID matches
          const dividendInfo = dividendsData.find(
            (d: any) => {
              const panelMatch = d.panelId === panel.id;
              const blockchainMatch = (panel.blockchainPanelId && d.blockchainPanelId === panel.blockchainPanelId) ||
                                    (panel.id === d.blockchainPanelId); // Add this condition
              
              console.log('Comparing dividend:', {
                dividendPanelId: d.panelId,
                dividendBlockchainPanelId: d.blockchainPanelId,
                panelId: panel.id,
                panelBlockchainId: panel.blockchainPanelId,
                panelMatch,
                blockchainMatch,
                matchType: panelMatch ? 'panel ID match' : 
                          blockchainMatch ? 'blockchain ID match' : 
                          'no match'
              });
              
              return panelMatch || blockchainMatch;
            }
          );
          
          console.log('Found dividend info for panel:', {
            panelId: panel.id,
            dividendInfo: dividendInfo ? {
              unclaimedAmount: dividendInfo.unclaimedAmount,
              matchedWith: {
                panelId: dividendInfo.panelId,
                blockchainPanelId: dividendInfo.blockchainPanelId
              }
            } : 'no dividend info found'
          });
          
          return {
            ...panel,
            unclaimedDividends: dividendInfo?.unclaimedAmount || '0'
          };
        });

        // Process the data to identify mock fields and filter by token holders
        const processedData = await Promise.all(panelsWithDividends.map(async (panel: Panel) => {
          console.log('Processing panel:', panel);
          console.log('Blockchain data:', panel.blockchainData);
          
          // Check if panel has blockchain data and share token address
          const hasRealBlockchainData = panel.blockchainData && !panel.blockchainData.isMockData;
          const shareTokenAddress = panel.blockchainData?.shareTokenAddress;
          
          if (hasRealBlockchainData && shareTokenAddress) {
            try {
              // Create provider and contract instance
              const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
              const shareToken = new ethers.Contract(shareTokenAddress, SHARE_TOKEN_ABI, provider);

              // Get user's balance
              const balance = await shareToken.balanceOf(userAddress);
              console.log('User balance:', balance.toString());

              if (balance.toString() === '0') {
                return null; // Skip this panel if user has no balance
              }

              return {
                ...panel,
                isMockData: false,
                isBlockchainVerified: true,
                mockDataFields: [] // Clear any mock data fields
              };
            } catch (error) {
              console.error('Error checking token balance:', error);
              return null;
            }
          }
          
          // For mock data or panels without blockchain data
          return {
            ...panel,
            isMockData: true,
            mockDataFields: ['minimum investment', 'expected ROI', 'progress', 'owner'],
          };
        }));
        
        // Filter out null values (panels where user is not a holder)
        const filteredPanels = processedData.filter(panel => panel !== null);
        console.log('Filtered panels:', filteredPanels);
        setPanels(filteredPanels);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load portfolio data');
      } finally {
        setIsLoading(false);
      }
    };

    if (userAddress) {
      fetchPanelsAndDividends();
    }
  }, [userAddress]);

  const handleClaimDividends = async (panelId: string) => {
    try {
      setIsClaiming(true);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        toast.error('Please install MetaMask to claim dividends');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tokens/claim-dividends`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ panelId: panelId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim dividends');
      }
      
      const data = await response.json();

      // Execute claim transaction
      const claimTx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: data.transactions.claim.to,
          data: data.transactions.claim.data,
          value: data.transactions.claim.value || '0x0'
        }]
      });

      console.log('Claim transaction sent:', claimTx);
      toast.success('Claiming dividends...');

      // Wait for claim transaction to be mined
      await new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          if (!window.ethereum) {
            clearInterval(checkInterval);
            resolve(null);
            return;
          }
          const receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [claimTx]
          });
          if (receipt) {
            clearInterval(checkInterval);
            resolve(receipt);
          }
        }, 1000);
      });

      toast.success('Successfully claimed dividends!');
      
      // Refresh the panels data after claiming
      if (userAddress) {
        const fetchPanels = async () => {
          try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
              throw new Error('No authentication token found');
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panels/blockchain/all`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Failed to fetch panels');
            }

            const data = await response.json();
            setPanels(data);
          } catch (error) {
            console.error('Error fetching panels:', error);
            toast.error('Failed to refresh panel data');
          } finally {
    setIsLoading(false);
          }
        };
        await fetchPanels();
      }
    } catch (error) {
      console.error('Error claiming dividends:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to claim dividends');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <DashboardLayout role="investor">
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
        <div>
            <h2 className="text-2xl font-bold text-gray-900">My Portfolio</h2>
          <p className="mt-1 text-sm text-gray-500">
              View and manage your solar energy investments
            </p>
          </div>
        </div>

        {!userAddress ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Please connect your MetaMask wallet to view your portfolio</p>
            <button
              onClick={() => window.ethereum?.request({ method: 'eth_requestAccounts' })}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Connect MetaMask
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : panels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">You don't have any investments yet</p>
            <Link
              href="/dashboard/projects"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Projects
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {panels.map((panel) => (
              <div
                key={panel.id}
                className="overflow-hidden rounded-lg bg-white shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900">{panel.name}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">{panel.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Capacity</p>
                      <p className="font-medium text-gray-900">{panel.capacity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Min. Investment</p>
                      <p className="font-medium text-gray-900">
                        {panel.minInvestment}
                        {panel.mockDataFields?.includes('minimum investment') && (
                          <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expected ROI</p>
                      <p className="font-medium text-green-600">
                        {panel.expectedROI}
                        {panel.mockDataFields?.includes('expected ROI') && (
                          <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock)</span>
                        )}
                      </p>
                    </div>
                    {panel.owner && (
                      <div>
                        <p className="text-gray-500">Owner</p>
                        <p className="font-medium text-gray-900">
                          {panel.owner}
                          {panel.mockDataFields?.includes('owner') && (
                            <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock)</span>
                          )}
                        </p>
                      </div>
                    )}
                    {/* Show either mock data warning or blockchain verified badge */}
                    <div className="col-span-2 mt-2">
                      {panel.isBlockchainVerified ? (
                        <p className="text-sm bg-green-100 text-green-800 p-2 rounded-md font-medium">
                          ✓ Blockchain verified data
                        </p>
                      ) : (
                        <p className="text-sm bg-red-100 text-red-800 p-2 rounded-md font-bold">
                          ⚠️ MOCK DATA INDICATOR - This should be visible
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Funding Progress</span>
                      <span className="font-medium text-gray-900">
                        {panel.blockchainData ? (
                          <>
                            {Math.round(
                              ((parseInt(panel.blockchainData.totalSupply) - parseInt(panel.blockchainData.availableSupply)) /
                                parseInt(panel.blockchainData.totalSupply)) *
                                100
                            )}%
                          </>
                        ) : (
                          <>
                            {panel.progress}%
                            {panel.mockDataFields?.includes('progress') && (
                              <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">(mock)</span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{
                          width: `${
                            panel.blockchainData
                              ? Math.round(
                                  ((parseInt(panel.blockchainData.totalSupply) - parseInt(panel.blockchainData.availableSupply)) /
                                    parseInt(panel.blockchainData.totalSupply)) *
                                    100
                                )
                              : panel.progress
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 bg-green-50 p-4 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">Unclaimed Dividends</span>
                      {(() => {
                        console.log('Raw unclaimed dividends value:', {
                          panelId: panel.id,
                          blockchainPanelId: panel.blockchainPanelId,
                          unclaimedDividends: panel.unclaimedDividends,
                          unclaimedDividendsNumber: Number(panel.unclaimedDividends || '0')
                        });
                        return null;
                      })()}
                      <span className="text-sm font-bold text-green-800">
                        {(Number(panel.unclaimedDividends || '0') / 1e6).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} USDC
                      </span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => handleClaimDividends(panel.blockchainPanelId || panel.id)}
                      disabled={isClaiming || parseFloat(panel.unclaimedDividends || '0') <= 0}
                      className={`block w-full rounded-lg px-4 py-2 text-center text-sm font-medium text-white ${
                        isClaiming 
                          ? 'bg-gray-400 cursor-not-allowed'
                          : parseFloat(panel.unclaimedDividends || '0') <= 0
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isClaiming ? 'Claiming...' : parseFloat(panel.unclaimedDividends || '0') <= 0 ? 'No Dividends to Claim' : 'Claim Dividends'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 