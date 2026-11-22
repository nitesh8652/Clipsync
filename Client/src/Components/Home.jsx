import { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText, FileDown, Copy, Download, Clock, Trash2, Loader2,
  Bookmark, BookmarkCheck, Image, Link, File, Search, X,
} from "lucide-react";
import { downloadClipFile } from "../api/clips";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("token");
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocInfo(mimeType, title) {
  const ext = (title || "").split(".").pop().toLowerCase();
  if (mimeType === "application/pdf" || ext === "pdf") return { label: "PDF", color: "#e53935", bg: "#fdecea" };
  if (["xls", "xlsx", "csv"].includes(ext) || mimeType?.includes("spreadsheet") || mimeType?.includes("excel"))
    return { label: "XLS", color: "#2e7d32", bg: "#e8f5e9" };
  if (["doc", "docx"].includes(ext) || mimeType?.includes("word"))
    return { label: "DOC", color: "#1565c0", bg: "#e3f2fd" };
  if (["ppt", "pptx"].includes(ext) || mimeType?.includes("presentation"))
    return { label: "PPT", color: "#e65100", bg: "#fff3e0" };
  return null;
}

function isImageMime(mimeType, title) {
  const ext = (title || "").split(".").pop().toLowerCase();
  return mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
}

function isLink(item) {
  if (item.type !== "text") return false;
  try { new URL(item.rawText || item.preview || ""); return true; } catch { return false; }
}

function getFilterType(item) {
  if (item.type === "file" || item.type === "pdf") {
    if (isImageMime(item.mimeType, item.title)) return "image";
    return "doc";
  }
  if (isLink(item)) return "link";
  return "text";
}

// Build a searchable string for a clip — extracts hostname for URLs so "youtube" matches "www.youtube.com/..."
function getSearchIndex(item) {
  const parts = [item.title || ""];
  const raw = item.rawText || item.preview || "";
  // For links, also index just the hostname so partial domain search works
  if (isLink(item)) {
    try {
      const u = new URL(raw);
      parts.push(u.hostname.replace(/^www\./, "")); // "youtube.com"
      parts.push(u.hostname);                        // "www.youtube.com"
      parts.push(raw);
    } catch {
      parts.push(raw);
    }
  } else {
    parts.push(raw);
  }
  parts.push(item.mimeType || "");
  return parts.join(" ").toLowerCase();
}

async function renderPdfThumbnail(pdfBytes) {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}

function DocPreview({ item }) {
  const [thumb, setThumb] = useState(item.thumbnailUrl || null);
  const [loadingThumb, setLoadingThumb] = useState(false);
  const fetchedRef = useRef(false);

  const docInfo = getDocInfo(item.mimeType, item.title);
  const isPdf = item.mimeType === "application/pdf" || item.title?.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    if (thumb || !isPdf || fetchedRef.current || item.uploading) return;
    if (item.storage === "mongo" || !item.thumbnailUrl) {
      fetchedRef.current = true;
      setLoadingThumb(true);
      fetch(`${API_URL}/clips/${item._id || item.id}/thumbnail`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => (buf ? renderPdfThumbnail(new Uint8Array(buf)) : null))
        .then((dataUrl) => { if (dataUrl) setThumb(dataUrl); })
        .catch(() => {})
        .finally(() => setLoadingThumb(false));
    }
  }, [item._id, item.id, item.storage, item.thumbnailUrl, isPdf, thumb, item.uploading]);

  return (
    <div className="rounded-xl overflow-hidden border border-[#2e2e2c] bg-[#141413] mb-2">
      <div className="relative w-full bg-[#1a1a18]" style={{ aspectRatio: "16/9" }}>
        {(loadingThumb || item.uploading) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        )}
        {thumb && !item.uploading ? (
          <img src={thumb} alt="preview" className="w-full h-full object-cover object-top" />
        ) : !loadingThumb && !item.uploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            {docInfo ? (
              <span className="text-2xl font-black tracking-wider" style={{ color: docInfo.color }}>
                {docInfo.label}
              </span>
            ) : (
              <FileDown size={28} className="text-white/20" />
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        {docInfo && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0"
            style={{ background: docInfo.bg, color: docInfo.color }}>
            {docInfo.label}
          </span>
        )}
        <span className="text-[11px] text-white/60 truncate flex-1">{item.title}</span>
        <span className="text-[10px] text-white/30 shrink-0">{formatBytes(item.size)}</span>
        {item.pageCount && (
          <span className="text-[10px] text-white/30 shrink-0">{item.pageCount}p</span>
        )}
      </div>
    </div>
  );
}

