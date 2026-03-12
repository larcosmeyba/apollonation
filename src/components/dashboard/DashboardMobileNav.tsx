import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import apolloLogo from "@/assets/apollo-logo.png";

const DashboardMobileNav = () => {
  const { profile } = useAuth();

  return (
    <header className="border-b border-border/20 p-4" style={{ background: 'rgba(14,18,30,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={apolloLogo} alt="Apollo Nation" className="w-8 h-8 invert" />
          <span className="font-heading text-sm tracking-[0.2em]">
            APOLLO <span className="text-foreground/50">NATION</span>
          </span>
        </Link>

        <Link
          to="/dashboard/profile"
          className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 hover:border-primary/40 transition-colors"
        >
          <User className="w-5 h-5 text-primary" />
        </Link>
      </div>
    </header>
  );
};

export default DashboardMobileNav;
