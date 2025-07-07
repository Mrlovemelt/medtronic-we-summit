"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminPanel } from '@/components/AdminPanel/index';
import Layout from '@/components/Layout';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for simple admin authentication
    const adminAuth = localStorage.getItem('adminAuthenticated');
    
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    } else {
      // Redirect to admin login
      router.push('/admin/login');
    }
    
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-96">Access denied</div>;
  }

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    router.push('/admin/login');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Response Moderation
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Review and moderate survey responses to ensure appropriate content for
              visualization.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>

        <AdminPanel />
      </div>
    </Layout>
  );
} 