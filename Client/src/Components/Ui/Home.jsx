import { useState } from "react";
import {
  FileText,
  FileDown,
  Code2,
  Languages,
  Copy,
  Download,
} from "lucide-react";

const historyItems = [
  {
    id: 1,
    icon: <FileText size={15} />,
    iconBg: "#e8f5ee",
    iconColor: "#3a8f5c",
    title: "Project Proposal Draft",
    preview: "Here is a draft for the upcoming Q3 project proposal focusing on sustainable design initiatives...",
    time: "2 hours ago",
    action: "copy",
    type: "text",
  },
  {
    id: 2,
    icon: <FileDown size={15} />,
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
    icon: <Code2 size={15} />,
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
    icon: <Languages size={15} />,
    iconBg: "#fdf0e8",
    iconColor: "#bf6a3a",
    title: "Translation: Greeting",
    preview: "Bonjour, j'espère que vous passez une excellente journée. N'hésitez pas à me contacter si...",
    time: "Oct 10",
    action: "copy",
    type: "text",
  },
];

function HistoryCard({ item, index }) {
  const [copied, setCopied] = useState(false);

  const handleAction = () => {
    if (item.action === "copy") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className="rounded-2xl p-5 flex flex-col justify-between cursor-pointer group transition-all duration-200 "
      style={{
        backgroundColor: "#faf8f4",
        border: "1px solid #ece8df",
        minHeight: "160px",
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = "#f5f1e8";
        e.currentTarget.style.borderColor = "#d9d3c7";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = "#faf8f4";
        e.currentTarget.style.borderColor = "#ece8df";
      }}
    >
      {/* Top row */}
      <div>
        <div className="flex items-center gap-2.5 mb-3 ">
          <span
            className="flex items-center justify-center rounded-lg w-7 h-7 flex-shrink-0"
            style={{ backgroundColor: item.iconBg, color: item.iconColor }}
          >
            {item.icon}
          </span>
          <span
            className="text-sm font-semibold truncate"
            style={{ color: "#2c2a26", fontFamily: "'Georgia', serif" }}
          >
            {item.title}
          </span>
        </div>

        {/* Content preview or placeholder */}
        {item.type === "pdf" ? (
          <div
            className="flex items-center justify-center rounded-xl mb-2"
            style={{ height: "56px", backgroundColor: "#ede9e0" }}
          >
            <FileDown size={36} style={{ color: "#c8c2b4" }} />
          </div>
        ) : item.preview ? (
          <p
            className="text-xs leading-relaxed line-clamp-3"
            style={{
              color: "#7a7568",
              fontFamily: item.type === "code" ? "'Courier New', monospace" : "inherit",
              whiteSpace: item.type === "code" ? "pre-wrap" : "normal",
            }}
          >
            {item.preview}
          </p>
        ) : null}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs" style={{ color: "#a09890" }}>
          {item.time}
        </span>
        <button
          onClick={handleAction}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all duration-150"
          style={{
            color: "#7a7568",
            backgroundColor: "transparent",
            border: "1px solid transparent",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = "#ede9e0";
            e.currentTarget.style.borderColor = "#d4cfc6";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
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

export default function RecentHistory() {
  return (
    <div
      className="min-h-screen flex items-start justify-center pt-10 px-6"
      style={{ backgroundColor: "#1F1F1E" }}
    >
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl font-bold"
            style={{ color: "#4770C2", fontFamily: "'Georgia', serif" }}
          >
            Recent History
          </h2>
          <button
            className="text-sm font-medium transition-colors duration-150"
            style={{ color: "#3a8f5c" }}
            onMouseEnter={e => e.currentTarget.style.color = "#2d6a4f"}
            onMouseLeave={e => e.currentTarget.style.color = "#3a8f5c"}
          >
            View All
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4">
          {historyItems.map((item, index) => (
            <HistoryCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}