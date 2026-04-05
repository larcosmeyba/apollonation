import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Dumbbell, BookOpen, Apple, User } from "lucide-react";

const tabs = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workouts", href: "/dashboard/workouts", icon: Dumbbell },
  { label: "Programs", href: "/dashboard/training", icon: BookOpen },
  { label: "Nutrition", href: "/dashboard/nutrition", icon: Apple },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

const DashboardBottomTabs = () => {
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-t border-border/50 lg:hidden">
      <div className="flex items-center justify-around h-14 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all relative"
            >
              {active && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-0.5 bg-foreground rounded-full" />
              )}
              <tab.icon className={`w-[18px] h-[18px] transition-colors ${active ? "text-foreground" : "text-muted-foreground/60"}`} strokeWidth={active ? 2 : 1.5} />
              <span className={`text-[9px] tracking-wider uppercase transition-colors ${active ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default DashboardBottomTabs;
