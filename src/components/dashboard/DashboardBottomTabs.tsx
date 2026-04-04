import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Dumbbell, BookOpen, Apple, User } from "lucide-react";

const tabs = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, color: "text-[hsl(210,100%,52%)]" },
  { label: "Workouts", href: "/dashboard/workouts", icon: Dumbbell, color: "text-[hsl(0,72%,51%)]" },
  { label: "Programs", href: "/dashboard/training", icon: BookOpen, color: "text-[hsl(280,65%,60%)]" },
  { label: "Nutrition", href: "/dashboard/nutrition", icon: Apple, color: "text-[hsl(25,95%,53%)]" },
  { label: "Profile", href: "/dashboard/profile", icon: User, color: "text-[hsl(142,71%,45%)]" },
];

const DashboardBottomTabs = () => {
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors relative"
            >
              <tab.icon className={`w-5 h-5 ${active ? tab.color : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-white" : "text-muted-foreground"}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iPhone notch */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default DashboardBottomTabs;
