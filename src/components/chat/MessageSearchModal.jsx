import { ArrowLeft, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabase";

export default function MessageSearchModal({ open, onClose, onSelectMessage, currentUserId }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError("");
      return;
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setError("");
      const safeTerm = term.replace(/[%_]/g, "\\$&");
      const { data, error: searchError } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at")
        .ilike("content", `%${safeTerm}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchError) {
        console.error("Unable to search messages:", searchError);
        setError("Unable to search messages right now.");
        setResults([]);
      } else {
        setResults(data ?? []);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#fff7f9]">
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-3 text-white shadow-md sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <button type="button" onClick={onClose} aria-label="Close message search" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30">
            <ArrowLeft size={21} />
          </button>
          <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-white px-4 text-gray-700 shadow-sm">
            <Search size={18} className="shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {searching ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 size={20} className="animate-spin text-rose-500" /> Searching messages...
          </div>
        ) : error ? (
          <p className="py-12 text-center text-sm text-red-500">{error}</p>
        ) : query.trim().length < 2 ? (
          <p className="py-12 text-center text-sm text-gray-500">Type at least two letters to search your conversation.</p>
        ) : results.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No matching messages found.</p>
        ) : (
          <div className="space-y-2">
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{results.length} result{results.length === 1 ? "" : "s"}</p>
            {results.map((result) => (
              <button
                type="button"
                key={result.id}
                onClick={() => onSelectMessage(result)}
                className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left shadow-sm transition hover:border-rose-200 hover:bg-rose-50"
              >
                <p className="text-xs font-bold text-rose-500">{result.sender_id === currentUserId ? "You" : "Your partner"}</p>
                <p className="mt-1 line-clamp-2 text-sm text-gray-700">{result.content}</p>
                <p className="mt-2 text-[11px] text-gray-400">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.created_at))}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
