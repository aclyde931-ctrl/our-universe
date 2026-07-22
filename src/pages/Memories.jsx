import {
  CalendarDays,
  Camera,
  Heart,
  Image,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

function Memories() {
  const { user } = useAuth();

  const fileInputRef = useRef(null);
  const uploadFormRef = useRef(null);

  const [memories, setMemories] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [memoryDate, setMemoryDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function loadMemories() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("memories")
        .select(
          `
            id,
            user_id,
            image_url,
            image_path,
            caption,
            memory_date,
            created_at
          `
        )
        .order("memory_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Unable to load memories:", error);
        setErrorMessage("Unable to load your memories.");
      } else {
        setMemories(data ?? []);
      }

      setLoading(false);
    }

    loadMemories();

    const channel = supabase
      .channel("memories-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memories",
        },
        () => {
          loadMemories();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function openUploadForm() {
    setShowUploadForm(true);
    setErrorMessage("");
    setSuccessMessage("");

    setTimeout(() => {
      uploadFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleFileSelection(event) {
    const file = event.target.files?.[0];

    setErrorMessage("");
    setSuccessMessage("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("The image must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function resetForm() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setCaption("");
    setMemoryDate(new Date().toISOString().split("T")[0]);
    setShowUploadForm(false);
    setErrorMessage("");
    setSuccessMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!user || !selectedFile || uploading) {
      if (!selectedFile) {
        setErrorMessage("Please select a photo first.");
      }

      return;
    }

    setUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    let uploadedFilePath = "";

    try {
      const fileExtension =
        selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";

      uploadedFilePath = `${user.id}/${crypto.randomUUID()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("memories")
        .upload(uploadedFilePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("memories")
        .getPublicUrl(uploadedFilePath);

      const imageUrl = publicUrlData.publicUrl;

      const { data: newMemory, error: insertError } = await supabase
        .from("memories")
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          image_path: uploadedFilePath,
          caption: caption.trim() || null,
          memory_date:
            memoryDate || new Date().toISOString().split("T")[0],
        })
        .select(
          `
            id,
            user_id,
            image_url,
            image_path,
            caption,
            memory_date,
            created_at
          `
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      setMemories((currentMemories) => [
        newMemory,
        ...currentMemories.filter(
          (currentMemory) => currentMemory.id !== newMemory.id
        ),
      ]);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(null);
      setPreviewUrl("");
      setCaption("");
      setMemoryDate(new Date().toISOString().split("T")[0]);
      setShowUploadForm(false);
      setSuccessMessage("Your memory was added successfully.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Memory upload error:", error);

      if (uploadedFilePath) {
        await supabase.storage
          .from("memories")
          .remove([uploadedFilePath]);
      }

      setErrorMessage(
        error.message ||
          "Unable to upload your memory. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(memory) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this memory?"
    );

    if (!confirmed || deletingId) return;

    setDeletingId(memory.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error: deleteRecordError } = await supabase
        .from("memories")
        .delete()
        .eq("id", memory.id);

      if (deleteRecordError) {
        throw deleteRecordError;
      }

      if (memory.image_path) {
        const { error: deleteImageError } = await supabase.storage
          .from("memories")
          .remove([memory.image_path]);

        if (deleteImageError) {
          console.error(
            "Unable to remove memory image:",
            deleteImageError
          );
        }
      }

      setMemories((currentMemories) =>
        currentMemories.filter(
          (currentMemory) => currentMemory.id !== memory.id
        )
      );

      setSuccessMessage("Memory deleted successfully.");
    } catch (error) {
      console.error("Memory deletion error:", error);
      setErrorMessage(
        error.message || "Unable to delete this memory."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function formatMemoryDate(dateValue) {
    if (!dateValue) return "";

    return new Intl.DateTimeFormat("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${dateValue}T00:00:00`));
  }

  return (
    <div className="min-h-screen bg-[#fff7f9]">
      <header className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-7 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Memories</h1>

            <p className="mt-1 text-sm text-rose-100 sm:text-base">
              This is where we keep our memories. 
            </p>
          </div>

          <button
            type="button"
            onClick={openUploadForm}
            className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 font-semibold text-rose-500 shadow-md transition hover:scale-105"
          >
            <Plus size={19} />

            <span className="hidden sm:inline">
              Add Memory
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 pb-32 sm:px-5">
        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {showUploadForm && (
          <section
            ref={uploadFormRef}
            className="scroll-mt-5 mb-7 rounded-3xl bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Add a New Memory
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Choose a photo, date, and caption.
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={uploading}
                aria-label="Close upload form"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpload}
              className="mt-6"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex min-h-64 w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-rose-200 bg-rose-50/50 transition hover:border-rose-300 hover:bg-rose-50"
              >
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Memory preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                      <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-rose-500">
                        <Camera size={18} />
                        Change Photo
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="px-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
                      <Upload size={28} />
                    </div>

                    <p className="mt-4 font-semibold text-gray-700">
                      Choose a photo
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      JPG, PNG, WEBP, or another image format
                    </p>
                  </div>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelection}
                className="hidden"
              />

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="memory_date"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Memory Date
                  </label>

                  <input
                    id="memory_date"
                    type="date"
                    value={memoryDate}
                    onChange={(event) =>
                      setMemoryDate(event.target.value)
                    }
                    className="w-full rounded-2xl border border-rose-100 bg-[#fffafb] px-4 py-3 text-gray-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="caption"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Caption
                  </label>

                  <input
                    id="caption"
                    type="text"
                    value={caption}
                    onChange={(event) =>
                      setCaption(event.target.value)
                    }
                    maxLength={250}
                    placeholder="Write something about this memory..."
                    className="w-full rounded-2xl border border-rose-100 bg-[#fffafb] px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3.5 font-semibold text-white shadow-md transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {uploading ? (
                  <>
                    <Loader2
                      className="animate-spin"
                      size={20}
                    />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Heart
                      className="fill-white"
                      size={20}
                    />
                    Save Memory
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {loading ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center">
            <Loader2
              className="animate-spin text-rose-500"
              size={36}
            />

            <p className="mt-3 text-sm text-gray-500">
              Loading your memories...
            </p>
          </div>
        ) : memories.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-pink-500">
              <Image size={40} />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-800">
              No memories added yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              Add your first photo and begin building your
              collection of special moments.
            </p>

            <button
              type="button"
              onClick={openUploadForm}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3 font-semibold text-white shadow-md transition hover:scale-105"
            >
              <Plus size={19} />
              Add Your First Memory
            </button>
          </div>
        ) : (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Our Memories
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {memories.length}{" "}
                  {memories.length === 1
                    ? "memory"
                    : "memories"}{" "}
                  saved
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {memories.map((memory) => (
                <article
                  key={memory.id}
                  className="group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-rose-50">
                    <img
                      src={memory.image_url}
                      alt={
                        memory.caption || "Couple memory"
                      }
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <button
                      type="button"
                      onClick={() => handleDelete(memory)}
                      disabled={
                        deletingId === memory.id
                      }
                      aria-label="Delete memory"
                      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-100 backdrop-blur-sm transition hover:bg-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      {deletingId === memory.id ? (
                        <Loader2
                          className="animate-spin"
                          size={18}
                        />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-rose-500">
                      <CalendarDays size={16} />

                      {formatMemoryDate(
                        memory.memory_date
                      )}
                    </div>

                    <p className="mt-3 min-h-6 break-words text-gray-700">
                      {memory.caption ||
                        "A beautiful moment together ❤️"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Memories;