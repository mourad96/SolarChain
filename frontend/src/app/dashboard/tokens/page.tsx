'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface Token {
  id: string;
  panelId: string;
  panelName: string;
  amount: number;
  mintedAt: string;
  owner: string;
}

interface TransferForm {
  tokenId: string;
  recipientAddress: string;
  amount: number;
}

export default function TokensPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [transferForm, setTransferForm] = useState<TransferForm>({
    tokenId: '',
    recipientAddress: '',
    amount: 0,
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/tokens');
      // const data = await response.json();
      
      // Temporary mock data
      setTokens([
        {
          id: '1',
          panelId: '1',
          panelName: 'Rooftop Panel 1',
          amount: 1000,
          mintedAt: '2024-03-20T10:30:00Z',
          owner: user?.walletAddress || '',
        },
        {
          id: '2',
          panelId: '2',
          panelName: 'Backyard Panel 1',
          amount: 500,
          mintedAt: '2024-03-20T09:15:00Z',
          owner: user?.walletAddress || '',
        },
      ]);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load energy tokens');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Energy Tokens</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and transfer your energy tokens
          </p>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Your Token Holdings
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {tokens.map((token) => (
              <li key={token.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {token.panelName} Tokens
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Minted: {new Date(token.mintedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-medium text-gray-900">
                        {token.amount} Tokens
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedToken(token);
                        setTransferForm({
                          ...transferForm,
                          tokenId: token.id,
                        });
                        setIsTransferring(true);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isTransferring && selectedToken && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Transfer Tokens
            </h3>
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                  min="1"
                  max={selectedToken.amount}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Available: {selectedToken.amount} tokens
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferring(false);
                    setSelectedToken(null);
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 