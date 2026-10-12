import React, { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SosAlertBanner from "./SosAlertBanner";

const Layout = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex font-sans">
      {/* Sidebar on the Left - Full Height */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area - Right Side */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <SosAlertBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
