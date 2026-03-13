import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import apolloLogo from "@/assets/apollo-logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth();
  const { isAdmin } = useAdminStatus();

  const navLinks = [
    { href: "/#features", label: "Programs" },
    { href: "/#pricing", label: "Membership" },
    { href: "/#testimonials", label: "Community" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation Logo" className="w-10 h-10 invert brightness-0 invert opacity-95" />
            <span className="font-heading text-lg tracking-[0.15em] text-foreground">
              APOLLO <span className="text-foreground/70">NATION</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-white/60 hover:text-white transition-colors duration-500 font-light text-xs uppercase tracking-[0.2em]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-9 bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="text-white/60 gap-2">
                      <Shield className="w-4 h-4" /> Admin
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard">
                  <Button variant="apollo" size="sm">Dashboard</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="apollo" size="sm">Join Now</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-background/98 backdrop-blur-xl border-t border-border/30">
          <div className="container mx-auto px-4 py-8 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-white/70 hover:text-white transition-colors py-3 font-light text-sm uppercase tracking-[0.15em]"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-6 space-y-3 border-t border-border/30">
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full text-white/60 gap-2">
                        <Shield className="w-4 h-4" /> Admin Panel
                      </Button>
                    </Link>
                  )}
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="apollo" className="w-full">Dashboard</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full text-white/60">Sign In</Button>
                  </Link>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="apollo" className="w-full">Join Now</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
