import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, FileText, Plus, Loader2, Paperclip, Clock, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Home from "./Home";
import { useSocket } from "../Hooks/useSocket";
import { fetchClips, createClip, updateClip, deleteClip, uploadClipFile, saveClip } from "../api/clips";

const TEMP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const typeStyles = [
  { iconBg: "#e8f8f5", iconColor: "#2fa38a" },
  { iconBg: "#eef2ff", iconColor: "#4f46e5" },
  { iconBg: "#f0fdf4", iconColor: "#22c55e" },
  { iconBg: "#fff7ed", iconColor: "#f97316" },
  { iconBg: "#f5f3ff", iconColor: "#8b5cf6" },
  { iconBg: "#ecfeff", iconColor: "#06b6d4" },
  { iconBg: "#fef2f2", iconColor: "#ef4444" },
  { iconBg: "#f8fafc", iconColor: "#334155" },
  { iconBg: "#fff1f2", iconColor: "#e11d48" },
  { iconBg: "#fffbeb", iconColor: "#d97706" },
  { iconBg: "#f0f9ff", iconColor: "#0284c7" },
  { iconBg: "#faf5ff", iconColor: "#a855f7" },
  { iconBg: "#ecfdf5", iconColor: "#059669" },
  { iconBg: "#fefce8", iconColor: "#ca8a04" },
  { iconBg: "#f1f5f9", iconColor: "#475569" },
];

let lastStyleIndex = -1;
function randomStyle() {
  let index;
  do { index = Math.floor(Math.random() * typeStyles.length); }
  while (index === lastStyleIndex);
  lastStyleIndex = index;
  return typeStyles[index];
}

// Decodes JWT payload without verifying (client-side read only)
function decodeToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return null; }
}

const ACCEPTED_FILE_TYPES = ".pdf,.ppt,.pptx,.doc,.docx,.zip,.jpg,.jpeg,.png,.gif,.webp,.svg";

