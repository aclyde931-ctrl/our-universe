import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Mic,
  RefreshCw,
  FileText,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import MediaTabs from "../components/sharedMedia/MediaTabs";
import MediaViewer from "../components/sharedMedia/MediaViewer";
import { supabase } from "../services/supabase";

const URL_PATTERN = /https?:\/\/[^\s<]+/gi;

function extractLinks(message) {
  const matches = message.content?.match(URL_PATTERN) ?? [];
  return matches.map((url, index) => ({
    id: `${message.id}-${index}`,
    messageId: message.id,
    url: url.replace(/[),.!?]+$/, ""),
    created_at: message.created_at,
  }));
}

function formatDuration(seconds) {
  const value = Number(seconds) || 0;
  const minutes = Math.floor(value / 60);
  const remaining = value % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SharedMedia() {
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("photos");
  const [viewerIndex, setViewerIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMedia() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("messages")
      .select("id, sender_id, content, image_url, file_url, file_name, file_size, file_type, voice_url, voice_duration, created_at")
      .order("created_at", { ascending: false });

    if (loadError) {
      console.error("Unable to load shared media:", loadError);
      setError("Shared media could not be loaded. Please try again.");
    } else {
      setMessages(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMedia();

    const channel = supabase
      .channel("shared-media-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => loadMedia()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const photos = useMemo(
    () => messages.filter((message) => Boolean(message.image_url)),
    [messages]
  );

  const files = useMemo(
    () => messages.filter((message) => Boolean(message.file_url)),
    [messages]
  );

  const voiceMessages = useMemo(
    () => messages.filter((message) => Boolean(message.voice_url)),
    [messages]
  );

  const links = useMemo(
    () => messages.flatMap(extractLinks),
    [messages]
  );

  const counts = {
    photos: photos.length,
    files: files.length,
    voice: voiceMessages.length,
    links: links.length,
  };

  return (
    <div className="min-h-screen bg-[#fff7f9] pb-28">
      <header className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 px-5 pb-10 pt-6 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link
            to="/chat"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur transition hover:bg-white/30"
            aria-label="Back to chat"
          >
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Shared Media</h1>
            <p className="mt-1 text-sm text-rose-100">
              Recently shared photos, files, voice messages, and links
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-6xl px-4 sm:px-5">
        <MediaTabs activeTab={activeTab} counts={counts} onChange={setActiveTab} />

        <section className="mt-6">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-3xl border border-rose-100 bg-white">
              <LoaderCircle className="animate-spin text-rose-500" size={32} />
            </div>
          ) : error ? (
            <EmptyState icon={RefreshCw} title="Could not load media" description={error}>
              <button
                type="button"
                onClick={loadMedia}
                className="mt-4 rounded-xl bg-rose-500 px-5 py-2.5 font-semibold text-white"
              >
                Try again
              </button>
            </EmptyState>
          ) : activeTab === "photos" ? (
            photos.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setViewerIndex(index)}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-rose-100 shadow-sm"
                  >
                    <img
                      src={photo.image_url}
                      alt="Shared chat memory"
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-left text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                      {formatDate(photo.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ImageIcon}
                title="No photos yet"
                description="Photos sent in your chat will appear here automatically."
              />
            )
          ) : activeTab === "files" ? (
            files.length ? (
              <div className="space-y-3">
                {files.map((file) => (
                  <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer" download={file.file_name || undefined} className="group flex items-center gap-4 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-500"><FileText size={23} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">{file.file_name || "Shared file"}</p>
                      <p className="text-xs text-slate-500">{file.file_size ? `${(Number(file.file_size) / 1024 / 1024).toFixed(2)} MB · ` : ""}{formatDate(file.created_at)}</p>
                    </div>
                    <Download size={20} className="shrink-0 text-slate-300 transition group-hover:text-rose-500" />
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No files yet" description="Documents sent in your chat will appear here automatically." />
            )
          ) : activeTab === "voice" ? (
            voiceMessages.length ? (
              <div className="space-y-3">
                {voiceMessages.map((voice) => (
                  <article
                    key={voice.id}
                    className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
                        <Mic size={21} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-800">Voice message</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(voice.created_at)} · {formatDuration(voice.voice_duration)}
                            </p>
                          </div>
                        </div>
                        <audio controls preload="metadata" src={voice.voice_url} className="h-10 w-full" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Mic}
                title="No voice messages yet"
                description="Voice messages from your conversation will be collected here."
              />
            )
          ) : links.length ? (
            <div className="space-y-3">
              {links.map((item) => {
                let hostname = item.url;
                try {
                  hostname = new URL(item.url).hostname.replace(/^www\./, "");
                } catch {
                  // Keep the original URL when it cannot be parsed.
                }

                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-500">
                      <Link2 size={21} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">{hostname}</p>
                      <p className="truncate text-sm text-slate-500">{item.url}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(item.created_at)}</p>
                    </div>
                    <ExternalLink className="shrink-0 text-slate-300 transition group-hover:text-rose-500" size={20} />
                  </a>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Link2}
              title="No links yet"
              description="Website links sent in chat will appear here automatically."
            />
          )}
        </section>
      </main>

      <MediaViewer
        items={photos}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onChange={setViewerIndex}
      />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-rose-200 bg-white px-6 text-center shadow-sm">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
        <Icon size={27} />
      </span>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {children}
    </div>
  );
}
