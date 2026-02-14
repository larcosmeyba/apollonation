import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Menu, X, LayoutDashboard, Dumbbell, Utensils, Camera, User, LogOut, Lock, Shield, MessageSquare, Apple, ClipboardList, Calendar } from "lucide-react";
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
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, locked: false },
    { label: "Workouts", href: "/dashboard/workouts", icon: Dumbbell, locked: false },
    { label: "Recipes", href: "/dashboard/recipes", icon: Utensils, locked: false },
    { label: "Training Program", href: "/dashboard/training", icon: ClipboardList, locked: false },
    { label: "Nutrition Plan", href: "/dashboard/nutrition", icon: Apple, locked: false },
    { label: "Calendar", href: "/dashboard/calendar", icon: Calendar, locked: false },
    { label: "Macro Tracker", href: "/dashboard/macros", icon: Camera, locked: !isElite, tier: "Elite" },
    { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, locked: false, badge: unreadCount > 0 ? unreadCount : undefined },
    { label: "Profile", href: "/dashboard/profile", icon: User, locked: false },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="bg-apollo-charcoal-light border-b border-border p-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={apolloLogo} alt="Apollo Nation" className="w-8 h-8 invert" />
          <span className="font-heading text-sm tracking-wider">
            APOLLO <span className="text-apollo-gold">NATION</span>
          </span>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 text-foreground">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-apollo-charcoal-light border-border">
            {/* User info */}
            <div className="py-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-apollo-gold/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-apollo-gold" />
                </div>
                <div>
                  <p className="font-medium text-sm">{profile?.display_name || "Member"}</p>
                  <p className="text-xs text-apollo-gold uppercase">{profile?.subscription_tier || "Basic"}</p>
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
                      ? "bg-apollo-gold/20 text-apollo-gold"
                      : item.locked
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {(item as any).badge && (
                    <span className="bg-apollo-gold text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all mt-4 border border-apollo-gold/30 ${
                    location.pathname === "/admin"
                      ? "bg-apollo-gold/20 text-apollo-gold"
                      : "text-apollo-gold hover:bg-apollo-gold/10"
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
