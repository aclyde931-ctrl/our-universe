import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CallScreen from "../components/chat/CallScreen";
import { useAuth } from "./AuthContext";
import { supabase } from "../services/supabase";

const CallContext = createContext(null);

const turnUrl = import.meta.env.VITE_TURN_URL;
const turnUsername = import.meta.env.VITE_TURN_USERNAME;
const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(turnUrl && turnUsername && turnCredential
      ? [
          {
            urls: turnUrl,
            username: turnUsername,
            credential: turnCredential,
          },
        ]
      : []),
  ],
  iceCandidatePoolSize: 10,
};

const FINAL_STATUSES = new Set(["declined", "ended", "failed", "missed"]);

function createTone(frequency, interval = 900) {
  let context;
  let oscillator;
  let timer;

  const start = () => {
    try {
      context = new AudioContext();
      const beep = () => {
        try {
          oscillator?.stop();
        } catch {
          // The previous oscillator may already be stopped.
        }

        oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.05;
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        setTimeout(() => {
          try {
            oscillator?.stop();
          } catch {
            // Ignore an oscillator that has already stopped.
          }
        }, 320);
      };

      beep();
      timer = setInterval(beep, interval);
    } catch {
      // Some browsers block audio until the page receives a user gesture.
    }
  };

  const stop = () => {
    clearInterval(timer);
    try {
      oscillator?.stop();
      context?.close();
    } catch {
      // Safe cleanup.
    }
  };

  return { start, stop };
}

function normalizeJson(value) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return normalizeJson(JSON.parse(value));
    } catch {
      return null;
    }
  }

  return value;
}

function normalizeDescription(value, expectedType) {
  const description = normalizeJson(value);
  if (!description || typeof description !== "object") return null;

  const type = description.type;
  const sdp = description.sdp;

  if (type !== expectedType || typeof sdp !== "string" || !sdp.trim()) {
    return null;
  }

  return { type, sdp };
}

function normalizeCandidate(value) {
  const candidate = normalizeJson(value);
  if (!candidate || typeof candidate !== "object") return null;
  if (typeof candidate.candidate !== "string") return null;

  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid ?? null,
    sdpMLineIndex: candidate.sdpMLineIndex ?? null,
    usernameFragment: candidate.usernameFragment ?? null,
  };
}

function waitForIceGatheringComplete(peer, timeoutMs = 5000) {
  if (peer.iceGatheringState === "complete") return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      peer.removeEventListener("icegatheringstatechange", handleStateChange);
      resolve();
    };

    const handleStateChange = () => {
      if (peer.iceGatheringState === "complete") finish();
    };

    const timeout = setTimeout(finish, timeoutMs);
    peer.addEventListener("icegatheringstatechange", handleStateChange);
  });
}

