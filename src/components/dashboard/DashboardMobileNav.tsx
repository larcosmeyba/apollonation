import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import apolloLogo from "@/assets/apollo-logo-sm.png";
import NotificationCenter from "./NotificationCenter";

const DashboardMobileNav = () => {
  const { profile } = useAuth();

  return (
    <header className="bg-background border-b border-border p-4">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={apolloLogo} alt="Apollo Nation" className="w-8 h-8 invert" />
          <span className="font-heading text-sm tracking-wider text-foreground">
            APOLLO <span className="text-primary">NATION</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <NotificationCenter />
          <Link
            to="/dashboard/profile"
            className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center hover:bg-primary/25 transition-colors"
          >
            <User className="w-5 h-5 text-primary" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default DashboardMobileNav;
