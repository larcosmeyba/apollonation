import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import {
  Home, Dumbbell, User, LogOut, Shield, Flame, Play,
  Calendar, BookOpen, Heart, ImageIcon,
} from "lucide-react";

const DashboardSidebar = () => {
  const { profile, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const location = useLocation();

  const mainNav = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Train", href: "/dashboard/training", icon: Dumbbell },
    { label: "Fuel", href: "/dashboard/nutrition", icon: Flame },
    { label: "On Demand", href: "/dashboard/workouts", icon: Play },
    { label: "Profile", href: "/dashboard/profile", icon: User },
  ];

  const secondaryNav = [
    { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
    { label: "Recipes", href: "/dashboard/recipes", icon: BookOpen },
    { label: "Transformation", href: "/dashboard/transformation", icon: ImageIcon },
    { label: "Recovery", href: "/dashboard/recovery", icon: Heart },
    { label: "Challenges", href: "/dashboard/challenges", icon: Dumbbell },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <aside className="w-52 bg-background border-r border-border/20 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6">
        <Link to="/dashboard">
          <span className="text-[10px] font-bold tracking-[0.3em] text-foreground/90 uppercase">
            Apollo Nation
          </span>
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px] ${
              isActive(item.href)
                ? "bg-foreground/8 text-foreground"
                : "text-foreground/40 hover:text-foreground hover:bg-foreground/5"
            }`}
          >
            <item.icon className="w-4 h-4" strokeWidth={1.5} />
            <span className="tracking-wide">{item.label}</span>
          </Link>
        ))}

        <div className="h-px bg-border/15 my-3" />

        <p className="px-3 text-[9px] text-foreground/20 uppercase tracking-[0.2em] mb-2">More</p>
        {secondaryNav.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[12px] ${
              isActive(item.href)
                ? "bg-foreground/8 text-foreground"
                : "text-foreground/30 hover:text-foreground hover:bg-foreground/5"
            }`}
          >
            <item.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="tracking-wide">{item.label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="h-px bg-border/15 my-3" />
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px] ${
                location.pathname === "/admin"
                  ? "bg-foreground/8 text-foreground"
                  : "text-foreground/30 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <Shield className="w-4 h-4" strokeWidth={1.5} />
              <span className="tracking-wide">Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/15">
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-lg text-foreground/30 hover:text-foreground hover:bg-foreground/5 transition-all text-[12px]"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
