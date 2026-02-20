import React, { useEffect } from 'react';
import { ProblemsProvider } from '@/context/ProblemsContext';
import { ToastProvider } from '@/components/ui/toast';
import { ProblemsPage } from '@/pages/ProblemsPage';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  return (
    <ToastProvider>
      <ProblemsProvider>
        <ProblemsPage />
      </ProblemsProvider>
    </ToastProvider>
  );
}

export default App;
