import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardMobileNav from "./DashboardMobileNav";
import DashboardBottomTabs from "./DashboardBottomTabs";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex overflow-x-hidden w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <DashboardSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden">
          <DashboardMobileNav />
        </div>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-6 overflow-auto pb-24 lg:pb-6 min-h-0">
          {children}
        </main>

        {/* Mobile bottom tabs */}
        <DashboardBottomTabs />
      </div>
    </div>
  );
};

export default DashboardLayout;
