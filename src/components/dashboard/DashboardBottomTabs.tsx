import { Link, useLocation } from "react-router-dom";
import { Home, Play, Flame, User } from "lucide-react";

const tabs = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "On Demand", href: "/dashboard/workouts", icon: Play },
  { label: "Fuel", href: "/dashboard/nutrition", icon: Flame },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

const DashboardBottomTabs = () => {
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-t border-border/40 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
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
                className={`w-5 h-5 transition-colors ${active ? "text-foreground" : "text-foreground/40"}`}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span
                className={`text-[9px] tracking-[0.1em] uppercase transition-colors ${
                  active ? "text-foreground font-bold" : "text-foreground/35 font-medium"
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
