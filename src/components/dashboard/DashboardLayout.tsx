import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardMobileNav from "./DashboardMobileNav";
import DashboardBottomTabs from "./DashboardBottomTabs";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden w-full">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <DashboardSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile top bar - simplified */}
        <div className="lg:hidden">
          <DashboardMobileNav />
        </div>

        {/* Page content - extra bottom padding on mobile for tab bar */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto pb-24 lg:pb-8 min-h-0">{children}</main>

        {/* Mobile bottom tabs */}
        <DashboardBottomTabs />
      </div>
    </div>
  );
};

export default DashboardLayout;
