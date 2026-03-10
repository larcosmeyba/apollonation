import { Instagram, Youtube, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import apolloLogo from "@/assets/apollo-logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    experience: [
      { label: "Programs", href: "/#features" },
      { label: "Membership", href: "/#pricing" },
    ],
    support: [
      { label: "Contact", href: "#contact" },
      { label: "Privacy", href: "/privacy", isLink: true },
      { label: "Terms", href: "/terms", isLink: true },
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/larcosfit", label: "Instagram" },
    { icon: Youtube, href: "https://www.youtube.com/@larcosfitness", label: "YouTube" },
    { icon: Mail, href: "#contact", label: "Email" },
  ];

  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img src={apolloLogo} alt="Apollo Nation Logo" className="w-9 h-9 invert brightness-0 invert opacity-90" />
              <span className="font-heading text-base tracking-[0.15em] text-foreground">
                APOLLO <span className="text-foreground/70">NATION</span>
              </span>
            </div>
            <p className="text-foreground/70 text-sm font-light leading-relaxed mb-6 max-w-xs">
              Elevate your practice. Transform your body. Discover your potential.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="w-9 h-9 border border-border flex items-center justify-center text-foreground/60 hover:border-foreground/30 hover:text-foreground transition-all duration-500 rounded-full"
                  aria-label={social.label}
                >
                  <social.icon size={14} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading text-xs uppercase tracking-[0.2em] text-foreground mb-6">Experience</h4>
            <ul className="space-y-3">
              {footerLinks.experience.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-foreground/60 hover:text-foreground transition-colors duration-500 text-sm font-light">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs uppercase tracking-[0.2em] text-foreground mb-6">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  {link.isLink ? (
                    <Link to={link.href} className="text-foreground/60 hover:text-foreground transition-colors duration-500 text-sm font-light">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-foreground/60 hover:text-foreground transition-colors duration-500 text-sm font-light">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-foreground/40 text-xs font-light">
            © {currentYear} Apollo Nation. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
