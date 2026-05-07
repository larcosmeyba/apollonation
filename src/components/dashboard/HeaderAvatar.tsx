import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";

const initialsFor = (name?: string | null, email?: string | null) => {
  const source = (name || email || "").trim();
  if (!source) return "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const HeaderAvatar = () => {
  const { profile, user } = useAuth();
  const { signedUrl } = useSignedUrl("avatars", profile?.avatar_url);
  const initials = initialsFor(profile?.display_name, user?.email);

  return (
    <Link
      to="/dashboard/profile"
      aria-label="Open profile"
      className="w-9 h-9 rounded-full overflow-hidden border border-border/60 bg-foreground/10 flex items-center justify-center hover:ring-2 hover:ring-foreground/20 transition-all"
    >
      {signedUrl ? (
        <img src={signedUrl} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[11px] font-bold text-foreground/80 tracking-wide">{initials}</span>
      )}
    </Link>
  );
};

export default HeaderAvatar;
