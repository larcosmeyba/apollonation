import { Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import apolloLogo from "@/assets/apollo-logo-sm.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="container mx-auto px-4 py-14">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation" className="w-8 h-8 invert brightness-0 invert opacity-90" />
            <span className="font-heading text-sm tracking-wide text-foreground/90">
              Apollo Nation
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://www.instagram.com/larcosfit" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-accent transition-colors" aria-label="Instagram">
              <Instagram size={18} strokeWidth={1.5} />
            </a>
            <a href="https://www.youtube.com/@larcosfitness" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-accent transition-colors" aria-label="YouTube">
              <Youtube size={18} strokeWidth={1.5} />
            </a>
          </div>
        </div>

        {/* Legal links */}
        <div className="mt-8 pt-6 border-t border-border/20 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/terms" className="text-foreground/50 hover:text-foreground/80 text-xs tracking-wide transition-colors">
            Terms of Service
          </Link>
          <Link to="/privacy" className="text-foreground/50 hover:text-foreground/80 text-xs tracking-wide transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-foreground/50 hover:text-foreground/80 text-xs tracking-wide transition-colors">
            Health Disclaimer
          </Link>
          <Link to="/terms" className="text-foreground/50 hover:text-foreground/80 text-xs tracking-wide transition-colors">
            Liability Waiver
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-foreground/40 text-xs leading-relaxed max-w-xl mx-auto">
            Apollo Nation is not a medical provider. Consult your physician before beginning any exercise or nutrition program. Use of this platform constitutes acceptance of all terms and liability waivers.
          </p>
          <p className="text-foreground/40 text-xs mt-4">
            © {currentYear} Apollo Nation. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
