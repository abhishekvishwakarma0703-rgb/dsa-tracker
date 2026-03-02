/**
 * useAuth Hook
 * Place at: src/hooks/useAuth.js
 * Use authentication anywhere in your app
 */

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
