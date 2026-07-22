import {
  Camera,
  Heart,
  Loader2,
  LogOut,
  Save,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

const emptyProfile = {
  full_name: "",
  birthday: "",
  avatar_url: "",
  favorite_color: "#f43f5e",
  favorite_food: "",
  favorite_flower: "",
};

function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
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
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Unable to load profile:", error);
        setErrorMessage("Unable to load your profile.");
      } else if (data) {
        setProfile({
          full_name: data.full_name ?? "",
          birthday: data.birthday ?? "",
          avatar_url: data.avatar_url ?? "",
          favorite_color: data.favorite_color ?? "#f43f5e",
          favorite_food: data.favorite_food ?? "",
          favorite_flower: data.favorite_flower ?? "",
        });
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((currentProfile) => ({
      ...currentProfile,
      [name]: value,
    }));

    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];

    if (!file || !user) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("The image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExtension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${user.id}/avatar-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((currentProfile) => ({
        ...currentProfile,
        avatar_url: avatarUrl,
      }));

      setSuccessMessage("Profile picture updated successfully.");
    } catch (error) {
      console.error("Avatar upload error:", error);
      setErrorMessage(
        error.message || "Unable to upload your profile picture."
      );
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!user || saving) return;

    const cleanName = profile.full_name.trim();

    if (!cleanName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const profileUpdates = {
      id: user.id,
      full_name: cleanName,
      birthday: profile.birthday || null,
      avatar_url: profile.avatar_url || null,
      favorite_color: profile.favorite_color || null,
      favorite_food: profile.favorite_food.trim() || null,
      favorite_flower: profile.favorite_flower.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(profileUpdates, {
        onConflict: "id",
      });

    if (error) {
      console.error("Unable to save profile:", error);
      setErrorMessage("Unable to save your profile. Please try again.");
    } else {
      setProfile((currentProfile) => ({
        ...currentProfile,
        full_name: cleanName,
      }));

      setSuccessMessage("Your profile has been updated.");
    }

    setSaving(false);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign-out error:", error);
      setErrorMessage(error.message);
      setLoggingOut(false);
      return;
    }

    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#fff7f9]">
      {/* Page Header */}
      <header className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-7 text-white shadow">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">Profile</h1>

          <p className="mt-1 text-sm text-rose-100 sm:text-base">
            Manage your personal information and favorite things
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-7 pb-32 sm:px-5">
        {loading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center">
            <Loader2
              className="animate-spin text-rose-500"
              size={36}
            />

            <p className="mt-3 text-sm text-gray-500">
              Loading your profile...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* Profile Overview */}
            <section className="rounded-3xl bg-white p-6 text-center shadow-sm sm:p-8">
              <div className="relative mx-auto h-28 w-28">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-rose-100 bg-rose-50 text-rose-500 shadow-sm">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={48} />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label="Change profile picture"
                  className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-rose-500 text-white shadow-md transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Camera size={17} />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <h2 className="mt-5 text-2xl font-bold text-gray-800">
                {profile.full_name || "Your Profile"}
              </h2>

              <p className="mt-1 break-all text-sm text-gray-500">
                {user?.email}
              </p>

              <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-rose-50 p-4 text-rose-600">
                <Heart className="fill-rose-500" size={20} />

                <span className="font-semibold">
                  Our Universe is our private space
                </span>
              </div>
            </section>

            {/* Messages */}
            {errorMessage && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            {/* Personal Information */}
            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  Personal Information
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Update the details shown throughout the app.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="full_name"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={profile.full_name}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-rose-100 bg-[#fffafb] px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="birthday"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Birthday
                  </label>

                  <input
                    id="birthday"
                    name="birthday"
                    type="date"
                    value={profile.birthday}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-rose-100 bg-[#fffafb] px-4 py-3 text-gray-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="favorite_color"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Favorite Color
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-[#fffafb] px-4 py-2">
                    <input
                      id="favorite_color"
                      name="favorite_color"
                      type="color"
                      value={profile.favorite_color}
                      onChange={handleChange}
                      className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    />

                    <span className="text-sm font-medium uppercase text-gray-600">
                      {profile.favorite_color}
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="favorite_food"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Favorite Food
                  </label>

                  <input
                    id="favorite_food"
                    name="favorite_food"
                    type="text"
                    value={profile.favorite_food}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="Example: Pizza"
                    className="w-full rounded-2xl border border-rose-100 bg-[#fffafb] px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="favorite_flower"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Favorite Flower
                  </label>

                  <input
                    id="favorite_flower"
                    name="favorite_flower"
                    type="text"
                    value={profile.favorite_flower}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="Example: Rose"
                    className="w-full rounded-2xl border border-rose-100 bg-[#fffafb] px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3.5 font-semibold text-white shadow-md transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </section>

            {/* Account */}
            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-xl font-bold text-gray-800">
                Account
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Sign out of your Together account on this device.
              </p>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut size={20} />
                    Sign Out
                  </>
                )}
              </button>
            </section>
          </form>
        )}
      </main>
    </div>
  );
}

export default Profile;