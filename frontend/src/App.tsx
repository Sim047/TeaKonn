// frontend/src/App.tsx
import React, { useEffect, useState, useRef, Fragment } from "react";
import { socket } from "./socket";
import axios from "axios";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";
import clsx from "clsx";
import { Menu, Transition } from "@headlessui/react";
import { Send, Trash2, X, Zap, Settings } from "lucide-react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StatusPicker from "./components/StatusPicker";
import SearchUsers from "./components/SearchUsers";
import ConversationsList from "./components/ConversationsList";
import AllUsers from "./pages/AllUsersModern";
import FollowersList from "./pages/FollowersList";
import FollowingList from "./pages/FollowingList";
import Discover from "./pages/Discover";
import SportsEvents from "./pages/SportsEvents";
import Dashboard from "./pages/Dashboard";
import MyEvents from "./pages/MyEvents";
import Posts from "./pages/Posts";
import UserContent from "./pages/UserContent";
import Avatar from "./components/Avatar";
import Sidebar from "./components/Sidebar";
import AssistantWidget from "./components/AssistantWidget";
import logo from "./assets/logo.png";
import { API_URL } from "./config/api";
import UserProfileModal from "./components/UserProfileModal";

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.updateLocale("en", { weekStart: 1 });

// Use centralized normalized API base
const API = API_URL.replace(/\/api$/, "");

const SAMPLE_AVATAR =
  "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff";

const THEME_KEY = "teakonn-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(THEME_KEY) || "dark";
}

type User = {
  _id?: string;
  id?: string;
  username?: string;
  email?: string;
  avatar?: string;
  role?: string;
  followers?: string[] | number;
  following?: string[] | number;
};

export default function App() {
  const [theme, setTheme] = useState<string>(getInitialTheme());
  const ASSISTANT_ENABLED = (import.meta.env.VITE_ASSISTANT_ENABLED ?? 'true') !== 'false';
  
  useEffect(() => {
    // Add smooth transition class
    document.documentElement.style.setProperty('--theme-transition', '0.3s');
    
    // Update theme class
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    
    // Persist theme
    localStorage.setItem(THEME_KEY, theme);
    
    // Log for debugging
    console.log(`Theme switched to: ${theme}`);
  }, [theme]);
  
  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // AUTH --------------------------------------
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [authPage, setAuthPage] = useState<"login" | "register">("login");

  // DM --------------------------------
  const [room, setRoom] = useState<string>("general");
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, any>>({});

  // STATUS ------------------------------------
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  
  // ONLINE USERS ------------------------------
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // UI refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesSectionRef = useRef<HTMLDivElement | null>(null);
  const unreadRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [showChatActions, setShowChatActions] = useState(false);
  const headerPressTimer = useRef<number | null>(null);
  const [showLongPressHintChat, setShowLongPressHintChat] = useState<boolean>(() => {
    try { return !localStorage.getItem('auralink-hint-chat-longpress'); } catch { return true; }
  });

  function startHeaderPress() {
    try {
      if (headerPressTimer.current) {
        window.clearTimeout(headerPressTimer.current);
        headerPressTimer.current = null;
      }
      headerPressTimer.current = window.setTimeout(() => setShowChatActions(true), 500) as any;
    } catch {}
  }
  function cancelHeaderPress() {
    try {
      if (headerPressTimer.current) {
        window.clearTimeout(headerPressTimer.current);
        headerPressTimer.current = null;
      }
    } catch {}
  }

  // DM & conversations
  const [conversations, setConversations] = useState<any[]>([]);
  const [inDM, setInDM] = useState(() => {
    const saved = localStorage.getItem("auralink-in-dm");
    return saved ? JSON.parse(saved) : false;
  });
  const [activeConversation, setActiveConversation] = useState<any | null>(() => {
    const saved = localStorage.getItem("auralink-active-conversation");
    return saved ? JSON.parse(saved) : null;
  });
  
  // Persist DM state
  useEffect(() => {
    localStorage.setItem("auralink-in-dm", JSON.stringify(inDM));
  }, [inDM]);
  
  useEffect(() => {
    if (activeConversation) {
      localStorage.setItem("auralink-active-conversation", JSON.stringify(activeConversation));
    } else {
      localStorage.removeItem("auralink-active-conversation");
    }
  }, [activeConversation]);

  // dynamic pages
  const [view, setView] = useState<
    "dashboard" | "discover" | "chat" | "all-users" | "followers" | "following" | "posts" | "direct-messages" | "user-content"
  >(() => {
    // Restore previous view from localStorage
    const saved = localStorage.getItem("auralink-current-view");
    return (saved as any) || "dashboard";
  });
  
  // Persist view changes to localStorage
  useEffect(() => {
    localStorage.setItem("auralink-current-view", view);
  }, [view]);

  // Keep URL query in sync with current view to preserve on refresh
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('view', view);
      if (view !== 'posts') params.delete('post');
      const qs = params.toString();
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    } catch (e) {
      console.warn('Failed to sync view to URL:', e);
    }
  }, [view]);

  // Handle deep-link query params (e.g., ?view=posts&post=ID)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      const postId = params.get('post');
      if (v) setView(v as any);
      if (postId) localStorage.setItem('auralink-highlight-post', postId);
    } catch (e) {
      console.warn('Deep link parsing failed:', e);
    }
  }, []);

  // editing messages
  const [editingMessageId, setEditingMessageId] =
    useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // PROFILE MODAL -----------------------------
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFollowersCount, setProfileFollowersCount] =
    useState<number | null>(null);
  const [profileFollowingCount, setProfileFollowingCount] =
    useState<number | null>(null);
  const [profileIsFollowed, setProfileIsFollowed] =
    useState<boolean>(false);

  // DM collapse
  const [dmOpen, setDmOpen] = useState<boolean>(true);

  // Missing states and helpers added
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [unreadIndex, setUnreadIndex] = useState<number>(-1);
  const [enterToSend, setEnterToSend] = useState<boolean>(() => {
    const saved = localStorage.getItem("enterToSend");
    return saved ? JSON.parse(saved) : false;
  });

  // Conversation refresh key
  const [conversationRefreshKey, setConversationRefreshKey] = useState<number>(0);
  const refreshConversations = () => setConversationRefreshKey((k) => k + 1);

  // Per-message actions dropdown (collapsed by default)
  const [openMessageActions, setOpenMessageActions] = useState<string | null>(null);
  const messagePressTimer = useRef<number | null>(null);
  const DEFAULT_REACTION_EMOJI = "❤️";
  const AVAILABLE_REACTIONS = ["❤️", "🔥", "😂", "😔"];
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [messageReactionChoice, setMessageReactionChoice] = useState<Record<string, string>>({});
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [replyTo, setReplyTo] = useState<any | null>(null);

  function currentReactionEmojiFor(msg: any) {
    // Prefer the emoji the current user has reacted with on this message
    for (const e of AVAILABLE_REACTIONS) {
      if (hasReacted(msg, e)) return e;
    }
    // Fall back to a locally chosen emoji (not yet reacted) or default
    return messageReactionChoice[msg._id] || DEFAULT_REACTION_EMOJI;
  }

  function startMessagePress(id: string) {
    try {
      if (messagePressTimer.current) {
        window.clearTimeout(messagePressTimer.current);
        messagePressTimer.current = null;
      }
      messagePressTimer.current = window.setTimeout(() => {
        setOpenMessageActions(id);
      }, 500) as any;
    } catch {}
  }

  function cancelMessagePress() {
    try {
      if (messagePressTimer.current) {
        window.clearTimeout(messagePressTimer.current);
        messagePressTimer.current = null;
      }
    } catch {}
  }

