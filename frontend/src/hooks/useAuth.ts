import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface User {
  id: string;
  name: string;
  email: string;
  walletAddress?: string;
  role: 'owner' | 'investor';
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
    // Check if we have a token in localStorage
    const token = localStorage.getItem('token') || Cookies.get('token');
    
    if (!token) {
      setState({
        user: null,
        isLoading: false,
        error: null,
      });
      return;
    }
    
    // Fetch user data with the token
    const fetchUser = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setState({
            user: data.user,
            isLoading: false,
            error: null,
          });
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          Cookies.remove('token');
          setState({
            user: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Clear token on error to prevent redirect loops
        localStorage.removeItem('token');
        Cookies.remove('token');
        setState({
          user: null,
          isLoading: false,
          error: 'Failed to authenticate',
        });
      }
    };
    
    fetchUser();
  }, []);

  const login = async (data: LoginData, role: 'owner' | 'investor' = 'owner') => {
    try {
      setState({
        ...state,
        isLoading: true,
        error: null,
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, role }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        setState({
          ...state,
          isLoading: false,
          error: responseData.error || 'Login failed',
        });
        throw new Error(responseData.error || 'Invalid credentials');
      }
      
      // Store token in localStorage and cookies with secure settings
      localStorage.setItem('token', responseData.token);
      Cookies.set('token', responseData.token, { 
        expires: 1, 
        sameSite: 'strict',
        secure: window.location.protocol === 'https:'
      });
      
      setState({
        user: responseData.user,
        isLoading: false,
        error: null,
      });
      
      // Delay navigation slightly to allow state to update
      setTimeout(() => {
        // Use direct navigation to avoid middleware issues
        window.location.href = role === 'investor' ? '/dashboard/investor' : '/dashboard/owner';
      }, 100);
      
      return { success: true };
    } catch (error) {
      // Clear tokens on error to prevent redirect loops
      localStorage.removeItem('token');
      Cookies.remove('token');
      
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  };

  const register = async (data: RegisterData, role: 'owner' | 'investor' = 'owner') => {
    try {
      setState({
        ...state,
        isLoading: true,
        error: null,
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, role }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        setState({
          ...state,
          isLoading: false,
          error: responseData.error || 'Registration failed',
        });
        throw new Error(responseData.error || 'Registration failed');
      }
      
      // Store token in localStorage and cookies with secure settings
      localStorage.setItem('token', responseData.token);
      Cookies.set('token', responseData.token, { 
        expires: 1, 
        sameSite: 'strict',
        secure: window.location.protocol === 'https:'
      });
      
      setState({
        user: responseData.user,
        isLoading: false,
        error: null,
      });
      
      // Delay navigation slightly to allow state to update
      setTimeout(() => {
        // Use direct navigation to avoid middleware issues
        window.location.href = role === 'investor' ? '/dashboard/investor' : '/dashboard/owner';
      }, 100);
      
      return { success: true };
    } catch (error) {
      // Clear tokens on error to prevent redirect loops
      localStorage.removeItem('token');
      Cookies.remove('token');
      
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('walletAddress');
    Cookies.remove('token');
    setState({
      user: null,
      isLoading: false,
      error: null,
    });
    // Use direct navigation for logout to avoid redirect loops
    window.location.href = '/';
  };

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,
    register,
    logout,
  };
} 