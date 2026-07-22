import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarHeart,
  Heart,
  Image,
  LoaderCircle,
  MessageCircleHeart,
  Mic2,
  Phone,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

function formatDate(value) {
  if (!value) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function daysTogether(startDate) {
  if (!startDate) return null;

  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.max(1, Math.floor((today - start) / 86400000) + 1);
}

function TimelineCard({ icon: Icon, title, date, description, accent }) {
  return (
    <article className="relative grid grid-cols-[42px_1fr] gap-4 sm:grid-cols-[52px_1fr]">
      <div className="relative flex justify-center">
        <div
          className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-[#fff7f9] sm:h-12 sm:w-12 ${accent}`}
        >
          <Icon size={20} />
        </div>
      </div>

      <div className="mb-5 rounded-[1.6rem] border border-rose-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-400">
          {date}
        </p>
        <h2 className="mt-2 text-lg font-bold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </article>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-rose-50 p-2.5 text-rose-500">
          <Icon size={19} />
        </span>
        <div>
          <p className="text-xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function CoupleTimeline() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [relationship, setRelationship] = useState(null);
  const [stats, setStats] = useState({ messages: 0, photos: 0, voices: 0, calls: 0 });
  const [firsts, setFirsts] = useState({
    message: null,
    photo: null,
    voice: null,
    call: null,
  });

  useEffect(() => {
    if (!user) return undefined;

    let active = true;

    async function loadTimeline() {
      setLoading(true);
      setErrorMessage("");

      try {
        const messageFields = "id, sender_id, content, image_url, voice_url, created_at";

        const [
          relationshipResponse,
          messageCountResponse,
          photoCountResponse,
          voiceCountResponse,
          firstMessageResponse,
          firstPhotoResponse,
          firstVoiceResponse,
          callCountResponse,
          firstCallResponse,
        ] = await Promise.all([
          supabase
            .from("relationship_settings")
            .select("relationship_name, start_date")
            .limit(1)
            .maybeSingle(),
          supabase.from("messages").select("id", { count: "exact", head: true }),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .not("image_url", "is", null),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .not("voice_url", "is", null),
          supabase
            .from("messages")
            .select(messageFields)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("messages")
            .select(messageFields)
            .not("image_url", "is", null)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("messages")
            .select(messageFields)
            .not("voice_url", "is", null)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("calls")
            .select("id", { count: "exact", head: true })
            .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`),
          supabase
            .from("calls")
            .select("id, type, status, created_at, duration_seconds")
            .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        const requiredResponses = [
          messageCountResponse,
          photoCountResponse,
          voiceCountResponse,
          firstMessageResponse,
          firstPhotoResponse,
          firstVoiceResponse,
        ];

        const requiredError = requiredResponses.find((response) => response.error)?.error;
        if (requiredError) throw requiredError;

        if (!active) return;

        setRelationship(relationshipResponse.error ? null : relationshipResponse.data);
        setStats({
          messages: messageCountResponse.count || 0,
          photos: photoCountResponse.count || 0,
          voices: voiceCountResponse.count || 0,
          calls: callCountResponse.error ? 0 : callCountResponse.count || 0,
        });
        setFirsts({
          message: firstMessageResponse.data,
          photo: firstPhotoResponse.data,
          voice: firstVoiceResponse.data,
          call: firstCallResponse.error ? null : firstCallResponse.data,
        });
      } catch (error) {
        console.error("Timeline loading error:", error);
        if (active) {
          setErrorMessage(error?.message || "Unable to load our timeline.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTimeline();

    return () => {
      active = false;
    };
  }, [user]);

  const timeline = useMemo(() => {
    const events = [];

    if (relationship?.start_date) {
      events.push({
        key: "relationship",
        dateValue: relationship.start_date,
        icon: Heart,
        title: relationship.relationship_name || "Our story began",
        description: "The beginning of our relationship and the first page of our shared story.",
        accent: "bg-rose-500 text-white",
      });
    }

    if (firsts.message) {
      const preview = firsts.message.content?.trim();
      events.push({
        key: "first-message",
        dateValue: firsts.message.created_at,
        icon: MessageCircleHeart,
        title: "First message",
        description: preview
          ? `“${preview.length > 110 ? `${preview.slice(0, 110)}…` : preview}”`
          : "Our first saved conversation in Together.",
        accent: "bg-blue-100 text-blue-600",
      });
    }

    if (firsts.photo) {
      events.push({
        key: "first-photo",
        dateValue: firsts.photo.created_at,
        icon: Image,
        title: "First shared photo",
        description: "The first picture kept in our private conversation gallery.",
        accent: "bg-pink-100 text-pink-600",
      });
    }

    if (firsts.voice) {
      events.push({
        key: "first-voice",
        dateValue: firsts.voice.created_at,
        icon: Mic2,
        title: "First voice message",
        description: "The first time one of our voices became part of our saved story.",
        accent: "bg-violet-100 text-violet-600",
      });
    }

    if (firsts.call) {
      events.push({
        key: "first-call",
        dateValue: firsts.call.created_at,
        icon: Phone,
        title: `First ${firsts.call.type || "audio"} call`,
        description: `Our first recorded call in Together${firsts.call.status ? ` ended as ${firsts.call.status}` : ""}.`,
        accent: "bg-emerald-100 text-emerald-600",
      });
    }

    return events.sort((a, b) => new Date(a.dateValue) - new Date(b.dateValue));
  }, [firsts, relationship]);

  const totalDays = daysTogether(relationship?.start_date);

  return (
    <div className="min-h-screen bg-[#fff7f9] pb-24">
      <header className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-6 text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className="rounded-full bg-white/20 p-2 transition hover:bg-white/30"
          >
            <ArrowLeft />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-rose-100">
              <Sparkles size={16} />
              <span className="text-sm font-semibold">Our story together</span>
            </div>
            <h1 className="text-2xl font-bold">Couple Timeline</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[45vh] items-center justify-center text-rose-500">
            <LoaderCircle className="animate-spin" size={30} />
          </div>
        ) : (
          <>
            <section className="mb-7 overflow-hidden rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-rose-500">Together so far</p>
                  <h2 className="mt-1 text-3xl font-bold text-slate-800">
                    {totalDays ? `${totalDays.toLocaleString()} days` : "Our shared memories"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {relationship?.start_date
                      ? `Since ${formatDate(relationship.start_date)}`
                      : "Add our relationship date in Setup to show our day counter."}
                  </p>
                </div>
                <CalendarHeart className="text-rose-300" size={58} strokeWidth={1.5} />
              </div>
            </section>

            <section className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={MessageCircleHeart} label="Messages" value={stats.messages.toLocaleString()} />
              <StatCard icon={Image} label="Photos" value={stats.photos.toLocaleString()} />
              <StatCard icon={Mic2} label="Voice notes" value={stats.voices.toLocaleString()} />
              <StatCard icon={Phone} label="Calls" value={stats.calls.toLocaleString()} />
            </section>

            <section>
              <div className="mb-5">
                <p className="text-sm font-semibold text-rose-500">Milestones</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-800">How our story grew</h2>
              </div>

              {timeline.length ? (
                <div className="relative before:absolute before:bottom-8 before:left-[20px] before:top-6 before:w-px before:bg-rose-200 sm:before:left-[26px]">
                  {timeline.map((event) => (
                    <TimelineCard
                      key={event.key}
                      icon={event.icon}
                      title={event.title}
                      date={formatDateTime(event.dateValue)}
                      description={event.description}
                      accent={event.accent}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-rose-200 bg-white px-6 py-12 text-center">
                  <Heart className="mx-auto text-rose-300" size={42} />
                  <h3 className="mt-4 text-lg font-bold text-slate-800">Our timeline is waiting</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Our first messages, photos, voice notes, and calls will appear here automatically.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
