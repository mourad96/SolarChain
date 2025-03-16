'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

interface SolarPanel {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: 'active' | 'inactive' | 'maintenance';
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface BlockchainPanelDetails {
  id: string;
  name: string;
  location: string;
  capacity: string;
  owner: string;
  isActive: boolean;
  registrationDate: string;
}

// Define a more specific interface for Ethereum provider
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
    };
  }
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  walletAddress: string | null;
  createdAt: string;
}

export default function PanelsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [panels, setPanels] = useState<SolarPanel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingPanel, setIsAddingPanel] = useState(false);
  const [newPanel, setNewPanel] = useState({
    name: '',
    location: '',
    capacity: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);
  const [blockchainPanels, setBlockchainPanels] = useState<BlockchainPanelDetails[]>([]);
  const [isLoadingBlockchain, setIsLoadingBlockchain] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchPanels();
      checkWalletConnection();
      checkMetaMaskInstallation();
    }
  }, [isAuthLoading, user]);

  const checkWalletConnection = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/v1/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data: UserProfile = await response.json();
      setWalletAddress(data.walletAddress);
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    if (isConnectingWallet) {
      toast.error('Wallet connection already in progress. Please check MetaMask popup.');
      return;
    }
    
    setIsConnectingWallet(true);
    try {
      console.log('Checking for MetaMask...', window.ethereum);
      if (!window.ethereum) {
        toast.error('Please install MetaMask to connect your wallet');
        return;
      }

      console.log('Requesting accounts from MetaMask...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Accounts received:', accounts);
      const address = accounts[0];

      console.log('Sending wallet address to backend:', address);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/update-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      console.log('Backend response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to update wallet address');
      }

      const data = await response.json();
      console.log('Backend response data:', data);
      setWalletAddress(data.user.walletAddress);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      // Handle the specific MetaMask pending request error
      if (error && typeof error === 'object' && 'code' in error && error.code === -32002) {
        toast.error('MetaMask connection already pending. Please check your MetaMask popup and approve the connection request.');
        // Set up a retry after a delay
        setTimeout(() => {
          if (!walletAddress) {
            console.log('Retrying wallet connection after pending request...');
            toast.success('Retrying wallet connection...');
            connectWallet();
          }
        }, 5000); // Wait 5 seconds before retrying
      } else if (error instanceof Error) {
        toast.error(`Wallet connection error: ${error.message}`);
      } else if (typeof error === 'string') {
        toast.error(`Wallet connection error: ${error}`);
      } else {
        toast.error('Failed to connect wallet. Please try again or refresh the page.');
      }
    } finally {
      // Add a small delay before allowing another connection attempt
      setTimeout(() => {
        setIsConnectingWallet(false);
      }, 1500);
    }
  };

  const fetchPanels = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panels`, {
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
      toast.error('Failed to load solar panels');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlockchainPanels = async () => {
    try {
      setIsLoadingBlockchain(true);
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
        throw new Error('Failed to fetch blockchain panels');
      }

      const data = await response.json();
      setBlockchainPanels(data);
    } catch (error) {
      console.error('Error fetching blockchain panels:', error);
      toast.error('Failed to load blockchain data');
    } finally {
      setIsLoadingBlockchain(false);
    }
  };

  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!user) {
        throw new Error('Please log in to add a panel');
      }

      if (!walletAddress) {
        toast.error('Please connect your wallet first to register on blockchain');
        return;
      }

      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panels`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newPanel),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Failed to add panel');
      }

      toast.success('Solar panel added successfully and registered on blockchain');
      setIsAddingPanel(false);
      setNewPanel({ name: '', location: '', capacity: 0 });
      await fetchPanels();
    } catch (error) {
      console.error('Error adding panel:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add solar panel');
    } finally {
      setIsLoading(false);
    }
  };

  const checkMetaMaskInstallation = () => {
    if (typeof window !== 'undefined') {
      console.log('Checking MetaMask installation...');
      if (window.ethereum) {
        console.log('MetaMask is installed!');
        // Check if MetaMask is unlocked
        window.ethereum.request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              console.log('MetaMask is unlocked and has accounts');
            } else {
              console.log('MetaMask is locked or no accounts available');
            }
          })
          .catch((err: Error) => {
            console.error('Error checking MetaMask accounts:', err);
          });
      } else {
        console.log('MetaMask is not installed.');
        toast.error('MetaMask extension is not detected. Please install MetaMask to connect your wallet.');
      }
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please log in</h2>
          <p className="mt-2 text-gray-600">You need to be logged in to view and manage solar panels</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Solar Panels" 
        description="Manage your solar panel installations and monitor their performance"
        role="owner"
      />

      <div className="flex flex-wrap gap-4 mb-6">
        {!walletAddress ? (
          <button
            onClick={connectWallet}
            disabled={isConnectingWallet}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
          >
            {isConnectingWallet ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : 'Connect Wallet'}
          </button>
        ) : (
          <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
            <span className="font-medium mr-1">Wallet:</span> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
        )}
        <button
          onClick={() => {
            setShowBlockchainDetails(true);
            fetchBlockchainPanels();
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          View Blockchain Data
        </button>
        <button
          onClick={() => {
            if (!walletAddress) {
              toast.error('Please connect your wallet first to register panels on blockchain');
              return;
            }
            setIsAddingPanel(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Add New Panel
        </button>
      </div>

      {showBlockchainDetails && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Blockchain Panel Registry
              </h3>
              <button
                onClick={() => setShowBlockchainDetails(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {isLoadingBlockchain ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : blockchainPanels.length > 0 ? (
              <div className="mt-4">
                <table key="blockchain-table" className="min-w-full divide-y divide-gray-200">
                  <thead key="table-head" className="bg-gray-50">
                    <tr key="header-row">
                      <th key="header-id" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th key="header-name" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th key="header-location" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th key="header-capacity" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                      <th key="header-owner" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                      <th key="header-status" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th key="header-date" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody key="table-body" className="bg-white divide-y divide-gray-200">
                    {blockchainPanels.map((panel, index) => (
                      <tr key={`row-${panel.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                        <td key={`id-${panel.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{panel.id}</td>
                        <td key={`name-${panel.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{panel.name}</td>
                        <td key={`location-${panel.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{panel.location}</td>
                        <td key={`capacity-${panel.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                            {panel.capacity} W
                          </span>
                        </td>
                        <td key={`owner-${panel.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {typeof panel.owner === 'string' ? `${panel.owner.slice(0, 6)}...${panel.owner.slice(-4)}` : 'Unknown'}
                        </td>
                        <td key={`status-cell-${panel.id}`} className="px-6 py-4 whitespace-nowrap">
                          <span key={`status-${panel.id}`} className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            panel.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {panel.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td key={`date-${panel.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(panel.registrationDate).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No panels found on the blockchain.</p>
                <p className="text-sm text-gray-400 mt-2">
                  This could be because no panels have been registered on the blockchain yet, 
                  or because the blockchain connection is not properly configured.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : panels.length > 0 ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
            <h3 className="text-lg font-medium text-white">
              Your Solar Panels
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {panels.map((panel) => (
              <li key={panel.id} className="hover:bg-gray-50 transition-colors">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900 truncate">{panel.name}</p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p key={`status-${panel.id}`} className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        panel.status === 'active' ? 'bg-green-100 text-green-800' : 
                        panel.status === 'inactive' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {panel.status.charAt(0).toUpperCase() + panel.status.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex items-center space-x-6">
                      <p key={`location-text-${panel.id}`} className="flex items-center text-sm text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">{panel.location}</span>
                      </p>
                      <p key={`capacity-text-${panel.id}`} className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        <span className="bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">{panel.capacity} W</span>
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <p key={`date-text-${panel.id}`}>Added on {new Date(panel.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
            <h3 className="text-lg font-medium text-white">
              Your Solar Panels
            </h3>
          </div>
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-4 text-gray-500">No solar panels found.</p>
            <p className="mt-1 text-sm text-gray-400">Get started by adding your first solar panel.</p>
            <button
              onClick={() => {
                if (!walletAddress) {
                  toast.error('Please connect your wallet first to register panels on blockchain');
                  return;
                }
                setIsAddingPanel(true);
              }}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Add New Panel
            </button>
          </div>
        </div>
      )}

      {isAddingPanel && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Solar Panel</h3>
              <button
                onClick={() => setIsAddingPanel(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddPanel}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Panel Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newPanel.name}
                    onChange={(e) => setNewPanel({ ...newPanel, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={newPanel.location}
                    onChange={(e) => setNewPanel({ ...newPanel, location: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                    Capacity (W)
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    value={newPanel.capacity}
                    onChange={(e) => setNewPanel({ ...newPanel, capacity: Number(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    min="0"
                    required
                  />
                </div>
                <div className="bg-yellow-50 p-3 rounded-md">
                  <p className="text-sm text-yellow-700">
                    This panel will be registered on the blockchain using your connected wallet: 
                    <span className="font-medium"> {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                  </p>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="submit"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </div>
                  ) : 'Add Panel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 