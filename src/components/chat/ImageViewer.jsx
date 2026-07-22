import { X } from "lucide-react";

export default function ImageViewer({ url, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25" aria-label="Close image viewer">
        <X size={24} />
      </button>
      <img src={url} alt="Shared chat image fullscreen" className="max-h-[90vh] max-w-[95vw] select-none object-contain" onClick={(event) => event.stopPropagation()} />
    </div>
  );
}
