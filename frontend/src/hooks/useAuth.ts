import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  walletAddress?: string;
  role: 'user' | 'admin';
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData extends LoginData {
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setState({
        user: response.data.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        error: 'Failed to authenticate',
      });
      localStorage.removeItem('token');
    }
  };

  const login = async (data: LoginData) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, data);
      localStorage.setItem('token', response.data.token);
      setState({
        user: response.data.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, data);
      localStorage.setItem('token', response.data.token);
      setState({
        user: response.data.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setState({
      user: null,
      isLoading: false,
      error: null,
    });
    router.push('/auth/login');
  };

  const connectWallet = async (address: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !state.user) throw new Error('Not authenticated');

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/connect-wallet`,
        { address },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setState({
        user: response.data.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      throw new Error('Failed to connect wallet');
    }
  };

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,
    register,
    logout,
    connectWallet,
  };
} 