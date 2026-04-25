import { useState } from "react";
import {
  FileText,
  FileDown,
  Copy,
  Download,
  Clock,
} from "lucide-react";

const staticHistoryItems  = [
  {
    id: 1,
    icon: <FileText size={15} />,
    iconBg: "#e8f5ee",
    iconColor: "#3a8f5c",
    title: "Project Proposal Draft",
    preview:
      "Here is a draft for the upcoming Q3 project proposal focusing on sustainable design initiatives...",
    time: "2 hours ago",
    action: "copy",
    type: "text",
  },
  {
    id: 2,
    icon: <FileText size={15} />,
    iconBg: "#f0ede8",
    iconColor: "#8a7560",
    title: "Q2_Financial_Report.pdf",
    preview: null,
    time: "Yesterday",
    action: "download",
    type: "pdf",
  },
  {
    id: 3,
    icon: <FileText size={15} />,
    iconBg: "#eaf0fb",
    iconColor: "#3a5fbf",
    title: "React Component Structure",
    preview: "const UserProfile = ({ user }) => { return (\n\n  ..",
    time: "Oct 12",
    action: "copy",
    type: "code",
  },
  {
    id: 4,
    icon: <FileText size={15} />,
    iconBg: "#fdf0e8",
    iconColor: "#bf6a3a",
    title: "Translation: Greeting",
    preview:
      "Bonjour, j'espère que vous passez une excellente journée...",
    time: "Oct 10",
    action: "copy",
    type: "text",
  },
];

const staticItems = [
  { id: 1, icon: <FileText size={15} />, iconBg: "#e8f5ee", iconColor: "#3a8f5c", title: "Project Proposal Draft", preview: "Here is a draft for the upcoming Q3 project proposal focusing on sustainable design initiatives...", time: "2 hours ago", action: "copy", type: "text" },
  { id: 2, icon: <FileText size={15} />, iconBg: "#f0ede8", iconColor: "#8a7560", title: "Q2_Financial_Report.pdf", preview: null, time: "Yesterday", action: "download", type: "pdf" },
  { id: 3, icon: <FileText size={15} />, iconBg: "#eaf0fb", iconColor: "#3a5fbf", title: "React Component Structure", preview: "const UserProfile = ({ user }) => { return (\n\n  ..", time: "Oct 12", action: "copy", type: "code" },
  { id: 4, icon: <FileText size={15} />, iconBg: "#fdf0e8", iconColor: "#bf6a3a", title: "Translation: Greeting", preview: "Bonjour, j'espère que vous passez une excellente journée...", time: "Oct 10", action: "copy", type: "text" },
];

function HistoryCard({ item, index, isNew }) {
  const [copied, setCopied] = useState(false);

  const handleAction = () => {
    if (item.action === "copy") {
        navigator.clipboard.writeText(item.rawText || item.preview || item.title).catch(()=>{})
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };


  return (
    <div
      className="rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 
      bg-[#171716] border border-[#696969b9] min-h-40
      hover:bg-[#2C2C2A] hover:border-[#F7F0ED]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="flex items-center justify-center rounded-lg w-7 h-7"
            style={{
              backgroundColor: item.iconBg,
              color: item.iconColor,
            }}
          >
            {item.icon}
          </span>

          <span
            className="text-sm font-semibold truncate"
            style={{
              color: "#DEDEDD",
              fontFamily: "'Georgia', serif",
            }}
          >
            {item.title}
          </span>
        </div>

        {/* Preview */}
        {item.type === "pdf" ? (
          <div className="flex items-center justify-center rounded-xl mb-2 h-14 bg-[#1F1F1E]">
            <FileDown size={36} className="text-[#c8c2b4]" />
          </div>
        ) : item.preview ? (
          <p
            className="text-xs leading-relaxed line-clamp-3 text-[#7a7568]"
            style={{
              fontFamily:
                item.type === "code"
                  ? "'Courier New', monospace"
                  : "inherit",
              whiteSpace:
                item.type === "code" ? "pre-wrap" : "normal",
            }}
          >
            {item.preview}
          </p>
        ) : null}
      </div>

      {/* Bottom */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs flex gap-2   text-[#a09890]">
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

export default function RecentHistory({items = []}) {
  const allItems = [...items, ...staticItems];

  return (
    <div className="min-h-screen flex items-start justify-center pt-10 px-6 bg-[#1F1F1E]">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl font-bold"
            style={{
              color: "#4770C2",
              fontFamily: "'Georgia', serif",
            }}
          >
            Recent History
          </h2>

          <button className="text-sm font-medium text-[#3a8f5c] hover:text-[#2d6a4f] transition-colors duration-150">
            View All
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4">
            {allItems.map((item, index) => (
            <HistoryCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}