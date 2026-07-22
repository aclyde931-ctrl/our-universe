import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../services/supabase";

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const { user } = useAuth();
  const [partnerIsOnline, setPartnerIsOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setPartnerIsOnline(false);
      setPartnerLastSeen(null);
      return undefined;
    }

    let active = true;

    const channel = supabase.channel("together-global-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    const syncPartnerPresence = () => {
      if (!active) return;

      const state = channel.presenceState();
      const partnerEntries = Object.values(state)
        .flat()
        .filter((entry) => entry?.user_id && entry.user_id !== user.id);

      setPartnerIsOnline(partnerEntries.length > 0);

      if (partnerEntries.length > 0) {
        const latestOnlineAt = partnerEntries
          .map((entry) => entry.online_at)
          .filter(Boolean)
          .sort()
          .at(-1);

        if (latestOnlineAt) {
          setPartnerLastSeen(latestOnlineAt);
        }
      }
    };

    channel
      .on("presence", { event: "sync" }, syncPartnerPresence)
      .on("presence", { event: "join" }, syncPartnerPresence)
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const partnerLeft = (leftPresences ?? []).some(
          (entry) => entry?.user_id && entry.user_id !== user.id
        );

        if (partnerLeft) {
          setPartnerLastSeen(new Date().toISOString());
        }

        syncPartnerPresence();
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED" || !active) return;

        const result = await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });

        if (result !== "ok") {
          console.error("Unable to publish global presence:", result);
        }
      });

    const retrackPresence = async () => {
      if (!active || !channelRef.current) return;

      const result = await channelRef.current.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
      });

      if (result !== "ok") {
        console.warn("Unable to refresh global presence:", result);
      }
    };

    window.addEventListener("online", retrackPresence);
    window.addEventListener("focus", retrackPresence);

    return () => {
      active = false;
      window.removeEventListener("online", retrackPresence);
      window.removeEventListener("focus", retrackPresence);
      channelRef.current = null;
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value = useMemo(
    () => ({
      partnerIsOnline,
      partnerLastSeen,
    }),
    [partnerIsOnline, partnerLastSeen]
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);

  if (!context) {
    throw new Error("usePresence must be used inside PresenceProvider");
  }

  return context;
}
