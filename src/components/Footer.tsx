import { Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import apolloLogo from "@/assets/apollo-logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: "Membership", href: "/#membership" },
    { label: "Training", href: "/#philosophy" },
    { label: "Nutrition", href: "/#features" },
    { label: "About", href: "/#founder" },
    { label: "Contact", href: "#contact" },
  ];

  const legalLinks = [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ];

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <img src={apolloLogo} alt="Apollo Nation Logo" className="w-9 h-9 invert brightness-0 invert opacity-90" />
            <span className="font-heading text-lg tracking-[0.2em] text-foreground">
              APOLLO NATION
            </span>
          </div>

          {/* Nav Links */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-500 text-xs uppercase tracking-[0.2em] font-light"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Social */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <a
              href="https://www.instagram.com/larcosfit"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 border border-border flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-500 rounded-full"
              aria-label="Instagram"
            >
              <Instagram size={16} strokeWidth={1.5} />
            </a>
            <a
              href="https://www.tiktok.com/@larcosfit"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 border border-border flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-500 rounded-full"
              aria-label="TikTok"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.18 8.18 0 003.76.92V6.45c-.01.08-.01.16-.01.24z"/>
              </svg>
            </a>
          </div>

          {/* Divider + Legal */}
          <div className="divider-gold mb-8" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground/60 text-xs font-light">
              © {currentYear} Apollo Nation. All rights reserved.
            </p>
            <div className="flex gap-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-muted-foreground/60 hover:text-muted-foreground transition-colors text-xs font-light"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;