import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const SWIPE_DISTANCE = 45;

export default function MediaViewer({ items, index, onClose, onChange }) {
  const touchStartX = useRef(null);

  const current = index === null ? null : items[index];
  const hasPrevious = index !== null && index > 0;
  const hasNext = index !== null && index < items.length - 1;

  useEffect(() => {
    if (!current) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrevious) onChange(index - 1);
      if (event.key === "ArrowRight" && hasNext) onChange(index + 1);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [current, hasNext, hasPrevious, index, onChange, onClose]);

  if (!current) return null;

  function handleTouchStart(event) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;

    if (distance > SWIPE_DISTANCE && hasPrevious) onChange(index - 1);
    if (distance < -SWIPE_DISTANCE && hasNext) onChange(index + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Shared photo viewer"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 pb-10 pt-4 text-white sm:px-6">
        <div>
          <p className="text-sm font-semibold">{index + 1} of {items.length}</p>
          <p className="mt-0.5 text-xs text-white/70">
            {new Date(current.created_at).toLocaleString([], {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
          aria-label="Close photo"
        >
          <X size={24} />
        </button>
      </div>

      {hasPrevious && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange(index - 1);
          }}
          className="absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:left-6"
          aria-label="Previous photo"
        >
          <ChevronLeft size={30} />
        </button>
      )}

      <div
        className="flex max-h-[88vh] max-w-[94vw] items-center justify-center pt-16 sm:max-w-[90vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={current.image_url}
          alt={`Shared memory ${index + 1} of ${items.length}`}
          className="max-h-[78vh] max-w-full select-none rounded-xl object-contain shadow-2xl sm:max-h-[82vh]"
          draggable="false"
        />
      </div>

      {hasNext && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange(index + 1);
          }}
          className="absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:right-6"
          aria-label="Next photo"
        >
          <ChevronRight size={30} />
        </button>
      )}

      {items.length > 1 && (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 text-xs text-white/85 backdrop-blur">
          Swipe or use the arrow keys
        </p>
      )}
    </div>
  );
}
