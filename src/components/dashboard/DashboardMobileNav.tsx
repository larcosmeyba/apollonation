import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Menu, User, LogOut, Lock, Shield, Dumbbell, MessageSquare, Apple, Play, Camera, Calendar, BookOpen, LayoutDashboard } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import apolloLogo from "@/assets/apollo-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const DashboardMobileNav = () => {
  const [open, setOpen] = useState(false);
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
    <header className="bg-[hsl(var(--apollo-charcoal-light)/0.85)] backdrop-blur-xl border-b border-border p-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={apolloLogo} alt="Apollo Nation" className="w-8 h-8 invert" />
          <span className="font-heading text-sm tracking-wider">
            APOLLO <span className="text-primary">NATION</span>
          </span>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 text-foreground">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-[hsl(var(--apollo-charcoal-light))] border-border">
            {/* User info */}
            <div className="py-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{profile?.display_name || "Member"}</p>
                  <p className="text-xs text-primary uppercase">{profile?.subscription_tier || "Basic"}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.locked ? "#" : item.href}
                  onClick={(e) => {
                    if (item.locked) {
                      e.preventDefault();
                    } else {
                      setOpen(false);
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(item.href)
                      ? "bg-primary/20 text-primary"
                      : item.locked
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {(item as any).badge && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {(item as any).badge}
                    </span>
                  )}
                  {item.locked && <Lock className="w-3 h-3" />}
                </Link>
              ))}

              {/* Admin toggle */}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all mt-4 border border-primary/30 ${
                    location.pathname === "/admin"
                      ? "bg-primary/20 text-primary"
                      : "text-primary hover:bg-primary/10"
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <span className="flex-1">Admin Panel</span>
                </Link>
              )}
            </nav>

            {/* Sign out */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => {
                  signOut();
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-muted-foreground hover:bg-muted"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default DashboardMobileNav;
