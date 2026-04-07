import { Link } from "react-router-dom";
import apolloLogo from "@/assets/apollo-logo-sm.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="container mx-auto px-4 py-14">
        <div className="flex flex-col items-center gap-6">
          {/* Logo only — no text */}
          <img src={apolloLogo} alt="Apollo Reborn" className="w-10 h-10 invert brightness-0 invert opacity-90" />

          {/* Social Icons — white and bright, with TikTok */}
          <div className="flex items-center gap-5">
            <a href="https://www.instagram.com/larcosfit" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/70 transition-colors" aria-label="Instagram">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@larcosfitness" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/70 transition-colors" aria-label="TikTok">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46v-7.15a8.16 8.16 0 005.58 2.2v-3.45a4.85 4.85 0 01-1-.17z"/></svg>
            </a>
            <a href="https://www.youtube.com/@larcosfitness" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/70 transition-colors" aria-label="YouTube">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>

        {/* Legal links */}
        <div className="mt-8 pt-6 border-t border-border/20 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/terms" className="text-white/60 hover:text-white text-xs tracking-wide transition-colors">
            Terms of Service
          </Link>
          <Link to="/privacy" className="text-white/60 hover:text-white text-xs tracking-wide transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-white/60 hover:text-white text-xs tracking-wide transition-colors">
            Health Disclaimer
          </Link>
          <Link to="/terms" className="text-white/60 hover:text-white text-xs tracking-wide transition-colors">
            Liability Waiver
          </Link>
          <Link to="/privacy" className="text-white/60 hover:text-white text-xs tracking-wide transition-colors">
            Data & Privacy Notice
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/50 text-xs leading-relaxed max-w-2xl mx-auto">
            Apollo Reborn™ is not a medical provider. Consult your physician before beginning any exercise or nutrition program. Use of this platform constitutes acceptance of all terms and liability waivers. Results may vary. By creating an account you consent to the collection, storage, and processing of your personal information (including fitness data, nutrition logs, and progress photos) as described in our Privacy Policy. You may request deletion of your data at any time. All content, workouts, and programs are the intellectual property of Apollo Reborn™ and may not be reproduced without written permission.
          </p>
          <p className="text-white/40 text-xs mt-4">
            © {currentYear} Apollo Reborn™. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
