import { Instagram, Twitter, Youtube, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import apolloLogo from "@/assets/apollo-logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    experience: [
      { label: "Programs", href: "#features" },
      { label: "Membership", href: "#pricing" },
      { label: "Mobile App", href: "#" },
      { label: "Workout Library", href: "#" },
    ],
    company: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
    ],
    support: [
      { label: "Help Center", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Privacy", href: "/privacy", isLink: true },
      { label: "Terms", href: "/terms", isLink: true },
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Mail, href: "#", label: "Email" },
  ];

  return (
    <footer className="bg-apollo-charcoal-light border-t border-border/30">
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <img 
                src={apolloLogo} 
                alt="Apollo Nation Logo" 
                className="w-10 h-10 invert opacity-80"
              />
              <span className="font-heading text-lg tracking-[0.15em] text-foreground">
                APOLLO <span className="text-apollo-gold">NATION</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm font-light leading-relaxed mb-8 max-w-xs">
              Elevate your practice. Transform your body. Discover your potential.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 border border-border/50 flex items-center justify-center text-muted-foreground hover:border-apollo-gold/50 hover:text-apollo-gold transition-all duration-500"
                  aria-label={social.label}
                >
                  <social.icon size={16} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading text-xs uppercase tracking-[0.2em] text-foreground mb-6">
              Experience
            </h4>
            <ul className="space-y-4">
              {footerLinks.experience.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-apollo-gold transition-colors duration-500 text-sm font-light"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs uppercase tracking-[0.2em] text-foreground mb-6">
              Company
            </h4>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-apollo-gold transition-colors duration-500 text-sm font-light"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs uppercase tracking-[0.2em] text-foreground mb-6">
              Support
            </h4>
            <ul className="space-y-4">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  {link.isLink ? (
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-apollo-gold transition-colors duration-500 text-sm font-light"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-apollo-gold transition-colors duration-500 text-sm font-light"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-20 pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs font-light">
            © {currentYear} Apollo Nation. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs font-light">
            Designed for excellence.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;