export default function ClipInput() {
  const [value, setValue] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [temporary, setTemporary] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // ── Bootstrap: read token from URL param or localStorage ──────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    let activeToken = urlToken || localStorage.getItem("token");
    if (!activeToken) { navigate("/login"); return; }

    if (urlToken) {
      localStorage.setItem("token", urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const payload = decodeToken(activeToken);
    setToken(activeToken);
    setUser(payload);
  }, []);

  // ── Load clips from server when user is available ────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchClips()
      .then(({ clips }) => setItems(clips.map(normalizeClip)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  // ── Socket.IO real-time sync ─────────────────────────────────────────
  const handleRemoteNewClip = useCallback((clip) => {
    setSyncStatus("synced"); //new data reciving from another device
    setTimeout(() => setSyncStatus("idle"), 2000);
    setItems((prev) => [normalizeClip(clip), ...prev]);
  }, []);

  const handleRemoteDeleteClip = useCallback((clipId) => {
    setItems((prev) => prev.filter((i) => i._id !== clipId && i.id !== clipId));
  }, []);

  const handleRemoteUpdateClip = useCallback((clip) => {
    const normalized = normalizeClip(clip);
    setItems((prev) => prev.map((i) => (i.id === normalized.id ? normalized : i)));
  }, []);

  //Only establishes connection when token exists
  const { emitNewClip, emitDeleteClip, emitUpdateClip } = useSocket(token, {
    onNewClip: handleRemoteNewClip,
    onDeleteClip: handleRemoteDeleteClip,
    onUpdateClip: handleRemoteUpdateClip,
  });

  // ── Normalize DB clip to UI shape ────────────────────────────────────
  function normalizeClip(clip) {
    return {
      ...clip,
      id: clip._id || clip.id,
      icon: <FileText size={15} />,
      time: formatTime(clip.createdAt || clip.time), //Converts timestamps to relative human readable time
    };
  }

  function formatTime(dateStr) {
    if (!dateStr) return "Just now";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // ── Send text clip ───────────────────────────────────────────────────
  const handleSend = async () => {
    if (!value.trim()) return; //prevent empty swnd
    const { iconBg, iconColor } = randomStyle();
    const title = value.slice(0, 40) + (value.length > 40 ? "…" : "");

    /**
     @description optimistic data flow
     * User Clicks Send
        ↓
    Show item immediately (id: "opt-12345")
        ↓
    Send to server in background
        ↓
    Success → Replace "opt-12345" with real data (id: "67890abc")
    Fail    → Keep optimistic item (offline-friendly)
     */

    const optimisticClip = {
      id: `opt-${Date.now()}`, //temporary id
      icon: <FileText size={15} />,
      iconBg, iconColor,
      type: "text",
      title,
      preview: value,
      time: "Just now",
      action: "copy",
      rawText: value,
      expiresAt: temporary ? new Date(Date.now() + TEMP_TTL_MS).toISOString() : null,
    };

    setItems((prev) => [optimisticClip, ...prev]); //instant ui
    setValue("");

    if (!token) return; // not logged in — local only

    setSending(true);
    try {
      const clipData = { title, preview: value, rawText: value, type: "text", action: "copy", iconBg, iconColor, temporary };
      const { clip } = await createClip(clipData); //send to server
      const normalized = normalizeClip(clip);

      // Replace optimistic with real
      setItems((prev) => prev.map((i) => i.id === optimisticClip.id ? normalized : i));

      // Broadcast/send to other devices
      emitNewClip(clip);
    } catch (err) {
      console.error("Failed to save clip:", err);
      // keep the optimistic item, mark it locally
    } finally {
      setSending(false);
    }
  };

  // ── Delete clip ──────────────────────────────────────────────────────
  const handleDelete = async (clipId) => {
    //remove from UI instantly
    setItems((prev) => prev.filter((i) => i.id !== clipId && i._id !== clipId));
    //In these cases, stop here—don’t call backend or socket”
    if (!token || String(clipId).startsWith("opt-")) return;
    try {
      await deleteClip(clipId);
      emitDeleteClip(clipId); //brodcaste
    } catch (err) {
      console.error("Failed to delete clip:", err);
    }
  };

  // ── Toggle temporary / permanent ────────────────────────────────────
  const handleToggleTemporary = async (item) => {
    const clipId = item._id || item.id;
    const nextTemporary = !item.expiresAt;
    const nextExpiresAt = nextTemporary
      ? new Date(Date.now() + TEMP_TTL_MS).toISOString()
      : null;

    // optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === clipId || i._id === clipId ? { ...i, expiresAt: nextExpiresAt } : i
      )
    );

    if (!token || String(clipId).startsWith("opt-")) return;

    try {
      const { clip } = await updateClip(clipId, { temporary: nextTemporary });
      const normalized = normalizeClip(clip);
      setItems((prev) =>
        prev.map((i) => (i.id === clipId || i._id === clipId ? normalized : i))
      );
      emitUpdateClip(clip);
    } catch (err) {
      console.error("Failed to update clip expiry:", err);
    }
  };

  // ── Toggle saved / starred ────────────────────────────────────────
  const handleToggleSaved = async (item) => {
    const clipId = item._id || item.id;
    const nextSaved = !item.saved;
    setItems((prev) =>
      prev.map((i) => (i.id === clipId || i._id === clipId ? { ...i, saved: nextSaved } : i))
    );
    if (!token || String(clipId).startsWith("opt-")) return;
    try {
      const { clip } = await saveClip(clipId, nextSaved);
      const normalized = normalizeClip(clip);
      setItems((prev) =>
        prev.map((i) => (i.id === clipId || i._id === clipId ? normalized : i))
      );
      emitUpdateClip(clip);
    } catch (err) {
      console.error("Failed to toggle saved:", err);
    }
  };

  // ── File upload ──────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return
    e.target.value = "" //reset input after upload

    setUploadError(null)

    const { iconBg, iconColor } = randomStyle();

    //showing uploading card immediately
    const optimisticId = `opt-${Date.now()}`;
    const optimisticClip = {
      id: optimisticId,
      icon: <Paperclip size={15} />,
      iconBg, iconColor,
      type: "file",
      title: file.name,
      preview: null,
      time: "Just now",
      action: "download",
      fileUrl: null,
      uploading: true,
      expiresAt: temporary ? new Date(Date.now() + TEMP_TTL_MS).toISOString() : null,
    };

    setItems((prev) => [optimisticClip, ...prev]); //instant ui
    setUploading(true)

    if (!token) {
      setUploading(false)
      return
    }

    try {
      const { clip } = await uploadClipFile(file, { iconBg, iconColor, temporary });
      const normalized = { ...normalizeClip(clip), uploading: false }
      setItems((prev) => prev.map((i) => i.id === optimisticId ? normalized : i))
      emitNewClip(clip)
    } catch (err) {
      console.error("file upload failed", err)
      setUploadError(err.message || "Upload failed")

      //remove failed optimistic item
      setItems((prev) => prev.filter((i) => i.id !== optimisticId));

    } finally {
      setUploading(false)
    }

  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = async (e) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;
    for (const item of clipItems) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        await handleFileChange({ target: { files: [file], value: "" } });
        return;
      }
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setTemporary((t) => !t);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

 return (
    <>

      <Navbar />
   
    
      <div className="bg-[#1F1F1E] flex flex-col items-center justify-center px-4 sm:px-6 font-[Sora,sans-serif]">
        <div className="text-center mb-6 sm:mb-8 mt-6 sm:mt-8">
          <h1 className="text-[18px] sm:text-[22px] font-extrabold text-white/85 tracking-wide mb-1">
            Your Personalized Clipboard!
          </h1>
          <p className="text-[12px] sm:text-[13px] text-white/30 tracking-widest">Made by Nitesh!</p>
 
          {syncStatus === "synced" && (
            <p className="text-[11px] text-emerald-400/70 mt-1 animate-pulse">
              ✦ New clip synced from another device
            </p>
          )}
 
          {/* Upload error banner */}
          {uploadError && (
            <p className="text-[11px] text-red-400/80 mt-1">
              ✕ {uploadError}
            </p>
          )}
        </div>
 
        <div className="relative w-full max-w-xl sm:max-w-130">
          <div
            className="rounded-[18px] p-[1.5px]"
            style={{
              background: "linear-gradient(135deg, rgba(120,80,255,0.8), rgba(56,189,248,0.7), rgba(16,185,129,0.6), rgba(120,80,255,0.5))",
            }}
          >
            <div className="bg-[#1F1F1E] rounded-[17px] pl-20 sm:pl-24 pr-20 sm:pr-24 py-3 flex items-end gap-3 relative">
              {searchMode ? (
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your clips…"
                  className="flex-1 bg-transparent p-0.75 outline-none text-white/88 text-[14px] placeholder:text-white/25"
                />
              ) : (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  style={{ maxHeight: "160px", overflowY: "auto" }}
                  onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                  placeholder="Paste here anything..."
                  className="flex-1 bg-transparent p-0.75 outline-none text-white/88 text-[14px] resize-none placeholder:text-white/25"
                />
              )}
            </div>
          </div>
 
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
          />
 
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || searchMode}
            title="Attach file (PDF, PPT, DOC, ZIP)"
            className="absolute left-3 bottom-3.25 cursor-pointer p-1 text-white/80 hover:bg-black/20 rounded-xl disabled:opacity-40"
          >
            {uploading
              ? <Loader2 size={20} className="animate-spin text-emerald-400" />
              : <Plus size={22} />
            }
          </button>

          {/* Search toggle — left of send button, same white pill style */}
          <button
            onClick={() => {
              const next = !searchMode;
              setSearchMode(next);
              if (!next) setSearchQuery("");
              else setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            title={searchMode ? "Close search" : "Search clips"}
            className="absolute bottom-2.25 right-12 w-8.5 h-8.5 bg-white/80 hover:bg-white text-black flex items-center justify-center rounded-2xl cursor-pointer transition-colors"
          >
            {searchMode ? <X size={16} /> : <Search size={16} />}
          </button>
 
          {/* Temp toggle — hidden in search mode */}
          {!searchMode && (
            <button
              onClick={() => setTemporary((t) => !t)}
              title={
                temporary
                  ? "Temporary — new clips auto-delete in 7 days. Click for permanent"
                  : "Permanent — click to auto-delete new clips in 7 days"
              }
              className={`absolute left-11 bottom-3.25 cursor-pointer p-1 rounded-xl transition-colors ${
                temporary
                  ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
                  : "text-white/80 hover:bg-black/20"
              }`}
            >
              <Clock size={20} />
            </button>
          )}

          {/* Send / close button */}
          <button
            onClick={() => {
              if (searchMode) { setSearchMode(false); setSearchQuery(""); }
              else handleSend();
            }}
            disabled={!searchMode && sending}
            className="absolute bottom-2.25 right-2.5 w-8.5 h-8.5 bg-white/80 hover:bg-white hover:rounded-full text-black flex items-center justify-center rounded-xl cursor-pointer disabled:opacity-50"
          >
            {!searchMode && sending
              ? <Loader2 size={16} className="animate-spin" />
              : <ArrowUp size={18} />
            }
          </button>
        </div>
 
        {temporary && (
          <p className="text-[11px] text-amber-400/80 mt-2 flex items-center gap-1">
            <Clock size={12} />
            Temporary mode — new clips auto-delete in 7 days
          </p>
        )}


      </div>
 
      <Home
        items={items}
        loading={loading}
        onDelete={handleDelete}
        onToggleTemporary={handleToggleTemporary}
        onToggleSaved={handleToggleSaved}
        externalQuery={searchQuery}
        externalSearchMode={searchMode}
      />
    </>
  );

}