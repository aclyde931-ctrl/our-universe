import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Heart,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";

import { supabase } from "../services/supabase";

const TOTAL_STEPS = 4;

function Setup() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    birthday: "",
    favoriteColor: "",
    favoriteFood: "",
    favoriteFlower: "",
    relationshipStartDate: "2026-05-24",
  });

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        navigate("/login", { replace: true });
        return;
      }

      setUser(currentUser);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
            full_name,
            birthday,
            favorite_color,
            favorite_food,
            favorite_flower,
            setup_completed
          `
        )
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError) {
        setErrorMessage(profileError.message);
        setLoading(false);
        return;
      }

      if (profile?.setup_completed) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const { data: relationship } = await supabase
        .from("relationship_settings")
        .select("start_date")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      setForm((previous) => ({
        ...previous,
        fullName: profile?.full_name || "",
        birthday: profile?.birthday || "",
        favoriteColor: profile?.favorite_color || "",
        favoriteFood: profile?.favorite_food || "",
        favoriteFlower: profile?.favorite_flower || "",
        relationshipStartDate:
          relationship?.start_date?.slice(0, 10) || "2026-05-24",
      }));

      setLoading(false);
    }

    loadProfile();
  }, [navigate]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function goNext() {
    setErrorMessage("");

    if (step === 1 && !form.fullName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (step === 2 && !form.birthday) {
      setErrorMessage("Please enter your birthday.");
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
    }
  }

  function goBack() {
    setErrorMessage("");

    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  async function finishSetup() {
    if (!user) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: form.fullName.trim(),
          birthday: form.birthday || null,
          favorite_color: form.favoriteColor.trim() || null,
          favorite_food: form.favoriteFood.trim() || null,
          favorite_flower: form.favoriteFlower.trim() || null,
          setup_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      const { data: existingRelationship, error: relationshipReadError } =
        await supabase
          .from("relationship_settings")
          .select("id")
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle();

      if (relationshipReadError) {
        throw relationshipReadError;
      }

      const relationshipDate = `${form.relationshipStartDate}T00:00:00+08:00`;

      if (existingRelationship) {
        const { error: relationshipUpdateError } = await supabase
          .from("relationship_settings")
          .update({
            start_date: relationshipDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRelationship.id);

        if (relationshipUpdateError) {
          throw relationshipUpdateError;
        }
      } else {
        const { error: relationshipInsertError } = await supabase
          .from("relationship_settings")
          .insert({
            relationship_name: "Together",
            start_date: relationshipDate,
            created_by: user.id,
          });

        if (relationshipInsertError) {
          throw relationshipInsertError;
        }
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Unable to save your setup.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-rose-500" size={36} />

          <p className="mt-3 text-sm text-slate-500">
            Preparing your shared space...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-50 via-white to-pink-100 px-5 py-8">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rose-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-300/25 blur-3xl" />

      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <section className="w-full rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-rose-200/40 backdrop-blur-xl sm:p-8">
          <header className="text-center">
            <div className="heart-beat mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200">
              <Heart className="fill-white" size={30} />
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-rose-500">
              Together
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-800">
              Personalize your space
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Step {step} of {TOTAL_STEPS}
            </p>
          </header>

          <div className="mt-6 flex gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
              const currentStep = index + 1;

              return (
                <div
                  key={currentStep}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    currentStep <= step ? "bg-rose-500" : "bg-rose-100"
                  }`}
                />
              );
            })}
          </div>

          <div className="mt-8 min-h-[260px]">
            {step === 1 && (
              <div>
                <StepHeading
                  icon={<UserRound size={22} />}
                  title="What should we call you?"
                  description="This name will appear in your greeting, chat, memories, and profile."
                />

                <label className="mt-6 block">
                  <span className="text-sm font-semibold text-slate-700">
                    Your name
                  </span>

                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={updateField}
                    placeholder="Enter your name"
                    autoComplete="name"
                    className="mt-2 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div>
                <StepHeading
                  icon={<CalendarDays size={22} />}
                  title="When is your birthday?"
                  description="Together will show a special birthday celebration on this date."
                />

                <label className="mt-6 block">
                  <span className="text-sm font-semibold text-slate-700">
                    Birthday
                  </span>

                  <input
                    type="date"
                    name="birthday"
                    value={form.birthday}
                    onChange={updateField}
                    className="mt-2 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  />
                </label>
              </div>
            )}

            {step === 3 && (
              <div>
                <StepHeading
                  icon={<Sparkles size={22} />}
                  title="A few favorites"
                  description="These are optional and can be changed from your Profile page later."
                />

                <div className="mt-6 space-y-4">
                  <SetupInput
                    label="Favorite color"
                    name="favoriteColor"
                    value={form.favoriteColor}
                    placeholder="Example: Blue"
                    onChange={updateField}
                  />

                  <SetupInput
                    label="Favorite food"
                    name="favoriteFood"
                    value={form.favoriteFood}
                    placeholder="Example: Pizza"
                    onChange={updateField}
                  />

                  <SetupInput
                    label="Favorite flower"
                    name="favoriteFlower"
                    value={form.favoriteFlower}
                    placeholder="Example: Rose"
                    onChange={updateField}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <StepHeading
                  icon={<Heart className="fill-current" size={22} />}
                  title="When did your story begin?"
                  description="This date powers your live relationship timer, monthsaries, and anniversaries."
                />

                <label className="mt-6 block">
                  <span className="text-sm font-semibold text-slate-700">
                    Relationship start date
                  </span>

                  <input
                    type="date"
                    name="relationshipStartDate"
                    value={form.relationshipStartDate}
                    onChange={updateField}
                    className="mt-2 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  />
                </label>

                <div className="mt-5 rounded-2xl bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-600">
                    Your setup
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Name:{" "}
                    <span className="font-semibold text-slate-800">
                      {form.fullName}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Birthday:{" "}
                    <span className="font-semibold text-slate-800">
                      {form.birthday}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Together since:{" "}
                    <span className="font-semibold text-slate-800">
                      {form.relationshipStartDate}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <footer className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || saving}
              className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3 font-semibold text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={finishSetup}
                disabled={saving || !form.relationshipStartDate}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3 font-semibold text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Finish Setup
                  </>
                )}
              </button>
            )}
          </footer>
        </section>
      </main>
    </div>
  );
}

function StepHeading({ icon, title, description }) {
  return (
    <div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
        {icon}
      </div>

      <h2 className="mt-4 text-2xl font-bold text-slate-800">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SetupInput({ label, name, value, placeholder, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type="text"
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="mt-2 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
      />
    </label>
  );
}

export default Setup;