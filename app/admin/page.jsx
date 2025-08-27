'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const demoMode = localStorage.getItem('demoMode');
      
      if (token || demoMode === 'true') {
        setIsAuthenticated(true);
        // Redirect to the static admin dashboard
        window.location.href = '/admin/dashboard.html';
      } else {
        // Redirect to login
        window.location.href = '/admin/login.html';
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Redirecting to Admin Panel</h1>
        <p className="mt-2 text-gray-600">Please wait while we redirect you...</p>
      </div>
    </div>
  );
}