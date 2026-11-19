import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/shared/Sidebar';
import { AdminHeader } from '../components/shared/AdminHeader';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader title="Administration Portal" subtitle="Operations, Procurement & Stock Management" />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