function shouldShowAvatar(index: number) {
  if (index === 0) return true;
  return (
    messages[index - 1]?.sender?._id !== messages[index]?.sender?._id
  );
}

function toggleEnterToSend() {
  const newValue = !enterToSend;
  setEnterToSend(newValue);
  localStorage.setItem("enterToSend", JSON.stringify(newValue));
}

function jumpToUnread() {
  if (unreadRef.current) unreadRef.current.scrollIntoView({ behavior: "smooth" });
}

function startEdit(m: any) {
  setEditingMessageId(m._id);
  setEditingText(m.text || "");
}

function cancelEdit() {
  setEditingMessageId(null);
  setEditingText("");
}

function onMessageContainerClick(e: React.MouseEvent<HTMLDivElement>) {
  const t = e.target as HTMLElement;
  const tag = (t.tagName || '').toLowerCase();
  if (["button", "a", "input", "textarea", "img", "svg", "path"].includes(tag)) return;
  composerTextareaRef.current?.focus();
}

async function saveEdit(id: string) {
  if (!token) return;
  
  // Optimistic update - update message immediately
  setMessages((m) => m.map((msg) => 
    msg._id === id ? { ...msg, text: editingText, edited: true } : msg
  ));
  setEditingMessageId(null);
  
  try {
    await axios.put(
      API + "/api/messages/" + id,
      { text: editingText },
      { headers: { Authorization: "Bearer " + token } }
    );
    socket.emit("edit_message", { messageId: id, text: editingText });
  } catch (e) {
    console.error("Edit failed", e);
    // Could revert the edit here if it failed
  }
}

async function deleteMessage(id: string) {
  if (!token) return;
  
  // Optimistic update - remove message immediately from my view
  setMessages((m) => m.filter((x) => x._id !== id));
  
  try {
    // REST endpoint handles per-user hiding and sends socket event only to me
    await axios.delete(API + "/api/messages/" + id, {
      headers: { Authorization: "Bearer " + token }
    });
  } catch (e) {
    console.error("Delete failed", e);
    // Could reload messages here if delete failed
  }
}

