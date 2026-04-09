import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Search, Bookmark } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const DashboardMobileNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-background/90 backdrop-blur-2xl border-b border-border/20 px-5 py-3.5" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.875rem)" }}>
      <div className="flex items-center justify-between">
        {/* Left: Hamburger menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-foreground/5 transition-colors">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-card border-border p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-6 pt-8 pb-6 border-b border-border">
                <h2 className="font-heading text-xl font-bold text-foreground">Apollo Reborn<sup className="text-[8px] ml-0.5">™</sup></h2>
              </div>

              {/* Menu Links */}
              <nav className="flex-1 px-6 py-6 space-y-1">
                {[
                  { label: "About", to: "/about" },
                  { label: "FAQ", to: "/faq" },
                  { label: "Settings", to: "/dashboard/profile" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-sm font-bold text-foreground hover:text-accent transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Follow Us + Social Links */}
              <div className="px-6 py-6 border-t border-border">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-foreground mb-4">Follow Us</p>
                <div className="flex items-center gap-4">
                  <a href="https://instagram.com/larcosfit" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-foreground/10 border border-border flex items-center justify-center hover:bg-foreground/20 transition-colors">
                    <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                  <a href="https://tiktok.com/@larcosfitness" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-foreground/10 border border-border flex items-center justify-center hover:bg-foreground/20 transition-colors">
                    <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46v-7.15a8.16 8.16 0 005.58 2.2v-3.45a4.85 4.85 0 01-1-.17z"/></svg>
                  </a>
                  <a href="https://youtube.com/@apollonation" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-foreground/10 border border-border flex items-center justify-center hover:bg-foreground/20 transition-colors">
                    <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Right: Search + Saved */}
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/workouts?search=true"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-foreground/5 transition-colors"
          >
            <Search className="w-5 h-5 text-foreground" />
          </Link>
          <Link
            to="/dashboard/workouts?tab=collections"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-foreground/5 transition-colors"
          >
            <Bookmark className="w-5 h-5 text-foreground" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default DashboardMobileNav;
