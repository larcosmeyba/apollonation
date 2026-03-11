import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";

import apolloLogo from "@/assets/apollo-logo.png";
import {
  LayoutDashboard,
  MessageSquare,
  Dumbbell,
  Activity,
  Users,
  Inbox,
  Utensils,
  LogOut,
  User,
  Menu,
  X,
  Megaphone,
  Bell,
  ChevronDown,
  Settings,
  UsersRound,
  Palette,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "broadcast", label: "Broadcast", icon: Megaphone },
  { id: "workouts", label: "On-Demand Classes", icon: Dumbbell },
  { id: "video-editor", label: "Video Builder", icon: Film },
  { id: "exercises", label: "Exercise Library", icon: Activity },
  { id: "recipes", label: "Recipes", icon: Utensils },
  { id: "group-coaching", label: "Group Coaching", icon: UsersRound },
  { id: "marketing", label: "Marketing", icon: Palette },
  { id: "contacts", label: "Contact Requests", icon: Inbox },
  { id: "profile", label: "Coach Profile", icon: User },
];

const AdminLayout = ({ children, activeTab, onTabChange }: AdminLayoutProps) => {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useMessages();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── TOP NAVIGATION BAR ─── */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 z-30 shrink-0">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onTabChange("dashboard")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <img src={apolloLogo} alt="Apollo Nation" className="w-8 h-8 invert" />
            <div className="hidden sm:block">
              <span className="font-heading text-sm tracking-wider">
                APOLLO <span className="text-apollo-gold">NATION</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-apollo-gold/70 block leading-none">
                Coach Panel
              </span>
            </div>
          </button>
        </div>

        {/* Right: notifications + messages + profile */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTabChange("contacts")}
            className="relative p-2 rounded-md hover:bg-muted transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => onTabChange("messages")}
            className="relative p-2 rounded-md hover:bg-muted transition-colors"
            title="Messages"
          >
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-apollo-gold text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 ml-2 p-1.5 rounded-md hover:bg-muted transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-apollo-gold/20 text-apollo-gold text-xs">
                    {profile?.display_name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                  {profile?.display_name || "Coach"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onTabChange("profile")}>
                <User className="w-4 h-4 mr-2" /> View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange("profile")}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── MOBILE SIDEBAR OVERLAY ─── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ─── LEFT SIDEBAR ─── */}
        <aside
          className={`fixed lg:relative inset-y-0 left-0 top-14 z-20 w-60 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                    isActive
                      ? "bg-apollo-gold/15 text-apollo-gold font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.id === "messages" && unreadCount > 0 && (
                    <span className="bg-apollo-gold text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