function daysUntil(dateStr) {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}

function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-[92vw] max-h-[88vh] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function HistoryCard({ item, index, onDelete, onToggleTemporary, onToggleSaved }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const isTemporary = Boolean(item.expiresAt);
  const daysLeft = isTemporary ? daysUntil(item.expiresAt) : null;
  const isSaved = Boolean(item.saved);
  const filterType = getFilterType(item);
  const isImg = filterType === "image";
  const isDoc = filterType === "doc";

  const handleAction = async (e) => {
    e.stopPropagation();
    if (item.action === "copy") {
      navigator.clipboard.writeText(item.rawText || item.preview || item.title).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else if (item.action === "download") {
      const clipId = item._id || item.id;
      if (!clipId || String(clipId).startsWith("opt-")) return;
      setDownloading(true);
      try {
        await downloadClipFile(clipId, item.title);
      } catch (err) {
        console.error("Download failed:", err);
      } finally {
        setDownloading(false);
      }
    }
  };

  return (
    <>
    {lightbox && isImg && item.fileUrl && (
      <ImageLightbox src={item.fileUrl} alt={item.title} onClose={() => setLightbox(false)} />
    )}
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all duration-200
      bg-[#171716] border border-[#696969b9] min-h-36 sm:min-h-40
      hover:bg-[#2C2C2A] hover:border-[#F7F0ED] group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top row */}
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

          {/* Save — disabled when temporary */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSaved?.(item); }}
            disabled={isTemporary}
            title={isTemporary ? "Cannot save a temporary clip" : isSaved ? "Saved — click to unsave" : "Save this clip"}
            className={`transition-colors duration-150 p-1.5 rounded-md shrink-0 ${
              isTemporary
                ? "text-[#3a3a38] cursor-not-allowed"
                : isSaved
                ? "text-sky-400 bg-sky-400/10 hover:bg-sky-400/20"
                : "text-[#696969] hover:text-sky-400 hover:bg-sky-400/10"
            }`}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>

          {/* Temp — disabled when saved */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleTemporary?.(item); }}
            disabled={isSaved}
            title={
              isSaved ? "Cannot make a saved clip temporary"
              : isTemporary ? `Temporary — auto-deletes in ${daysLeft} day(s). Click to keep forever`
              : "Permanent — click to auto-delete in 7 days"
            }
            className={`transition-colors duration-150 p-1.5 rounded-md shrink-0 ${
              isSaved
                ? "text-[#3a3a38] cursor-not-allowed"
                : isTemporary
                ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
                : "text-[#696969] hover:text-amber-300 hover:bg-amber-400/10"
            }`}
          >
            <Clock size={16} />
          </button>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(item._id || item.id); }}
            className="p-1.5 rounded-md text-[#696969] hover:text-red-400 hover:bg-red-400/10 shrink-0"
            title="Delete clip"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Content */}
        {(isDoc || item.type === "pdf") ? (
          <DocPreview item={item} />
        ) : isImg && item.fileUrl ? (
          <div
            className="rounded-xl overflow-hidden mb-2 bg-[#141413] cursor-zoom-in"
            style={{ aspectRatio: "16/9" }}
            onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
          >
            <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" />
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

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-3 sm:mt-4 gap-2">
        <div className="text-xs flex gap-1.5 items-center text-[#a09890] min-w-0">
          <Clock className="size-3.5 sm:size-4 shrink-0" />
          <span className="truncate">{item.time}</span>
          {isTemporary && (
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-400/15 text-amber-300"
              title={`Auto-deletes in ${daysLeft} day(s)`}>
              {daysLeft}d
            </span>
          )}
          {isSaved && (
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-sky-400/15 text-sky-300">
              saved
            </span>
          )}
        </div>

        <button
          onClick={handleAction}
          disabled={downloading}
          className="flex items-center gap-1 sm:gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg
          text-[#99968e] bg-[#1F1F1E] border border-transparent transition-all duration-150
          hover:bg-[#ede9e0] hover:border-[#d4cfc6] font-bold hover:text-[#1F1F1E] shrink-0 disabled:opacity-50"
        >
          {item.action === "copy" ? (
            <><Copy size={12} /><span>{copied ? "Copied!" : "Copy"}</span></>
          ) : downloading ? (
            <><Loader2 size={12} className="animate-spin" /><span>Downloading…</span></>
          ) : (
            <><Download size={12} /><span>Download</span></>
          )}
        </button>
      </div>
    </div>
    </>
  );
}

const FILTERS = [
  { key: "all",    label: "All",    Icon: FileText },
  { key: "image",  label: "Images", Icon: Image },
  { key: "doc",    label: "Docs",   Icon: File },
  { key: "link",   label: "Links",  Icon: Link },
  { key: "saved",  label: "Saved",  Icon: BookmarkCheck },
];

export default function RecentHistory({ items = [], loading = false, onDelete, onToggleTemporary, onToggleSaved, externalQuery = "", externalSearchMode = false }) {
  const [filter, setFilter] = useState("all");
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef(null);

  // Sync external search (from ClipBoard input bar) into local state
  useEffect(() => {
    if (externalSearchMode) {
      setSearchMode(true);
      setQuery(externalQuery);
    } else {
      setSearchMode(false);
      setQuery("");
    }
  }, [externalQuery, externalSearchMode]);

  // Focus input when local search mode activates
  useEffect(() => {
    if (searchMode && !externalSearchMode) searchInputRef.current?.focus();
    else if (!searchMode) setQuery("");
  }, [searchMode, externalSearchMode]);

  // Active query: external takes priority
  const activeQuery = externalSearchMode ? externalQuery : query;

  const displayed = useMemo(() => {
    let result = items;
    if (filter === "saved") {
      result = items.filter((i) => i.saved);
    } else if (filter !== "all") {
      result = items.filter((i) => getFilterType(i) === filter);
    }
    const q = activeQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter((i) => getSearchIndex(i).includes(q));
  }, [items, filter, activeQuery]);

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

        {/* Header row */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 gap-3 flex-wrap">
          <h2
            className="text-lg sm:text-xl font-bold shrink-0"
            style={{ color: "#4770C2", fontFamily: "'Georgia', serif" }}
          >
            Recent History
          </h2>

          <div className="flex items-center gap-2">
            {/* Search toggle button */}
            <button
              onClick={() => setSearchMode((s) => !s)}
              title={searchMode ? "Close search" : "Search clips"}
              className={`p-1.5 rounded-lg transition-colors duration-150 ${
                searchMode
                  ? "text-white/80 bg-[#2e2e2c]"
                  : "text-[#696969] hover:text-white/60 hover:bg-[#2e2e2c]"
              }`}
            >
              {searchMode ? <X size={15} /> : <Search size={15} />}
            </button>

            {/* Filter pill bar */}
            <div className="flex items-center gap-1 bg-[#171716] border border-[#2e2e2c] rounded-xl p-1 overflow-x-auto scrollbar-none">
              {FILTERS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                    filter === key
                      ? key === "saved"
                        ? "bg-sky-400/15 text-sky-300"
                        : "bg-[#2e2e2c] text-white/90"
                      : "text-[#696969] hover:text-white/60"
                  }`}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search input — shown when local search mode is on AND external search is not driving */}
        {searchMode && !externalSearchMode && (
          <div className="mb-4 flex items-center gap-2 bg-[#171716] border border-[#2e2e2c] rounded-xl px-3 py-2">
            <Search size={14} className="text-[#696969] shrink-0" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                filter === "all" ? "Search all clips…"
                : filter === "saved" ? "Search saved clips…"
                : `Search ${filter}s…`
              }
              className="flex-1 bg-transparent text-[13px] text-white/80 outline-none placeholder:text-white/25"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[#696969] hover:text-white/60">
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {displayed.length === 0 ? (
          <div className="text-center py-16 sm:py-20 text-[#696969]">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {activeQuery
                ? `No results for "${activeQuery}"`
                : filter === "saved"
                ? "No saved clips yet."
                : filter === "all"
                ? "No clips yet. Paste something above!"
                : `No ${filter}s found.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {displayed.map((item, index) => (
              <HistoryCard
                key={item._id || item.id}
                item={item}
                index={index}
                onDelete={onDelete}
                onToggleTemporary={onToggleTemporary}
                onToggleSaved={onToggleSaved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
