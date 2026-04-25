import { useState, useRef, useEffect } from "react";
import { ArrowUp, FileText, Plus } from "lucide-react";
import Navbar from "./Navbar";
import Home from "./Home";

const typeStyles = [
  { iconBg: "#e8f5ee", iconColor: "#3a8f5c" },
  { iconBg: "#eaf0fb", iconColor: "#3a5fbf" },
  { iconBg: "#f0ede8", iconColor: "#8a7560" },
  { iconBg: "#fdf0e8", iconColor: "#bf6a3a" },
  { iconBg: "#f3e8fd", iconColor: "#7c3abf" },
  { iconBg: "#fef9e8", iconColor: "#b89a2a" },
  { iconBg: "#fde8ee", iconColor: "#bf3a5f" },
];

let lastStyleIndex = -1

function randomStyle(){
  let index
  do{
index= Math.floor(Math.random()*typeStyles.length)
  }while (index === lastStyleIndex);
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
      title: value.slice(0, 40) + (value.length > 40 ? "..." : ""),
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
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const { iconBg, iconColor } = randomStyle();
    setItems((prev) => [{
      id: Date.now(),
      icon: <FileText size={15} />,
      iconBg, iconColor,
      type: isPdf ? "pdf" : "text",
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