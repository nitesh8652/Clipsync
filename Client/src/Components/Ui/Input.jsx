import { useState, useRef } from "react";
import { ArrowUp, Plus } from "lucide-react";
import Navbar from "./Navbar";
import Home from "./Home";

const hints = [
  "Build a REST API with Express",
  "Create a React component",
  "Design a MongoDB schema",
  "Set up Tailwind CSS config",
];

export default function ClipInput() {
  const [value, setValue] = useState("");
  const fileInputRef = useRef(null);

  const handleInput = (e) => {
    setValue(e.target.value);
  };

  const handleSend = () => {
    if (!value.trim()) return;
    console.log("Sending text:", value);
    setValue("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log("Selected file:", file.name);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fillInput = (text) => {
    setValue(text);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#1F1F1E] flex flex-col items-center justify-center px-6 font-[Sora,sans-serif]">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[22px] font-extrabold text-white/85 tracking-wide mb-1">
            What can I help you Copy?
          </h1>
          <p className="text-[13px] text-white/30 tracking-widest">
            Made by Nitesh!
          </p>
        </div>

        {/* Input */}
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
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent p-0.75 outline-none text-white/88 text-[14px] resize-none placeholder:text-white/25"
              />
            </div>
          </div>

          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Attach */}
          <button
            onClick={triggerFileSelect}
            className="absolute left-3 bottom-3.25 cursor-pointer p-1 text-white/80 hover:bg-black/20 rounded-xl"
          >
            <Plus size={22} />
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            className="absolute bottom-2.25 right-2.5 w-8.5 h-8.5 bg-white/80 hover:bg-white hover:rounded-full text-black  flex items-center justify-center rounded-xl  cursor-pointer "
          >
            <ArrowUp size={18} />
          </button>
        </div>

        {/* Hints */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {hints.map((hint) => (
            <button
              key={hint}
              onClick={() => fillInput(hint)}
              className="text-[11px] text-white/40 border border-white/10 rounded-full px-3 py-1 hover:text-white/70"
            >
              {hint}
            </button>
          ))}
        </div>
      </div>
      <Home/>
    </>
  );
}