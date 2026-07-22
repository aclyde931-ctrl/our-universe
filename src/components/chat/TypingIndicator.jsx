export default function TypingIndicator({ partnerName }) {
  return (
    <div className="mb-3 flex justify-start">
      <div className="flex max-w-[82%] flex-col items-start sm:max-w-[70%]">
        <div className="rounded-2xl rounded-bl-md border border-rose-50 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5" aria-label={`${partnerName} is typing`}>
            <span className="h-2 w-2 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-rose-400" />
          </div>
        </div>
        <span className="mt-1 px-1 text-[10px] text-gray-400">{partnerName} is typing...</span>
      </div>
    </div>
  );
}
