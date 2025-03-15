import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

// For UI demo purposes, we'll create a mock user
const createMockUser = (role: 'owner' | 'investor' = 'owner'): User => ({
  id: '123456',
  name: role === 'owner' ? 'John Owner' : 'Jane Investor',
  email: role === 'owner' ? 'owner@example.com' : 'investor@example.com',
  role: role,
});

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });
  const router = useRouter();

  useEffect(() => {
    // Check if we have a role stored in localStorage
    const storedRole = localStorage.getItem('userRole') as 'owner' | 'investor' | null;
    
    // For UI demo, we'll always have a user after a short delay
    setTimeout(() => {
      setState({
        user: storedRole ? createMockUser(storedRole) : null,
        isLoading: false,
        error: null,
      });
    }, 500);
  }, []);

  const login = async (data: LoginData, role: 'owner' | 'investor' = 'owner') => {
    try {
      // For UI demo, we'll just create a mock user
      localStorage.setItem('userRole', role);
      
      setState({
        user: createMockUser(role),
        isLoading: false,
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const register = async (data: RegisterData, role: 'owner' | 'investor' = 'owner') => {
    try {
      // For UI demo, we'll just create a mock user
      localStorage.setItem('userRole', role);
      
      setState({
        user: createMockUser(role),
        isLoading: false,
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      throw new Error('Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('userRole');
    setState({
      user: null,
      isLoading: false,
      error: null,
    });
    router.push('/');
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