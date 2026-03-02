import React, { useEffect } from 'react';
import { ProblemsProvider } from '@/context/ProblemsContext';
import { ToastProvider } from '@/components/ui/toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminPanel } from '@/pages/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
      <ProblemsProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin only routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProblemsProvider>
    </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;


