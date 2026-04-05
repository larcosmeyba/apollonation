import { Link, useLocation } from "react-router-dom";
import { Home, Dumbbell, Flame, Play, User } from "lucide-react";

const tabs = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Train", href: "/dashboard/training", icon: Dumbbell },
  { label: "Fuel", href: "/dashboard/nutrition", icon: Flame },
  { label: "On Demand", href: "/dashboard/workouts", icon: Play },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

const DashboardBottomTabs = () => {
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-border/30 lg:hidden">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-all relative"
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-foreground rounded-full" />
              )}
              <tab.icon
                className={`w-5 h-5 transition-colors ${active ? "text-foreground" : "text-foreground/30"}`}
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={`text-[9px] tracking-[0.1em] uppercase transition-colors ${
                  active ? "text-foreground font-medium" : "text-foreground/25"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default DashboardBottomTabs;
