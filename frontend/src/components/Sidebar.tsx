// frontend/src/components/Sidebar.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, 
  UserPlus, 
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Home,
  Search,
  CalendarDays,
  MessageCircle,
  LogOut,
  Sun,
  Moon,
  TrendingUp,
  Bot,
  Eye,
  EyeOff
} from "lucide-react";
import Avatar from "./Avatar";
import StatusPicker from "./StatusPicker";
import SearchUsers from "./SearchUsers";
import logo from "../assets/teakonn-logo.png";
import { socket } from "../socket";
import dayjs from "dayjs";

// Use normalized absolute API base
import { API_URL } from "../config/api";
const API = API_URL;

interface SidebarProps {
  token: string;
  user: any;
  theme: string;
  myStatus: any;
  isOnline?: boolean;
  onNavigate?: (view: string) => void;
  onThemeToggle: () => void;
  onLogout: () => void;
  onStatusUpdated: (status: any) => void;
  onShowProfile: (user: any) => void;
  onOpenConversation: (conversation: any) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarSave: () => void;
  onAvatarCancel: () => void;
  selectedAvatar: File | null;
  conversations: any[];
  makeAvatarUrl: (url?: string) => string;
}

export default function Sidebar({
  token,
  user,
  theme,
  myStatus,
  isOnline = false,
  onNavigate,
  onThemeToggle,
  onLogout,
  onStatusUpdated,
  onShowProfile,
  onOpenConversation,
  onAvatarUpload,
  onAvatarSave,
  onAvatarCancel,
  selectedAvatar,
  conversations,
  makeAvatarUrl
}: SidebarProps) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [assistantHidden, setAssistantHidden] = useState<boolean>(() => {
    try { return localStorage.getItem('teakonn.assistantHidden') === 'true'; } catch { return false; }
  });
  const [joinedActiveEvents, setJoinedActiveEvents] = useState<any[]>([]);
  const [groupUnread, setGroupUnread] = useState<Record<string, number>>({});

  useEffect(() => {
    loadUserStats();
    // Initial load of group chats and polling
    loadGroupChats();
    const interval = setInterval(() => {
      loadGroupChats();
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // Socket-driven refresh for incoming events
  useEffect(() => {
    try {
      const handler = () => loadGroupChats();
      socket?.on?.('receive_message', handler);
      socket?.on?.('message_deleted', handler);
      socket?.on?.('messages_bulk_deleted', handler);
      socket?.on?.('message_status_update', handler); // read/delivered updates
      return () => {
        socket?.off?.('receive_message', handler);
        socket?.off?.('message_deleted', handler);
        socket?.off?.('messages_bulk_deleted', handler);
        socket?.off?.('message_status_update', handler);
      };
    } catch {}
  }, []);

  async function loadUserStats() {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(false);
      console.log("Loading user stats from:", `${API}/users/me`);
      
      const res = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500,
      });
      
      console.log("User stats response:", res.status, res.data);
      
      if (res.status === 404) {
        console.warn("User endpoint not found (404)");
        setFollowers(0);
        setFollowing(0);
        setError(true);
        return;
      }
      
      const userData = res.data;
      const followersCount = Array.isArray(userData.followers) ? userData.followers.length : 0;
      const followingCount = Array.isArray(userData.following) ? userData.following.length : 0;
      
      console.log("Setting followers:", followersCount, "following:", followingCount);
      setFollowers(followersCount);
      setFollowing(followingCount);
    } catch (err: any) {
      console.error("Sidebar stats error:", err);
      setError(true);
      setFollowers(0);
      setFollowing(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupChats() {
    if (!token) return;
    try {
      const joinedRes = await axios.get(`${API}/events/my/joined`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const joined = (joinedRes.data?.events || []).filter((ev: any) => !ev.archivedAt);
      setJoinedActiveEvents(joined);

      const ids = joined.map((e: any) => e._id);
      if (ids.length > 0) {
        try {
          const unreadRes = await axios.post(
            `${API}/messages/rooms/unread-counts`,
            { rooms: ids },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setGroupUnread(unreadRes.data || {});
        } catch (e) {
          console.warn('Sidebar: failed to load group unread counts');
          setGroupUnread({});
        }
      } else {
        setGroupUnread({});
      }
    } catch (e) {
      console.warn('Sidebar: failed to load joined events');
      setJoinedActiveEvents([]);
      setGroupUnread({});
    }
  }

  const stats = [
    {
      icon: Users,
      label: "Followers",
      value: followers,
      color: "from-emerald-500/12 to-green-500/10",
      onClick: () => onNavigate?.('followers')
    },
    {
      icon: UserPlus,
      label: "Following",
      value: following,
      color: "from-emerald-500/12 to-green-500/10",
      onClick: () => onNavigate?.('following')
    }
  ];

  // Calculate total unread messages from conversations (only if conversations array exists and has items)
  const totalUnreadMessages = Array.isArray(conversations) && conversations.length > 0
    ? conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0) 
    : 0;
  const totalGroupUnread = Object.values(groupUnread || {}).reduce((s: number, n: any) => s + (n || 0), 0);
  
  console.log('[Sidebar] Conversations:', conversations?.length, 'Total unread:', totalUnreadMessages);

  // Helper component for navigation buttons
  const NavButton = ({ icon: Icon, label, badge, isCollapsed, onClick }: any) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group themed-card hover:shadow-md"
      title={isCollapsed ? label : ''}
    >
      <Icon className="w-5 h-5 flex-shrink-0 text-theme-secondary" />
      {!isCollapsed && (
        <span className="flex-1 text-left text-sm font-medium text-heading">
          {label}
        </span>
      )}
      {!isCollapsed && badge !== undefined && badge > 0 && (
        <span className="px-2 py-0.5 bg-cyan-600 text-white text-xs rounded-full font-semibold">
          {badge}
        </span>
      )}
    </button>
  );

  // Mobile toggle button
  const MobileToggle = () => (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-xl border shadow-lg transition-all"
        style={{
          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          borderColor: theme === 'dark' ? '#475569' : '#cbd5e1'
        }}
      >
        {isMobileOpen ? (
          <X className="w-5 h-5" style={{ color: theme === 'dark' ? '#ffffff' : '#1e293b' }} />
        ) : (
          <Menu className="w-5 h-5" style={{ color: theme === 'dark' ? '#ffffff' : '#1e293b' }} />
        )}
      </button>
    </>
  );

  // Desktop collapse toggle
  const CollapseToggle = () => (
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="hidden lg:flex absolute -right-3 top-8 p-1.5 rounded-full border shadow-lg transition-all z-10 themed-card"
    >
      {isCollapsed ? (
        <ChevronRight className="w-4 h-4" />
      ) : (
        <ChevronLeft className="w-4 h-4" />
      )}
    </button>
  );

  const SidebarContent = () => (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header with Logo and Theme Toggle */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center justify-center flex-1">
              <img src={logo} alt="TeaKonn" className="w-16 h-16 object-contain" />
            </div>
            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
              className="p-2 rounded-lg themed-card hover:opacity-90 transition-all duration-300 group"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700 group-hover:text-slate-600 transition-colors" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <img src={logo} alt="TeaKonn" className="w-10 h-10 object-contain" />
          </div>
        )}
      </div>

      {/* User Profile Section */}
      {!isCollapsed && (
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              src={makeAvatarUrl(user?.avatar)}
              className="w-12 h-12 rounded-lg object-cover"
              alt={user?.username || "User"}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-bold truncate" style={{ color: 'var(--text)' }}>{user?.username}</div>
                {isOnline && (
                  <div className="flex-shrink-0 w-2.5 h-2.5 bg-green-500 rounded-full" title="Online"></div>
                )}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{user?.role?.toUpperCase() || "USER"}</div>
            </div>
          </div>

          {myStatus && (
            <div className="text-xs flex gap-1 items-center mb-3" style={{ color: 'var(--text-secondary)' }}>
              <span>{myStatus.emoji}</span>
              <span className="opacity-80 truncate">{myStatus.mood}</span>
            </div>
          )}

          <StatusPicker
            token={token}
            currentStatus={myStatus}
            onUpdated={onStatusUpdated}
          />

          {/* Improved Avatar Upload Section */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <label className="block text-xs font-semibold mb-3 text-slate-300">
              Profile Picture
            </label>
            
            {selectedAvatar && (
              <div className="mb-3 relative">
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-800 border-2 border-cyan-500">
                  <img
                    src={URL.createObjectURL(selectedAvatar)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-cyan-600 text-white text-xs rounded-full font-semibold">
                  Preview
                </div>
              </div>
            )}
            
            <div className="relative">
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={onAvatarUpload}
                className="hidden"
              />
              <label
                htmlFor="avatar-upload"
                className="block w-full px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-all text-center"
              >
                {selectedAvatar ? 'Choose Different Image' : 'Upload New Photo'}
              </label>
            </div>
            
            {selectedAvatar && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onAvatarSave}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  ✓ Save
                </button>
                <button
                  onClick={onAvatarCancel}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-all"
                >
                  ✕ Cancel
                </button>
              </div>
            )}
            
            <p className="mt-2 text-xs text-slate-400 text-center">
              JPG, PNG or WEBP • Max 5MB
            </p>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <div className="p-2 space-y-2">
        <NavButton
          icon={Home}
          label="Dashboard"
          isCollapsed={isCollapsed}
          onClick={() => {
            onNavigate?.('dashboard');
            setIsMobileOpen(false);
          }}
        />
        <NavButton
          icon={Search}
          label="Discover"
          isCollapsed={isCollapsed}
          onClick={() => {
            onNavigate?.('discover');
            setIsMobileOpen(false);
          }}
        />
        <NavButton
          icon={CalendarDays}
          label="My Activities"
          isCollapsed={isCollapsed}
          onClick={() => {
            onNavigate?.('my-activities');
            setIsMobileOpen(false);
          }}
        />
        <NavButton
          icon={Users}
          label="All Users"
          isCollapsed={isCollapsed}
          onClick={() => {
            onNavigate?.('all-users');
            setIsMobileOpen(false);
          }}
        />
        <NavButton
          icon={TrendingUp}
          label="Posts"
          isCollapsed={isCollapsed}
          onClick={() => {
            onNavigate?.('posts');
            setIsMobileOpen(false);
          }}
        />
        <NavButton
          icon={MessageCircle}
          label="Direct Messages"
          badge={totalUnreadMessages}
          isCollapsed={isCollapsed}
          onClick={() => {
            onNavigate?.('direct-messages');
            setIsMobileOpen(false);
          }}
        />
        <NavButton
          icon={Users}
          label="Group Chats"
          badge={totalGroupUnread}
          isCollapsed={isCollapsed}
          onClick={() => {
            onNavigate?.('group-chats');
            setIsMobileOpen(false);
          }}
        />
      </div>

      {/* Search Users */}
      {!isCollapsed && (
        <div className="px-4 py-2 border-t border-slate-700">
          <SearchUsers
            token={token}
            currentUserId={user?._id}
            onShowProfile={onShowProfile}
            onOpenConversation={onOpenConversation}
          />
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex-1 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        {!isCollapsed && (
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Quick Stats</h3>
        )}
        
        <div className="space-y-2">
          {loading && !error ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-slate-800 rounded-xl"></div>
                </div>
              ))}
            </>
          ) : (
            stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  onClick={stat.onClick}
                  className={`
                    relative rounded-xl p-3 cursor-pointer border bg-gradient-to-r ${stat.color}
                    transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-emerald-500/40
                    ${isCollapsed ? 'aspect-square' : ''}
                  `}
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <div className="relative z-10">
                    <div className={`flex ${isCollapsed ? 'flex-col items-center justify-center h-full' : 'items-center justify-between'}`}>
                      <div className={isCollapsed ? 'mb-1' : ''}>
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      {!isCollapsed && (
                        <div className="text-right">
                          <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                            {stat.value}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {stat.label}
                          </p>
                        </div>
                      )}
                    </div>
                    {isCollapsed && (
                      <div className="text-center">
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{stat.value}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error && !loading && !isCollapsed && (
          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-400 text-center">
              Unable to load stats
            </p>
          </div>
        )}
      </div>

      {/* Assistant Toggle */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => {
            const next = !assistantHidden;
            setAssistantHidden(next);
            try { localStorage.setItem('teakonn.assistantHidden', next ? 'true' : 'false'); } catch {}
            window.dispatchEvent(new CustomEvent('teakonn.assistant.toggle', { detail: { hidden: next } }));
          }}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} px-4 py-2 themed-card border transition-all`}
          title={assistantHidden ? 'Show Assistant' : 'Hide Assistant'}
          style={{ borderColor: 'var(--border)' }}
        >
          <Bot className="w-4 h-4 text-accent" />
          {!isCollapsed && <span>{assistantHidden ? 'Show Assistant' : 'Hide Assistant'}</span>}
        </button>
      </div>

      {/* Logout and Footer */}
      <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
        {!isCollapsed && (
          <button
            onClick={loadUserStats}
            disabled={loading}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all text-xs font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Stats'}
          </button>
        )}
        
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-medium`}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span>Log Out</span>}
        </button>

        {!isCollapsed && (
          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()}</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">SIMON KATHULU</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <MobileToggle />

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Unified Sidebar */}
      <div
        className={`
          fixed lg:relative top-0 left-0 h-screen
          border-r shadow-2xl
          transition-all duration-300 z-40 flex-shrink-0
          ${isCollapsed ? 'w-20' : 'w-80'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ 
          background: 'var(--sidebar)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="relative h-full">
          <CollapseToggle />
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
