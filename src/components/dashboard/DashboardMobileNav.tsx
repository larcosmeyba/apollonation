import { Link } from "react-router-dom";
import { Search, Bookmark } from "lucide-react";
import NotificationCenter from "@/components/dashboard/NotificationCenter";
import HeaderAvatar from "@/components/dashboard/HeaderAvatar";

const DashboardMobileNav = () => {


  return (
    <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-2xl border-b border-white/[0.06] px-5 py-3.5" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.875rem)" }}>
      <div className="flex items-center justify-between">
        {/* Left: spacer so the right-side actions stay aligned */}
        <div className="w-9 h-9" aria-hidden="true" />


        {/* Right: Notifications + Search + Saved + Avatar */}
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <Link
            to="/dashboard/workouts?search=true"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-foreground/5 transition-colors"
          >
            <Search className="w-5 h-5 text-foreground" />
          </Link>
          <Link
            to="/dashboard/workouts?tab=collections"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-foreground/5 transition-colors"
          >
            <Bookmark className="w-5 h-5 text-foreground" />
          </Link>
          <div className="ml-1">
            <HeaderAvatar />
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardMobileNav;