function onMyStatusUpdated(newStatus: any) {
  const uid = String(user?._id || user?.id);
  console.log("App: onMyStatusUpdated called with:", newStatus, "for user:", uid);
  setStatuses((s) => {
    const updated = { ...s };
    if (newStatus === null) {
      delete updated[uid];
      console.log("App: Cleared status for user:", uid);
    } else {
      updated[uid] = newStatus;
      console.log("App: Updated status for user:", uid, newStatus);
    }
    return updated;
  });
}

  const myStatus =
    statuses[String(user?._id || user?.id)] || null;

  function makeAvatarUrl(avatar?: string | null) {
    if (!avatar) return SAMPLE_AVATAR;
    if (avatar.startsWith("http")) return avatar;
    if (avatar.startsWith("/")) return API + avatar;
    return API + "/uploads/" + avatar;
  }
  
  // SOCKET SETUP -------------------------------------------------
  useEffect(() => {
    if (!token || !user) return;

    socket.auth = { token, user };
    socket.connect();
    
    // Join initial room
    const initialRoom = inDM && activeConversation ? activeConversation._id : room;
    socket.emit("join_room", initialRoom);
    console.log("[Socket] Joined room:", initialRoom);

    socket.on("receive_message", async (msg: any) => {
      setMessages((m) => {
        // Remove any pending/optimistic messages from the same user with similar timestamp
        const filtered = m.filter((existing) => {
          if (!existing.isPending) return true;
          // Remove pending message if we received the real one
          if (existing.sender?._id === msg.sender?._id && 
              existing.text === msg.text &&
              Math.abs(new Date(existing.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 5000) {
            return false;
          }
          return true;
        });
        
        // Check if message already exists (prevent duplicates)
        const exists = filtered.some((existing) => existing._id === msg._id);
        if (exists) return filtered;
        
        const next = [...filtered, msg];
        computeUnreadIndex(next);
        return next;
      });
      scrollToBottom();
      
      // Mark as delivered if not sender
      if (msg.sender?._id !== user?._id) {
        socket.emit("message_delivered", { messageId: msg._id, userId: user?._id });
        
        // Also mark as read immediately if chat is visible (view === "chat")
        if (view === "chat") {
          socket.emit("message_read", { messageId: msg._id, userId: user?._id });
          
          // Mark conversation as read if it's a DM and we're viewing it
          if (inDM && activeConversation?._id && token) {
            try {
              await axios.post(
                `${API}/api/conversations/${activeConversation._id}/read`,
                {},
                { headers: { Authorization: "Bearer " + token } }
              );
            } catch (err) {
              console.error("Failed to mark conversation as read:", err);
            }
          }
        }
        
        // Show browser notification for messages from others (only if not currently viewing chat)
        if (view !== "chat" && "Notification" in window && Notification.permission === "granted") {
          const senderName = msg.sender?.username || "Someone";
          const messageText = msg.text || (msg.fileUrl ? "Sent an image" : "New message");
          const notification = new Notification(`${senderName}`, {
            body: messageText.substring(0, 100),
            icon: msg.sender?.avatar ? (msg.sender.avatar.startsWith("http") ? msg.sender.avatar : API + "/uploads/" + msg.sender.avatar) : SAMPLE_AVATAR,
            tag: msg._id,
            requireInteraction: false
          });
          
          // Auto-close after 5 seconds
          setTimeout(() => notification.close(), 5000);
          
          // Focus window when clicking notification
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      }
    });

    socket.on("message_status_update", (updatedMsg: any) => {
      setMessages((m) => {
        const next = m.map((x) => (x._id === updatedMsg._id ? updatedMsg : x));
        computeUnreadIndex(next);
        return next;
      });
    });

    socket.on("reaction_update", (msg: any) => {
      setMessages((m) => m.map((x) => (x._id === msg._id ? msg : x)));
    });

    socket.on("typing", ({ userId, typing, user: typingUser }: any) => {
      console.log("[Socket] Typing event:", { userId, typing, user: typingUser });
      if (typing) {
        setTypingUsers((t) => {
          const updated = { ...t, [userId]: typingUser || { username: 'Someone' } };
          console.log("[Socket] Typing users updated:", updated);
          return updated;
        });
        
        // Clear typing indicator after 3 seconds of inactivity
        setTimeout(() => {
          setTypingUsers((t) => {
            const updated = { ...t };
            delete updated[userId];
            return updated;
          });
        }, 3000);
      } else {
        setTypingUsers((t) => {
          const updated = { ...t };
          delete updated[userId];
          return updated;
        });
      }
    });

    socket.on("message_edited", (updatedMsg: any) => {
      setMessages((m) =>
        m.map((x) => (x._id === updatedMsg._id ? updatedMsg : x))
      );
    });

    socket.on("message_hidden", ({ messageId }: { messageId: string }) => {
      // Only remove from my view when I hide a message
      setMessages((m) => m.filter((x) => x._id !== messageId));
    });

    socket.on("status_update", (payload: any) => {
      if (payload?.cleared) {
        setStatuses((s) => {
          const c = { ...s };
          delete c[payload.user];
          return c;
        });
      } else if (payload?.user) {
        const uid = String(payload.user._id || payload.user);
        setStatuses((s) => ({ ...s, [uid]: payload }));
      }
    });
    
    socket.on("presence_update", ({ userId, status }: { userId: string; status: "online" | "offline" }) => {
      console.log("[Socket] Presence update:", userId, status);
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (status === "online") {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        console.log("[Socket] Online users:", Array.from(updated));
        return updated;
      });
    });

    // Receive initial online users list when connecting
    socket.on("online_users_list", ({ userIds }: { userIds: string[] }) => {
      console.log("[Socket] Received online users list:", userIds);
      setOnlineUsers(new Set(userIds));
    });

    // Join request notifications
    socket.on("join_request_created", ({ eventTitle, organizerId }: any) => {
      if (user?._id === organizerId) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Join Request", {
            body: `Someone requested to join your event: ${eventTitle}`,
            icon: "/logo.png",
          });
        }
      }
    });

    socket.on("join_request_approved", ({ eventTitle, userId }: any) => {
      if (user?._id === userId) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Join Request Approved", {
            body: `Your request to join "${eventTitle}" has been approved!`,
            icon: "/logo.png",
          });
        }
      }
    });

    socket.on("join_request_rejected", ({ eventTitle, userId }: any) => {
      if (user?._id === userId) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Join Request Rejected", {
            body: `Your request to join "${eventTitle}" was not approved.`,
            icon: "/logo.png",
          });
        }
      }
    });

    // Booking status update notifications
    socket.on("booking_status_update", ({ bookingId, status, approvalStatus, message, paymentVerified }: any) => {
      console.log("[Socket] Booking status update:", { bookingId, status, message });
      
      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Booking Update", {
          body: message,
          icon: "/logo.png",
        });
      }
      
      // Show in-app alert (optional - could be a toast notification instead)
      alert(message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, user]);
  
  // Rejoin socket room when room or conversation changes
  useEffect(() => {
    if (!socket.connected) return;
    
    const targetRoom = inDM && activeConversation ? activeConversation._id : room;
    console.log("[Socket] Switching to room:", targetRoom);
    socket.emit("join_room", targetRoom);
  }, [room, inDM, activeConversation]);

  // LOAD ROOM MESSAGES ------------------------------------------
  useEffect(() => {
    if (!token || inDM || view !== "chat") return;

    setMessagesLoading(true);
    axios
      .get(API + "/api/messages/" + room, {
        headers: { Authorization: "Bearer " + token }
      })
      .then((r) => {
        const list = r.data || [];
        setMessages(list);
        computeUnreadIndex(list);
        
        // Mark messages as read when loading chat
        if (user && socket) {
          list.forEach((msg: any) => {
            if (msg.sender?._id !== user._id && !msg.readBy?.some((id: any) => String(id) === String(user._id))) {
              socket.emit("message_read", { messageId: msg._id, userId: user._id });
            }
          });
        }
      })
      .catch((e) => {
        try {
          const status = e?.response?.status;
          const data = e?.response?.data;
          const url = (e?.config?.baseURL || "") + (e?.config?.url || "");
          console.error("Room load error", { url, status, data });
        } catch {}
      })
      .finally(() => setMessagesLoading(false));
  }, [room, token, view, inDM, user, socket]);

  // LOAD DM MESSAGES --------------------------------------------
  useEffect(() => {
    if (!token || !inDM || !activeConversation) return;

    setMessagesLoading(true);
    axios
      .get(
        API + "/api/conversations/" + activeConversation._id + "/messages",
        { headers: { Authorization: "Bearer " + token } }
      )
      .then((r) => {
        const list = r.data || [];
        setMessages(list);
        computeUnreadIndex(list);
        
        // Mark messages as read when loading DM conversation
        if (user && socket) {
          list.forEach((msg: any) => {
            if (msg.sender?._id !== user._id && !msg.readBy?.some((id: any) => String(id) === String(user._id))) {
              socket.emit("message_read", { messageId: msg._id, userId: user._id });
            }
          });
        }
      })
      .catch((e) => {
        try {
          const status = e?.response?.status;
          const data = e?.response?.data;
          const url = (e?.config?.baseURL || "") + (e?.config?.url || "");
          console.error("DM load error", { url, status, data });
        } catch {
          console.error("DM load error", e);
        }
      })
      .finally(() => setMessagesLoading(false));
  }, [token, inDM, activeConversation, user, socket]);

  // LOAD ALL STATUSES -------------------------------------------
  useEffect(() => {
    if (!token) return;

    axios
      .get(API + "/api/status", {
        headers: { Authorization: "Bearer " + token }
      })
      .then((r) => {
        const map: Record<string, any> = {};
        (r.data || []).forEach((st: any) => {
          const uid = String(st.user?._id || st.user);
          map[uid] = st;
        });
        setStatuses(map);
      })
      .catch(() => {});
  }, [token]);

  // LOAD USER CONVERSATIONS -------------------------------------
  useEffect(() => {
    if (!token) return;

    axios
      .get(API + "/api/conversations", {
        headers: { Authorization: "Bearer " + token }
      })
      .then((r) => setConversations(r.data || []))
      .catch((e) => {
        try {
          const status = e?.response?.status;
          const data = e?.response?.data;
          const url = (e?.config?.baseURL || "") + (e?.config?.url || "");
          console.error("Conversations load error", { url, status, data });
        } catch {}
      });
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 40);
    return () => clearTimeout(t);
  }, [messages.length, view, inDM]);

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  // SEND MESSAGE -------------------------------------------------
  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text && selectedImages.length === 0) return;

    const fileUrls: string[] = [];

    if (selectedImages.length > 0) {
      for (const img of selectedImages) {
        const fd = new FormData();
        fd.append("file", img);

        try {
          const r = await axios.post(API + "/api/files/upload", fd, {
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "multipart/form-data"
            }
          });
          if (r.data.url) fileUrls.push(r.data.url);
        } catch (e) {
          console.error("Image upload failed:", e);
        }
      }
    }

    const targetRoom =
      inDM && activeConversation ? activeConversation._id : room;

    // Send message with all uploaded images
    if (fileUrls.length > 0) {
      for (const fileUrl of fileUrls) {
        const optimisticMessage = {
          _id: `temp-${Date.now()}-${Math.random()}`,
          sender: user,
          text: fileUrls.indexOf(fileUrl) === 0 ? text : "",
          room: targetRoom,
          fileUrl,
          createdAt: new Date().toISOString(),
          isPending: true
        };
        
        // Add message immediately to UI (optimistic update)
        setMessages((m) => [...m, optimisticMessage]);
        
        socket.emit("send_message", {
          room: targetRoom,
          message: {
            sender: user,
            text: fileUrls.indexOf(fileUrl) === 0 ? text : "",
            room: targetRoom,
            fileUrl,
            createdAt: new Date().toISOString(),
            replyTo: replyTo?._id || null
          }
        });
      }
    } else if (text) {
      const optimisticMessage = {
        _id: `temp-${Date.now()}-${Math.random()}`,
        sender: user,
        text,
        room: targetRoom,
        fileUrl: "",
        createdAt: new Date().toISOString(),
        isPending: true
      };
      
      // Add message immediately to UI (optimistic update)
      setMessages((m) => [...m, optimisticMessage]);
      
      socket.emit("send_message", {
        room: targetRoom,
        message: {
          sender: user,
          text,
          room: targetRoom,
          fileUrl: "",
          createdAt: new Date().toISOString(),
          replyTo: replyTo?._id || null
        }
      });
    }

    setText("");
    setSelectedImages([]);
    setFile(null);
    setReplyTo(null);
    
    // Reset textarea height
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = '48px';
      }
    }, 0);
    
    scrollToBottom();
    
    // Refresh conversations if this was a DM (to update lastMessage and unread counts)
    if (inDM) {
      refreshConversations();
    }
  }
  // Message actions helpers ------------------------------------
  function copyMessageText(m: any) {
    try {
      if (m.text) navigator.clipboard.writeText(m.text);
      setOpenMessageActions(null);
    } catch {}
  }

  async function hideMessageForMe(id: string) {
    try {
      await axios.delete(`${API}/api/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages((msgs) => msgs.filter((x) => x._id !== id));
    } catch (e) {
      console.error("Hide message error", e);
    } finally {
      setOpenMessageActions(null);
    }
  }

  async function deleteMessageForEveryone(id: string) {
    try {
      await axios.delete(`${API}/api/messages/${id}/force`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages((msgs) => msgs.filter((x) => x._id !== id));
    } catch (e) {
      console.error("Force delete error", e);
      alert("Failed to delete message for everyone");
    } finally {
      setOpenMessageActions(null);
    }
  }

  // TYPING -------------------------------------------------------
  function onComposerChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);

    const typingData = {
      room: inDM && activeConversation ? activeConversation._id : room,
      userId: user?._id,
      user: { _id: user?._id, username: user?.username, avatar: user?.avatar },
      typing: !!e.target.value
    };
    console.log("[Socket] Emitting typing:", typingData);
    socket.emit("typing", typingData);
  }

  // Handle Enter key press
  function handleKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      // Shift+Enter always creates a new line
      if (e.shiftKey) {
        return; // Allow default behavior (new line)
      }
      
      if (enterToSend && !e.ctrlKey) {
        // Enter alone sends if setting is enabled
        e.preventDefault();
        sendMessage();
      } else if (!enterToSend && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter or Cmd+Enter sends if setting is disabled
        e.preventDefault();
        sendMessage();
      }
      // Shift+Enter always allows new line (browser default)
    }
  }

  // IMAGE HANDLING -----------------------------------------------
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedImages((prev) => [...prev, ...files]);
      setImagePreviewOpen(true);
    }
    e.target.value = ""; // Reset input
  }

  function removeImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAllImages() {
    setSelectedImages([]);
    setImagePreviewOpen(false);
  }

  // REACTIONS ----------------------------------------------------
  function reactionCount(msg: any, emoji: string) {
    return msg.reactions?.filter((r: any) => r.emoji === emoji).length || 0;
  }

  function hasReacted(msg: any, emoji: string) {
    const uid = String(user?._id || user?.id);
    return (
      msg.reactions?.some(
        (r: any) => r.userId === uid && r.emoji === emoji
      ) || false
    );
  }

  function toggleReaction(msg: any, emoji: string) {
    const uid = String(user?._id || user?.id);
    
    // Optimistic update - update UI immediately
    setMessages((m) => m.map((message) => {
      if (message._id !== msg._id) return message;
      
      const reactions = message.reactions || [];
      const existingReactionIndex = reactions.findIndex(
        (r: any) => r.userId === uid && r.emoji === emoji
      );
      
      let newReactions;
      if (existingReactionIndex >= 0) {
        // Remove reaction
        newReactions = reactions.filter((_: any, i: number) => i !== existingReactionIndex);
      } else {
        // Add reaction
        newReactions = [...reactions, { userId: uid, emoji }];
      }
      
      return { ...message, reactions: newReactions };
    }));
    
    // Send to server
    socket.emit("react", {
      room: inDM && activeConversation ? activeConversation._id : room,
      messageId: msg._id,
      userId: user?._id,
      emoji
    });
  }

  // PROFILE FIXED FUNCTION --------------------------------------
  async function showProfile(userOrId: any) {
    if (!token) return;

    const id =
      typeof userOrId === "string"
        ? userOrId
        : userOrId?._id || userOrId?.id;

    if (!id) return;

    // Open modal immediately to show loading state
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileUser(null);

    try {
      // This is the ONLY correct endpoint.
      const res = await axios.get(API + "/api/users/" + id, {
        headers: { Authorization: "Bearer " + token }
      });

      const u = res.data;
      setProfileUser(u);

      // followers & following come directly from backend
      setProfileFollowersCount(
        Array.isArray(u.followers)
          ? u.followers.length
          : typeof u.followers === "number"
          ? u.followers
          : 0
      );

      setProfileFollowingCount(
        Array.isArray(u.following)
          ? u.following.length
          : typeof u.following === "number"
          ? u.following
          : 0
      );

      // detect if THIS user follows them
      setProfileIsFollowed(
        Array.isArray(u.followers)
          ? u.followers.map(String).includes(String(user?._id))
          : false
      );
    } catch (err) {
      console.error("Profile load failed:", err);
    } finally {
      setProfileLoading(false);
    }
  }
  // FOLLOW / UNFOLLOW --------------------------------------------
  async function toggleFollowProfile() {
    if (!profileUser || !token) return;

    const id = profileUser._id;
    const following = profileIsFollowed;

    try {
      if (following) {
        await axios.post(
          API + "/api/users/" + id + "/unfollow",
          {},
          { headers: { Authorization: "Bearer " + token } }
        );

        setProfileIsFollowed(false);
        setProfileFollowersCount((c) => (c || 1) - 1);
      } else {
        await axios.post(
          API + "/api/users/" + id + "/follow",
          {},
          { headers: { Authorization: "Bearer " + token } }
        );

        setProfileIsFollowed(true);
        setProfileFollowersCount((c) => (c || 0) + 1);
      }
    } catch (e) {
      console.error("Follow error", e);
    }
  }
  // OPEN A DM FROM ANYWHERE --------------------------------------
  async function openConversation(conv: any) {
    setActiveConversation(conv);
    setInDM(true);
    setView("chat");

    if (socket.connected) {
      const roomId = conv._id || conv.id;
      console.log("[Socket] Opening conversation, joining room:", roomId);
      socket.emit("join_room", roomId);
    }

    // Mark conversation as read
    if (token && conv._id) {
      try {
        await axios.post(
          `${API}/api/conversations/${conv._id}/read`,
          {},
          { headers: { Authorization: "Bearer " + token } }
        );
      } catch (err) {
        console.error("Failed to mark conversation as read:", err);
      }
    }
  }

  // START DM FROM PROFILE ----------------------------------------
  async function messageFromProfile() {
    if (!profileUser) return;

    try {
      const res = await axios.post(
        API + "/api/conversations",
        { partnerId: profileUser._id },
        { headers: { Authorization: "Bearer " + token } }
      );

      openConversation(res.data);
      setProfileOpen(false);
    } catch (e) {
      console.error("Could not start conversation", e);
      alert("Unable to start conversation");
    }
  }

  // START DM WITH USER ID ----------------------------------------
  async function startConversationWithUser(userId: string) {
    console.log("[App] startConversationWithUser called with userId:", userId);
    console.log("[App] token exists:", !!token);
    
    if (!userId || !token) {
      alert("Please log in to send messages");
      return;
    }

    try {
      console.log("[App] Creating conversation with partnerId:", userId);
      const res = await axios.post(
        API + "/api/conversations",
        { partnerId: userId },
        { headers: { Authorization: "Bearer " + token } }
      );

      console.log("[App] Conversation created/fetched:", res.data);
      openConversation(res.data);
    } catch (e) {
      console.error("[App] Could not start conversation", e);
      alert("Unable to start conversation");
    }
  }

  // SCROLL TO BOTTOM ---------------------------------------------
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 200;
    setShowScrollButton(!isNearBottom);
    // Hide unread marker once it has been scrolled into view/past
    try {
      if (unreadRef.current && messagesSectionRef.current) {
        const markerRect = unreadRef.current.getBoundingClientRect();
        const containerRect = messagesSectionRef.current.getBoundingClientRect();
        if (markerRect.top <= containerRect.top + 32) {
          setUnreadIndex(-1);
        }
      }
    } catch {}
  };

  // Compute unread separator position based on read receipts
  function computeUnreadIndex(list: any[]) {
    try {
      const uid = String(user?._id);
      const idx = list.findIndex(
        (m: any) => m.sender?._id !== uid && !(m.readBy || []).map(String).includes(uid)
      );
      setUnreadIndex(idx);
    } catch {
      setUnreadIndex(-1);
    }
  }

  // MESSAGE RENDERER ---------------------------------------------
  function renderMessages() {
    return messages.map((m, index) => {
      const date = dayjs(m.createdAt).format("YYYY-MM-DD");
      const prevDate =
        index > 0
          ? dayjs(messages[index - 1].createdAt).format("YYYY-MM-DD")
          : null;
      const showDate = date !== prevDate;

      const showAvatar = shouldShowAvatar(index);
      const unreadMark =
        unreadIndex >= 0 && index === unreadIndex ? true : false;

      const senderStatus =
        statuses[String(m.sender?._id || m.sender?.id)] || null;

      return (
        <Fragment key={m._id}>
          {showDate && (
            <div className="my-6 text-center">
              <span className="px-4 py-1 rounded-full card-date">
                {date === dayjs().format("YYYY-MM-DD")
                  ? "Today"
                  : date === dayjs().subtract(1, "day").format("YYYY-MM-DD")
                  ? "Yesterday"
                  : dayjs(m.createdAt).format("DD MMM YYYY")}
              </span>
            </div>
          )}

          {unreadMark && (
            <div
              ref={unreadRef}
              className="my-2 flex justify-center text-xs text-white"
            >
              <span className="px-3 py-1 rounded-md bg-orange-500">
                Unread messages
              </span>
            </div>
          )}

          <div
            className={clsx(
              "flex items-start gap-3",
              String(m.sender?._id) === String(user?._id) && "justify-end"
            )}
            style={{
              transition: "opacity .25s, transform .25s",
              opacity: ready ? 1 : 0,
              transform: ready ? "translateY(0)" : "translateY(6px)"
            }}
            onMouseDown={() => startMessagePress(m._id)}
            onMouseUp={cancelMessagePress}
            onMouseLeave={cancelMessagePress}
            onTouchStart={() => startMessagePress(m._id)}
            onTouchEnd={cancelMessagePress}
          >
            {String(m.sender?._id) !== String(user?._id) ? (
              showAvatar ? (
                <Avatar
                  src={makeAvatarUrl(m.sender?.avatar)}
                  className="avatar w-10 h-10 rounded-md object-cover"
                  alt={m.sender?.username || "User"}
                />
              ) : (
                <div style={{ width: 40 }} />
              )
            ) : null}

            <div className={clsx("message", String(m.sender?._id) === String(user?._id) && "msg-mine")} onClick={onMessageContainerClick}> 
              <div className="flex items-center gap-2">
                {String(m.sender?._id) !== String(user?._id) && showAvatar && <strong>{m.sender?.username}</strong>}
                <span
                  className="text-xs opacity-60"
                  title={dayjs(m.createdAt).format(
                    "dddd, DD MMM YYYY • HH:mm"
                  )}
                >
                  {dayjs(m.createdAt).format("HH:mm")}
                </span>

                {m.edited && (
                  <span className="text-xs opacity-50 ml-1">(edited)</span>
                )}

                {/* Message Status Ticks - only show for sender */}
                {String(m.sender?._id) === String(user?._id) && (
                  <span className="ml-2 text-xs flex items-center gap-0.5">
                    {m.readBy && m.readBy.length > 0 ? (
                      // Double blue tick for read
                      <span className="text-blue-500" title="Read">✓✓</span>
                    ) : m.deliveredTo && m.deliveredTo.length > 0 ? (
                      // Double gray tick for delivered
                      <span className="text-gray-400" title="Delivered">✓✓</span>
                    ) : (
                      // Single gray tick for sent
                      <span className="text-gray-400" title="Sent">✓</span>
                    )}
                  </span>
                )}

                {senderStatus && (
                  <span className="ml-3 text-xs px-2 py-0.5 card-status rounded-md flex items-center gap-1">
                    <span>{senderStatus.emoji}</span>
                    <span className="opacity-80">{senderStatus.mood}</span>
                  </span>
                )}

                {/* Removed three-dots toggle to simplify reply UX */}
              </div>

              {m.fileUrl && (
                <img
                  src={m.fileUrl.startsWith('http') ? m.fileUrl : API + m.fileUrl}
                  className="max-w-full w-auto h-auto rounded-md mt-2 cursor-zoom-in"
                  style={{ maxHeight: "400px", objectFit: "contain" }}
                  onClick={() => openMessageImage(m.fileUrl.startsWith('http') ? m.fileUrl : API + m.fileUrl)}
                />
              )}

              {editingMessageId === m._id ? (
                <div className="flex gap-2 items-start mt-2">
                  <input
                    className="input p-2 rounded-md flex-1"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                  />
                  <button className="btn" onClick={() => saveEdit(m._id)}>
                    Save
                  </button>
                  <button
                    className="px-3 py-2 border rounded-md"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  {m.text && (
                    <div
                      className="mt-2 break-words"
                      onClick={(e) => { e.stopPropagation(); setExpandedMessages((prev) => ({ ...prev, [m._id]: !prev[m._id] })); }}
                      style={expandedMessages[m._id]
                        ? ({ wordBreak: 'break-word', overflowWrap: 'anywhere', cursor: 'auto' } as any)
                        : ({
                            display: '-webkit-box',
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            cursor: 'pointer'
                          } as any)}
                      title={expandedMessages[m._id] ? undefined : 'Click to expand'}
                    >
                      {m.text}
                    </div>
                  )}
                  {m.text && m.text.length > 160 && (
                    <button
                      className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 hover:opacity-80"
                      onClick={(e) => { e.stopPropagation(); setExpandedMessages((prev) => ({ ...prev, [m._id]: !prev[m._id] })); }}
                    >
                      {expandedMessages[m._id] ? 'See less' : 'See more'}
                    </button>
                  )}
                </>
              )}

              {/* Compact reaction bar: emoji as trigger (click = unlike or choose) */}
              <div className="mt-2 flex items-center gap-2">
                <div className="relative inline-flex">
                  {(() => {
                    const emoji = currentReactionEmojiFor(m);
                    const reacted = hasReacted(m, emoji);
                    return (
                      <button
                        className={clsx(
                          "reaction-btn",
                          reacted && "reacted"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (reacted) {
                            // Clicking the emoji removes your reaction
                            toggleReaction(m, emoji);
                          } else {
                            // If not reacted yet, open picker anchored to this emoji
                            setReactionPickerFor(m._id);
                          }
                        }}
                        title={reacted ? "Remove reaction" : "React"}
                      >
                        <span>{emoji}</span>
                        <span className="count">{reactionCount(m, emoji) || ""}</span>
                      </button>
                    );
                  })()}
                  {reactionPickerFor === m._id && (
                    <div
                      className="reaction-picker flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                      style={{ left: 0 }}
                    >
                      {AVAILABLE_REACTIONS.filter((e) => e !== currentReactionEmojiFor(m)).map((e) => (
                        <button
                          key={e}
                          className="reaction-option"
                          onClick={() => {
                            const curr = currentReactionEmojiFor(m);
                            if (hasReacted(m, curr)) toggleReaction(m, curr);
                            setMessageReactionChoice((prev) => ({ ...prev, [m._id]: e }));
                            toggleReaction(m, e);
                            setReactionPickerFor(null);
                          }}
                        >
                          {e} {reactionCount(m, e) || ""}
                        </button>
                      ))}
                      <button
                        className="reaction-option"
                        onClick={() => {
                          // Explicit remove option (if you hadn't reacted yet, simply close)
                          const curr = currentReactionEmojiFor(m);
                          if (hasReacted(m, curr)) toggleReaction(m, curr);
                          setReactionPickerFor(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {openMessageActions === m._id && (
                <div
                  className="mt-2 p-2 rounded-lg border flex flex-wrap items-center gap-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="text-xs px-3 py-1 rounded-md border"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => { setReplyTo(m); setOpenMessageActions(null); composerTextareaRef.current?.focus(); }}
                  >
                    Reply
                  </button>

                  {m.text && (
                    <button
                      className="text-xs px-3 py-1 rounded-md border"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => copyMessageText(m)}
                    >
                      Copy text
                    </button>
                  )}

                  <button
                    className="text-xs px-3 py-1 rounded-md border"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => { setReactionPickerFor(m._id); setOpenMessageActions(null); }}
                  >
                    Change reaction
                  </button>

                  <button
                    className="text-xs px-3 py-1 rounded-md border"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => hideMessageForMe(m._id)}
                  >
                    Hide for me
                  </button>

                  {String(m.sender?._id) === String(user?._id) && (
                    <div className="ml-2 flex gap-2 text-xs">
                      <button onClick={() => startEdit(m)}>Edit</button>
                      <button onClick={() => deleteMessageForEveryone(m._id)}>Delete for everyone</button>
                    </div>
                  )}

                  <div className="ml-auto">
                    <button
                      className="text-xs px-2 py-1 rounded-md hover:opacity-80"
                      onClick={() => setOpenMessageActions(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Fragment>
      );
    });
  }

  // AVATAR UPLOAD ------------------------------------------------
  function uploadAvatarDirect(e: any) {
    const f = e.target.files?.[0];
    if (f) setSelectedAvatar(f);
  }

  async function saveAvatar() {
    if (!selectedAvatar || !token) return;

    const fd = new FormData();
    fd.append("avatar", selectedAvatar);

    try {
      console.log("App: Uploading avatar...");
      const res = await axios.post(API + "/api/users/avatar", fd, {
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "multipart/form-data"
        }
      });

      console.log("App: Avatar upload response:", res.data);
      if (res.data?.user) {
        console.log("App: Updating user state with:", res.data.user);
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      setSelectedAvatar(null);
    } catch (e) {
      console.error("avatar upload error", e);
    }
  }

  // LOGOUT -------------------------------------------------------
  function logout() {
    localStorage.clear();
    setToken(null);
    setUser(null);
    window.location.reload();
  }

  // MESSAGE IMAGE VIEWER STATE ----------------------------------
  const [messageImageViewer, setMessageImageViewer] = React.useState<{ index: number } | null>(null);
  const messageImageUrls = React.useMemo(() => {
    try {
      return messages
        .filter((m: any) => !!m.fileUrl)
        .map((m: any) => (m.fileUrl.startsWith('http') ? m.fileUrl : API + m.fileUrl));
    } catch { return []; }
  }, [messages]);
  function openMessageImage(url: string) {
    const idx = messageImageUrls.indexOf(url);
    setMessageImageViewer({ index: idx >= 0 ? idx : 0 });
  }
  function closeMessageImage() { setMessageImageViewer(null); }
  function prevMessageImage() { if (!messageImageUrls.length) return; setMessageImageViewer((v) => ({ index: ( (v?.index || 0) + messageImageUrls.length - 1) % messageImageUrls.length })); }
  function nextMessageImage() { if (!messageImageUrls.length) return; setMessageImageViewer((v) => ({ index: ( (v?.index || 0) + 1) % messageImageUrls.length })); }
  async function shareMessageImage() {
    try {
      const url = messageImageUrls[messageImageViewer?.index || 0];
      if ((navigator as any).share) { await (navigator as any).share({ title: 'TeaKonn Photo', url }); return; }
      await navigator.clipboard.writeText(url);
      alert('Image link copied');
    } catch {}
  }
  function downloadMessageImage() {
    try {
      const url = messageImageUrls[messageImageViewer?.index || 0];
      const a = document.createElement('a');
      a.href = url; a.download = url.split('/').pop() || 'image.jpg';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch {}
  }
  React.useEffect(() => {
    if (!messageImageViewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMessageImage();
      else if (e.key === 'ArrowLeft') prevMessageImage();
      else if (e.key === 'ArrowRight') nextMessageImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [messageImageViewer, messageImageUrls]);

  // AUTH CHECK ---------------------------------------------------
  if (!token || !user) {
    return authPage === "login" ? (
      <Login
        onSuccess={({ token, user }) => {
          setToken(token);
          setUser(user);
        }}
        switchToRegister={() => setAuthPage("register")}
      />
    ) : (
      <Register
        onSuccess={({ token, user }) => {
          setToken(token);
          setUser(user);
        }}
        switchToLogin={() => setAuthPage("login")}
      />
    );
  }
  
  // ---- MAIN LAYOUT ----
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Unified Sidebar */}
      {token && (
        <Sidebar
          key={`${user?._id}-${user?.avatar}-${myStatus?.mood}-${myStatus?.emoji}-${JSON.stringify(user)}`}
          token={token}
          user={user}
          theme={theme}
          myStatus={myStatus}
          isOnline={user?._id ? onlineUsers.has(user._id) : false}
          onNavigate={(v) => {
            setView(v as any);
            setInDM(false);
            setActiveConversation(null);
          }}
          onThemeToggle={toggleTheme}
          onLogout={logout}
          onStatusUpdated={onMyStatusUpdated}
          onShowProfile={showProfile}
          onOpenConversation={openConversation}
          onAvatarUpload={uploadAvatarDirect}
          onAvatarSave={saveAvatar}
          onAvatarCancel={() => setSelectedAvatar(null)}
          selectedAvatar={selectedAvatar}
          conversations={conversations}
          makeAvatarUrl={makeAvatarUrl}
        />
      )}

      {/* ---------------- MAIN VIEW ---------------- */}
      <main 
        className={clsx(
          "flex-1 flex flex-col pl-14 lg:pl-0",
          view === "chat" ? "overflow-hidden h-screen" : "overflow-auto p-4 lg:p-6"
        )} 
        style={{ color: 'var(--text)' }}
      >
        {/* DASHBOARD PAGE */}
        {view === "dashboard" && (
          <Dashboard
            token={token}
            onNavigate={(newView: string) => setView(newView as any)}
            onViewProfile={showProfile}
          />
        )}
        
        {/* MY ACTIVITIES PAGE */}
        {(view === "my-activities" || view === "my-events") && (
          <MyEvents token={token as any} onNavigate={(newView: string) => setView(newView as any)} />
        )}
        
        {/* DISCOVER PAGE */}
        {view === "discover" && (
          <Discover
            token={token}
            onViewProfile={showProfile}
            onStartConversation={startConversationWithUser}
          />
        )}

        {/* SPORTS EVENTS PAGE (simplified booking flow) */}
        {view === "sports" && (
          <SportsEvents token={token} onViewProfile={showProfile} onStartConversation={startConversationWithUser} />
        )}

        {/* FOLLOWERS PAGE */}
        {view === "followers" && (
          <FollowersList
            token={token}
            currentUserId={user?._id}
            onShowProfile={showProfile}
            onOpenConversation={openConversation}
          />
        )}

        {/* FOLLOWING PAGE */}
        {view === "following" && (
          <FollowingList
            token={token}
            currentUserId={user?._id}
            onShowProfile={showProfile}
            onOpenConversation={openConversation}
          />
        )}

        {/* ALL USERS PAGE */}
        {view === "all-users" && (
          <AllUsers
            token={token}
            currentUserId={user?._id}
            onOpenConversation={(c) => openConversation(c)}
            onShowProfile={showProfile}
          />
        )}

        {/* ROOMS PAGE */}
        {view === "posts" && (
          <Posts
            token={token}
            currentUserId={user?._id}
            onShowProfile={(u: any) => showProfile(u)}
          />
        )}

        {view === "user-content" && (
          <UserContent
            token={token}
            onNavigate={(v: string) => setView(v as any)}
          />
        )}

        {/* DIRECT MESSAGES PAGE */}
        {view === "direct-messages" && (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">💬 Direct Messages</h2>
            <ConversationsList
              key={conversationRefreshKey}
              token={token}
              currentUserId={user?._id}
              onShowProfile={(u: any) => showProfile(u)}
              onOpenConversation={(c: any) => openConversation(c)}
              onlineUsers={onlineUsers}
            />
          </div>
        )}

        {/* CHAT / DM PAGE */}
        {view === "chat" && (
          <div className="h-full grid grid-rows-[auto_1fr_auto]">
            <header
              className="flex flex-wrap items-center justify-between gap-2 p-4 border-b relative z-10"
              style={{ borderColor: 'var(--border)', overflow: 'visible' }}
              onMouseDown={startHeaderPress}
              onMouseUp={cancelHeaderPress}
              onMouseLeave={cancelHeaderPress}
              onTouchStart={startHeaderPress}
              onTouchEnd={cancelHeaderPress}
            >
              {inDM && activeConversation ? (
                <div className="flex items-center gap-3">
                  {(() => {
                    const partner = (activeConversation.participants || []).find(
                      (p: any) => String(p._id) !== String(user?._id)
                    );
                    return (
                      <>
                        <div className="relative">
                          <Avatar
                            src={makeAvatarUrl(partner?.avatar)}
                            className="w-10 h-10 rounded-md object-cover"
                            alt={partner?.username || "User"}
                          />
                          {/* Online status indicator */}
                          {partner?._id && onlineUsers.has(partner._id) && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm"></div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {partner?.username}
                            </span>
                            {/* Settings icon to open chat actions */}
                            <button
                              className="p-1 rounded-md border hover:bg-slate-100 dark:hover:bg-slate-800"
                              style={{ borderColor: 'var(--border)' }}
                              onClick={(e) => { e.stopPropagation(); setShowChatActions(true); }}
                              title="Chat settings"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            {partner?._id && onlineUsers.has(partner._id) && (
                              <span className="text-xs text-green-500 font-medium">● Online</span>
                            )}
                          </div>
                          {/* Show typing indicator for this specific user */}
                          {partner?._id && typingUsers[partner._id] ? (
                            <div className="flex items-center gap-1.5 text-cyan-500 text-xs">
                              <div className="flex gap-0.5">
                                <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </div>
                              <span>typing...</span>
                            </div>
                          ) : (
                            <div className="text-xs opacity-70">
                              Private conversation
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <h3 className="text-lg font-semibold">#{room}</h3>
              )}

              <div className="text-sm opacity-80 flex flex-wrap items-center gap-2">
                {Object.keys(typingUsers).length > 0 && (
                  <div className="flex items-center gap-1.5 text-cyan-500 animate-pulse">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-xs font-medium">
                      {Object.keys(typingUsers).length === 1
                        ? `${Object.values(typingUsers)[0]?.username || 'Someone'} is typing...`
                        : Object.keys(typingUsers).length === 2
                        ? `${Object.values(typingUsers).map((u: any) => u?.username || 'Someone').join(' and ')} are typing...`
                        : `${Object.keys(typingUsers).length} people are typing...`
                      }
                    </span>
                  </div>
                )}
                {unreadIndex >= 0 && (
                  <button
                    className="text-xs px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-medium transition-all shadow-sm"
                    onClick={jumpToUnread}
                  >
                    Jump to unread
                  </button>
                )}
                
                {/* Long-press chat actions sheet */}
                {showChatActions && (
                  <div
                    className="absolute right-4 top-14 bg-white dark:bg-slate-900 border rounded-lg shadow-2xl z-20 w-64"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={toggleEnterToSend}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Zap className={clsx('w-4 h-4', enterToSend ? 'text-indigo-500' : 'text-gray-400')} />
                      <div className="flex-1">
                        <div className="font-medium">Send on Enter</div>
                        <div className="text-xs opacity-70">
                          {enterToSend ? 'Enabled (Press Enter)' : 'Disabled (Press Ctrl+Enter)'}
                        </div>
                      </div>
                    </button>
                    <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                    <button
                      onClick={async () => {
                        if (!confirm("Clear all messages in this chat? This cannot be undone.")) return;
                        try {
                          if (inDM && activeConversation) {
                            await axios.delete(
                              `${API}/api/conversations/${activeConversation._id}/messages`,
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                          } else {
                            await axios.delete(
                              `${API}/api/messages/room/${room}/clear`,
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                          }
                          setMessages([]);
                          setShowChatActions(false);
                        } catch (e) {
                          console.error("Clear chat error", e);
                          alert("Failed to clear chat");
                        }
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4 text-orange-500" />
                      <div>
                        <div className="font-medium">Clear Chat</div>
                        <div className="text-xs opacity-70">Remove all messages</div>
                      </div>
                    </button>
                    {inDM && activeConversation && (
                      <>
                        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this entire conversation permanently? This cannot be undone.")) return;
                            try {
                              await axios.delete(
                                `${API}/api/conversations/${activeConversation._id}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                              );
                              setActiveConversation(null);
                              setInDM(false);
                              setMessages([]);
                              setView("direct-messages");
                              const res = await axios.get(`${API}/api/conversations`, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              setConversations(res.data || []);
                            } catch (e) {
                              console.error("Delete conversation error", e);
                              alert("Failed to delete conversation");
                            } finally {
                              setShowChatActions(false);
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <X className="w-4 h-4 text-red-500" />
                          <div>
                            <div className="font-medium text-red-500">Delete Conversation</div>
                            <div className="text-xs opacity-70">Permanently remove chat</div>
                          </div>
                        </button>
                      </>
                    )}
                    <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                    <button
                      onClick={() => setShowChatActions(false)}
                      className="w-full px-4 py-2 text-xs text-theme-secondary hover:opacity-80 text-left"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </header>
            {showLongPressHintChat && (
              <div className="mx-4 mt-2 mb-0 rounded-lg px-3 py-2 text-xs bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border"
                   style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-theme-secondary">Tip: Long-press the header for chat options.</span>
                  <button
                    className="text-[11px] px-2 py-1 rounded-md bg-white/60 dark:bg-slate-700/60 hover:opacity-80"
                    onClick={() => { try { localStorage.setItem('auralink-hint-chat-longpress','true'); } catch {}; setShowLongPressHintChat(false); }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}

            {/* MESSAGE LIST */}
            <section 
              ref={messagesSectionRef}
              className="overflow-y-auto p-4 relative"
              onScroll={handleScroll}
            >
              <div className="flex flex-col gap-4">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-md" style={{ background: 'var(--muted)' }} />
                        <div className="flex-1">
                          <div className="h-3 w-24 rounded" style={{ background: 'var(--muted)' }} />
                          <div className="mt-2 h-3 w-3/5 rounded" style={{ background: 'var(--muted)' }} />
                          <div className="mt-2 h-3 w-2/5 rounded" style={{ background: 'var(--muted)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  renderMessages()
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to Bottom Button */}
              {showScrollButton && (
                <button
                  onClick={scrollToBottom}
                  className="fixed bottom-24 right-8 bg-gradient-to-r from-cyan-400 to-purple-500 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all z-10"
                  title="Scroll to bottom"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
            </section>

            {/* MESSAGE COMPOSER */}
            <form
              className="composer flex flex-col gap-2 p-4 border-t"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              onSubmit={sendMessage}
            >
              {replyTo && (
                <div className="mb-2 p-2 rounded-md border text-xs flex items-center gap-2"
                     style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <span className="opacity-80">Replying to</span>
                  <strong>{replyTo?.sender?.username || 'User'}</strong>
                  <span className="opacity-70 truncate max-w-[50%]">{(replyTo?.text || '').slice(0, 80)}</span>
                  <button
                    type="button"
                    className="ml-auto text-[11px] px-2 py-1 rounded-md border"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {/* Image Preview Bar */}
              {selectedImages.length > 0 && (
                <div className="flex gap-2 p-2 bg-slate-800/30 rounded-md overflow-x-auto">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`Preview ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-md cursor-pointer"
                        onClick={() => setImagePreviewOpen(true)}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <textarea
                  className="input composer-input w-full pt-3 pl-3 pr-3 pb-3 rounded-2xl resize-none overflow-y-auto overflow-x-hidden leading-6"
                  style={{ 
                    minHeight: '48px',
                    maxHeight: '144px',
                    height: '48px'
                  }}
                  wrap="soft"
                  ref={composerTextareaRef}
                  value={text}
                  onChange={onComposerChange}
                  onKeyDown={handleKeyPress}
                  placeholder={inDM ? (enterToSend ? "Message... (Enter to send)" : "Message... (Ctrl+Enter to send)") : (enterToSend ? "Say something... (Enter to send)" : "Say something... (Ctrl+Enter to send)")}
                  rows={1}
                  onInput={(e: any) => {
                    // Auto-resize textarea as user types - expand when scrollHeight exceeds current height
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '48px';
                    if (target.scrollHeight > 48) {
                      target.style.height = Math.min(target.scrollHeight, 144) + 'px';
                    }
                  }}
                />
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {/* Image Button with Icon */}
                  <label className="cursor-pointer composer-icon-btn">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-theme-secondary"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>

                  <button 
                    className="composer-send-btn w-full sm:w-auto mt-2 sm:mt-0" 
                    type="submit"
                    title="Send message"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {profileOpen && profileUser && (
        <UserProfileModal
          user={{ ...profileUser, isFollowed: profileIsFollowed }}
          visible={profileOpen}
          onClose={() => setProfileOpen(false)}
          token={token}
          onOpenConversation={(u: any) => startConversationWithUser(u._id)}
          currentUserId={user?._id}
          onNavigate={(v: string) => setView(v as any)}
        />
      )}

      {/* ---------------- IMAGE PREVIEW MODAL ---------------- */}
      {imagePreviewOpen && selectedImages.length > 0 && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setImagePreviewOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedImages.length} Image{selectedImages.length > 1 ? "s" : ""} Selected
              </h3>
              <button
                onClick={() => setImagePreviewOpen(false)}
                className="text-2xl opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Image ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => removeImage(idx)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                    {img.name}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={clearAllImages}
                className="px-4 py-2 border rounded-md"
              >
                Clear All
              </button>
              <button
                onClick={() => setImagePreviewOpen(false)}
                className="btn px-4 py-2"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MESSAGE IMAGE LIGHTBOX ---------------- */}
      {messageImageViewer && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeMessageImage}
        >
          <button
            onClick={closeMessageImage}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
            aria-label="Close image preview"
          >
            <X className="w-6 h-6" />
          </button>
          {messageImageUrls.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevMessageImage(); }} className="absolute left-4 mid:top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3">‹</button>
              <button onClick={(e) => { e.stopPropagation(); nextMessageImage(); }} className="absolute right-4 mid:top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3">›</button>
            </>
          )}
          <img
            src={messageImageUrls[messageImageViewer.index]}
            alt="Message Image"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); shareMessageImage(); }} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm">Share</button>
            <button onClick={(e) => { e.stopPropagation(); downloadMessageImage(); }} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm">Download</button>
          </div>
        </div>
      )}
      {/* AI Assistant Widget */}
      {ASSISTANT_ENABLED && <AssistantWidget token={token} user={user as any} view={view} />}
    </div>
  );
}