export function CallProvider({ children }) {
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [call, setCall] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState("user");

  const peerRef = useRef(null);
  const callRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const seenCandidateIdsRef = useRef(new Set());
  const toneRef = useRef(null);
  const missedTimerRef = useRef(null);
  const acceptingRef = useRef(false);
  const endingRef = useRef(false);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select("id, full_name, last_seen")
      .neq("id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data, error: partnerError }) => {
        if (partnerError) console.error("Unable to load partner:", partnerError);
        setPartner(data ?? null);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const updateLastSeen = () =>
      supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id);

    updateLastSeen();
    const id = setInterval(updateLastSeen, 60_000);
    window.addEventListener("focus", updateLastSeen);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", updateLastSeen);
    };
  }, [user]);

  const stopTone = useCallback(() => {
    toneRef.current?.stop();
    toneRef.current = null;

    if (missedTimerRef.current) {
      clearTimeout(missedTimerRef.current);
      missedTimerRef.current = null;
    }
  }, []);

  const beginTone = useCallback(
    (kind) => {
      stopTone();
      toneRef.current = createTone(
        kind === "incoming" ? 740 : 440,
        kind === "incoming" ? 1100 : 1500,
      );
      toneRef.current.start();
    },
    [stopTone],
  );

  const cleanupMedia = useCallback(() => {
    stopTone();

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();

    peerRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    seenCandidateIdsRef.current.clear();
    acceptingRef.current = false;

    setLocalStream(null);
    setRemoteStream(null);
  }, [stopTone]);

  const addCandidate = useCallback(async (rawCandidate, candidateId = null) => {
    if (candidateId && seenCandidateIdsRef.current.has(candidateId)) return;

    const candidate = normalizeCandidate(rawCandidate);
    if (!candidate) {
      console.warn("Ignored an invalid ICE candidate:", rawCandidate);
      return;
    }

    if (candidateId) seenCandidateIdsRef.current.add(candidateId);

    const peer = peerRef.current;
    if (!peer || !peer.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await peer.addIceCandidate(candidate);
    } catch (candidateError) {
      console.error("Unable to add ICE candidate:", candidateError);
    }
  }, []);

  const flushCandidates = useCallback(async () => {
    if (!peerRef.current?.remoteDescription) return;

    const queued = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const candidate of queued) {
      await addCandidate(candidate);
    }
  }, [addCandidate]);

  const loadStoredCandidates = useCallback(
    async (callId, remoteSenderId) => {
      const { data, error: candidatesError } = await supabase
        .from("call_ice_candidates")
        .select("id, candidate")
        .eq("call_id", callId)
        .eq("sender_id", remoteSenderId)
        .order("created_at", { ascending: true });

      if (candidatesError) {
        console.error("Unable to load stored ICE candidates:", candidatesError);
        return;
      }

      for (const row of data ?? []) {
        await addCandidate(row.candidate, row.id);
      }
    },
    [addCandidate],
  );

  const createPeer = useCallback(
    async (activeCall, stream) => {
      peerRef.current?.close();

      const peer = new RTCPeerConnection(rtcConfig);
      peerRef.current = peer;

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.ontrack = (event) => {
        const [incomingStream] = event.streams;
        if (!incomingStream) return;

        console.log("Remote media track received.");
        remoteStreamRef.current = incomingStream;
        setRemoteStream(incomingStream);
        stopTone();
        setError("");
        setStatus("connected");
      };

      peer.onconnectionstatechange = () => {
          console.log(
              "connectionState:",
              peer.connectionState,
              "ice:",
              peer.iceConnectionState
          );

          switch (peer.connectionState) {
              case "connected":
                  stopTone();
                  setStatus("connected");
                  setError("");
                  break;

              case "disconnected":
                  setStatus("connecting");
                  break;

              case "failed":
                  setStatus("failed");
                  setError("Peer connection failed.");
                  break;

              case "closed":
                  console.log("Peer closed");
                  break;
          }
      };

      peer.oniceconnectionstatechange = () => {
          console.log("ICE:", peer.iceConnectionState);

          switch (peer.iceConnectionState) {
              case "checking":
                  setStatus("connecting");
                  break;

              case "connected":
              case "completed":
                  stopTone();
                  setStatus("connected");
                  break;

              case "failed":
                  setStatus("failed");
                  break;
          }
      };

      peer.onicegatheringstatechange = () => {
        console.log("ICE gathering:", peer.iceGatheringState);
      };

      peer.onsignalingstatechange = () => {
        console.log("Signaling:", peer.signalingState);
      };

      peer.onicecandidateerror = (event) => {
        console.error("ICE candidate error:", {
          errorCode: event.errorCode,
          errorText: event.errorText,
          url: event.url,
        });
      };

      peer.onicecandidate = async (event) => {
        if (!event.candidate) return;

        const { error: candidateError } = await supabase
          .from("call_ice_candidates")
          .insert({
            call_id: activeCall.id,
            sender_id: user.id,
            candidate: event.candidate.toJSON(),
          });

        if (candidateError) {
          console.error("Unable to save ICE candidate:", candidateError);
        }
      };

      return peer;
    },
    [stopTone, user],
  );

  const getMedia = useCallback(
    (type, mode = facingMode) =>
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          type === "video" ? { facingMode: { ideal: mode } } : false,
      }),
    [facingMode],
  );

  const resetCallUi = useCallback(() => {
    cleanupMedia();
    callRef.current = null;
    setCall(null);
    setStatus("idle");
    setMuted(false);
    setCameraOn(true);
    setSpeakerOn(true);
  }, [cleanupMedia]);

  const endCall = useCallback(
    async (nextStatus = "ended") => {
      if (endingRef.current) return;
      endingRef.current = true;

      try {
        const activeCall = callRef.current;
        if (activeCall) {
          const endedAt = new Date().toISOString();
          const answeredAt = activeCall.answered_at
            ? new Date(activeCall.answered_at)
            : null;

          const durationSeconds =
            answeredAt && !Number.isNaN(answeredAt.getTime())
              ? Math.max(
                  0,
                  Math.floor(
                    (new Date(endedAt).getTime() - answeredAt.getTime()) / 1000,
                  ),
                )
              : 0;

          const { error: updateError } = await supabase
            .from("calls")
            .update({
              status: nextStatus,
              ended_at: endedAt,
              duration_seconds: durationSeconds,
            })
            .eq("id", activeCall.id);

          if (updateError) console.error("Unable to end call:", updateError);
        }
      } finally {
        resetCallUi();
        endingRef.current = false;
      }
    },
    [resetCallUi],
  );

  const startCall = useCallback(
    async (type) => {
      if (!user || !partner || callRef.current) return;

      setError("");
      setStatus("starting");

      try {
        const stream = await getMedia(type);
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCameraOn(type === "video");

        const { data: createdCall, error: callError } = await supabase
          .from("calls")
          .insert({
            caller_id: user.id,
            receiver_id: partner.id,
            type,
            status: "ringing",
          })
          .select()
          .single();

        if (callError) throw callError;

        callRef.current = createdCall;
        setCall(createdCall);

        const peer = await createPeer(createdCall, stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await waitForIceGatheringComplete(peer);

        const serializedOffer = peer.localDescription?.toJSON();
        if (!normalizeDescription(serializedOffer, "offer")) {
          throw new Error("The browser generated an invalid WebRTC offer.");
        }

        const { data: updatedCall, error: offerError } = await supabase
          .from("calls")
          .update({ offer: serializedOffer })
          .eq("id", createdCall.id)
          .select()
          .single();

        if (offerError) throw offerError;

        callRef.current = updatedCall;
        setCall(updatedCall);
        setStatus("ringing");
        beginTone("outgoing");

        missedTimerRef.current = setTimeout(() => endCall("missed"), 45_000);
      } catch (startError) {
        console.error("Unable to start call:", startError);
        resetCallUi();
        setError(
          startError?.name === "NotAllowedError"
            ? "Camera or microphone permission was denied."
            : startError?.message || "Unable to start the call.",
        );
      }
    },
    [beginTone, createPeer, endCall, getMedia, partner, resetCallUi, user],
  );

  const acceptCall = useCallback(async () => {
    if (acceptingRef.current) return;

    const currentCall = callRef.current;
    if (!currentCall || currentCall.receiver_id !== user?.id) return;

    acceptingRef.current = true;
    stopTone();
    setError("");
    setStatus("connecting");

    try {
      // The INSERT realtime event can arrive before the caller stores its offer.
      // Always fetch the newest row before trying to parse the SDP.
      const { data: latestCall, error: fetchError } = await supabase
        .from("calls")
        .select("*")
        .eq("id", currentCall.id)
        .single();

      if (fetchError) throw fetchError;

      const offer = normalizeDescription(latestCall.offer, "offer");
      if (!offer) {
        throw new Error(
          "The call offer is not ready yet. Ask the caller to try again.",
        );
      }

      callRef.current = latestCall;
      setCall(latestCall);

      const stream = await getMedia(latestCall.type);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraOn(latestCall.type === "video");

      const peer = await createPeer(latestCall, stream);
      await peer.setRemoteDescription(offer);

      await loadStoredCandidates(latestCall.id, latestCall.caller_id);
      await flushCandidates();

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await waitForIceGatheringComplete(peer);

      const serializedAnswer = peer.localDescription?.toJSON();
      if (!normalizeDescription(serializedAnswer, "answer")) {
        throw new Error("The browser generated an invalid WebRTC answer.");
      }

      const { data: acceptedCall, error: answerError } = await supabase
        .from("calls")
        .update({
          answer: serializedAnswer,
          status: "accepted",
          answered_at: new Date().toISOString(),
        })
        .eq("id", latestCall.id)
        .select()
        .single();

      if (answerError) throw answerError;

      callRef.current = acceptedCall;
      setCall(acceptedCall);

      const receiverConnected =
        peer.connectionState === "connected" ||
        peer.iceConnectionState === "connected" ||
        peer.iceConnectionState === "completed" ||
        Boolean(remoteStreamRef.current);

      setStatus(receiverConnected ? "connected" : "connecting");
    } catch (acceptError) {
      console.error("Unable to accept call:", acceptError);
      setError(acceptError?.message || "Unable to accept the call.");
      await endCall("failed");
    } finally {
      acceptingRef.current = false;
    }
  }, [createPeer, endCall, flushCandidates, getMedia, loadStoredCandidates, stopTone, user]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraOn(next);
  }, [cameraOn]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((value) => !value);
  }, []);

  const switchCamera = useCallback(async () => {
    const activeCall = callRef.current;
    if (activeCall?.type !== "video") return;

    const next = facingMode === "user" ? "environment" : "user";

    try {
      const replacementStream = await getMedia("video", next);
      const replacementVideo = replacementStream.getVideoTracks()[0];
      const videoSender = peerRef.current
        ?.getSenders()
        .find((sender) => sender.track?.kind === "video");

      if (!replacementVideo || !videoSender) {
        replacementStream.getTracks().forEach((track) => track.stop());
        throw new Error("No replaceable video track was found.");
      }

      await videoSender.replaceTrack(replacementVideo);
      localStreamRef.current?.getVideoTracks().forEach((track) => track.stop());

      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      const combined = new MediaStream([
        ...(audioTrack ? [audioTrack] : []),
        replacementVideo,
      ]);

      localStreamRef.current = combined;
      setLocalStream(combined);
      setFacingMode(next);
      setCameraOn(true);
    } catch (switchError) {
      console.error("Unable to switch camera:", switchError);
      setError("Unable to switch camera on this device.");
    }
  }, [facingMode, getMedia]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`calls-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${user.id}`,
        },
        ({ new: incoming }) => {
          if (callRef.current || incoming.status !== "ringing") return;

          callRef.current = incoming;
          setCall(incoming);
          setStatus("incoming");
          beginTone("incoming");

          // Calling vibrate without a previous user gesture creates a browser
          // warning. It is optional and never affects the WebRTC connection.
          if (navigator.userActivation?.hasBeenActive) {
            navigator.vibrate?.([500, 250, 500, 250, 700]);
          }

          missedTimerRef.current = setTimeout(() => endCall("missed"), 45_000);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        async ({ new: updated }) => {
          const activeCall = callRef.current;
          if (!activeCall || updated.id !== activeCall.id) return;

          callRef.current = updated;
          setCall(updated);

          if (FINAL_STATUSES.has(updated.status)) {
            resetCallUi();
            return;
          }

          // Only the caller consumes the answer. The receiver creates its
          // answer inside acceptCall(), avoiding duplicate setRemoteDescription
          // calls and duplicate answers.
          if (
            updated.status === "accepted" &&
            updated.caller_id === user.id &&
            updated.answer &&
            peerRef.current &&
            !peerRef.current.remoteDescription
          ) {
            try {
              const answer = normalizeDescription(updated.answer, "answer");
              if (!answer) throw new Error("The received answer is invalid.");

              await peerRef.current.setRemoteDescription(answer);
              await loadStoredCandidates(updated.id, updated.receiver_id);
              await flushCandidates();

              const callerConnected =
                peerRef.current.connectionState === "connected" ||
                peerRef.current.iceConnectionState === "connected" ||
                peerRef.current.iceConnectionState === "completed" ||
                Boolean(remoteStreamRef.current);

              setStatus(callerConnected ? "connected" : "connecting");
            } catch (answerError) {
              console.error("Unable to apply call answer:", answerError);
              setError(answerError?.message || "Unable to connect the call.");
              await endCall("failed");
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_ice_candidates",
        },
        ({ new: row }) => {
          const activeCall = callRef.current;
          if (
            activeCall &&
            row.call_id === activeCall.id &&
            row.sender_id !== user.id
          ) {
            addCandidate(row.candidate, row.id);
          }
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "CHANNEL_ERROR") {
          console.error("Supabase call realtime channel failed.");
          setError("Realtime calling connection could not be started.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addCandidate, beginTone, endCall, flushCandidates, loadStoredCandidates, resetCallUi, user]);

  useEffect(() => {
    const activeCall = call;
    if (!user || !activeCall || FINAL_STATUSES.has(activeCall.status)) return;

    const remoteUserId =
      activeCall.caller_id === user.id
        ? activeCall.receiver_id
        : activeCall.caller_id;

    const syncCandidates = () => {
      loadStoredCandidates(activeCall.id, remoteUserId).catch((syncError) => {
        console.error("Unable to synchronize ICE candidates:", syncError);
      });
    };

    syncCandidates();
    const intervalId = setInterval(syncCandidates, 1000);

    return () => clearInterval(intervalId);
  }, [call, loadStoredCandidates, user]);

  useEffect(
    () => () => {
      cleanupMedia();
    },
    [cleanupMedia],
  );

  const value = useMemo(
    () => ({ startCall, call, status, partner, error }),
    [call, error, partner, startCall, status],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {call && (
        <CallScreen
          call={call}
          status={status}
          partnerName={partner?.full_name || "Your Partner"}
          localStream={localStream}
          remoteStream={remoteStream}
          muted={muted}
          cameraOn={cameraOn}
          speakerOn={speakerOn}
          isIncoming={call.receiver_id === user?.id && status === "incoming"}
          onAccept={acceptCall}
          onDecline={() => endCall("declined")}
          onEnd={() => endCall("ended")}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleSpeaker={toggleSpeaker}
          onSwitchCamera={switchCamera}
          error={error}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const value = useContext(CallContext);
  if (!value) throw new Error("useCall must be used inside CallProvider");
  return value;
}