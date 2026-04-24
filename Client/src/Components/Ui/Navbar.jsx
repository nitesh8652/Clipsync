import { User2Icon, UserCheck2Icon } from "lucide-react";
import { useState, useEffect } from "react";


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

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser(payload)
    }
  }, [])

  const handleSignIn = () => {
    window.location.href = 'http://localhost:5000/auth/google'
    console.log("Sign in clicked");
  }

  const handleSignOut = () => {
    localStorage.removeItem("token")
    setUser(null)
    console.log("Sign out clicked");
  }

  return (
    <nav
      className="w-full flex items-center justify-between px-6 py-3 border-b border-stone-200 dark:border-stone-700 bg-[#1F1F1E]"

    >
      {/* Logo */}
      <div
        className="text-lg font-semibold tracking-tight"
        style={{ color: "#4770C2", fontFamily: "'Georgia', serif" }}
      >
        ClipSync.
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {user ? (
          <>

            <span className="text-[13px] font-medium">{user.name}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm text-stone-700 hover:bg-stone-50">

              <GoogleIcon />
              Signed In
            </button>
          </>
        ) :

          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm text-stone-700 hover:bg-stone-50"
          >
            <GoogleIcon />
            <span className="text-[13px] font-medium">Sign in with Google</span>
          </button>

        }

        <button className="w-9 h-9 rounded-full overflow-hidden border border-stone-300">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <User2Icon className="text-stone-500" />
          )}
        </button>

      </div>
    </nav>
  );
}