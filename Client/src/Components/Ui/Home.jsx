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
import { downloadClipFile } from "../../api/clips";

function HistoryCard({ item, index, onDelete }) {
  const [copied, setCopied] = useState(false);

  const handleAction = async () => {
    if (item.action === "copy") {
      navigator.clipboard.writeText(item.rawText || item.preview || item.title).catch(() => { });
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
      className="rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 
      bg-[#171716] border border-[#696969b9] min-h-40
      hover:bg-[#2C2C2A] hover:border-[#F7F0ED] group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="flex items-center justify-center rounded-lg w-7 h-7 shrink-0"
            style={{ backgroundColor: item.iconBg, color: item.iconColor }}
          >
            {item.icon}
          </span>
          <span
            className="text-sm font-semibold truncate flex-1"
            style={{ color: "#DEDEDD", fontFamily: "'Georgia', serif" }}
          >
            {item.title}
          </span>
          {/* Delete button — shows on hover */}
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 
            p-1 rounded-md text-[#696969] hover:text-red-400 hover:bg-red-400/10"
            title="Delete clip"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {item.type === "pdf" ? (
          <div className="flex items-center justify-center rounded-xl mb-2 h-14 bg-[#1F1F1E]">
            <FileDown size={36} className="text-[#c8c2b4]" />
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
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs flex gap-2 text-[#a09890]">
          <Clock className="size-4" />
          {item.time}
        </div>

        <button
          onClick={handleAction}
          className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg 
          text-[#99968e] bg-[#1F1F1E] border border-transparent transition-all duration-150
          hover:bg-[#ede9e0] hover:border-[#d4cfc6] font-bold hover:text-[#1F1F1E]"
        >
          {item.action === "copy" ? (
            <>
              <Copy size={13} />
              <span>{copied ? "Copied!" : "Copy"}</span>
            </>
          ) : (
            <>
              <Download size={13} />
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
      <div className="min-h-screen flex items-start justify-center pt-16 px-6 bg-[#1F1F1E]">
        <div className="flex flex-col items-center gap-3 text-[#696969]">
          <Loader2 size={24} className="animate-spin" />
          <p className="text-sm">Loading your clips…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-10 px-6 bg-[#1F1F1E]">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl font-bold"
            style={{ color: "#4770C2", fontFamily: "'Georgia', serif" }}
          >
            Recent History
          </h2>
          <span className="text-xs text-[#696969]">
            Clips auto-delete after 6 hours
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-[#696969]">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No clips yet. Paste something above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
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