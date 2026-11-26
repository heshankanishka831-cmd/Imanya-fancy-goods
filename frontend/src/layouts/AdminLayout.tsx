import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/shared/Sidebar';
import { AdminHeader } from '../components/shared/AdminHeader';

export const AdminLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden bg-slate-50/70 font-sans print:h-auto print:overflow-visible">
      {/* Permanently Fixed Left Sidebar (position: fixed, top: 0, left: 0, w-64, h-screen/100dvh, z-40) */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Right Content Shell: Left margin matches sidebar width (md:ml-64 = 16rem = 256px) so it never overlaps */}
      <div className="flex flex-col h-full min-w-0 md:ml-64 print:ml-0 print:h-auto">
        <AdminHeader
          title="Administration Portal"
          subtitle="Operations, Procurement & Stock Management"
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />
        {/* Only the main content area scrolls vertically */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 print:overflow-visible print:p-0">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
