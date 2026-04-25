import { useState, useRef, useEffect } from "react";
import { ArrowUp, FileText, Plus } from "lucide-react";
import Navbar from "./Navbar";
import Home from "./Home";

const typeStyles = [
  { iconBg: "#e8f8f5", iconColor: "#2fa38a" }, // teal soft
  { iconBg: "#eef2ff", iconColor: "#4f46e5" }, // indigo
  { iconBg: "#f0fdf4", iconColor: "#22c55e" }, // green
  { iconBg: "#fff7ed", iconColor: "#f97316" }, // orange
  { iconBg: "#f5f3ff", iconColor: "#8b5cf6" }, // violet
  { iconBg: "#ecfeff", iconColor: "#06b6d4" }, // cyan
  { iconBg: "#fef2f2", iconColor: "#ef4444" }, // red
  { iconBg: "#f8fafc", iconColor: "#334155" }, // slate
  { iconBg: "#fff1f2", iconColor: "#e11d48" }, // rose
  { iconBg: "#fffbeb", iconColor: "#d97706" }, // amber
  { iconBg: "#f0f9ff", iconColor: "#0284c7" }, // sky blue
  { iconBg: "#faf5ff", iconColor: "#a855f7" }, // purple light
  { iconBg: "#ecfdf5", iconColor: "#059669" }, // emerald
  { iconBg: "#fefce8", iconColor: "#ca8a04" }, // yellow
  { iconBg: "#f1f5f9", iconColor: "#475569" }, // cool gray
];

let lastStyleIndex = -1

function randomStyle() {
  let index
  do {
    index = Math.floor(Math.random() * typeStyles.length)
  } while (index === lastStyleIndex);
  lastStyleIndex = index
  return typeStyles[index]

}

export default function ClipInput() {
  const [value, setValue] = useState("");
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, document.title, window.location.pathname);
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
    }
  }, []);

  const handleSend = () => {
    if (!value.trim()) return;
    const { iconBg, iconColor } = randomStyle();
    setItems((prev) => [{
      id: Date.now(),
      icon: <FileText size={15} />,
      iconBg, iconColor,
      type: "text",
      title: value.slice(0, 8) + (value.length > 8 ? "..." : ""),
      preview: value,
      time: "Just now",
      action: "copy",
      rawText: value,
    }, ...prev]);
    setValue("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isDownloadable = file.type === "application/pdf" || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.type === "application/zip" || file.name.endsWith(".zip") || file.name.endsWith(".zipped") || file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.type.startsWith("image/") || file.name.endsWith(".ppt") || file.name.endsWith(".pptx");
    const { iconBg, iconColor } = randomStyle();
    setItems((prev) => [{
      id: Date.now(),
      icon: <FileText size={15} />,
      iconBg, iconColor,
      type: isDownloadable ? "pdf" : "text",
      title: file.name,
      preview: null,
      time: "Just now",
      action: "download",
      file,
    }, ...prev]);
    e.target.value = "";
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
        </div>

        <div className="relative w-full max-w-130">
          <div
            className="rounded-[18px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(120,80,255,0.8), rgba(56,189,248,0.7), rgba(16,185,129,0.6), rgba(120,80,255,0.5))",
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

          <input type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.docx,.zip,.zipped,.mp3,.mp4,.ppt,.pptx,image/*,audio/*,video/*"
          className="hidden" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-3 bottom-3.25 cursor-pointer p-1 text-white/80 hover:bg-black/20 rounded-xl"
          >
            <Plus size={22} />
          </button>

          <button
            onClick={handleSend}
            className="absolute bottom-2.25 right-2.5 w-8.5 h-8.5 bg-white/80 hover:bg-white hover:rounded-full text-black flex items-center justify-center rounded-xl cursor-pointer"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
      <Home items={items} />
    </>
  );
}