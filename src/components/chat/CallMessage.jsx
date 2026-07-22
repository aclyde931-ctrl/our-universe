import { Phone, PhoneCall, Video } from "lucide-react";

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function CallMessage({ message, isOwnMessage, onCallAgain }) {
  const isVideo = message.call_type === "video";
  const status = message.call_status || "ended";
  const duration = Number(message.call_duration) || 0;

  let title = isVideo ? "Video call" : "Voice call";
  let subtitle = duration > 0 ? `Duration · ${formatDuration(duration)}` : "Call ended";

  if (status === "missed") {
    title = isVideo ? "Missed video call" : "Missed voice call";
    subtitle = isOwnMessage ? "No answer" : "You missed this call";
  } else if (status === "declined") {
    title = isVideo ? "Declined video call" : "Declined voice call";
    subtitle = isOwnMessage ? "Your partner declined" : "You declined this call";
  } else if (status === "failed") {
    title = isVideo ? "Video call failed" : "Voice call failed";
    subtitle = "The call could not connect";
  }

  const Icon = isVideo ? Video : Phone;

  return (
    <div
      className={`min-w-[245px] rounded-2xl border p-3 shadow-sm sm:min-w-[280px] ${
        isOwnMessage
          ? "border-white/25 bg-white/15 text-white"
          : "border-rose-100 bg-white text-gray-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            isOwnMessage
              ? "bg-white/20 text-white"
              : status === "missed" || status === "failed"
                ? "bg-red-50 text-red-500"
                : "bg-rose-50 text-rose-500"
          }`}
        >
          <Icon size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p
            className={`mt-0.5 truncate text-xs ${
              isOwnMessage ? "text-white/75" : "text-gray-500"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onCallAgain?.(message.call_type || "audio");
          }}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
            isOwnMessage
              ? "bg-white text-rose-500 hover:bg-rose-50"
              : "bg-rose-500 text-white hover:bg-rose-600"
          }`}
          aria-label={`Start another ${isVideo ? "video" : "voice"} call`}
          title="Call again"
        >
          <PhoneCall size={18} />
        </button>
      </div>
    </div>
  );
}

export default CallMessage;
