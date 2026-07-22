import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";

function AuthRedirect() {
  const { user, loading: authLoading } = useAuth();

  const [checkingProfile, setCheckingProfile] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    async function checkProfile() {
      if (authLoading) {
        return;
      }

      if (!user) {
        setCheckingProfile(false);
        return;
      }

      setCheckingProfile(true);
      setProfileError("");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("setup_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setProfileError(error.message);
        setCheckingProfile(false);
        return;
      }

      setSetupCompleted(Boolean(profile?.setup_completed));
      setCheckingProfile(false);
    }

    checkProfile();
  }, [user, authLoading]);

  if (authLoading || checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50">
        <div className="text-center">
          <LoaderCircle
            className="mx-auto animate-spin text-rose-500"
            size={38}
          />

          <p className="mt-3 text-sm text-gray-500">
            Preparing your space...
          </p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50 px-5">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold text-gray-800">
            Unable to open your account
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {profileError}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!setupCompleted) {
    return <Navigate to="/setup" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default AuthRedirect;