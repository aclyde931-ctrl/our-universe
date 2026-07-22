import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Heart,
  LoaderCircle,
  Lock,
  Mail,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const destination = location.state?.from || "/dashboard";

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("setup_completed")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (profile?.setup_completed) {
        navigate(destination, { replace: true });
      } else {
        navigate("/setup", { replace: true });
      }
    } catch (error) {
      setErrorMessage(
        error?.message || "Unable to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50">
        <LoaderCircle
          className="animate-spin text-rose-500"
          size={36}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-rose-100 via-pink-50 to-white px-5 py-10">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-pink-200/50 blur-3xl" />

      <main className="relative z-10 w-full max-w-md">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-7 shadow-2xl shadow-rose-200/40 backdrop-blur sm:p-9">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 shadow-inner">
              <Heart
                className="fill-rose-500 text-rose-500"
                size={39}
              />
            </div>

            <h1 className="mt-5 text-3xl font-bold text-gray-800">
              Together
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Sign in to your private space filled with memories,
              messages and special moments.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-12 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-rose-500"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3.5 font-semibold text-white shadow-lg shadow-rose-200 transition hover:from-rose-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <LoaderCircle className="animate-spin" size={20} />
              )}

              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-7 text-center text-xs leading-5 text-gray-400">
            This is a private application. Only authorized accounts can
            access it.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;