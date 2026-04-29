import { Link, useLocation } from "react-router-dom";
import { Home, Play, Flame, MessageCircle, User, Lock } from "lucide-react";
import { useAccessControl } from "@/hooks/useAccessControl";

const tabs = [
  { label: "Home", href: "/dashboard", icon: Home, lockKey: null as null | "premium" | "elite" },
  { label: "On Demand", href: "/dashboard/workouts", icon: Play, lockKey: null },
  { label: "Fuel", href: "/dashboard/nutrition", icon: Flame, lockKey: "premium" as const },
  { label: "Messages", href: "/dashboard/messages", icon: MessageCircle, lockKey: "elite" as const },
  { label: "Profile", href: "/dashboard/profile", icon: User, lockKey: null },
];

const DashboardBottomTabs = () => {
  const location = useLocation();
  const { hasPremiumAccess, hasEliteAccess } = useAccessControl();

  const isActive = (href: string) => location.pathname === href;
  const isLocked = (lockKey: typeof tabs[number]["lockKey"]) => {
    if (lockKey === "premium") return !hasPremiumAccess;
    if (lockKey === "elite") return !hasEliteAccess;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-t border-border/40 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const locked = isLocked(tab.lockKey);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-all relative min-w-0"
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-foreground rounded-full" />
              )}
              <div className="relative">
                <tab.icon
                  className={`w-[18px] h-[18px] transition-colors ${active ? "text-foreground" : "text-foreground/40"}`}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                {locked && (
                  <span
                    aria-label="Premium feature"
                    className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-amber-500/90 flex items-center justify-center ring-1 ring-background"
                  >
                    <Lock className="w-[7px] h-[7px] text-background" strokeWidth={3} />
                  </span>
                )}
              </div>
              <span
                className={`text-[8.5px] tracking-[0.08em] uppercase transition-colors truncate max-w-full ${
                  active ? "text-foreground font-bold" : "text-foreground/35 font-medium"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default DashboardBottomTabs;
