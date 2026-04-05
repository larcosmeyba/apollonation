import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardMobileNav from "./DashboardMobileNav";
import DashboardBottomTabs from "./DashboardBottomTabs";
import SupportChatbot from "./SupportChatbot";

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

        {/* Page content — generous padding, refined spacing */}
        <main className="flex-1 px-5 py-6 lg:px-10 lg:py-8 overflow-auto pb-24 lg:pb-8 min-h-0">{children}</main>

        {/* Mobile bottom tabs */}
        <DashboardBottomTabs />
      </div>

      {/* Support Chatbot */}
      <SupportChatbot />
    </div>
  );
};

export default DashboardLayout;
