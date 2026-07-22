import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

const RELATIONSHIP_START_DATE = new Date("2026-05-24T00:00:00+08:00");

function calculateTimeTogether() {
  const now = new Date();
  const difference = Math.max(0, now.getTime() - RELATIONSHIP_START_DATE.getTime());

  const totalSeconds = Math.floor(difference / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function TimeBox({ value, label }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-4 text-center backdrop-blur-sm">
      <p className="text-2xl font-bold sm:text-3xl">
        {String(value).padStart(2, "0")}
      </p>

      <p className="mt-1 text-xs text-rose-100 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function RelationshipCounter() {
  const [timeTogether, setTimeTogether] = useState(calculateTimeTogether);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeTogether(calculateTimeTogether());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-500 to-pink-500 p-6 text-white shadow-xl shadow-rose-200">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <Heart className="fill-white" size={25} />
        </div>

        <div>
          <p className="text-sm text-rose-100">Our journey</p>

          <h2 className="text-xl font-bold">
            Time Together
          </h2>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-4">
        <TimeBox value={timeTogether.days} label="Days" />
        <TimeBox value={timeTogether.hours} label="Hours" />
        <TimeBox value={timeTogether.minutes} label="Minutes" />
        <TimeBox value={timeTogether.seconds} label="Seconds" />
      </div>

      <div className="mt-5 border-t border-white/20 pt-4">
        <p className="text-sm text-rose-100">
          Together since
        </p>

        <p className="mt-1 font-semibold">
          May 24, 2026
        </p>
      </div>
    </section>
  );
}

export default RelationshipCounter;