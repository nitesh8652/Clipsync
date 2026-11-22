import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Register() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(() =>
    new URLSearchParams(window.location.search).get("notice") === "account-exists"
      ? "Account already exists. Try logging in!"
      : ""
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (new URLSearchParams(location.search).get("notice") === "account-exists")
      navigate("/register", { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setToast("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const duplicateAccount = res.status === 409 || /already registered|already exists|duplicate/i.test(data.error || "");
        if (duplicateAccount) setToast("Account already exists. Try logging in!");
        else setError(data.error || "Registration failed");
        return;
      }
      localStorage.setItem("token", data.token);
      navigate("/clips");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1F1F1E] flex items-center justify-center px-4 font-[Sora,sans-serif]">
      {toast && (
        <div
          role="alert"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-red-400/20 bg-[#292321] px-4 py-3 text-sm text-red-200 shadow-xl"
        >
          <span>{toast}</span>
          <Link to="/login" className="font-semibold underline underline-offset-2">Log in</Link>
        </div>
      )}
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white/90 tracking-wide">Create account</h1>
          <p className="text-[13px] text-white/30 mt-1">Join ClipSync</p>
        </div>

        <a
          href={`${API_URL}/auth/google?intent=register`}
          className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl bg-white/90 hover:bg-white text-[#1F1F1E] font-semibold text-sm transition-colors mb-4"
        >
          <GoogleIcon />
          Sign up with Google
        </a>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-white/25">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[#171716] border border-[#2e2e2c] rounded-xl px-4 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-white/30"
          />

          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#171716] border border-[#2e2e2c] rounded-xl px-4 py-2.5 pr-10 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-white/30"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 py-2.5 rounded-xl bg-white/80 hover:bg-white text-[#1F1F1E] font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-center text-[12px] text-white/30 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-white/60 hover:text-white underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.6 39.5 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  );
}
