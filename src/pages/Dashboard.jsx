import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  History,
  ChevronRight,
  Heart,
  Image,
  LoaderCircle,
  MessageCircle,
  Sparkles,
  UserRound,
} from "lucide-react";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

function Dashboard() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [latestLetter, setLatestLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      if (!user) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const [profileResponse, relationshipResponse, latestLetterResponse] =
          await Promise.all([
            supabase
              .from("profiles")
              .select(
                `
                  full_name,
                  birthday,
                  avatar_url,
                  favorite_color,
                  favorite_food,
                  favorite_flower
                `
              )
              .eq("id", user.id)
              .maybeSingle(),

            supabase
              .from("relationship_settings")
              .select(
                `
                  relationship_name,
                  start_date
                `
              )
              .eq("created_by", user.id)
              .maybeSingle(),

            supabase
              .from("love_letters")
              .select("id, title, body, created_at")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

        if (profileResponse.error) {
          throw profileResponse.error;
        }

        /*
         * Do not stop the whole dashboard if relationship settings
         * cannot be found yet.
         */
        if (
          relationshipResponse.error &&
          relationshipResponse.error.code !== "PGRST116"
        ) {
          console.error(
            "Relationship settings error:",
            relationshipResponse.error
          );
        }

        if (
          latestLetterResponse.error &&
          latestLetterResponse.error.code !== "PGRST116" &&
          latestLetterResponse.error.code !== "42P01"
        ) {
          console.error("Latest love letter error:", latestLetterResponse.error);
        }

        if (active) {
          setProfile(profileResponse.data);
          setRelationship(relationshipResponse.data);
          setLatestLetter(latestLetterResponse.data || null);
        }
      } catch (error) {
        console.error("Dashboard loading error:", error);

        if (active) {
          setErrorMessage(
            error?.message ||
              "Unable to load your dashboard information."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      active = false;
    };
  }, [user]);

  const userName = useMemo(() => {
    if (loading) {
      return "Loading...";
    }

    return profile?.full_name?.trim() || "Love";
  }, [loading, profile]);

  const relationshipStartDate = relationship?.start_date || null;

  const quickActions = [
    {
      title: "Memories",
      description: "View your favorite moments together.",
      icon: Image,
      path: "/memories",
      iconStyle: "bg-pink-100 text-pink-600",
    },
    {
      title: "Chat",
      description: "Continue your private conversation.",
      icon: MessageCircle,
      path: "/chat",
      iconStyle: "bg-blue-100 text-blue-600",
    },
    {
      title: "Love Letters",
      description: "Write something meaningful for your partner.",
      icon: Heart,
      path: "/love-letters",
      iconStyle: "bg-rose-100 text-rose-600",
    },
    {
      title: "Calendar",
      description: "Remember your important dates and events.",
      icon: CalendarDays,
      path: "/calendar",
      iconStyle: "bg-violet-100 text-violet-600",
    },
    {
      title: "Couple Timeline",
      description: "See your first messages, photos, voice notes, and calls.",
      icon: History,
      path: "/timeline",
      iconStyle: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fff7f9]">
      <DashboardHeader
        userName={userName}
        relationshipStartDate={relationshipStartDate}
      />

      <main className="mx-auto max-w-6xl space-y-7 px-5 py-8 sm:px-8">
        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600"
          >
            {errorMessage}
          </div>
        )}

        <section className="relative overflow-hidden rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-rose-100/70 blur-2xl" />

          <div className="relative">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-500">
                  <Sparkles size={17} />

                  <span>Your shared space</span>
                </div>

                <h2 className="mt-2 text-2xl font-bold text-slate-800 sm:text-3xl">
                  Welcome back
                  {!loading && profile?.full_name
                    ? `, ${profile.full_name}`
                    : ""}
                  <span className="ml-2">❤️</span>
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  Keep our memories, messages, love letters, and special
                  dates together in one private place.
                </p>
              </div>

              <Link
                to="/profile"
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
              >
                <UserRound size={18} />
                View Profile
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-sm font-semibold text-rose-500">
              Quick actions
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-800">
              What would you like to do?
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.title}
                  to={action.path}
                  className="group rounded-[1.75rem] border border-rose-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-100/70"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${action.iconStyle}`}
                    >
                      <Icon size={23} />
                    </div>

                    <ChevronRight
                      className="mt-2 text-slate-300 transition group-hover:translate-x-1 group-hover:text-rose-500"
                      size={20}
                    />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-800">
                    {action.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {action.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Shared Media", "/shared-media", "Photos and voice messages"],
            ["Call History", "/call-history", "Incoming, outgoing and missed calls"],
            ["More Together", "/more-together", "Countdown, watch, music and location"],
          ].map(([title,path,description]) => (
            <Link key={path} to={path} className="rounded-[1.5rem] border border-rose-100 bg-white p-5 shadow-sm transition hover:-translate-y-1">
              <h3 className="font-bold text-slate-800">{title}</h3><p className="mt-2 text-sm text-slate-500">{description}</p>
            </Link>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
              <Image size={21} />
            </div>

            <p className="mt-5 text-sm font-semibold text-rose-500">
              Latest memory
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-800">
              Your memories will appear here
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add your first photo and preserve a special moment
              together.
            </p>

            <Link
              to="/memories"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-rose-500 hover:text-rose-600"
            >
              Open memories
              <ChevronRight size={17} />
            </Link>
          </article>

          <article className="rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Heart size={21} />
            </div>

            <p className="mt-5 text-sm font-semibold text-rose-500">
              Love letters
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-800">
              {latestLetter?.title || "Write from the heart"}
            </h3>

            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
              {latestLetter?.body ||
                "Create meaningful messages that your partner can always revisit."}
            </p>

            <Link
              to="/love-letters"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-rose-500 hover:text-rose-600"
            >
              {latestLetter ? "Read your letters" : "Write a letter"}
              <ChevronRight size={17} />
            </Link>
          </article>

          <article className="rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <CalendarDays size={21} />
            </div>

            <p className="mt-5 text-sm font-semibold text-rose-500">
              Upcoming events
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-800">
              Important dates in one place
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Monthsaries, birthdays, anniversaries, and other special
              dates will appear here.
            </p>

            <Link
              to="/calendar"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-rose-500 hover:text-rose-600"
            >
              View calendar
              <ChevronRight size={17} />
            </Link>
          </article>
        </section>

        {loading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-white px-5 py-4 text-sm text-slate-500">
            <LoaderCircle
              className="animate-spin text-rose-500"
              size={20}
            />

            Loading your dashboard...
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;