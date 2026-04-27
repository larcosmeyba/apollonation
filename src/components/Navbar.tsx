import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { isWeb } from "@/lib/platform";
import apolloLogo from "@/assets/apollo-logo-sm.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth();
  const { isAdmin } = useAdminStatus();

  const navLinks = [
    { href: "#pillars", label: "The Platform", isAnchor: true },
    { href: "#programs", label: "Programs", isAnchor: true },
    { href: "#nutrition", label: "Nutrition", isAnchor: true },
    { href: "/contact", label: "Contact" },
    { href: "#download", label: "Download the App", isAnchor: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-background/80 border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Reborn Logo" className="w-8 h-8 invert brightness-0 invert opacity-95" loading="eager" />
            <span className="font-heading text-base tracking-wide text-white font-bold">
              Apollo Reborn<sup className="text-[8px] ml-0.5 align-super">™</sup>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              link.isAnchor ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-white hover:text-white/80 transition-colors duration-300 font-body text-sm font-medium"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-white hover:text-white/80 transition-colors duration-300 font-body text-sm font-medium"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                {isWeb() && isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Shield className="w-3.5 h-3.5" /> Admin
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard">
                  <Button size="sm" className="rounded-full px-6 bg-white text-black hover:bg-white/90 font-semibold">
                    Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-white">
                    Sign In
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="rounded-full px-6 bg-white text-black hover:bg-white/90 font-semibold"
                  onClick={() => document.getElementById("download")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Get the App
                </Button>
              </>
            )}
          </div>

          <button
            className="md:hidden text-white p-2"
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
            {navLinks.map((link) =>
              link.isAnchor ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-white hover:text-white/80 transition-colors py-2 text-sm font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  to={link.href}
                  className="block text-white hover:text-white/80 transition-colors py-2 text-sm font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
            <div className="pt-4 space-y-3 border-t border-border/30">
              {user ? (
                <>
                  {isWeb() && isAdmin && (
                    <Link to="/admin" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full gap-2 text-white">
                        <Shield className="w-3.5 h-3.5" /> Admin
                      </Button>
                    </Link>
                  )}
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button className="w-full rounded-full bg-white text-black hover:bg-white/90 font-semibold">Dashboard</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full text-white">Sign In</Button>
                  </Link>
                  <Button
                    className="w-full rounded-full bg-white text-black hover:bg-white/90 font-semibold"
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
