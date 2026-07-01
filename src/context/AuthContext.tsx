import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, DebaterStatus } from '../types';
import { Database, mapAuthUserToUser } from '../database/database';
import { supabase } from '../database/supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message: string; code?: string }>;
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
  ) => Promise<{ success: boolean; message: string; code?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? mapAuthUserToUser(session.user) : null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapAuthUserToUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const result = await Database.login(email, password);
    setLoading(false);
    return { success: result.success, message: result.message, code: result.code };
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
    const result = await Database.register(
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
    setLoading(false);
    return { success: result.success, message: result.message, code: result.code };
  };

  const logout = async () => {
    await Database.logout();
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
