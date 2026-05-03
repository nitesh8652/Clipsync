import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, FileText, Plus, Loader2, Paperclip } from "lucide-react";
import Navbar from "./Navbar";
import Home from "./Home";
import { useSocket } from "../../Hooks/useSocket";
import { fetchClips, createClip, deleteClip, uploadClipFile } from "../../api/clips";

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

const ACCEPTED_FILE_TYPES = ".pdf,.ppt,.pptx,.doc,.docx,.zip";

export default function ClipInput() {
  const [value, setValue] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | error
  const fileInputRef = useRef(null);

  // ── Bootstrap: read token from URL param or localStorage ──────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    let activeToken = urlToken || localStorage.getItem("token");
    if (!activeToken) return;

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

  //Only establishes connection when token exists
  const { emitNewClip, emitDeleteClip } = useSocket(token, {
    onNewClip: handleRemoteNewClip,
    onDeleteClip: handleRemoteDeleteClip,
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
    };

    setItems((prev) => [optimisticClip, ...prev]); //instant ui
    setValue("");

    if (!token) return; // not logged in — local only

    setSending(true);
    try {
      const clipData = { title, preview: value, rawText: value, type: "text", action: "copy", iconBg, iconColor };
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

  // ── File upload (local only for now) ────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return
    e.target.value = "" //reset input after upload

    setUploadError(null)

    //validate file size
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File size must be less than 20 MB");
      return;
    }

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
    };

    setItems((prev) => [optimisticClip, ...prev]); //instant ui
    setUploading(true)

    if (!token) {
      setUploading(false)
      return
    }

    try {
      const { clip } = await uploadClipFile(file, { iconBg, iconColor });
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

 return (
    <>
      <Navbar />
      <div className="bg-[#1F1F1E] flex flex-col items-center justify-center px-6 font-[Sora,sans-serif]">
        <div className="text-center mb-8 mt-8">
          <h1 className="text-[22px] font-extrabold text-white/85 tracking-wide mb-1">
            What can I help you Copy, {user?.name || "😘"}?
          </h1>
          <p className="text-[13px] text-white/30 tracking-widest">Made by Nitesh!</p>
 
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
 
        <div className="relative w-full max-w-130">
          <div
            className="rounded-[18px] p-[1.5px]"
            style={{
              background: "linear-gradient(135deg, rgba(120,80,255,0.8), rgba(56,189,248,0.7), rgba(16,185,129,0.6), rgba(120,80,255,0.5))",
            }}
          >
            <div className="bg-[#1F1F1E] rounded-[17px] px-12 py-3 flex items-end gap-3 relative">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Paste here anything..."
                className="flex-1 bg-transparent p-0.75 outline-none text-white/88 text-[14px] resize-none placeholder:text-white/25"
              />
            </div>
          </div>
 
          {/* Hidden file input — only doc types now */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
          />
 
          {/* Attach button — shows spinner while uploading */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach file (PDF, PPT, DOC, ZIP — max 10 MB)"
            className="absolute left-3 bottom-3.25 cursor-pointer p-1 text-white/80 hover:bg-black/20 rounded-xl disabled:opacity-40"
          >
            {uploading
              ? <Loader2 size={20} className="animate-spin text-emerald-400" />
              : <Plus size={22} />
            }
          </button>
 
          <button
            onClick={handleSend}
            disabled={sending}
            className="absolute bottom-2.25 right-2.5 w-8.5 h-8.5 bg-white/80 hover:bg-white hover:rounded-full text-black flex items-center justify-center rounded-xl cursor-pointer disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </div>
 
        {!token && (
          <p className="text-[11px] text-white/25 mt-3">
            Sign in with Google to sync across devices
          </p>
        )}
 
        {/* Hint about supported file types */}
        <p className="text-[10px] text-white/15 mt-2">
          Attach: PDF · PPT · DOC · ZIP &nbsp;·&nbsp; max 10 MB &nbsp;·&nbsp; auto-deleted after 6 h
        </p>
      </div>
 
      <Home items={items} loading={loading} onDelete={handleDelete} />
    </>
  );

}