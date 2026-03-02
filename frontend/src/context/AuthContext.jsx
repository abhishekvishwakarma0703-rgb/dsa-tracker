/**
 * Authentication Context
 * Place at: src/contexts/AuthContext.jsx
 * Manages authentication state globally
 */

import React, { createContext, useState, useEffect } from 'react';
import api from '../services/apiClient';
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if logged in on mount
  useEffect(() => {
    const storedUser = api.getUser();
    if (storedUser && api.isAuthenticated()) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const register = async (username, email, password, fullName) => {
    try {
      setIsLoading(true);
      const response = await api.register(username, email, password, fullName);
      setUser(response.user);
      setIsAuthenticated(true);
      setError(null);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      const response = await api.login(username, password);
      setUser(response.user);
      setIsAuthenticated(true);
      setError(null);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    api.logout();
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await api.getCurrentUser();
      setUser(updatedUser);
      api.setUser(updatedUser);
    } catch (err) {
      console.error('Failed to refresh user:', err);
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        register,
        login,
        logout,
        refreshUser,
        isAdmin: user?.is_admin || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
