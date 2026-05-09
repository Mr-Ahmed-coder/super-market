import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TopNavbar from './TopNavbar.jsx';

function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="dashboard-main">
        <TopNavbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
