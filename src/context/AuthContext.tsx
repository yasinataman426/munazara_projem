import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, DebaterStatus } from '../types';
import { Database } from '../database/database';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
  register: (
    username: string, 
    fullName: string, 
    phoneNumber: string, 
    email: string, 
    password: string,
    city: string, 
    age: number, 
    school: string, 
    role: UserRole, 
    status: DebaterStatus
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = Database.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    // Simulate minor network latency for premium feel (spinner etc.)
    await new Promise(resolve => setTimeout(resolve, 800));
    const result = Database.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    setLoading(false);
    return { success: result.success, message: result.message };
  };

  const register = async (
    username: string, 
    fullName: string, 
    phoneNumber: string, 
    email: string, 
    password: string,
    city: string, 
    age: number, 
    school: string, 
    role: UserRole, 
    status: DebaterStatus
  ) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const result = Database.register(
      username, 
      fullName, 
      phoneNumber, 
      email, 
      password,
      city, 
      age, 
      school, 
      role, 
      status
    );
    if (result.success && result.user) {
      // Automatically log in on success
      Database.login(email, password);
      setUser(result.user);
    }
    setLoading(false);
    return { success: result.success, message: result.message };
  };

  const logout = () => {
    Database.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
