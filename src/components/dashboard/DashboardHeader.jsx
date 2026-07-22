import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Heart,
  Sparkles,
} from "lucide-react";

// Change the time here if your relationship started at a different hour.
const RELATIONSHIP_START_DATE = new Date(
  "2026-05-24T00:00:00+08:00"
);

const LOVE_QUOTES = [
  "Every second with you is my favorite.",
  "Home is wherever I am with you.",
  "You make ordinary days feel special.",
  "Our story is my favorite story.",
  "Every day with you is worth remembering.",
  "You are my favorite part of every day.",
  "Our Universe is our private space.",
];

const TIME_THEMES = {
  morning: {
    greeting: "Good Morning",
    emoji: "☀️",
    background: "from-amber-400 via-orange-400 to-rose-500",
    glowOne: "bg-yellow-200/30",
    glowTwo: "bg-rose-300/30",
  },

  afternoon: {
    greeting: "Good Afternoon",
    emoji: "🌤️",
    background: "from-sky-400 via-blue-500 to-indigo-500",
    glowOne: "bg-cyan-200/30",
    glowTwo: "bg-indigo-300/30",
  },

  evening: {
    greeting: "Good Evening",
    emoji: "🌅",
    background: "from-orange-500 via-rose-500 to-purple-600",
    glowOne: "bg-orange-200/30",
    glowTwo: "bg-purple-300/30",
  },

  night: {
    greeting: "Good Night",
    emoji: "🌙",
    background: "from-slate-900 via-indigo-950 to-purple-950",
    glowOne: "bg-indigo-400/20",
    glowTwo: "bg-purple-400/20",
  },
};

function getTimePeriod(date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }

  if (hour >= 17 && hour < 21) {
    return "evening";
  }

  return "night";
}

function calculateRelationshipTime(now) {
  const difference = Math.max(
    0,
    now.getTime() - RELATIONSHIP_START_DATE.getTime()
  );

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
  };
}

function TimeUnit({ value, label }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/20 bg-white/10 px-1 py-2.5 text-center backdrop-blur-md sm:rounded-2xl sm:px-2 sm:py-4">
      <p className="truncate text-lg font-bold leading-none tracking-tight tabular-nums min-[360px]:text-xl sm:text-3xl">
        {String(value).padStart(2, "0")}
      </p>

      <p className="mt-1 truncate text-[7px] font-semibold uppercase tracking-[0.08em] text-white/70 min-[360px]:text-[8px] sm:text-xs sm:tracking-[0.16em]">
        {label}
      </p>
    </div>
  );
}

function DashboardHeader({ userName = "Love" }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const relationshipTime = useMemo(
    () => calculateRelationshipTime(currentDate),
    [currentDate]
  );

  const timePeriod = getTimePeriod(currentDate);
  const theme = TIME_THEMES[timePeriod];

  const dateText = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeText = currentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dayOfYear = Math.floor(
    (currentDate -
      new Date(currentDate.getFullYear(), 0, 0)) /
      86400000
  );

  const quote = LOVE_QUOTES[dayOfYear % LOVE_QUOTES.length];

  return (
    <header
      className={`relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br ${theme.background} px-4 pb-7 pt-5 text-white shadow-2xl shadow-rose-200/40 sm:px-8 sm:pb-8 sm:pt-6`}
    >
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl ${theme.glowOne}`}
      />

      <div
        className={`pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full blur-3xl ${theme.glowTwo}`}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="heart-beat h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg backdrop-blur-md sm:h-12 sm:w-12">
              <img
                src="/branding/our-universe-app-icon.png"
                alt="Our Universe"
                className="h-full w-full object-cover"
                draggable="false"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-white/65 sm:text-xs sm:tracking-[0.25em]">
                Our private space
              </p>

              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Our Universe
              </h1>
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-md sm:px-3 sm:text-xs">
            Since May 24
          </div>
        </div>

        <div className="mt-7 sm:mt-8">
          <p className="text-sm font-medium text-white/75">
            {theme.emoji} {theme.greeting}
          </p>

          <h2 className="mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl">
            {userName}
            <span className="ml-2 inline-block">👋</span>
          </h2>
        </div>

        <div className="mt-5 flex flex-col gap-2 text-sm text-white/80 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={17} />
            <span>{dateText}</span>
          </div>

          <div className="hidden h-1 w-1 rounded-full bg-white/50 sm:block" />

          <div className="flex items-center gap-2">
            <Clock3 size={17} />
            <span className="font-semibold tabular-nums">
              {timeText}
            </span>
          </div>
        </div>

        <section className="mt-7 rounded-[1.5rem] border border-white/20 bg-black/10 p-3 shadow-xl backdrop-blur-xl sm:mt-8 sm:rounded-[2rem] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-white/75">
                <Heart
                  size={16}
                  className="fill-white/70"
                />

                <p className="text-xs font-medium sm:text-sm">
                  Together for
                </p>
              </div>

              <p className="mt-2 text-lg font-bold sm:text-2xl">
                Every second counts
              </p>
            </div>

            <Sparkles
              size={20}
              className="shrink-0 text-white/70 sm:h-[22px] sm:w-[22px]"
            />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1.5 min-[360px]:gap-2 sm:mt-5 sm:gap-4">
            <TimeUnit
              value={relationshipTime.days}
              label="Days"
            />

            <TimeUnit
              value={relationshipTime.hours}
              label="Hours"
            />

            <TimeUnit
              value={relationshipTime.minutes}
              label="Minutes"
            />

            <TimeUnit
              value={relationshipTime.seconds}
              label="Seconds"
            />
          </div>

          <div className="mt-4 border-t border-white/15 pt-4 sm:mt-5">
            <p className="text-center text-xs italic leading-relaxed text-white/85 sm:text-base">
              “{quote}”
            </p>
          </div>
        </section>
      </div>
    </header>
  );
}

export default DashboardHeader;