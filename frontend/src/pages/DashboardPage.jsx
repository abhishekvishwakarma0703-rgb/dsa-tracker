import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ProblemsPage } from './ProblemsPage';

export function DashboardPage() {
  const { user, logout, isAdmin } = useAuth();

  // We simply return the ProblemsPage. 
  // The ProblemsPage logic should handle the data fetching via its Context.
  return <ProblemsPage user={user} logout={logout} isAdmin={isAdmin} />;
}