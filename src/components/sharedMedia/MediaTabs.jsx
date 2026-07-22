const tabs = [
  { id: "photos", label: "Photos" },
  { id: "files", label: "Files" },
  { id: "voice", label: "Voice" },
  { id: "links", label: "Links" },
];

export default function MediaTabs({ activeTab, counts, onChange }) {
  return (
    <div className="grid grid-cols-4 rounded-2xl border border-rose-100 bg-white p-1.5 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-xl px-2 py-3 text-xs font-semibold transition sm:px-3 sm:text-sm ${
            activeTab === tab.id
              ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200"
              : "text-slate-500 hover:bg-rose-50 hover:text-rose-500"
          }`}
        >
          {tab.label}
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] sm:ml-1.5 sm:px-2 sm:text-xs ${activeTab === tab.id ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
            {counts[tab.id] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
