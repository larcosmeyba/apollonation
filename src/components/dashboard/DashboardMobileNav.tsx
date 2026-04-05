import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const DashboardMobileNav = () => {
  const { profile } = useAuth();

  return (
    <header className="bg-background/90 backdrop-blur-2xl border-b border-border/20 px-5 py-3.5">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center">
          <span className="text-[11px] font-bold tracking-[0.3em] text-foreground/90 uppercase">
            Apollo Nation
          </span>
        </Link>

        <Link
          to="/dashboard/profile"
          className="w-8 h-8 rounded-full bg-foreground/5 border border-border/30 flex items-center justify-center hover:bg-foreground/10 transition-colors"
        >
          {profile?.display_name ? (
            <span className="text-[10px] font-semibold text-foreground/60">
              {profile.display_name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-foreground/30">?</span>
          )}
        </Link>
      </div>
    </header>
  );
};

export default DashboardMobileNav;
