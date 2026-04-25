import { useState, useRef, useEffect } from "react";
import { ArrowUp, FileText, Plus } from "lucide-react";
import Navbar from "./Navbar";
import Home from "./Home";

const typeStyles = {
  text: { iconBg: "#e8f5ee", iconColor: "#3a8f5c" },
  code: { iconBg: "#eaf0fb", iconColor: "#3a5fbf" },
  pdf: { iconBg: "#f0ede8", iconColor: "#8a7560" },
}

function detectType(text) {
  if (/^\s*(const|let|var|function|import|export|class|if|for|<)/.test(text)) return "code";
  return "text";
}

export default function ClipInput() {
  const [value, setValue] = useState("");
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([])
  const fileInputRef = useRef(null);


  // Get token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      // Clean token from URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
      console.log("✅ Logged in, token saved.");
    }
  }, []);



  const handleSend = () => {
    if (!value.trim()) return;
    const type = detectType(value)
    const { iconBg, iconColor } = typeStyles[type]
    setItems((prev) => [{
      id: Date.now(),
      icon: <FileText size={15} />,
      iconBg, iconColor, type,
      title: value.slice(0, 15) + (value.length > 15 ? "..." : ""),
      preview: value,
      time: "Just now",
      action: "copy",
      rawText: value,
    }, ...prev])
    setValue("")

    console.log("Sending:", value);
    setValue("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const {iconBg, iconColor} = typeStyles[isPdf ? "pdf" : "text"]
    setItems((prev) => [{
      id:Date.now(),
      icon:<FileText size={15}/>,
      iconBg, iconColor,
      type: isPdf ? "pdf" : "text",
      title: file.name,
      preview: null,
      time: "Just now",
      action: "download",
      file
    }, ...prev])
    e.target.value = "",
    console.log("Selected file:", file.name);
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

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

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