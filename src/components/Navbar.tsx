import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import apolloLogo from "@/assets/apollo-logo-sm.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth();
  const { isAdmin } = useAdminStatus();

  const navLinks = [
    { href: "#workouts", label: "Workouts" },
    { href: "#programs", label: "Programs" },
    { href: "#nutrition", label: "Nutrition" },
    { href: "#download", label: "Download" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-background/80 border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation Logo" className="w-8 h-8 invert brightness-0 invert opacity-95" />
            <span className="font-heading text-sm tracking-wide text-foreground">
              Apollo Nation
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 font-body text-sm"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Shield className="w-3.5 h-3.5" /> Admin
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard">
                  <Button variant="apollo" size="sm" className="rounded-full px-6">
                    Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Button
                  variant="apollo"
                  size="sm"
                  className="rounded-full px-6"
                  onClick={() => document.getElementById("download")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Get the App
                </Button>
              </>
            )}
          </div>

          <button
            className="md:hidden text-muted-foreground p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-background/98 backdrop-blur-xl border-t border-border/30">
          <div className="container mx-auto px-4 py-6 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-muted-foreground hover:text-foreground transition-colors py-2 text-sm"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 space-y-3 border-t border-border/30">
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full gap-2">
                        <Shield className="w-3.5 h-3.5" /> Admin
                      </Button>
                    </Link>
                  )}
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="apollo" className="w-full rounded-full">Dashboard</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full">Sign In</Button>
                  </Link>
                  <Button
                    variant="apollo"
                    className="w-full rounded-full"
                    onClick={() => {
                      setIsOpen(false);
                      document.getElementById("download")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Get the App
                  </Button>
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
