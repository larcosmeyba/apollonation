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
  Apple,
  Play,
  Camera,
  Calendar,
  BookOpen,
  Heart,
  ImageIcon,
} from "lucide-react";
import apolloLogo from "@/assets/apollo-logo-sm.png";
import NotificationCenter from "./NotificationCenter";

const DashboardSidebar = () => {
  const { profile, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const location = useLocation();

  const isElite = profile?.subscription_tier === "elite";

  const mainNav = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Workouts", href: "/dashboard/workouts", icon: Play },
    { label: "Programs", href: "/dashboard/training", icon: Dumbbell },
    { label: "Nutrition", href: "/dashboard/nutrition", icon: Apple },
  ];

  const secondaryNav = [
    { label: "Calendar", href: "/dashboard/calendar", icon: Calendar, locked: false },
    { label: "Recipes", href: "/dashboard/recipes", icon: BookOpen, locked: false },
    { label: "Transformation", href: "/dashboard/transformation", icon: ImageIcon, locked: false },
    { label: "Recovery", href: "/dashboard/recovery", icon: Heart, locked: false },
    { label: "Challenges", href: "/dashboard/challenges", icon: Dumbbell, locked: false },
    { label: "Macro Tracker", href: "/dashboard/macros", icon: Camera, locked: !isElite, tier: "Elite" },
  ];

  const isActive = (href: string) => location.pathname === href;

  const NavItem = ({ item }: { item: any }) => (
    <Link
      key={item.href}
      to={item.locked ? "#" : item.href}
      onClick={(e) => item.locked && e.preventDefault()}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px] ${
        isActive(item.href)
          ? "bg-foreground/10 text-foreground"
          : item.locked
          ? "text-muted-foreground/25 cursor-not-allowed"
          : "text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5"
      }`}
    >
      <item.icon className="w-4 h-4" strokeWidth={1.5} />
      <span className="tracking-wide">{item.label}</span>
      {item.locked && (
        <div className="flex items-center gap-1 text-[9px] ml-auto">
          <Lock className="w-2.5 h-2.5" />
          <span>{item.tier}</span>
        </div>
      )}
    </Link>
  );

  return (
    <aside className="w-56 bg-background border-r border-border/30 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src={apolloLogo} alt="Apollo Nation" className="w-7 h-7 invert" />
          <span className="font-heading text-xs tracking-[0.25em] text-foreground/90">
            APOLLO
          </span>
        </Link>
      </div>

      {/* User */}
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center">
            {profile?.display_name ? (
              <span className="text-[10px] font-medium text-foreground/60">{profile.display_name.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="w-3.5 h-3.5 text-foreground/30" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate text-foreground/80">
              {profile?.display_name || "Member"}
            </p>
            <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em]">
              {profile?.subscription_tier || "Basic"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {mainNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        <div className="h-px bg-border/20 my-3" />

        <p className="px-3 text-[9px] text-muted-foreground/30 uppercase tracking-[0.2em] mb-2">More</p>
        {secondaryNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        {isAdmin && (
          <>
            <div className="h-px bg-border/20 my-3" />
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px] ${
                location.pathname === "/admin"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground/40 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <Shield className="w-4 h-4" strokeWidth={1.5} />
              <span className="tracking-wide">Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/20 flex items-center gap-1">
        <NotificationCenter />
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all text-[13px]"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
