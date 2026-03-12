import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import {
  LayoutDashboard, Dumbbell, User, LogOut, Lock, Shield,
  MessageSquare, Apple, Play, Camera, Calendar, BookOpen,
} from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import apolloLogo from "@/assets/apollo-logo.png";

const DashboardSidebar = () => {
  const { profile, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const location = useLocation();
  const { unreadCount } = useMessages();
  const isElite = profile?.subscription_tier === "elite";

  const navItems = [
    { label: "Today", href: "/dashboard", icon: LayoutDashboard, locked: false },
    { label: "Train", href: "/dashboard/training", icon: Dumbbell, locked: false },
    { label: "Inbox", href: "/dashboard/messages", icon: MessageSquare, locked: false, badge: unreadCount > 0 ? unreadCount : undefined },
    { label: "Nutrition", href: "/dashboard/nutrition", icon: Apple, locked: false },
    { label: "On Demand", href: "/dashboard/workouts", icon: Play, locked: false },
    { label: "Calendar", href: "/dashboard/calendar", icon: Calendar, locked: false },
    { label: "Recipes", href: "/dashboard/recipes", icon: BookOpen, locked: false },
    { label: "Macro Tracker", href: "/dashboard/macros", icon: Camera, locked: !isElite, tier: "Elite" },
    { label: "Profile", href: "/dashboard/profile", icon: User, locked: false },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r border-border/30" style={{ background: '#0F0F0E' }}>
      {/* Logo */}
      <div className="p-6 border-b border-border/20">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={apolloLogo} alt="Apollo Nation" className="w-10 h-10 invert" />
          <span className="font-heading text-lg tracking-[0.2em]">
            APOLLO <span className="text-muted-foreground">NATION</span>
          </span>
        </Link>
      </div>

      {/* User info */}
      <div className="p-6 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-foreground">
              {profile?.display_name || "Member"}
            </p>
            <p className="text-[10px] text-secondary uppercase tracking-[0.2em]">
              {profile?.subscription_tier || "Basic"} Member
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.locked ? "#" : item.href}
            onClick={(e) => item.locked && e.preventDefault()}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
              isActive(item.href)
                ? "bg-primary/15 text-primary border border-primary/20"
                : item.locked
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1 text-sm font-light">{item.label}</span>
            {(item as any).badge && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {(item as any).badge}
              </span>
            )}
            {item.locked && (
              <div className="flex items-center gap-1 text-[10px]">
                <Lock className="w-3 h-3" />
                <span>{(item as any).tier}</span>
              </div>
            )}
          </Link>
        ))}

        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 mt-4 border ${
              location.pathname === "/admin"
                ? "bg-primary/15 text-primary border-primary/20"
                : "text-primary/70 border-primary/15 hover:bg-primary/10"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="flex-1 text-sm font-light">Admin Panel</span>
          </Link>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-border/20">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-light">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;