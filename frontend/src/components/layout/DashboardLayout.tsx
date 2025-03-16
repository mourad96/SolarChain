'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';

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

interface DashboardLayoutProps {
  children: ReactNode;
  role: 'owner' | 'investor';
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthContext();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  const ownerNavItems = [
    { name: 'Overview', href: '/dashboard/owner' },
    { name: 'Solar Panels', href: '/dashboard/panels' },
    { name: 'Dividends', href: '/dashboard/tokens' },
    { name: 'IoT Data', href: '/dashboard/iot' },
  ];

  const investorNavItems = [
    { name: 'Overview', href: '/dashboard/investor' },
    { name: 'Projects', href: '/dashboard/projects' },
    { name: 'Portfolio', href: '/dashboard/portfolio' },
  ];

  const navItems = role === 'owner' ? ownerNavItems : investorNavItems;

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
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
      if (!window.ethereum) {
        toast.error('Please install MetaMask to connect your wallet');
        setIsConnectingWallet(false);
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        setIsConnectingWallet(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/update-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!response.ok) {
        throw new Error('Failed to update wallet address');
      }

      const data = await response.json();
      setWalletAddress(data.user.walletAddress);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === -32002) {
        toast.error('MetaMask connection already pending. Please check your MetaMask popup.');
      } else if (error instanceof Error) {
        toast.error(`Wallet connection error: ${error.message}`);
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    } finally {
      setTimeout(() => {
        setIsConnectingWallet(false);
      }, 1500);
    }
  };

  const handleLogout = () => {
    // Clear tokens and wallet address
    localStorage.removeItem('token');
    localStorage.removeItem('walletAddress');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Show success message
    toast.success('Logged out successfully');
    
    // Use direct navigation to prevent redirect loops
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b">
          <Link href="/" className="text-xl font-bold text-blue-600">
            IOFY
          </Link>
        </div>
        <nav className="mt-5 px-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`mb-1 flex items-center rounded-lg px-4 py-2 text-sm font-medium ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="ml-64">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-8">
          <h1 className="text-xl font-semibold text-gray-900">
            {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            {!walletAddress ? (
              <button 
                onClick={connectWallet}
                disabled={isConnectingWallet}
                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
              >
                {isConnectingWallet ? (
                  <>
                    <span className="inline-block mr-1">Connecting...</span>
                  </>
                ) : 'Connect Wallet'}
              </button>
            ) : (
              <div className="text-sm text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            )}
            <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Profile
            </button>
            <button 
              onClick={handleLogout}
              className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
} 