import {
  Check,
  CheckCheck,
  Copy,
  Paperclip,
  FileText,
  Download,
  Loader2,
  MessageCircle,
  Mic,
  Pause,
  Pin,
  PinOff,
  Reply,
  Send,
  Square,
  Trash2,
  X,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCall } from "../contexts/CallContext";
import { usePresence } from "../contexts/PresenceContext";
import { supabase } from "../services/supabase";
import ChatHeader from "../components/chat/ChatHeader";
import ImageViewer from "../components/chat/ImageViewer";
import TypingIndicator from "../components/chat/TypingIndicator";
import VoiceMessage from "../components/chat/VoiceMessage";
import CallMessage from "../components/chat/CallMessage";
import MessageSearchModal from "../components/chat/MessageSearchModal";
import DeleteMessageModal from "../components/ui/DeleteMessageModal";

function Chat() {
  const { user } = useAuth();
  const { partnerIsOnline } = usePresence();

  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [partnerName, setPartnerName] = useState("Your Partner");
  const [partnerAvatarUrl, setPartnerAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("idle");
  const [uploadCurrentName, setUploadCurrentName] = useState("");
  const [uploadCurrentIndex, setUploadCurrentIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [openReactionPickerId, setOpenReactionPickerId] = useState(null);
  const [savingReactionForId, setSavingReactionForId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const [customizingReactions, setCustomizingReactions] = useState(false);
  const [defaultReactionOptions, setDefaultReactionOptions] = useState(() => {
    const fallbackReactions = ["❤️", "😍", "😂", "🥺", "👍"];

    try {
      const savedReactions = JSON.parse(
        localStorage.getItem("together-default-reactions")
      );

      if (
        Array.isArray(savedReactions) &&
        savedReactions.length === 5 &&
        savedReactions.every(
          (reaction) => typeof reaction === "string"
        )
      ) {
        return savedReactions;
      }
    } catch (error) {
      console.warn(
        "Unable to load saved default reactions:",
        error
      );
    }

    return fallbackReactions;
  });
  const [reactionDraft, setReactionDraft] = useState([]);
  const [reactionAnimations, setReactionAnimations] = useState([]);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [pinningMessageId, setPinningMessageId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [messagePendingDelete, setMessagePendingDelete] = useState(null);
  const [imageViewerUrl, setImageViewerUrl] = useState("");
  const [recordingState, setRecordingState] = useState("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("");
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const { startCall } = useCall();
  const [swipeState, setSwipeState] = useState({
    messageId: null,
    offset: 0,
  });

  const messagesEndRef = useRef(null);
  const olderMessagesSentinelRef = useRef(null);
  const initialScrollDoneRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const userScrolledUpRef = useRef(false);
  const lastWindowScrollYRef = useRef(0);
  const pullStartYRef = useRef(null);
  const pullTriggeredRef = useRef(false);
  const textAreaRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const uploadProgressTimerRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingStopTimeoutRef = useRef(null);
  const partnerTypingTimeoutRef = useRef(null);
  const messageRefs = useRef(new Map());
  const longPressTimeoutRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const lastTapRef = useRef({
    messageId: null,
    tappedAt: 0,
  });
  const gestureRef = useRef({
    messageId: null,
    startX: 0,
    startY: 0,
    isOwnMessage: false,
    longPressOpened: false,
    replyThresholdReached: false,
    currentOffset: 0,
    startedAt: 0,
    moved: false,
  });

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function markPartnerMessagesAsRead() {
      const { error } = await supabase.rpc(
        "mark_partner_messages_as_read"
      );

      if (error) {
        console.error("Unable to mark messages as read:", error);
      }
    }

    async function loadChat() {
      setLoading(true);
      setErrorMessage("");

      const [messagesResult, partnerResult] = await Promise.all([
        supabase
          .from("messages")
          .select(
            "id, sender_id, content, image_url, file_url, file_name, file_size, file_type, voice_url, voice_duration, call_id, call_type, call_status, call_duration, reply_to_id, created_at, read_at, pinned_at, pinned_by"
          )
          .order("created_at", { ascending: false })
          .limit(10),

        supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .neq("id", user.id)
          .limit(1)
          .maybeSingle(),
      ]);

      const reactionsResult = await supabase
        .from("message_reactions")
        .select("id, message_id, user_id, emoji, created_at");

      if (!isMounted) return;

      if (messagesResult.error) {
        console.error(
          "Unable to load messages:",
          messagesResult.error
        );

        setErrorMessage(
          "Unable to load the conversation. Please refresh the page."
        );
      } else {
        const initialMessages = [...(messagesResult.data ?? [])].reverse();
        setMessages(initialMessages);
        setHasMoreMessages(initialMessages.length === 10);
        initialScrollDoneRef.current = false;

        // The user is currently viewing Chat,
        // so incoming partner messages are now considered read.
        await markPartnerMessagesAsRead();
      }

      if (reactionsResult.error) {
        console.error(
          "Unable to load message reactions:",
          reactionsResult.error
        );
      } else {
        setReactions(reactionsResult.data ?? []);
      }

      if (!partnerResult.error && partnerResult.data) {
        if (partnerResult.data.full_name) {
          setPartnerName(partnerResult.data.full_name);
        }

        setPartnerAvatarUrl(partnerResult.data.avatar_url ?? "");
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadChat();

    const channel = supabase
      .channel("private-couple-chat", {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on(
        "broadcast",
        {
          event: "typing",
        },
        ({ payload }) => {
          if (!payload || payload.user_id === user.id) return;

          setPartnerIsTyping(Boolean(payload.is_typing));

          if (partnerTypingTimeoutRef.current) {
            clearTimeout(partnerTypingTimeoutRef.current);
          }

          if (payload.is_typing) {
            partnerTypingTimeoutRef.current = setTimeout(() => {
              setPartnerIsTyping(false);
            }, 2500);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const updatedProfile = payload.new;

          if (!updatedProfile || updatedProfile.id === user.id) return;

          if (updatedProfile.full_name) {
            setPartnerName(updatedProfile.full_name);
          }

          setPartnerAvatarUrl(updatedProfile.avatar_url ?? "");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new;

          setMessages((currentMessages) => {
            const alreadyExists = currentMessages.some(
              (currentMessage) =>
                currentMessage.id === newMessage.id
            );

            if (alreadyExists) {
              return currentMessages;
            }

            return [...currentMessages, newMessage];
          });

          // A partner message received while Chat is open
          // should immediately be marked as read.
          if (newMessage.sender_id !== user.id) {
            await markPartnerMessagesAsRead();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new;

          setMessages((currentMessages) =>
            currentMessages.map((currentMessage) =>
              currentMessage.id === updatedMessage.id
                ? updatedMessage
                : currentMessage
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          setMessages((currentMessages) =>
            currentMessages.filter(
              (currentMessage) =>
                currentMessage.id !== payload.old.id
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const newReaction = payload.new;

          setReactions((currentReactions) => {
            const alreadyExists = currentReactions.some(
              (reaction) => reaction.id === newReaction.id
            );

            return alreadyExists
              ? currentReactions
              : [...currentReactions, newReaction];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const updatedReaction = payload.new;

          setReactions((currentReactions) =>
            currentReactions.map((reaction) =>
              reaction.id === updatedReaction.id
                ? updatedReaction
                : reaction
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          setReactions((currentReactions) =>
            currentReactions.filter(
              (reaction) => reaction.id !== payload.old.id
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          typingChannelRef.current = channel;
        }
      });

    async function handlePageVisible() {
      if (
        document.visibilityState === "visible" &&
        isMounted
      ) {
        await markPartnerMessagesAsRead();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handlePageVisible
    );

    window.addEventListener("focus", handlePageVisible);

    return () => {
      isMounted = false;

      document.removeEventListener(
        "visibilitychange",
        handlePageVisible
      );

      window.removeEventListener(
        "focus",
        handlePageVisible
      );

      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }

      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }

      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }

      selectedAttachments.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (loading || initialScrollDoneRef.current || messages.length === 0) return;
    initialScrollDoneRef.current = true;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [loading, messages.length]);

  useEffect(() => {
    lastWindowScrollYRef.current = window.scrollY;

    function trackUpwardScroll() {
      const currentY = window.scrollY;
      const movedUp = currentY < lastWindowScrollYRef.current;

      if (movedUp && currentY <= 180) {
        userScrolledUpRef.current = true;

        if (!loadingOlderRef.current && hasMoreMessages) {
          loadOlderMessages();
        }
      }

      lastWindowScrollYRef.current = currentY;
    }

    function handleWheel(event) {
      if (event.deltaY < 0 && window.scrollY <= 120) {
        userScrolledUpRef.current = true;

        if (!loadingOlderRef.current && hasMoreMessages) {
          loadOlderMessages();
        }
      }
    }

    function handleTouchStart(event) {
      if (window.scrollY <= 5 && event.touches.length === 1) {
        pullStartYRef.current = event.touches[0].clientY;
        pullTriggeredRef.current = false;
      } else {
        pullStartYRef.current = null;
      }
    }

    function handleTouchMove(event) {
      if (pullStartYRef.current === null || pullTriggeredRef.current) return;

      const distance = event.touches[0].clientY - pullStartYRef.current;

      // Pulling downward while already at the top loads the next batch.
      if (distance >= 45 && window.scrollY <= 5) {
        pullTriggeredRef.current = true;
        userScrolledUpRef.current = true;

        if (!loadingOlderRef.current && hasMoreMessages) {
          loadOlderMessages();
        }
      }
    }

    function handleTouchEnd() {
      pullStartYRef.current = null;
      pullTriggeredRef.current = false;
    }

    window.addEventListener("scroll", trackUpwardScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("scroll", trackUpwardScroll);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [hasMoreMessages, messages.length]);

  useEffect(() => {
    const sentinel = olderMessagesSentinelRef.current;
    if (!sentinel || !hasMoreMessages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !loadingOlderRef.current &&
          userScrolledUpRef.current
        ) {
          userScrolledUpRef.current = false;
          loadOlderMessages();
        }
      },
      { root: null, rootMargin: "120px 0px 0px 0px", threshold: 0.01 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreMessages, messages.length]);

  useEffect(() => {
    if (!openReactionPickerId) return;

    function closeReactionPicker() {
      setOpenReactionPickerId(null);
      setShowAllReactions(false);
      setCustomizingReactions(false);
      setReactionDraft([]);
    }

    function handleOutsidePointerDown(event) {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target)
      ) {
        closeReactionPicker();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeReactionPicker();
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsidePointerDown
    );
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointerDown
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openReactionPickerId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "together-default-reactions",
        JSON.stringify(defaultReactionOptions)
      );
    } catch (error) {
      console.warn(
        "Unable to save default reactions:",
        error
      );
    }
  }, [defaultReactionOptions]);

  async function sendTypingStatus(isTyping) {
    if (!user || !typingChannelRef.current) return;

    const response = await typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: user.id,
        is_typing: isTyping,
      },
    });

    if (response !== "ok") {
      console.error("Unable to send typing status:", response);
    }
  }

  function stopTyping() {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    sendTypingStatus(false);
  }

  function handleMessageChange(event) {
    const nextMessage = event.target.value;
    setMessage(nextMessage);

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }

    if (!nextMessage.trim()) {
      sendTypingStatus(false);
      return;
    }

    sendTypingStatus(true);

    typingStopTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  }

  function formatFileSize(bytes) {
    const safeBytes = Number(bytes) || 0;
    if (safeBytes < 1024) return `${safeBytes} B`;
    if (safeBytes < 1024 * 1024) return `${(safeBytes / 1024).toFixed(1)} KB`;
    return `${(safeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const allowedDocumentTypes = [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv", "application/zip", "application/x-zip-compressed",
    "application/vnd.rar", "application/x-rar-compressed",
  ];
  const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar"];

  function addAttachments(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    const availableSlots = Math.max(0, 10 - selectedAttachments.length);
    const accepted = [];

    for (const file of files.slice(0, availableSlots)) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const isImage = allowedImageTypes.includes(file.type);
      const isDocument = allowedDocumentTypes.includes(file.type) || allowedExtensions.includes(extension);

      if (!isImage && !isDocument) continue;
      const maximumFileSize = isImage ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
      if (file.size > maximumFileSize) continue;

      accepted.push({
        id: crypto.randomUUID(),
        file,
        isImage,
        preview: isImage ? URL.createObjectURL(file) : "",
      });
    }

    if (!accepted.length) {
      setErrorMessage("Choose supported images or documents smaller than the allowed size.");
      return;
    }

    setSelectedAttachments((current) => [...current, ...accepted]);
    setErrorMessage(files.length > availableSlots ? "You can send up to 10 attachments at once." : "");
    stopTyping();
  }

  function handleAttachmentSelect(event) {
    addAttachments(event.target.files);
    event.target.value = "";
  }

  function removeSelectedAttachment(id) {
    setSelectedAttachments((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return current.filter((item) => item.id !== id);
    });
  }

  function clearSelectedAttachments() {
    setSelectedAttachments((current) => {
      current.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      return [];
    });
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (recordingState === "idle" && !sending) setDragActive(true);
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    if (recordingState !== "idle" || sending) return;
    addAttachments(event.dataTransfer.files);
  }


  function stopUploadProgressAnimation() {
    if (uploadProgressTimerRef.current) {
      clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }
  }

  function animateUploadProgressToward(target) {
    stopUploadProgressAnimation();
    uploadProgressTimerRef.current = setInterval(() => {
      setUploadProgress((current) => {
        if (current >= target) {
          stopUploadProgressAnimation();
          return current;
        }

        const remaining = target - current;
        const step = Math.max(0.7, Math.min(3.5, remaining * 0.12));
        return Math.min(target, Number((current + step).toFixed(1)));
      });
    }, 120);
  }

  async function uploadChatImage(file) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
    const fileName = `${crypto.randomUUID()}.${safeExtension}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("chat-images")
      .getPublicUrl(filePath);

    return {
      imageUrl: data.publicUrl,
      filePath,
    };
  }

  async function uploadChatFile(file) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "file";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "file";
    const fileName = `${crypto.randomUUID()}.${safeExtension}`;
    const filePath = `${user.id}/files/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("chat-images").getPublicUrl(filePath);
    return { fileUrl: data.publicUrl, filePath };
  }

  function formatVoiceDuration(value) {
    const safeValue = Math.max(0, Math.floor(value || 0));
    const minutes = Math.floor(safeValue / 60);
    const seconds = safeValue % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function clearRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function startRecordingTimer() {
    clearRecordingTimer();
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);
  }

  function stopMediaStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function discardVoiceRecording() {
    clearRecordingTimer();

    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
    }

    setVoiceBlob(null);
    setVoicePreviewUrl("");
    setRecordingSeconds(0);
    setRecordingState("idle");
    recordedChunksRef.current = [];
    stopMediaStream();
  }

  async function startVoiceRecording() {
    if (!user || sending || uploadingImage || uploadingVoice) return;

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErrorMessage("Voice recording is not supported by this browser.");
      return;
    }

    try {
      setErrorMessage("");
      stopTyping();
      clearSelectedAttachments();
      discardVoiceRecording();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("Voice recorder error:", event.error || event);
        clearRecordingTimer();
        stopMediaStream();
        setRecordingState("idle");
        setErrorMessage("The recording stopped because of a microphone error.");
      };

      recorder.onstop = () => {
        clearRecordingTimer();
        stopMediaStream();

        const chunks = recordedChunksRef.current;
        if (!chunks.length) {
          setRecordingState("idle");
          setErrorMessage("No audio was recorded. Please try again.");
          return;
        }

        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        const previewUrl = URL.createObjectURL(blob);

        setVoiceBlob(blob);
        setVoicePreviewUrl(previewUrl);
        setRecordingState("preview");
      };

      recorder.start(250);
      setRecordingSeconds(0);
      setRecordingState("recording");
      startRecordingTimer();
    } catch (error) {
      console.error("Unable to start voice recording:", error);
      clearRecordingTimer();
      stopMediaStream();
      setRecordingState("idle");
      setErrorMessage(
        error?.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access and try again."
          : "The microphone could not be started. Please try again."
      );
    }
  }

  function pauseVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.pause();
    clearRecordingTimer();
    setRecordingState("paused");
  }

  function resumeVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    recorder.resume();
    startRecordingTimer();
    setRecordingState("recording");
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    clearRecordingTimer();
    recorder.stop();
  }

  async function uploadChatVoice(blob) {
    const type = blob.type || "audio/webm";
    const extension = type.includes("mp4")
      ? "m4a"
      : type.includes("ogg")
        ? "ogg"
        : "webm";
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-voices")
      .upload(filePath, blob, {
        cacheControl: "3600",
        contentType: type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("chat-voices")
      .getPublicUrl(filePath);

    return {
      voiceUrl: data.publicUrl,
      filePath,
    };
  }

  async function sendVoiceRecording() {
    if (!user || !voiceBlob || uploadingVoice || sending) return;

    const temporaryReply = replyingTo;
    let uploadedFilePath = null;

    setUploadingVoice(true);
    setErrorMessage("");

    try {
      const uploadResult = await uploadChatVoice(voiceBlob);
      uploadedFilePath = uploadResult.filePath;

      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          content: null,
          image_url: null,
          voice_url: uploadResult.voiceUrl,
          voice_duration: recordingSeconds,
          reply_to_id: temporaryReply?.id ?? null,
          read_at: null,
        });

      if (insertError) throw insertError;

      discardVoiceRecording();
      setReplyingTo(null);
    } catch (error) {
      console.error("Unable to send voice message:", error);

      if (uploadedFilePath) {
        await supabase.storage
          .from("chat-voices")
          .remove([uploadedFilePath]);
      }

      setErrorMessage("Your voice message could not be sent. Please try again.");
    } finally {
      setUploadingVoice(false);
    }
  }

  function startReply(chatMessage) {
    setReplyingTo(chatMessage);
    setOpenReactionPickerId(null);
    setShowAllReactions(false);
    setCustomizingReactions(false);
    setReactionDraft([]);
    stopTyping();

    requestAnimationFrame(() => {
      textAreaRef.current?.focus();
    });
  }

  function cancelReply() {
    setReplyingTo(null);
  }

  function getRepliedMessage(replyToId) {
    if (!replyToId) return null;

    return messages.find(
      (chatMessage) => chatMessage.id === replyToId
    );
  }

  function getReplyPreviewText(chatMessage) {
    if (!chatMessage) return "Original message unavailable";

    if (chatMessage.content?.trim()) {
      return chatMessage.content.trim();
    }

    if (chatMessage.image_url) {
      return "📷 Photo";
    }

    if (chatMessage.file_url) {
      return `📎 ${chatMessage.file_name || "File"}`;
    }

    if (chatMessage.voice_url) {
      return `🎙 Voice message · ${formatVoiceDuration(chatMessage.voice_duration)}`;
    }

    return "Message";
  }

  async function loadReactionsForMessages(messageIds) {
    if (!messageIds.length) return;
    const { data, error } = await supabase
      .from("message_reactions")
      .select("id, message_id, user_id, emoji, created_at")
      .in("message_id", messageIds);

    if (error) {
      console.error("Unable to load reactions for older messages:", error);
      return;
    }

    setReactions((current) => {
      const byId = new Map(current.map((reaction) => [reaction.id, reaction]));
      (data ?? []).forEach((reaction) => byId.set(reaction.id, reaction));
      return [...byId.values()];
    });
  }

  async function loadOlderMessages() {
    if (loadingOlderRef.current || !hasMoreMessages || messages.length === 0) return;
    loadingOlderRef.current = true;
    setLoadingOlderMessages(true);

    const previousHeight = document.documentElement.scrollHeight;
    const oldestMessage = messages[0];

    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, content, image_url, file_url, file_name, file_size, file_type, voice_url, voice_duration, call_id, call_type, call_status, call_duration, reply_to_id, created_at, read_at, pinned_at, pinned_by")
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Unable to load older messages:", error);
      setErrorMessage("Unable to load older messages. Please try again.");
    } else {
      const olderMessages = [...(data ?? [])].reverse();
      setHasMoreMessages(olderMessages.length === 10);
      if (olderMessages.length) {
        setMessages((current) => [...olderMessages, ...current]);
        await loadReactionsForMessages(olderMessages.map((item) => item.id));
        requestAnimationFrame(() => {
          const newHeight = document.documentElement.scrollHeight;
          window.scrollBy({ top: newHeight - previousHeight, behavior: "auto" });
        });
      }
    }

    setLoadingOlderMessages(false);
    loadingOlderRef.current = false;
  }

  async function openSearchResult(result) {
    setSearchOpen(false);
    const fields = "id, sender_id, content, image_url, file_url, file_name, file_size, file_type, voice_url, voice_duration, call_id, call_type, call_status, call_duration, reply_to_id, created_at, read_at, pinned_at, pinned_by";

    const [targetResult, olderResult, newerResult] = await Promise.all([
      supabase.from("messages").select(fields).eq("id", result.id).maybeSingle(),
      supabase.from("messages").select(fields).lt("created_at", result.created_at).order("created_at", { ascending: false }).limit(5),
      supabase.from("messages").select(fields).gt("created_at", result.created_at).order("created_at", { ascending: true }).limit(5),
    ]);

    if (targetResult.error || !targetResult.data) {
      setErrorMessage("Unable to open that message.");
      return;
    }

    const contextMessages = [
      ...[...(olderResult.data ?? [])].reverse(),
      targetResult.data,
      ...(newerResult.data ?? []),
    ];

    setMessages(contextMessages);
    setHasMoreMessages((olderResult.data ?? []).length === 5);
    await loadReactionsForMessages(contextMessages.map((item) => item.id));
    requestAnimationFrame(() => {
      setTimeout(() => scrollToMessage(result.id), 80);
    });
  }

  function scrollToMessage(messageId) {
    const messageElement = messageRefs.current.get(messageId);

    if (!messageElement) return;

    messageElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    messageElement.classList.add(
      "ring-2",
      "ring-rose-300",
      "ring-offset-2"
    );

    setTimeout(() => {
      messageElement.classList.remove(
        "ring-2",
        "ring-rose-300",
        "ring-offset-2"
      );
    }, 1200);
  }

  const allReactionOptions = [
    "❤️", "😍", "😂", "🥺", "👍", "😘", "🥰", "💕",
    "💖", "💗", "💓", "💞", "💘", "💝", "💋", "🌹",
    "😊", "😁", "🤣", "😅", "😇", "🙂", "🙃", "😉",
    "😋", "😜", "🤪", "🤭", "🤗", "🤩", "😎", "🥳",
    "😭", "😢", "😔", "😞", "😟", "😩", "😫", "😤",
    "😡", "🤬", "😱", "😮", "😲", "😳", "🤯", "😴",
    "👏", "🙌", "🤝", "🙏", "💪", "👌", "✌️", "🤞",
    "👎", "🔥", "✨", "⭐", "💯", "🎉", "🎊", "🎈",
    "🎂", "🎁", "💍", "🧸", "🐻", "🐼", "🐰", "🐶",
  ];

  function beginReactionCustomization() {
    setReactionDraft(defaultReactionOptions);
    setCustomizingReactions(true);
    setShowAllReactions(true);
  }

  function toggleDefaultReaction(emoji) {
    setReactionDraft((currentReactions) => {
      if (currentReactions.includes(emoji)) {
        return currentReactions.filter(
          (reaction) => reaction !== emoji
        );
      }

      if (currentReactions.length >= 5) {
        return currentReactions;
      }

      return [...currentReactions, emoji];
    });
  }

  function saveReactionCustomization() {
    if (reactionDraft.length !== 5) return;

    setDefaultReactionOptions(reactionDraft);
    setCustomizingReactions(false);
  }

  function cancelReactionCustomization() {
    setReactionDraft([]);
    setCustomizingReactions(false);
  }

  function clearLongPressTimer() {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }

  function openReactionPicker(messageId) {
    setOpenReactionPickerId(messageId);
    setShowAllReactions(false);
    setCustomizingReactions(false);
    setReactionDraft([]);

    if (navigator.vibrate) {
      navigator.vibrate(35);
    }
  }

  function handleMessagePointerDown(
    event,
    chatMessage,
    isOwnMessage
  ) {
    if (event.button !== undefined && event.button !== 0) return;

    clearLongPressTimer();

    gestureRef.current = {
      messageId: chatMessage.id,
      startX: event.clientX,
      startY: event.clientY,
      isOwnMessage,
      longPressOpened: false,
      replyThresholdReached: false,
      currentOffset: 0,
      startedAt: Date.now(),
      moved: false,
    };

    setSwipeState({
      messageId: chatMessage.id,
      offset: 0,
    });

    event.currentTarget.setPointerCapture?.(event.pointerId);

    longPressTimeoutRef.current = setTimeout(() => {
      gestureRef.current.longPressOpened = true;
      setSwipeState({
        messageId: null,
        offset: 0,
      });
      openReactionPicker(chatMessage.id);
    }, 400);
  }

  function handleMessagePointerMove(event) {
    const gesture = gestureRef.current;

    if (!gesture.messageId || gesture.longPressOpened) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      gesture.moved = true;
      clearLongPressTimer();
    }

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      setSwipeState({
        messageId: gesture.messageId,
        offset: 0,
      });
      return;
    }

    const allowedOffset = gesture.isOwnMessage
      ? Math.min(0, deltaX)
      : Math.max(0, deltaX);

    const limitedOffset = Math.max(
      -100,
      Math.min(100, allowedOffset)
    );

    gestureRef.current.currentOffset = limitedOffset;

    setSwipeState({
      messageId: gesture.messageId,
      offset: limitedOffset,
    });

    const reachedThreshold = Math.abs(limitedOffset) >= 70;

    if (
      reachedThreshold &&
      !gesture.replyThresholdReached
    ) {
      gesture.replyThresholdReached = true;

      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }

    if (!reachedThreshold) {
      gesture.replyThresholdReached = false;
    }
  }

  function finishMessageGesture(chatMessage) {
    const gesture = gestureRef.current;
    const currentOffset =
      gesture.messageId === chatMessage.id
        ? gesture.currentOffset ?? 0
        : 0;

    const gestureDuration = Date.now() - (gesture.startedAt || 0);
    const isSimpleTap =
      !gesture.longPressOpened &&
      !gesture.moved &&
      Math.abs(currentOffset) < 10 &&
      gestureDuration < 350;

    clearLongPressTimer();

    if (
      !gesture.longPressOpened &&
      Math.abs(currentOffset) >= 70
    ) {
      startReply(chatMessage);
    } else if (isSimpleTap) {
      const now = Date.now();
      const previousTap = lastTapRef.current;
      const isDoubleTap =
        previousTap.messageId === chatMessage.id &&
        now - previousTap.tappedAt <= 320;

      if (isDoubleTap) {
        lastTapRef.current = {
          messageId: null,
          tappedAt: 0,
        };

        setOpenReactionPickerId(null);
        setShowAllReactions(false);
        setCustomizingReactions(false);
        setReactionDraft([]);

        handleReaction(
          chatMessage.id,
          defaultReactionOptions[0]
        );

        if (navigator.vibrate) {
          navigator.vibrate(35);
        }
      } else {
        lastTapRef.current = {
          messageId: chatMessage.id,
          tappedAt: now,
        };
      }
    }

    setSwipeState({
      messageId: null,
      offset: 0,
    });

    gestureRef.current = {
      messageId: null,
      startX: 0,
      startY: 0,
      isOwnMessage: false,
      longPressOpened: false,
      replyThresholdReached: false,
      currentOffset: 0,
      startedAt: 0,
      moved: false,
    };
  }

  function cancelMessageGesture() {
    clearLongPressTimer();

    setSwipeState({
      messageId: null,
      offset: 0,
    });

    gestureRef.current = {
      messageId: null,
      startX: 0,
      startY: 0,
      isOwnMessage: false,
      longPressOpened: false,
      replyThresholdReached: false,
      currentOffset: 0,
      startedAt: 0,
      moved: false,
    };
  }

  function getMessageReactions(messageId) {
    return reactions.filter(
      (reaction) => reaction.message_id === messageId
    );
  }

  function groupMessageReactions(messageId) {
    const grouped = new Map();

    getMessageReactions(messageId).forEach((reaction) => {
      const existing = grouped.get(reaction.emoji) ?? {
        emoji: reaction.emoji,
        count: 0,
        reactedByCurrentUser: false,
      };

      existing.count += 1;

      if (reaction.user_id === user?.id) {
        existing.reactedByCurrentUser = true;
      }

      grouped.set(reaction.emoji, existing);
    });

    return Array.from(grouped.values());
  }

  function closeMessageActions() {
    setOpenReactionPickerId(null);
    setShowAllReactions(false);
    setCustomizingReactions(false);
    setReactionDraft([]);
  }

  function triggerReactionAnimation(messageId, emoji) {
    const animationId = crypto.randomUUID();

    setReactionAnimations((currentAnimations) => [
      ...currentAnimations,
      {
        id: animationId,
        messageId,
        emoji,
      },
    ]);

    window.setTimeout(() => {
      setReactionAnimations((currentAnimations) =>
        currentAnimations.filter(
          (animation) => animation.id !== animationId
        )
      );
    }, 850);
  }

  async function copyMessage(chatMessage) {
    const textToCopy = chatMessage.content?.trim();

    if (!textToCopy) {
      setErrorMessage("This message has no text to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(chatMessage.id);
      setErrorMessage("");
      closeMessageActions();

      window.setTimeout(() => {
        setCopiedMessageId((currentId) =>
          currentId === chatMessage.id ? null : currentId
        );
      }, 1800);
    } catch (error) {
      console.error("Unable to copy message:", error);
      setErrorMessage("The message could not be copied.");
    }
  }

  async function togglePinnedMessage(chatMessage) {
    if (!user || pinningMessageId) return;

    setPinningMessageId(chatMessage.id);
    setErrorMessage("");

    const isPinned = Boolean(chatMessage.pinned_at);

    try {
      const { error } = await supabase
        .from("messages")
        .update({
          pinned_at: isPinned ? null : new Date().toISOString(),
          pinned_by: isPinned ? null : user.id,
        })
        .eq("id", chatMessage.id);

      if (error) throw error;

      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === chatMessage.id
            ? {
                ...currentMessage,
                pinned_at: isPinned
                  ? null
                  : new Date().toISOString(),
                pinned_by: isPinned ? null : user.id,
              }
            : currentMessage
        )
      );

      closeMessageActions();
    } catch (error) {
      console.error("Unable to update pinned message:", error);
      setErrorMessage(
        "The pinned message could not be updated. Run the Supabase SQL provided with this file first."
      );
    } finally {
      setPinningMessageId(null);
    }
  }

  function getStoragePathFromPublicUrl(publicUrl, bucketName) {
    if (!publicUrl) return null;

    const marker = `/storage/v1/object/public/${bucketName}/`;
    const markerIndex = publicUrl.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
  }

  function requestDeleteMessage(chatMessage) {
    if (
      !user ||
      chatMessage.sender_id !== user.id ||
      deletingMessageId
    ) {
      return;
    }

    closeMessageActions();
    setMessagePendingDelete(chatMessage);
  }

  function cancelDeleteMessage() {
    if (deletingMessageId) return;
    setMessagePendingDelete(null);
  }

  async function confirmDeleteMessage() {
    const chatMessage = messagePendingDelete;

    if (
      !chatMessage ||
      !user ||
      chatMessage.sender_id !== user.id ||
      deletingMessageId
    ) {
      return;
    }

    setDeletingMessageId(chatMessage.id);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", chatMessage.id)
        .eq("sender_id", user.id);

      if (error) throw error;

      const storagePath = getStoragePathFromPublicUrl(
        chatMessage.image_url,
        "chat-images"
      );

      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("chat-images")
          .remove([storagePath]);

        if (storageError) {
          console.warn(
            "Message deleted, but its image could not be removed:",
            storageError
          );
        }
      }

      const fileStoragePath = getStoragePathFromPublicUrl(
        chatMessage.file_url,
        "chat-images"
      );

      if (fileStoragePath) {
        const { error: fileStorageError } = await supabase.storage
          .from("chat-images")
          .remove([fileStoragePath]);

        if (fileStorageError) {
          console.warn(
            "Message deleted, but its attached file could not be removed:",
            fileStorageError
          );
        }
      }

      const voiceStoragePath = getStoragePathFromPublicUrl(
        chatMessage.voice_url,
        "chat-voices"
      );

      if (voiceStoragePath) {
        const { error: voiceStorageError } = await supabase.storage
          .from("chat-voices")
          .remove([voiceStoragePath]);

        if (voiceStorageError) {
          console.warn(
            "Message deleted, but its voice recording could not be removed:",
            voiceStorageError
          );
        }
      }

      setMessages((currentMessages) =>
        currentMessages.filter(
          (currentMessage) =>
            currentMessage.id !== chatMessage.id
        )
      );

      setMessagePendingDelete(null);
      closeMessageActions();
    } catch (error) {
      console.error("Unable to delete message:", error);
      setErrorMessage("The message could not be deleted. Please try again.");
    } finally {
      setDeletingMessageId(null);
    }
  }

  async function handleReaction(messageId, emoji) {
    if (!user || savingReactionForId) return;

    setSavingReactionForId(messageId);
    setErrorMessage("");

    const existingReaction = reactions.find(
      (reaction) =>
        reaction.message_id === messageId &&
        reaction.user_id === user.id
    );

    try {
      if (existingReaction?.emoji === emoji) {
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (error) throw error;

        setReactions((currentReactions) =>
          currentReactions.filter(
            (reaction) => reaction.id !== existingReaction.id
          )
        );
      } else if (existingReaction) {
        const { data, error } = await supabase
          .from("message_reactions")
          .update({ emoji })
          .eq("id", existingReaction.id)
          .select("id, message_id, user_id, emoji, created_at")
          .single();

        if (error) throw error;

        setReactions((currentReactions) =>
          currentReactions.map((reaction) =>
            reaction.id === data.id ? data : reaction
          )
        );

        triggerReactionAnimation(messageId, emoji);
      } else {
        const { data, error } = await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          })
          .select("id, message_id, user_id, emoji, created_at")
          .single();

        if (error) throw error;

        setReactions((currentReactions) => {
          const alreadyExists = currentReactions.some(
            (reaction) => reaction.id === data.id
          );

          return alreadyExists
            ? currentReactions
            : [...currentReactions, data];
        });

        triggerReactionAnimation(messageId, emoji);
      }

      setOpenReactionPickerId(null);
      setShowAllReactions(false);
      setCustomizingReactions(false);
      setReactionDraft([]);
    } catch (error) {
      console.error("Unable to save reaction:", error);
      setErrorMessage(
        "The reaction could not be saved. Please try again."
      );
    } finally {
      setSavingReactionForId(null);
    }
  }

  async function handleSendMessage(event) {
    event?.preventDefault();
    const cleanMessage = message.trim();

    if ((!cleanMessage && selectedAttachments.length === 0) || !user || sending || uploadingImage) return;

    stopTyping();
    setSending(true);
    setErrorMessage("");
    stopUploadProgressAnimation();
    setUploadProgress(0);
    setUploadStage("preparing");
    setUploadCurrentName("");
    setUploadCurrentIndex(0);

    const temporaryMessage = cleanMessage;
    const temporaryAttachments = [...selectedAttachments];
    const temporaryReply = replyingTo;
    const uploadedPaths = [];
    setMessage("");

    try {
      if (temporaryAttachments.length === 0) {
        const { error } = await supabase.from("messages").insert({
          sender_id: user.id,
          content: cleanMessage,
          reply_to_id: temporaryReply?.id ?? null,
          read_at: null,
        });
        if (error) throw error;
      } else {
        setUploadingImage(true);
        setUploadProgress(2);
        await new Promise((resolve) => setTimeout(resolve, 220));

        for (let index = 0; index < temporaryAttachments.length; index += 1) {
          const item = temporaryAttachments[index];
          const itemStart = (index / temporaryAttachments.length) * 100;
          const uploadTarget = itemStart + (82 / temporaryAttachments.length);

          setUploadCurrentName(item.file.name);
          setUploadCurrentIndex(index + 1);
          setUploadStage("uploading");
          setUploadProgress((current) => Math.max(current, Number((itemStart + 2).toFixed(1))));
          animateUploadProgressToward(uploadTarget);

          let imageUrl = null;
          let fileUrl = null;
          let uploadedPath = null;

          if (item.isImage) {
            const result = await uploadChatImage(item.file);
            imageUrl = result.imageUrl;
            uploadedPath = result.filePath;
          } else {
            const result = await uploadChatFile(item.file);
            fileUrl = result.fileUrl;
            uploadedPath = result.filePath;
          }
          uploadedPaths.push(uploadedPath);
          stopUploadProgressAnimation();
          setUploadStage("saving");
          setUploadProgress(Number((itemStart + (90 / temporaryAttachments.length)).toFixed(1)));

          const { error } = await supabase.from("messages").insert({
            sender_id: user.id,
            content: index === 0 ? cleanMessage || null : null,
            image_url: imageUrl,
            file_url: fileUrl,
            file_name: item.isImage ? null : item.file.name,
            file_size: item.isImage ? null : item.file.size,
            file_type: item.isImage ? item.file.type : item.file.type || null,
            reply_to_id: index === 0 ? temporaryReply?.id ?? null : null,
            read_at: null,
          });
          if (error) throw error;
          setUploadProgress(Number((((index + 1) / temporaryAttachments.length) * 100).toFixed(1)));
        }

        setUploadStage("sent");
        setUploadProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 550));
      }

      clearSelectedAttachments();
      setReplyingTo(null);
      textAreaRef.current?.focus();
    } catch (error) {
      console.error("Unable to send message:", error);
      if (uploadedPaths.length) await supabase.storage.from("chat-images").remove(uploadedPaths);
      setMessage(temporaryMessage);
      setSelectedAttachments(temporaryAttachments);
      setReplyingTo(temporaryReply);
      setErrorMessage("Your attachment could not be sent. Please try again.");
    } finally {
      stopUploadProgressAnimation();
      setUploadingImage(false);
      setUploadProgress(0);
      setUploadStage("idle");
      setUploadCurrentName("");
      setUploadCurrentIndex(0);
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  function formatMessageTime(dateValue) {
    return new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateValue));
  }

  function formatDateSeparator(dateValue) {
    const messageDate = new Date(dateValue);
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (firstDate, secondDate) =>
      firstDate.getFullYear() ===
        secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate();

    if (isSameDay(messageDate, today)) {
      return "Today";
    }

    if (isSameDay(messageDate, yesterday)) {
      return "Yesterday";
    }

    return new Intl.DateTimeFormat("en-PH", {
      month: "long",
      day: "numeric",
      year:
        messageDate.getFullYear() !== today.getFullYear()
          ? "numeric"
          : undefined,
    }).format(messageDate);
  }

  function shouldShowDateSeparator(
    currentMessage,
    index
  ) {
    if (index === 0) return true;

    const previousMessage = messages[index - 1];

    return (
      new Date(
        currentMessage.created_at
      ).toDateString() !==
      new Date(previousMessage.created_at).toDateString()
    );
  }

  const pinnedMessages = messages
    .filter((chatMessage) => chatMessage.pinned_at)
    .sort(
      (firstMessage, secondMessage) =>
        new Date(secondMessage.pinned_at) -
        new Date(firstMessage.pinned_at)
    );

  const latestPinnedMessage = pinnedMessages[0] ?? null;

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className="relative flex min-h-[calc(100vh-7rem)] flex-col bg-[#fff7f9] scroll-smooth">
      {dragActive && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-rose-500/20 backdrop-blur-sm">
          <div className="rounded-3xl border-2 border-dashed border-rose-500 bg-white px-10 py-8 text-center shadow-2xl">
            <Paperclip className="mx-auto mb-3 text-rose-500" size={38} />
            <p className="text-lg font-bold text-gray-800">Drop files to attach</p>
            <p className="mt-1 text-sm text-gray-500">Up to 10 photos or documents</p>
          </div>
        </div>
      )}
      <style>{`
        @keyframes togetherReactionFloat {
          0% {
            opacity: 0;
            transform: translate(-50%, 10px) scale(0.45) rotate(-8deg);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -8px) scale(1.35) rotate(5deg);
          }
          65% {
            opacity: 1;
            transform: translate(-50%, -54px) scale(1.05) rotate(-3deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -88px) scale(0.8) rotate(3deg);
          }
        }

        @keyframes togetherReactionSparkleLeft {
          0%, 100% {
            opacity: 0;
            transform: translate(0, 0) scale(0.5);
          }
          35% {
            opacity: 1;
            transform: translate(-18px, -24px) scale(1);
          }
        }

        @keyframes togetherReactionSparkleRight {
          0%, 100% {
            opacity: 0;
            transform: translate(0, 0) scale(0.5);
          }
          35% {
            opacity: 1;
            transform: translate(18px, -30px) scale(1);
          }
        }
      `}</style>
      <ChatHeader
        partnerName={partnerName}
        partnerAvatarUrl={partnerAvatarUrl}
        partnerIsOnline={partnerIsOnline}
        partnerIsTyping={partnerIsTyping}
        onStartCall={startCall}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {latestPinnedMessage && (
        <button
          type="button"
          onClick={() =>
            scrollToMessage(latestPinnedMessage.id)
          }
          className="sticky top-[76px] z-10 mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-4xl items-center gap-3 rounded-2xl border border-rose-100 bg-white/95 px-4 py-3 text-left shadow-md backdrop-blur transition hover:bg-rose-50 sm:w-[calc(100%-3rem)]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500">
            <Pin size={17} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
              Pinned message
            </p>
            <p className="truncate text-sm text-gray-700">
              {getReplyPreviewText(latestPinnedMessage)}
            </p>
          </div>

          {pinnedMessages.length > 1 && (
            <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-500">
              +{pinnedMessages.length - 1}
            </span>
          )}
        </button>
      )}

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 py-5 sm:px-6">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-gray-500">
            <Loader2
              className="animate-spin text-rose-500"
              size={34}
            />

            <p className="mt-3 text-sm">
              Loading your conversation...
            </p>
          </div>
        ) : errorMessage && messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-500">
              <MessageCircle size={30} />
            </div>

            <p className="mt-4 max-w-sm text-sm text-red-500">
              {errorMessage}
            </p>
          </div>
        ) : messages.length === 0 && !partnerIsTyping ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500">
              <MessageCircle size={38} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-800">
              Start your conversation
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
              Send your first message and keep your private
              moments together in one place.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div ref={olderMessagesSentinelRef} className="flex min-h-10 items-center justify-center py-2 text-xs text-gray-400">
              {loadingOlderMessages ? (
                <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin text-rose-500" /> Loading older messages...</span>
              ) : hasMoreMessages ? (
                <span>Scroll to the top or pull down to load 10 older messages</span>
              ) : (
                <span>You reached the beginning of your conversation</span>
              )}
            </div>
            {messages.map((chatMessage, index) => {
              const isOwnMessage = chatMessage.sender_id === user?.id;
              const isLastMessage = index === messages.length - 1;
              const groupedReactions = groupMessageReactions(
                chatMessage.id
              );
              const repliedMessage = getRepliedMessage(
                chatMessage.reply_to_id
              );
              const swipeOffset =
                swipeState.messageId === chatMessage.id
                  ? swipeState.offset
                  : 0;
              const replyProgress = Math.min(
                1,
                Math.abs(swipeOffset) / 70
              );

              return (
                <div
                  key={chatMessage.id}
                  ref={(element) => {
                    if (element) {
                      messageRefs.current.set(
                        chatMessage.id,
                        element
                      );
                    } else {
                      messageRefs.current.delete(
                        chatMessage.id
                      );
                    }
                  }}
                  className="rounded-2xl transition"
                >
                  {shouldShowDateSeparator(
                    chatMessage,
                    index
                  ) && (
                    <div className="my-5 flex items-center justify-center">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
                        {formatDateSeparator(
                          chatMessage.created_at
                        )}
                      </span>
                    </div>
                  )}

                  <div
                    className={`relative mb-3 flex overflow-visible ${
                      isOwnMessage
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 transition ${
                        isOwnMessage ? "right-2" : "left-2"
                      }`}
                      style={{
                        opacity: replyProgress,
                        transform: `translateY(-50%) scale(${
                          0.75 + replyProgress * 0.25
                        })`,
                      }}
                      aria-hidden="true"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-lg text-rose-500 shadow-sm">
                        ↩
                      </div>
                    </div>

                    <div
                      onPointerDown={(event) =>
                        handleMessagePointerDown(
                          event,
                          chatMessage,
                          isOwnMessage
                        )
                      }
                      onPointerMove={handleMessagePointerMove}
                      onPointerUp={() =>
                        finishMessageGesture(chatMessage)
                      }
                      onPointerCancel={cancelMessageGesture}
                      onContextMenu={(event) =>
                        event.preventDefault()
                      }
                      style={{
                        transform: `translateX(${swipeOffset}px)`,
                        touchAction: "pan-y",
                      }}
                      className={`flex max-w-[82%] select-none flex-col transition-transform ease-out sm:max-w-[70%] ${
                        swipeState.messageId === chatMessage.id
                          ? "duration-0"
                          : "duration-150"
                      } ${
                        isOwnMessage
                          ? "items-end"
                          : "items-start"
                      }`}
                    >
                      <div className="relative">
                        {reactionAnimations
                          .filter(
                            (animation) =>
                              animation.messageId ===
                              chatMessage.id
                          )
                          .map((animation) => (
                            <div
                              key={animation.id}
                              className="pointer-events-none absolute left-1/2 top-1/2 z-30"
                              aria-hidden="true"
                            >
                              <span
                                className="absolute left-1/2 top-1/2 text-4xl drop-shadow-lg"
                                style={{
                                  animation:
                                    "togetherReactionFloat 850ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                                }}
                              >
                                {animation.emoji}
                              </span>
                              <span
                                className="absolute left-1/2 top-1/2 text-sm"
                                style={{
                                  animation:
                                    "togetherReactionSparkleLeft 700ms ease-out forwards",
                                }}
                              >
                                ✨
                              </span>
                              <span
                                className="absolute left-1/2 top-1/2 text-sm"
                                style={{
                                  animation:
                                    "togetherReactionSparkleRight 700ms ease-out forwards",
                                }}
                              >
                                ✨
                              </span>
                            </div>
                          ))}

                        {chatMessage.pinned_at && (
                          <div
                            className={`mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold text-rose-500 ${
                              isOwnMessage
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <Pin size={11} />
                            Pinned
                          </div>
                        )}

                        <div
                        className={`rounded-2xl shadow-sm ${
                          chatMessage.call_id
                            ? isOwnMessage
                              ? "rounded-br-md bg-gradient-to-br from-rose-500 to-pink-500 p-1 text-white"
                              : "rounded-bl-md bg-transparent p-0"
                            : isOwnMessage
                              ? "rounded-br-md bg-gradient-to-br from-rose-500 to-pink-500 px-4 py-2.5 text-white"
                              : "rounded-bl-md border border-rose-50 bg-white px-4 py-2.5 text-gray-800"
                        }`}
                      >
                        {chatMessage.reply_to_id && (
                          <button
                            type="button"
                            onClick={() =>
                              scrollToMessage(
                                chatMessage.reply_to_id
                              )
                            }
                            className={`mb-2 block w-full rounded-xl border-l-4 px-3 py-2 text-left transition ${
                              isOwnMessage
                                ? "border-white/70 bg-white/15 hover:bg-white/20"
                                : "border-rose-400 bg-rose-50 hover:bg-rose-100"
                            }`}
                          >
                            <span
                              className={`block text-[10px] font-semibold uppercase tracking-wide ${
                                isOwnMessage
                                  ? "text-white/80"
                                  : "text-rose-500"
                              }`}
                            >
                              Replying to
                            </span>

                            <span
                              className={`mt-0.5 block max-w-full truncate text-xs ${
                                isOwnMessage
                                  ? "text-white/90"
                                  : "text-gray-600"
                              }`}
                            >
                              {getReplyPreviewText(repliedMessage)}
                            </span>
                          </button>
                        )}

                        {chatMessage.image_url && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setImageViewerUrl(
                                chatMessage.image_url
                              );
                            }}
                            className="block w-full cursor-zoom-in"
                            aria-label="Open chat image"
                          >
                            <img
                              src={chatMessage.image_url}
                              loading="lazy"
                              decoding="async"
                              alt="Shared in chat"
                              loading="lazy"
                              className={`max-h-[420px] w-full rounded-xl object-cover ${
                                chatMessage.content ? "mb-2" : ""
                              }`}
                            />
                          </button>
                        )}

                        {chatMessage.file_url && (
                          <a
                            href={chatMessage.file_url}
                            target="_blank"
                            rel="noreferrer"
                            download={chatMessage.file_name || true}
                            onClick={(event) => event.stopPropagation()}
                            className={`mb-1 flex min-w-[220px] items-center gap-3 rounded-xl border p-3 transition ${
                              isOwnMessage
                                ? "border-white/30 bg-white/15 hover:bg-white/25"
                                : "border-rose-100 bg-rose-50 hover:bg-rose-100"
                            }`}
                          >
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isOwnMessage ? "bg-white/20 text-white" : "bg-white text-rose-500"}`}>
                              <FileText size={22} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{chatMessage.file_name || "Attachment"}</span>
                              <span className={`block text-xs ${isOwnMessage ? "text-white/75" : "text-gray-500"}`}>{formatFileSize(chatMessage.file_size)}</span>
                            </span>
                            <Download size={19} className="shrink-0" />
                          </a>
                        )}

                        {chatMessage.voice_url && (
                          <VoiceMessage
                            url={chatMessage.voice_url}
                            duration={chatMessage.voice_duration}
                            isOwnMessage={isOwnMessage}
                          />
                        )}

                        {chatMessage.call_id && (
                          <CallMessage
                            message={chatMessage}
                            isOwnMessage={isOwnMessage}
                            onCallAgain={startCall}
                          />
                        )}

                        {chatMessage.content && !chatMessage.call_id && (
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 sm:text-[15px]">
                            {chatMessage.content}
                          </p>
                        )}
                        </div>
                      </div>

                      {copiedMessageId === chatMessage.id && (
                        <span
                          className={`mt-1 px-1 text-[10px] font-semibold text-green-600 ${
                            isOwnMessage
                              ? "self-end"
                              : "self-start"
                          }`}
                        >
                          Copied
                        </span>
                      )}

                      {groupedReactions.length > 0 && (
                        <div
                          className={`mt-1 flex flex-wrap items-center gap-1 ${
                            isOwnMessage
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          {groupedReactions.map((reaction) => (
                            <button
                              key={reaction.emoji}
                              type="button"
                              onClick={() =>
                                handleReaction(
                                  chatMessage.id,
                                  reaction.emoji
                                )
                              }
                              disabled={
                                savingReactionForId ===
                                chatMessage.id
                              }
                              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition ${
                                reaction.reactedByCurrentUser
                                  ? "border-rose-300 bg-rose-50 text-rose-600"
                                  : "border-gray-100 bg-white text-gray-600"
                              }`}
                              aria-label={`React with ${reaction.emoji}`}
                            >
                              <span>{reaction.emoji}</span>
                              <span className="text-[10px] font-semibold">
                                {reaction.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {openReactionPickerId === chatMessage.id && (
                        <div
                          className={`mt-2 flex ${
                            isOwnMessage
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            ref={reactionPickerRef}
                            onPointerDown={(event) =>
                              event.stopPropagation()
                            }
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            className="reaction-picker w-fit max-w-[min(94vw,390px)] rounded-[28px] border border-gray-100 bg-white p-2 shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
                          >
                            <div className="flex items-center gap-1">
                              {defaultReactionOptions.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() =>
                                    handleReaction(
                                      chatMessage.id,
                                      emoji
                                    )
                                  }
                                  disabled={
                                    savingReactionForId ===
                                    chatMessage.id
                                  }
                                  className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[23px] transition duration-150 hover:-translate-y-1 hover:scale-125 hover:bg-gray-50 active:scale-110 disabled:opacity-50"
                                  aria-label={`React with ${emoji}`}
                                >
                                  <span className="transition-transform group-hover:scale-110">
                                    {emoji}
                                  </span>
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() => {
                                  setShowAllReactions(
                                    (current) => !current
                                  );

                                  if (showAllReactions) {
                                    cancelReactionCustomization();
                                  }
                                }}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600 transition hover:scale-110 hover:bg-gray-200"
                                aria-label={
                                  showAllReactions
                                    ? "Close more reactions"
                                    : "Show more reactions"
                                }
                              >
                                {showAllReactions ? "×" : "+"}
                              </button>
                            </div>

                            {showAllReactions && (
                              <div className="mt-2 w-full border-t border-gray-100 pt-2">
                                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700">
                                      {customizingReactions
                                        ? "Choose 5 default reactions"
                                        : "Choose a reaction"}
                                    </p>

                                    {customizingReactions && (
                                      <p className="text-[10px] text-gray-400">
                                        {reactionDraft.length}/5 selected
                                      </p>
                                    )}
                                  </div>

                                  {customizingReactions ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={cancelReactionCustomization}
                                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-100"
                                      >
                                        Cancel
                                      </button>

                                      <button
                                        type="button"
                                        onClick={saveReactionCustomization}
                                        disabled={reactionDraft.length !== 5}
                                        className="rounded-full bg-rose-500 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={beginReactionCustomization}
                                      className="rounded-full px-3 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50"
                                    >
                                      Customize
                                    </button>
                                  )}
                                </div>

                                <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto overscroll-contain pr-1">
                                  {allReactionOptions.map(
                                    (emoji, emojiIndex) => {
                                      const isSelected =
                                        reactionDraft.includes(emoji);

                                      return (
                                        <button
                                          key={`${emoji}-${emojiIndex}`}
                                          type="button"
                                          onClick={() => {
                                            if (customizingReactions) {
                                              toggleDefaultReaction(emoji);
                                              return;
                                            }

                                            handleReaction(
                                              chatMessage.id,
                                              emoji
                                            );
                                          }}
                                          disabled={
                                            savingReactionForId ===
                                            chatMessage.id ||
                                            (customizingReactions &&
                                              reactionDraft.length >= 5 &&
                                              !isSelected)
                                          }
                                          className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-xl transition hover:scale-125 active:scale-110 disabled:cursor-not-allowed disabled:opacity-35 ${
                                            customizingReactions &&
                                            isSelected
                                              ? "bg-rose-100 ring-2 ring-rose-400"
                                              : "hover:bg-gray-100"
                                          }`}
                                          aria-label={
                                            customizingReactions
                                              ? `${
                                                  isSelected
                                                    ? "Remove"
                                                    : "Add"
                                                } ${emoji} from defaults`
                                              : `React with ${emoji}`
                                          }
                                        >
                                          {emoji}

                                          {customizingReactions &&
                                            isSelected && (
                                              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                                                {reactionDraft.indexOf(
                                                  emoji
                                                ) + 1}
                                              </span>
                                            )}
                                        </button>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )}

                            {!customizingReactions && (
                              <div className="mt-2 grid grid-cols-2 gap-1 border-t border-gray-100 pt-2 sm:grid-cols-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    startReply(chatMessage)
                                  }
                                  className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                                >
                                  <Reply size={15} />
                                  Reply
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    copyMessage(chatMessage)
                                  }
                                  disabled={
                                    !chatMessage.content?.trim()
                                  }
                                  className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  <Copy size={15} />
                                  Copy
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    togglePinnedMessage(chatMessage)
                                  }
                                  disabled={
                                    pinningMessageId ===
                                    chatMessage.id
                                  }
                                  className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                                >
                                  {pinningMessageId ===
                                  chatMessage.id ? (
                                    <Loader2
                                      size={15}
                                      className="animate-spin"
                                    />
                                  ) : chatMessage.pinned_at ? (
                                    <PinOff size={15} />
                                  ) : (
                                    <Pin size={15} />
                                  )}
                                  {chatMessage.pinned_at
                                    ? "Unpin"
                                    : "Pin"}
                                </button>

                                {isOwnMessage && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      requestDeleteMessage(chatMessage)
                                    }
                                    disabled={
                                      deletingMessageId ===
                                      chatMessage.id
                                    }
                                    className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {deletingMessageId ===
                                    chatMessage.id ? (
                                      <Loader2
                                        size={15}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2 size={15} />
                                    )}
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-gray-400">
                      <span>{formatMessageTime(chatMessage.created_at)}</span>

                      {isOwnMessage && isLastMessage && (
                        <span
                          className={`flex items-center gap-0.5 font-medium ${
                            chatMessage.read_at
                              ? "text-blue-500"
                              : "text-gray-400"
                          }`}
                        >
                          {chatMessage.read_at ? (
                            <>
                              <CheckCheck size={13} />
                              Seen
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              Sent
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {partnerIsTyping && <TypingIndicator partnerName={partnerName} />}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <div className="sticky bottom-[5.8rem] z-20 border-t border-rose-100 bg-white/95 px-3 py-3 shadow-[0_-4px_18px_rgba(0,0,0,0.04)] backdrop-blur-md sm:px-6">
        {replyingTo && (
          <div className="mx-auto mb-3 max-w-4xl">
            <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
                <span className="text-lg">↩</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                  Replying to
                </p>

                <p className="truncate text-sm text-gray-600">
                  {getReplyPreviewText(replyingTo)}
                </p>
              </div>

              <button
                type="button"
                onClick={cancelReply}
                disabled={sending || uploadingImage}
                aria-label="Cancel reply"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>
          </div>
        )}

        {selectedAttachments.length > 0 && (
          <div className="mx-auto mb-3 max-w-4xl">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800">
                  {selectedAttachments.length} attachment{selectedAttachments.length === 1 ? "" : "s"} ready
                </p>
                <button type="button" onClick={clearSelectedAttachments} disabled={sending || uploadingImage} className="text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-50">Remove all</button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedAttachments.map((item) => (
                  <div key={item.id} className="relative w-24 shrink-0 overflow-hidden rounded-xl border border-white bg-white shadow-sm">
                    {item.isImage ? (
                      <img src={item.preview} alt={item.file.name} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="flex h-20 items-center justify-center bg-white text-rose-500"><FileText size={30} /></div>
                    )}
                    <div className="px-2 py-1.5">
                      <p className="truncate text-[11px] font-semibold text-gray-700">{item.file.name}</p>
                      <p className="text-[10px] text-gray-400">{formatFileSize(item.file.size)}</p>
                    </div>
                    <button type="button" onClick={() => removeSelectedAttachment(item.id)} disabled={sending || uploadingImage} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"><X size={13} /></button>
                  </div>
                ))}
              </div>
              {uploadingImage && (
                <div className="mt-3 rounded-xl border border-white/80 bg-white/75 p-3 shadow-sm backdrop-blur">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {uploadStage === "sent" ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check size={15} strokeWidth={3} />
                          </span>
                        ) : (
                          <Loader2 size={17} className="shrink-0 animate-spin text-rose-500" />
                        )}
                        <p className={`text-sm font-semibold ${uploadStage === "sent" ? "text-emerald-600" : "text-gray-800"}`}>
                          {uploadStage === "preparing" && "Preparing attachments"}
                          {uploadStage === "uploading" && "Uploading"}
                          {uploadStage === "saving" && "Finishing up"}
                          {uploadStage === "sent" && "Sent"}
                        </p>
                      </div>
                      {uploadCurrentName && uploadStage !== "sent" && (
                        <p className="mt-1 max-w-[240px] truncate pl-6 text-xs text-gray-500">
                          {uploadCurrentName}
                          {selectedAttachments.length > 1 && ` · ${uploadCurrentIndex} of ${selectedAttachments.length}`}
                        </p>
                      )}
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${uploadStage === "sent" ? "text-emerald-600" : "text-rose-500"}`}>
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ease-out ${uploadStage === "sent" ? "bg-emerald-500" : "bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500"}`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                    {uploadStage !== "sent" && (
                      <div className="absolute inset-y-0 left-0 w-1/3 animate-[uploadShimmer_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">
                    {uploadStage === "preparing" && "Getting your files ready…"}
                    {uploadStage === "uploading" && "Please keep this page open while the upload finishes."}
                    {uploadStage === "saving" && "Saving the message to your conversation…"}
                    {uploadStage === "sent" && "Your attachment was sent successfully."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {recordingState !== "idle" && (
          <div className="mx-auto mb-3 max-w-4xl">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 shadow-sm">
              {(recordingState === "recording" || recordingState === "paused") && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full ${
                        recordingState === "recording"
                          ? "animate-pulse bg-red-500"
                          : "bg-amber-400"
                      }`}
                    />

                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {recordingState === "recording" ? "Recording voice message" : "Recording paused"}
                      </p>
                      <p className="font-mono text-sm text-rose-500">
                        {formatVoiceDuration(recordingSeconds)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={
                        recordingState === "recording"
                          ? pauseVoiceRecording
                          : resumeVoiceRecording
                      }
                      className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-rose-500 shadow-sm transition hover:bg-rose-100"
                    >
                      {recordingState === "recording" ? (
                        <><Pause size={17} fill="currentColor" /> Pause</>
                      ) : (
                        <><Play size={17} fill="currentColor" /> Resume</>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="flex h-11 items-center gap-2 rounded-full bg-gray-800 px-4 text-sm font-semibold text-white transition hover:bg-black"
                    >
                      <Square size={16} fill="currentColor" /> Stop
                    </button>
                  </div>
                </div>
              )}

              {recordingState === "preview" && voicePreviewUrl && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <audio
                    src={voicePreviewUrl}
                    controls
                    className="h-11 min-w-0 flex-1"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={discardVoiceRecording}
                      disabled={uploadingVoice}
                      className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={17} /> Delete
                    </button>

                    <button
                      type="button"
                      onClick={sendVoiceRecording}
                      disabled={uploadingVoice}
                      className="flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 px-5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] disabled:opacity-50"
                    >
                      {uploadingVoice ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Send size={17} />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="mx-auto flex max-w-4xl items-end gap-2"
        >
          <input
            ref={attachmentInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            onChange={handleAttachmentSelect}
            multiple
            className="hidden"
          />

          <button
            type="button"
            onClick={startVoiceRecording}
            disabled={
              recordingState !== "idle" ||
              sending ||
              uploadingImage ||
              uploadingVoice
            }
            aria-label="Record a voice message"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mic size={21} />
          </button>

          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            disabled={
              recordingState !== "idle" ||
              sending ||
              uploadingImage ||
              uploadingVoice
            }
            aria-label="Attach a photo or file"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Paperclip size={21} />
          </button>

          <div className="flex min-h-12 flex-1 items-end rounded-3xl border border-rose-100 bg-[#fff7f9] px-4 py-2 transition focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100">
            <textarea
              ref={textAreaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={2000}
              disabled={recordingState !== "idle" || uploadingVoice}
              placeholder="Write a message..."
              className="max-h-28 min-h-7 w-full resize-none bg-transparent py-0.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={
              (!message.trim() && selectedAttachments.length === 0) ||
              sending ||
              uploadingImage ||
              uploadingVoice ||
              recordingState !== "idle"
            }
            aria-label="Send message"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {sending || uploadingImage ? (
              <Loader2
                className="animate-spin"
                size={21}
              />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>

        {errorMessage && messages.length > 0 && (
          <p className="mx-auto mt-2 max-w-4xl px-2 text-xs text-red-500">
            {errorMessage}
          </p>
        )}
      </div>

      <MessageSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectMessage={openSearchResult}
        currentUserId={user?.id}
      />

      <ImageViewer
        url={imageViewerUrl}
        onClose={() => setImageViewerUrl("")}
      />

      <DeleteMessageModal
        open={Boolean(messagePendingDelete)}
        message={messagePendingDelete}
        deleting={Boolean(deletingMessageId)}
        onCancel={cancelDeleteMessage}
        onConfirm={confirmDeleteMessage}
      />

    </div>
  );
}

export default Chat;