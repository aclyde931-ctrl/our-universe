import { AlertTriangle, FileText, Image, Loader2, Mic, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

function getMessageDetails(message) {
  if (!message) {
    return {
      label: "Message",
      description: "This message will be permanently removed from the conversation.",
      Icon: Trash2,
    };
  }

  if (message.image_url) {
    return {
      label: "Photo",
      description: "This photo will be permanently removed from the conversation.",
      Icon: Image,
    };
  }

  if (message.file_url) {
    return {
      label: message.file_name || "Attached file",
      description: "This attachment will be permanently removed from the conversation.",
      Icon: FileText,
    };
  }

  if (message.voice_url) {
    return {
      label: "Voice message",
      description: "This voice message will be permanently removed from the conversation.",
      Icon: Mic,
    };
  }

  return {
    label: "Message",
    description: "This message will be permanently removed from the conversation.",
    Icon: Trash2,
  };
}

function DeleteMessageModal({ open, message, deleting, onCancel, onConfirm }) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    function handleKeyDown(event) {
      if (event.key === "Escape" && !deleting) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, deleting, onCancel]);

  if (!open || !message) return null;

  const { label, description, Icon } = getMessageDetails(message);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) {
          onCancel();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-message-title"
        aria-describedby="delete-message-description"
        className="relative w-full max-w-sm animate-[deleteModalIn_180ms_ease-out] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl shadow-slate-950/25"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          aria-label="Close delete message dialog"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <div className="px-6 pb-5 pt-7 text-center sm:px-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-8 ring-red-50/60">
            <AlertTriangle size={30} strokeWidth={2.2} />
          </div>

          <h2
            id="delete-message-title"
            className="mt-6 text-xl font-bold tracking-tight text-slate-900"
          >
            Delete message?
          </h2>

          <p
            id="delete-message-description"
            className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500"
          >
            {description} This action cannot be undone.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
              <Icon size={21} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
              {message.content?.trim() && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
                  {message.content.trim()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/80 p-4 sm:p-5">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deleting ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={17} />
                Delete
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteMessageModal;
