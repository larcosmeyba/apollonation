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
  Film,
  BookOpen,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-[hsl(210,100%,52%)]" },
  { id: "clients", label: "Clients", icon: Users, color: "text-[hsl(142,71%,45%)]" },
  { id: "messages", label: "Messages", icon: MessageSquare, color: "text-[hsl(160,84%,39%)]" },
  { id: "broadcast", label: "Broadcast", icon: Megaphone, color: "text-[hsl(25,95%,53%)]" },
  { id: "programs", label: "Programs", icon: BookOpen, color: "text-[hsl(280,65%,60%)]" },
  { id: "workouts", label: "On-Demand Classes", icon: Dumbbell, color: "text-[hsl(0,72%,51%)]" },
  { id: "video-editor", label: "Video Builder", icon: Film, color: "text-[hsl(340,75%,55%)]" },
  { id: "exercises", label: "Exercise Library", icon: Activity, color: "text-[hsl(45,93%,47%)]" },
  { id: "recipes", label: "Recipes", icon: Utensils, color: "text-[hsl(30,80%,55%)]" },
  { id: "group-coaching", label: "Group Coaching", icon: UsersRound, color: "text-[hsl(200,80%,50%)]" },
  { id: "marketing", label: "Marketing", icon: Palette, color: "text-[hsl(320,70%,55%)]" },
  { id: "challenges", label: "Challenges", icon: Activity, color: "text-[hsl(35,90%,55%)]" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "text-[hsl(40,95%,55%)]" },
  { id: "referrals", label: "Referrals", icon: Gift, color: "text-[hsl(150,60%,50%)]" },
  { id: "contacts", label: "Contact Requests", icon: Inbox, color: "text-[hsl(180,60%,45%)]" },
  { id: "profile", label: "Coach Profile", icon: User, color: "text-[hsl(220,60%,60%)]" },
];

const AdminLayout = ({ children, activeTab, onTabChange }: AdminLayoutProps) => {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useMessages();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── TOP NAVIGATION BAR ─── */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 z-30 shrink-0">
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
              <span className="font-heading text-sm tracking-wider text-foreground">
                APOLLO <span className="text-primary">NATION</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-primary/70 block leading-none">
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
              <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 ml-2 p-1.5 rounded-md hover:bg-muted transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">
                    {profile?.display_name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium max-w-[120px] truncate text-foreground">
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
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                <Eye className="w-4 h-4 mr-2" /> View as Client
              </DropdownMenuItem>
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
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ─── LEFT SIDEBAR ─── */}
        <aside
          className={`fixed lg:relative inset-y-0 left-0 top-14 z-20 w-60 bg-card/90 backdrop-blur-sm border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${
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
                      ? "bg-primary/15 font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${item.color}`} />
                  <span className={`flex-1 text-left truncate ${isActive ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>{item.label}</span>
                  {item.id === "messages" && unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
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
