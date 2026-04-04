import { Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import apolloLogo from "@/assets/apollo-logo-sm.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/larcosfit", label: "Instagram" },
    { icon: Youtube, href: "https://www.youtube.com/@larcosfitness", label: "YouTube" },
  ];

  return (
    <footer className="border-t border-white/5 bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation" className="w-7 h-7 invert brightness-0 invert opacity-80" />
            <span className="font-heading text-xs tracking-[0.2em] text-white/60">
              APOLLO NATION
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-white/30 hover:text-white/60 text-xs font-light transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-white/30 hover:text-white/60 text-xs font-light transition-colors">
              Terms
            </Link>
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white/60 transition-colors"
                aria-label={social.label}
              >
                <social.icon size={14} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-white/20 text-[11px] font-light">
            © {currentYear} Apollo Nation. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
