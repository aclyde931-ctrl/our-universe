import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  Heart,
  Images,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../services/supabase";

const navigationItems = [
  {
    label: "Memories",
    path: "/memories",
    icon: Images,
  },
  {
    label: "Chat",
    path: "/chat",
    icon: MessageCircle,
  },
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: Heart,
    center: true,
  },
  {
    label: "Calendar",
    path: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserRound,
  },
];

function BottomNavigation() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  function handleNavigationClick(path) {
    // Keep Chat's own scroll position and message behavior untouched.
    if (path === "/chat") return;

    // Reset the page before and immediately after navigation so Dashboard,
    // Memories, Calendar, and Profile always open from their top section.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    async function loadUnreadCount() {
      const { count, error } = await supabase
        .from("messages")
        .select("id", {
          count: "exact",
          head: true,
        })
        .neq("sender_id", user.id)
        .is("read_at", null);

      if (!isMounted) return;

      if (error) {
        console.error("Unable to load unread messages:", error);
        return;
      }

      setUnreadCount(count ?? 0);
    }

    loadUnreadCount();

    const channel = supabase
      .channel(`navbar-unread-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          loadUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        () => {
          loadUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  function formatUnreadCount(count) {
    return count > 99 ? "99+" : count;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-5">
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-rose-100 bg-white/95 px-2 py-2 shadow-2xl shadow-rose-200/40 backdrop-blur-xl">
        <div className="grid grid-cols-5 items-end">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isChatItem = item.path === "/chat";

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => handleNavigationClick(item.path)}
                className={({ isActive }) =>
                  `group flex min-w-0 flex-col items-center justify-center transition ${
                    item.center ? "-mt-7" : "py-1"
                  } ${
                    isActive
                      ? "text-rose-500"
                      : "text-slate-400 hover:text-rose-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.center ? (
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#fff7f9] shadow-xl transition ${
                          isActive
                            ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-rose-300/50"
                            : "bg-white text-rose-500 shadow-rose-200/40"
                        }`}
                      >
                        <Icon
                          size={27}
                          className={isActive ? "fill-white" : ""}
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            isActive
                              ? "bg-rose-50 text-rose-500"
                              : "group-hover:bg-rose-50"
                          }`}
                        >
                          <Icon size={20} />
                        </div>

                        {isChatItem && unreadCount > 0 && (
                          <span
                            key={unreadCount}
                            className="absolute -right-2 -top-2 flex min-h-[19px] min-w-[19px] animate-bounce items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-md"
                            aria-label={`${unreadCount} unread messages`}
                          >
                            {formatUnreadCount(unreadCount)}
                          </span>
                        )}
                      </div>
                    )}

                    <span
                      className={`mt-1 max-w-full truncate text-[10px] font-semibold sm:text-xs ${
                        item.center ? "mt-1.5" : ""
                      }`}
                    >
                      {item.label}
                    </span>

                    {!item.center && isActive && (
                      <span className="mt-1 h-1 w-1 rounded-full bg-rose-500" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default BottomNavigation;