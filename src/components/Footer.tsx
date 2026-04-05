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
            <span className="font-heading text-sm tracking-wide text-foreground/80">
              Apollo Nation
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Terms
            </Link>
            <a href="https://www.instagram.com/larcosfit" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors" aria-label="Instagram">
              <Instagram size={18} strokeWidth={1.5} />
            </a>
            <a href="https://www.youtube.com/@larcosfitness" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors" aria-label="YouTube">
              <Youtube size={18} strokeWidth={1.5} />
            </a>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border/20 text-center">
          <p className="text-muted-foreground text-sm">
            © {currentYear} Apollo Nation. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
