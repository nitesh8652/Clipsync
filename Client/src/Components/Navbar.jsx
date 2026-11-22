import { User2Icon, UserCheck2Icon, UserLockIcon, UserMinus2, UserPlus2Icon } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";


const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

export default function Navbar() {

  const [user, setUser] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser(payload)
    }
  }, [])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

const handleSignIn = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/google`
}

  const handleSignOut = () => {
    localStorage.removeItem("token");
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    });
    setUser(null);
    navigate("/login", { replace: true });
  }

  return (
    <nav
      className="w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-700 bg-[#1F1F1E]"
    >
      {/* Logo */}
      <div
        className="text-lg font-semibold tracking-tight"
        style={{ color: "#4770C2", fontFamily: "'Georgia', serif" }}
      >
        ClipSync.
      </div>

      {/* Right side */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {/* Install App button — only shown when browser fires beforeinstallprompt (Android Chrome) */}
        {installPrompt && (
          <button
            onClick={handleInstall}
            title="Install ClipSync app"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#4770C2]/20 hover:bg-[#4770C2]/30 border border-[#4770C2]/40 text-[#7aa0e8] text-xs font-semibold transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">Install</span>
          </button>
        )}
        {user ? (
          <>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs sm:text-sm text-stone-700 hover:bg-stone-50 font-semibold">
              <GoogleIcon />
              Logout
            </button>
          </>
        ) :
          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg
            bg-white text-black font-medium text-xs sm:text-sm
            hover:scale-[1.03] hover:shadow-md transition-all duration-200">
            <GoogleIcon />
            <span className="text-[12px] sm:text-[13px] font-medium">Sign in with Google</span>
          </button>
        }

        {user && (
          <div className="relative group">
            <button className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-stone-300 shadow-2xl">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
            </button>
            {user?.name && (
              <div className="absolute right-0 top-11 bg-[#2C2C2A] text-white/80 text-xs px-3 py-1.5 rounded-lg
            opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-bold border border-stone-700 mt-4 z-50">
                {user.name}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}