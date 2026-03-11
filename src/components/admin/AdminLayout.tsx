import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import apolloLogo from "@/assets/apollo-logo.png";
import {
  MessageSquare,
  Dumbbell,
  Activity,
  Users,
  Inbox,
  Apple,
  Utensils,
  Shield,
  LogOut,
  User,
  Menu,
  X,
  Megaphone,
  ClipboardList,
  StickyNote,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "broadcast", label: "Broadcast", icon: Megaphone },
  { id: "clients", label: "Clients", icon: Users },
  { id: "workouts", label: "On-Demand Classes", icon: Dumbbell },
  { id: "exercises", label: "Exercise Library", icon: Activity },
  { id: "recipes", label: "Recipes", icon: Utensils },
  { id: "contacts", label: "Contact Requests", icon: Inbox },
  { id: "profile", label: "Coach Profile", icon: User },
];

const AdminLayout = ({ children, activeTab, onTabChange }: AdminLayoutProps) => {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useMessages();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-apollo-charcoal-light border-r border-border min-h-screen flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation" className="w-10 h-10 invert" />
            <div>
              <span className="font-heading text-sm tracking-wider block">
                APOLLO <span className="text-apollo-gold">NATION</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-apollo-gold/70">
                Coach Panel
              </span>
            </div>
          </div>
        </div>

        {/* Coach info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-apollo-gold/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-apollo-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {profile?.display_name || "Coach"}
              </p>
              <p className="text-[10px] text-apollo-gold uppercase tracking-wider">
                Administrator
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                  isActive
                    ? "bg-apollo-gold/15 text-apollo-gold font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "messages" && unreadCount > 0 && (
                  <span className="bg-apollo-gold text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-border">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile header + content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-apollo-charcoal-light">
          <div className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation" className="w-8 h-8 invert" />
            <div>
              <span className="font-heading text-sm tracking-wider">
                APOLLO <span className="text-apollo-gold">NATION</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-apollo-gold/70 block">
                Coach Panel
              </span>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-apollo-charcoal-light border-b border-border p-3 space-y-0.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                    isActive
                      ? "bg-apollo-gold/15 text-apollo-gold font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "messages" && unreadCount > 0 && (
                    <span className="bg-apollo-gold text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-muted text-sm mt-2 border-t border-border pt-3"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
