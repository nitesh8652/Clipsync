import { useState } from "react";
import {
  FileText,
  FileDown,
  Copy,
  Download,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react";
import { downloadClipFile } from "../api/clips";

function HistoryCard({ item, index, onDelete }) {
  const [copied, setCopied] = useState(false);

  const handleAction = async () => {
    if (item.action === "copy") {
      navigator.clipboard.writeText(item.rawText || item.preview || item.title).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else if (item.action === "download") {
      try {
        await downloadClipFile(item._id || item.id, item.title);
      } catch (error) {
        console.error("Error downloading clip file:", error);
      }
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(item._id || item.id);
  };

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 
      bg-[#171716] border border-[#696969b9] min-h-36 sm:min-h-40
      hover:bg-[#2C2C2A] hover:border-[#F7F0ED] group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top */}
      <div>
        <div className="flex items-center gap-2 sm:gap-2.5 mb-3">
          <span
            className="flex items-center justify-center rounded-lg w-6 h-6 sm:w-7 sm:h-7 shrink-0"
            style={{ backgroundColor: item.iconBg, color: item.iconColor }}
          >
            {item.icon}
          </span>
          <span
            className="text-xs sm:text-sm font-semibold truncate flex-1"
            style={{ color: "#DEDEDD", fontFamily: "'Georgia', serif" }}
          >
            {item.title}
          </span>
          {/* Delete button — always visible on mobile, hover on desktop */}
          <button
            onClick={handleDelete}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 
            p-1 rounded-md text-[#696969] hover:text-red-400 hover:bg-red-400/10 shrink-0"
            title="Delete clip"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {item.type === "pdf" ? (
          <div className="flex items-center justify-center rounded-xl mb-2 h-12 sm:h-14 bg-[#1F1F1E]">
            <FileDown size={30} className="text-[#c8c2b4] sm:size-9" />
          </div>
        ) : item.preview ? (
          <p
            className="text-xs leading-relaxed line-clamp-3 text-[#7a7568]"
            style={{
              fontFamily: item.type === "code" ? "'Courier New', monospace" : "inherit",
              whiteSpace: item.type === "code" ? "pre-wrap" : "normal",
            }}
          >
            {item.preview}
          </p>
        ) : null}
      </div>

      {/* Bottom */}
      <div className="flex items-center justify-between mt-3 sm:mt-4 gap-2">
        <div className="text-xs flex gap-1.5 items-center text-[#a09890] min-w-0">
          <Clock className="size-3.5 sm:size-4 shrink-0" />
          <span className="truncate">{item.time}</span>
        </div>

        <button
          onClick={handleAction}
          className="flex items-center gap-1 sm:gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg 
          text-[#99968e] bg-[#1F1F1E] border border-transparent transition-all duration-150
          hover:bg-[#ede9e0] hover:border-[#d4cfc6] font-bold hover:text-[#1F1F1E] shrink-0"
        >
          {item.action === "copy" ? (
            <>
              <Copy size={12} />
              <span>{copied ? "Copied!" : "Copy"}</span>
            </>
          ) : (
            <>
              <Download size={12} />
              <span>Download</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function RecentHistory({ items = [], loading = false, onDelete }) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-center pt-16 px-4 sm:px-6 bg-[#1F1F1E]">
        <div className="flex flex-col items-center gap-3 text-[#696969]">
          <Loader2 size={24} className="animate-spin" />
          <p className="text-sm">Loading your clips…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-8 sm:pt-10 px-4 sm:px-6 bg-[#1F1F1E]">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 gap-3">
          <h2
            className="text-lg sm:text-xl font-bold shrink-0"
            style={{ color: "#4770C2", fontFamily: "'Georgia', serif" }}
          >
            Recent History
          </h2>
         
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 sm:py-20 text-[#696969]">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No clips yet. Paste something above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {items.map((item, index) => (
              <HistoryCard
                key={item._id || item.id}
                item={item}
                index={index}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}