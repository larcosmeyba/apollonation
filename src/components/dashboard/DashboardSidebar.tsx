import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import {
  LayoutDashboard,
  Dumbbell,
  User,
  LogOut,
  Lock,
  Shield,
  MessageSquare,
  Apple,
  Play,
  Camera,
  Calendar,
  BookOpen,
  Heart,
  ImageIcon,
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
    { label: "Fuel", href: "/dashboard/nutrition", icon: Apple, locked: false },
    { label: "On Demand", href: "/dashboard/workouts", icon: Play, locked: false },
    { label: "Calendar", href: "/dashboard/calendar", icon: Calendar, locked: false },
    { label: "Recipes", href: "/dashboard/recipes", icon: BookOpen, locked: false },
    { label: "Transformation", href: "/dashboard/transformation", icon: ImageIcon, locked: false },
    { label: "Recovery", href: "/dashboard/recovery", icon: Heart, locked: false },
    { label: "Challenges", href: "/dashboard/challenges", icon: Dumbbell, locked: false },
    { label: "Macro Tracker", href: "/dashboard/macros", icon: Camera, locked: !isElite, tier: "Elite" },
    { label: "Profile", href: "/dashboard/profile", icon: User, locked: false },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <aside className="w-64 bg-card/50 backdrop-blur-sm border-r border-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={apolloLogo} alt="Apollo Nation" className="w-10 h-10 invert" />
          <span className="font-heading text-lg tracking-wider text-foreground">
            APOLLO <span className="text-primary">NATION</span>
          </span>
        </Link>
      </div>

      {/* User info */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-foreground">
              {profile?.display_name || "Member"}
            </p>
            <p className="text-xs text-primary uppercase tracking-wide">
              {profile?.subscription_tier || "Basic"} Member
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.locked ? "#" : item.href}
            onClick={(e) => item.locked && e.preventDefault()}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive(item.href)
                ? "bg-primary/15 text-primary"
                : item.locked
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
            {(item as any).badge && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {(item as any).badge}
              </span>
            )}
            {item.locked && (
              <div className="flex items-center gap-1 text-xs">
                <Lock className="w-3 h-3" />
                <span>{(item as any).tier}</span>
              </div>
            )}
          </Link>
        ))}

        {/* Admin toggle */}
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all mt-4 border border-primary/30 ${
              location.pathname === "/admin"
                ? "bg-primary/15 text-primary"
                : "text-primary hover:bg-primary/10"
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="flex-1">Admin Panel</span>
          </Link>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
