import {
  ArrowLeft,
  Images,
  Phone,
  Search,
  UserRound,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "P";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function PartnerAvatar({ name, avatarUrl, isOnline }) {
  return (
    <div className="relative shrink-0" aria-hidden="true">
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-white text-sm font-extrabold text-rose-500 shadow-md sm:h-12 sm:w-12">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover transition-opacity duration-300"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        ) : name && name !== "Your Partner" ? (
          <span>{getInitials(name)}</span>
        ) : (
          <UserRound size={21} />
        )}
      </div>

      <span
        className={`absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-pink-500 shadow-sm transition-colors duration-200 ${
          isOnline ? "bg-emerald-400" : "bg-white/70"
        }`}
      >
        {isOnline && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-50" />
        )}
      </span>
    </div>
  );
}

export default function ChatHeader({
  partnerName,
  partnerAvatarUrl,
  partnerIsOnline,
  partnerIsTyping,
  onStartCall,
  onOpenSearch,
}) {
  const statusText = partnerIsTyping
    ? "Typing..."
    : partnerIsOnline
      ? "Online"
      : "Offline";

  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-3 text-white shadow-md sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-4xl items-center gap-2.5 sm:gap-3">
        <Link
          to="/dashboard"
          aria-label="Return to dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95"
        >
          <ArrowLeft size={21} />
        </Link>

        <PartnerAvatar
          name={partnerName}
          avatarUrl={partnerAvatarUrl}
          isOnline={partnerIsOnline}
        />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-tight sm:text-xl">
            {partnerName}
          </h1>

          <div
            className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-medium sm:text-sm ${
              partnerIsTyping ? "text-white" : "text-rose-100"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                partnerIsTyping
                  ? "animate-pulse bg-white"
                  : partnerIsOnline
                    ? "bg-emerald-300"
                    : "bg-white/50"
              }`}
            />
            <span className="truncate">{statusText}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search messages"
            title="Search messages"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95 sm:h-11 sm:w-11"
          >
            <Search size={19} />
          </button>

          <Link
            to="/shared-media"
            aria-label="Open shared media"
            title="Shared media"
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95 min-[420px]:flex sm:h-11 sm:w-11"
          >
            <Images size={19} />
          </Link>

          <button
            type="button"
            onClick={() => onStartCall("audio")}
            aria-label={`Start audio call with ${partnerName}`}
            title="Audio call"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95 sm:h-11 sm:w-11"
          >
            <Phone size={18} fill="currentColor" />
          </button>

          <button
            type="button"
            onClick={() => onStartCall("video")}
            aria-label={`Start video call with ${partnerName}`}
            title="Video call"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95 sm:h-11 sm:w-11"
          >
            <Video size={19} fill="currentColor" />
          </button>
        </div>
      </div>
    </header>
  );
}
