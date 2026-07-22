import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Heart,
  Loader2,
  Mail,
  PenLine,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function LoveLetters() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [form, setForm] = useState({ title: "", body: "" });

  const loadLetters = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("love_letters")
      .select("id, title, body, created_by, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Love letters loading error:", error);
      setErrorMessage(
        error.code === "42P01"
          ? "Love Letters needs its database setup before it can be used."
          : error.message || "Unable to load your love letters."
      );
      setLetters([]);
    } else {
      setLetters(data || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadLetters();
  }, [loadLetters]);

  useEffect(() => {
    if (!user) return undefined;

    const channel = supabase
      .channel("love-letters-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "love_letters" },
        () => loadLetters()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLetters, user]);

  const letterCountLabel = useMemo(
    () => `${letters.length} ${letters.length === 1 ? "letter" : "letters"}`,
    [letters.length]
  );

  function openComposer() {
    setForm({ title: "", body: "" });
    setErrorMessage("");
    setShowComposer(true);
  }

  async function saveLetter(event) {
    event.preventDefault();

    const title = form.title.trim();
    const body = form.body.trim();

    if (!title || !body || !user) {
      setErrorMessage("Please enter a title and write your letter.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("love_letters")
      .insert({ title, body, created_by: user.id })
      .select("id, title, body, created_by, created_at")
      .single();

    if (error) {
      console.error("Love letter save error:", error);
      setErrorMessage(
        error.code === "42P01"
          ? "Love Letters needs its database setup before it can be used."
          : error.message || "Unable to save your letter."
      );
      setSaving(false);
      return;
    }

    setLetters((current) => [data, ...current]);
    setShowComposer(false);
    setForm({ title: "", body: "" });
    setSaving(false);
  }

  async function deleteLetter(letter) {
    if (!user || letter.created_by !== user.id) return;

    const confirmed = window.confirm(
      `Delete “${letter.title}”? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(letter.id);
    setErrorMessage("");

    const { error } = await supabase
      .from("love_letters")
      .delete()
      .eq("id", letter.id)
      .eq("created_by", user.id);

    if (error) {
      setErrorMessage(error.message || "Unable to delete this letter.");
    } else {
      setLetters((current) => current.filter((item) => item.id !== letter.id));
      if (selectedLetter?.id === letter.id) setSelectedLetter(null);
    }

    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-[#fff7f9]">
      <header className="relative overflow-hidden bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 px-5 py-7 text-white shadow-lg shadow-rose-200/60">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              aria-label="Back to dashboard"
              className="rounded-full bg-white/20 p-2.5 transition hover:bg-white/30"
            >
              <ArrowLeft size={22} />
            </Link>

            <div>
              <h1 className="text-2xl font-bold">Love Letters</h1>
              <p className="text-sm text-rose-100">Words written from the heart</p>
            </div>
          </div>

          <button
            type="button"
            onClick={openComposer}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Write a Letter</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <section className="mb-6 flex flex-col gap-3 rounded-[1.75rem] border border-rose-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-500">Your collection</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-800">
              {loading ? "Opening your letters..." : letterCountLabel}
            </h2>
          </div>

          <button
            type="button"
            onClick={openComposer}
            className="inline-flex w-fit items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5"
          >
            <PenLine size={18} />
            Write a Letter
          </button>
        </section>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-[2rem] border border-rose-100 bg-white shadow-sm">
            <div className="text-center text-slate-500">
              <Loader2 className="mx-auto animate-spin text-rose-500" size={34} />
              <p className="mt-3 text-sm">Opening your love letters...</p>
            </div>
          </div>
        ) : letters.length === 0 ? (
          <div className="rounded-[2rem] border border-rose-100 bg-white p-10 text-center shadow-sm">
            <div className="relative mx-auto w-fit">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-amber-50 to-rose-100 shadow-inner">
                <Mail className="text-amber-500" size={54} />
              </div>
              <Heart
                className="absolute -bottom-2 -right-3 fill-rose-500 text-rose-500"
                size={28}
              />
            </div>

            <h2 className="mt-7 text-2xl font-bold text-slate-800">
              No love letters yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Write your first letter and keep your most meaningful words in one
              special place.
            </p>
            <button
              type="button"
              onClick={openComposer}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200"
            >
              <PenLine size={18} />
              Write your first letter
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {letters.map((letter) => (
              <article
                key={letter.id}
                className="group relative overflow-hidden rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-100/80"
              >
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-100/70 blur-2xl" />

                <button
                  type="button"
                  onClick={() => setSelectedLetter(letter)}
                  className="relative block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                      <Mail size={23} />
                    </div>
                    <Heart className="fill-rose-200 text-rose-200" size={20} />
                  </div>

                  <h3 className="mt-5 line-clamp-2 text-xl font-bold text-slate-800">
                    {letter.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-500">
                    {letter.body}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-rose-500">
                    <CalendarDays size={15} />
                    {formatDate(letter.created_at)}
                  </div>
                </button>

                {letter.created_by === user?.id && (
                  <button
                    type="button"
                    onClick={() => deleteLetter(letter)}
                    disabled={deletingId === letter.id}
                    aria-label={`Delete ${letter.title}`}
                    className="absolute bottom-4 right-4 rounded-xl p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 group-hover:opacity-100"
                  >
                    {deletingId === letter.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </main>

      {showComposer && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <form
            onSubmit={saveLetter}
            className="max-h-[96vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-[#fffaf7] px-6 pb-7 pt-5 shadow-2xl sm:max-h-[92vh] sm:rounded-[2rem] sm:p-8"
          >
            <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-3 bg-[#fffaf7]/95 px-1 pb-4 backdrop-blur">
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                aria-label="Close"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-rose-500"
              >
                <X size={20} />
              </button>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold text-slate-800 sm:text-2xl">
                  Love Letter
                </h2>
                <p className="truncate text-xs text-slate-500 sm:text-sm">
                  Write something from your heart 💗
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Send size={17} />
                )}
                {saving ? "Sending" : "Send"}
              </button>
            </div>

            <div className="rounded-[1.75rem] border border-rose-100 bg-white/55 p-4 shadow-sm sm:p-6">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Title ♡</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  maxLength={120}
                  placeholder="For example: To the love of my life"
                  className="mt-2.5 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </label>

              <label className="mt-5 block">
                <span className="text-sm font-bold text-slate-700">Letter ♡</span>
                <textarea
                  value={form.body}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, body: event.target.value }))
                  }
                  rows={13}
                  placeholder="My love,"
                  className="mt-2.5 min-h-[310px] w-full resize-y rounded-2xl border border-rose-100 bg-white px-4 py-4 leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 sm:min-h-[360px]"
                />
              </label>

              {errorMessage && (
                <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
              )}

              <div className="mt-5 rounded-2xl bg-rose-50/80 px-4 py-3 text-center text-xs font-medium leading-5 text-rose-500 sm:text-sm">
                ✨ Every letter you write becomes a memory we’ll treasure forever. 💗
              </div>
            </div>
          </form>
        </div>
      )}

      {selectedLetter && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:p-8">
          <div className="mx-auto max-w-3xl rounded-[2rem] bg-[#fffdf8] shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-100 px-6 py-5 sm:px-9">
              <button
                type="button"
                onClick={() => setSelectedLetter(null)}
                className="inline-flex items-center gap-2 text-sm font-bold text-rose-600"
              >
                <ArrowLeft size={19} />
                Back to letters
              </button>

              {selectedLetter.created_by === user?.id && (
                <button
                  type="button"
                  onClick={() => deleteLetter(selectedLetter)}
                  disabled={deletingId === selectedLetter.id}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Delete letter"
                >
                  {deletingId === selectedLetter.id ? (
                    <Loader2 className="animate-spin" size={19} />
                  ) : (
                    <Trash2 size={19} />
                  )}
                </button>
              )}
            </div>

            <article className="px-6 py-10 sm:px-12 sm:py-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                <Heart className="fill-rose-500" size={29} />
              </div>
              <p className="mt-7 text-center text-xs font-bold uppercase tracking-[0.25em] text-rose-500">
                Love Letter
              </p>
              <h1 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-bold leading-tight text-slate-800 sm:text-4xl">
                {selectedLetter.title}
              </h1>
              <p className="mt-3 text-center text-sm text-slate-400">
                {formatDate(selectedLetter.created_at)}
              </p>

              <div className="mx-auto mt-10 max-w-2xl border-t border-rose-100 pt-9">
                <p className="whitespace-pre-wrap text-[1.05rem] leading-8 text-slate-700">
                  {selectedLetter.body}
                </p>
              </div>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoveLetters;
