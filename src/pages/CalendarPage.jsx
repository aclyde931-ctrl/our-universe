import { ArrowLeft, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

function CalendarPage() {
  return (
    <div className="min-h-screen bg-[#fff7f9]">
      <header className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-6 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link
            to="/dashboard"
            className="rounded-full bg-white/20 p-2"
          >
            <ArrowLeft size={22} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-rose-100">
              Important dates and plans
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <CalendarDays
            className="mx-auto text-green-500"
            size={54}
          />

          <h2 className="mt-4 text-2xl font-bold text-gray-800">
            Calendar page is ready
          </h2>

          <p className="mt-2 text-gray-500">
            Dates, events and reminders will be displayed here.
          </p>
        </div>
      </main>

    </div>
  );
}

export default CalendarPage;