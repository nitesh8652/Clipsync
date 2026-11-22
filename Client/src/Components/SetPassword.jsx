import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupToken, setSetupToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) { navigate("/login"); return; }
    // Verify it's a needsPassword token
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      if (!payload.needsPassword) { navigate("/clips"); return; }
      setSetupToken(t);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${setupToken}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
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
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white/90 tracking-wide">Set a password</h1>
          <p className="text-[13px] text-white/30 mt-1">
            Set a password so you can also sign in with email next time
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Choose a password"
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
            Save & continue
          </button>
        </form>

        <p className="text-center text-[12px] text-white/30 mt-4">
          You can skip this and set it later from settings.{" "}
          <button
            onClick={() => {
              // Skip — store the setup token temporarily and go to clips
              // The token has needsPassword=true so clips will still work
              // but next Google login will prompt again until password is set
              localStorage.setItem("token", setupToken);
              navigate("/clips");
            }}
            className="text-white/50 hover:text-white underline"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
