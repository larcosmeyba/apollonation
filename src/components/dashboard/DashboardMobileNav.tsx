import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import apolloLogo from "@/assets/apollo-logo-sm.png";
import NotificationCenter from "./NotificationCenter";

const DashboardMobileNav = () => {
  const { profile } = useAuth();

  return (
    <header className="bg-background/80 backdrop-blur-2xl border-b border-border/30 px-5 py-3">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src={apolloLogo} alt="Apollo Nation" className="w-7 h-7 invert" />
          <span className="font-heading text-xs tracking-[0.25em] text-foreground/90">
            APOLLO
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          <Link
            to="/dashboard/profile"
            className="w-8 h-8 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center hover:bg-foreground/10 transition-colors"
          >
            {profile?.display_name ? (
              <span className="text-[10px] font-medium text-foreground/70">{profile.display_name.charAt(0).toUpperCase()}</span>
            ) : (
              <span className="text-[10px] font-medium text-foreground/40">?</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default DashboardMobileNav;
