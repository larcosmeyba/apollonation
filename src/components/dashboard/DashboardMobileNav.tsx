import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import apolloLogo from "@/assets/apollo-logo.png";

const DashboardMobileNav = () => {
  const { profile } = useAuth();

  return (
    <header className="bg-[hsl(var(--apollo-charcoal-light))] border-b border-border p-4">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={apolloLogo} alt="Apollo Nation" className="w-8 h-8 invert" />
          <span className="font-heading text-sm tracking-wider">
            APOLLO <span className="text-primary">NATION</span>
          </span>
        </Link>

        <Link
          to="/dashboard/profile"
          className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
        >
          <User className="w-5 h-5 text-primary" />
        </Link>
      </div>
    </header>
  );
};

export default DashboardMobileNav;
