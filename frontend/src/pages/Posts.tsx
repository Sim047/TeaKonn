// frontend/src/pages/Posts.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Heart, MessageCircle, Send, Trash2, Edit, X, Image as ImageIcon, Plus, ArrowUp, Share } from "lucide-react";
import Avatar from "../components/Avatar";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const API = import.meta.env.VITE_API_URL || "";

interface Post {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
    email: string;
  };
  caption: string;
  imageUrl: string;
  likes: string[];
  comments: Array<{
    _id: string;
    user: {
      _id: string;
      username: string;
      avatar?: string;
    };
    text: string;
    likes?: string[];
    replies?: Array<{
      user: {
        _id: string;
        username: string;
        avatar?: string;
      };
      text: string;
      createdAt: string;
    }>;
    createdAt: string;
  }>;
  tags: string[];
  location: string;
  createdAt: string;
  updatedAt: string;
  captionEditedAt?: string;
}

export default function Posts({ token, currentUserId, onShowProfile }: any) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ caption: "", imageUrl: "", location: "", tags: "" });
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  
  // Edit states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostData, setEditPostData] = useState({ caption: "", location: "", tags: "" });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  
  // Comments collapse state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [showAllComments, setShowAllComments] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [commentBoxOpen, setCommentBoxOpen] = useState<Record<string, boolean>>({});
  const [expandedCommentText, setExpandedCommentText] = useState<Record<string, boolean>>({});
  const [expandedReplyText, setExpandedReplyText] = useState<Record<string, Record<number, boolean>>>({});
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  
  // Scroll to top state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [longPressPostId, setLongPressPostId] = useState<string | null>(null);
  const pressTimerRef = React.useRef<number | null>(null);
  const [showLongPressHint, setShowLongPressHint] = useState<boolean>(() => {
    try { return !localStorage.getItem('auralink-hint-posts-longpress'); } catch { return true; }
  });

  function startPostPress(postId: string) {
    try {
      if (pressTimerRef.current) {
        window.clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      pressTimerRef.current = window.setTimeout(() => setLongPressPostId(postId), 500) as any;
      try {
        localStorage.setItem('auralink-hint-posts-longpress', 'true');
        setShowLongPressHint(false);
      } catch {}
    } catch {}
  }
  function cancelPostPress() {
    try {
      if (pressTimerRef.current) {
        window.clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    } catch {}
  }

  useEffect(() => {
    if (token) loadPosts();
  }, [token]);

  const currentUser = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // If opened via a shared link, highlight and scroll to the post
  useEffect(() => {
    const highlightId = localStorage.getItem('auralink-highlight-post');
    if (!highlightId) return;
    const el = document.getElementById(`post-${highlightId}`);
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-cyan-500');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-cyan-500');
        try { localStorage.removeItem('auralink-highlight-post'); } catch {}
      }, 2000);
    }, 300);
  }, [posts.length]);

  async function loadPosts() {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  }

  function makeAvatarUrl(avatar?: string) {
    if (!avatar) return "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff";
    if (avatar.startsWith("http")) return avatar;
    if (avatar.startsWith("/")) return API + avatar;
    return API + "/uploads/" + avatar;
  }

  async function handleCreatePost() {
    if (!newPost.caption.trim() && !newPost.imageUrl) {
      alert("Please add a caption or image");
      return;
    }

    try {
      const tags = newPost.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await axios.post(
        `${API}/api/posts`,
        {
          caption: newPost.caption,
          imageUrl: newPost.imageUrl,
          tags,
          location: newPost.location,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts([res.data, ...posts]);
      setNewPost({ caption: "", imageUrl: "", location: "", tags: "" });
      setCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create post:", err);
      alert("Failed to create post");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API}/api/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setNewPost({ ...newPost, imageUrl: res.data.url });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleLike(postId: string) {
    // Optimistic toggle
    const prev = posts;
    setPosts((list) => list.map((p) => {
      if (p._id !== postId) return p;
      const liked = p.likes.includes(currentUserId);
      return { ...p, likes: liked ? p.likes.filter((id) => id !== currentUserId) : [...p.likes, currentUserId] };
    }));

    try {
      const res = await axios.post(
        `${API}/api/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((list) => list.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error("Failed to like post:", err);
      // Revert on error
      setPosts(prev);
    }
  }

  async function handleComment(postId: string) {
    const text = commentTexts[postId]?.trim();
    if (!text) return;

    // Optimistic add
    const prev = posts;
    const tempId = `temp-${Date.now()}`;
    const tempComment = {
      _id: tempId,
      user: { _id: currentUserId, username: currentUser?.username || "You", avatar: currentUser?.avatar },
      text,
      likes: [],
      replies: [],
      createdAt: new Date().toISOString(),
    } as any;

    setPosts((list) => list.map((p) => p._id === postId ? { ...p, comments: [...p.comments, tempComment] } : p));
    setCommentTexts({ ...commentTexts, [postId]: "" });

    try {
      const res = await axios.post(
        `${API}/api/posts/${postId}/comment`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((list) => list.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error("Failed to add comment:", err);
      // Revert and restore input
      setPosts(prev);
      setCommentTexts({ ...commentTexts, [postId]: text });
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Delete this post?")) return;

    try {
      await axios.delete(`${API}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPosts(posts.filter((p) => p._id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Failed to delete post");
    }
  }

  function getPostShareUrl(post: Post) {
    try {
      const origin = window.location.origin;
      const url = `${origin}/?view=posts&post=${post._id}`;
      return url;
    } catch {
      return `/?view=posts&post=${post._id}`;
    }
  }

  async function handleSharePost(post: Post) {
    const shareUrl = getPostShareUrl(post);
    const title = `${post.author.username}'s post`;
    const text = post.caption || 'Check out this post on TeaKonn!';
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
    } catch (e) {
      console.warn('Web Share aborted or failed:', e);
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard');
    } catch (e) {
      console.error('Clipboard copy failed:', e);
      alert(shareUrl);
    }
  }

  function startEditPost(post: Post) {
    setEditingPostId(post._id);
    setEditPostData({
      caption: post.caption,
      location: post.location,
      tags: post.tags.join(", "),
    });
  }

  async function handleUpdatePost() {
    if (!editingPostId) return;

    try {
      const tags = editPostData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await axios.put(
        `${API}/api/posts/${editingPostId}`,
        {
          caption: editPostData.caption,
          tags,
          location: editPostData.location,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts(posts.map((p) => (p._id === editingPostId ? res.data : p)));
      setEditingPostId(null);
      setEditPostData({ caption: "", location: "", tags: "" });
    } catch (err) {
      console.error("Failed to update post:", err);
      alert("Failed to update post");
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    if (!confirm("Delete this comment?")) return;

    try {
      const res = await axios.delete(
        `${API}/api/posts/${postId}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts(posts.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Failed to delete comment");
    }
  }

  function startEditComment(comment: any) {
    setEditingCommentId(comment._id);
    setEditCommentText(comment.text);
  }

  async function handleLikeComment(postId: string, commentId: string) {
    // Optimistic toggle
    const prev = posts;
    setPosts((list) => list.map((p) => {
      if (p._id !== postId) return p;
      return {
        ...p,
        comments: p.comments.map((c) => {
          if (c._id !== commentId) return c;
          const likes = c.likes || [];
          const liked = likes.includes(currentUserId);
          return { ...c, likes: liked ? likes.filter((id) => id !== currentUserId) : [...likes, currentUserId] };
        })
      };
    }));

    try {
      const res = await axios.post(
        `${API}/api/posts/${postId}/comment/${commentId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((list) => list.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error("Failed to like comment:", err);
      setPosts(prev);
    }
  }

  async function handleReplyToComment(postId: string, commentId: string) {
    if (!replyText.trim()) return;

    const text = replyText.trim();
    const prev = posts;
    const tempReply = {
      user: { _id: currentUserId, username: currentUser?.username || "You", avatar: currentUser?.avatar },
      text,
      createdAt: new Date().toISOString(),
      _id: `tempreply-${Date.now()}`,
    } as any;

    // Optimistic add
    setPosts((list) => list.map((p) => {
      if (p._id !== postId) return p;
      return {
        ...p,
        comments: p.comments.map((c) => c._id === commentId ? { ...c, replies: [...(c.replies || []), tempReply] } : c)
      };
    }));
    setReplyingTo(null);
    setReplyText("");

    try {
      const res = await axios.post(
        `${API}/api/posts/${postId}/comment/${commentId}/reply`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts((list) => list.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error("Failed to reply to comment:", err);
      alert("Failed to reply to comment");
      setPosts(prev);
      // Optionally restore reply draft
      setReplyingTo(commentId);
      setReplyText(text);
    }
  }

  function toggleComments(postId: string) {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }

  function toggleShowAll(postId: string) {
    setShowAllComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  }

  function formatTimestamp(dateString: string) {
    const date = dayjs(dateString);
    const now = dayjs();
    const diffInHours = now.diff(date, 'hour');

    if (diffInHours < 24) {
      return date.fromNow(); // "2 hours ago"
    } else if (diffInHours < 168) { // Less than 7 days
      return date.format('dddd [at] h:mm A'); // "Monday at 3:45 PM"
    } else {
      return date.format('MMM D, YYYY [at] h:mm A'); // "Dec 14, 2025 at 3:45 PM"
    }
  }

  function toggleCommentBox(postId: string) {
    setCommentBoxOpen(prev => ({ ...prev, [postId]: !prev[postId] }));
  }

  return (
    <div className="min-h-screen themed-page p-4 sm:p-6">
      <div className="max-w-3xl lg:max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Feed
          </h1>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Create Post
          </button>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-6 animate-pulse themed-card">
                <div className="h-64 themed-card"></div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-theme-secondary mx-auto mb-4" />
            <p className="text-theme-secondary text-lg">No posts yet</p>
            <p className="text-theme-secondary text-sm mt-2">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {showLongPressHint && (
              <div className="rounded-lg px-3 py-2 text-xs bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-theme-secondary">Tip: Press and hold a post to edit or delete.</span>
                  <button
                    className="text-[11px] px-2 py-1 rounded-md bg-white/60 dark:bg-slate-700/60 hover:opacity-80"
                    onClick={() => { try { localStorage.setItem('auralink-hint-posts-longpress', 'true'); } catch {}; setShowLongPressHint(false); }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
            {posts.map((post) => (
              <div
                key={post._id}
                id={`post-${post._id}`}
                className="rounded-2xl shadow-md themed-card"
                style={{ overflow: 'visible' }}
                onMouseDown={() => startPostPress(post._id)}
                onMouseUp={cancelPostPress}
                onMouseLeave={cancelPostPress}
                onTouchStart={() => startPostPress(post._id)}
                onTouchEnd={cancelPostPress}
              >
                {/* Post Header */}
                <div className="flex items-center justify-between p-3 relative z-10" style={{ overflow: 'visible' }}>
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={makeAvatarUrl(post.author.avatar)}
                      className="w-10 h-10 rounded-full object-cover cursor-pointer"
                      alt={post.author.username}
                      onClick={() => onShowProfile(post.author)}
                    />
                    <div>
                      <div
                        className="font-semibold text-heading cursor-pointer hover:text-cyan-500"
                        onClick={() => onShowProfile(post.author)}
                      >
                        {post.author.username}
                      </div>
                      {post.location && (
                        <div className="text-xs text-theme-secondary">{post.location}</div>
                      )}
                    </div>
                  </div>

                  {/* Share + Long-press actions */}
                  <div className="flex items-center gap-1.5 relative">
                    <button
                      onClick={() => handleSharePost(post)}
                      className="p-2 hover:opacity-80 rounded-full themed-card"
                      title="Share"
                    >
                      <Share className="w-5 h-5 text-theme-secondary" />
                    </button>
                    {post.author._id === currentUserId && longPressPostId === post._id && (
                      <div
                        className="absolute right-0 top-10 z-20 w-56 rounded-lg shadow-2xl themed-menu"
                        style={{ overflow: 'visible' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { setLongPressPostId(null); startEditPost(post); }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-theme hover:opacity-90"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Post
                        </button>
                        <button
                          onClick={() => { setLongPressPostId(null); handleDeletePost(post._id); }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:opacity-90"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Post
                        </button>
                        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                        <button
                          onClick={() => setLongPressPostId(null)}
                          className="w-full px-4 py-2 text-xs text-theme-secondary text-left hover:opacity-80"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Image (standardized height) */}
                {post.imageUrl && (
                  <div className="w-full h-64 sm:h-72 md:h-80 overflow-hidden rounded-t-2xl">
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post._id)}
                      className="flex items-center gap-1.5 group"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all ${
                          post.likes.includes(currentUserId)
                            ? "fill-red-500 text-red-500"
                            : "text-theme-secondary group-hover:text-red-500"
                        }`}
                      />
                      <span className="text-sm font-medium text-theme-secondary">
                        {post.likes.length}
                      </span>
                    </button>
                    <button 
                      onClick={() => toggleCommentBox(post._id)}
                      className="flex items-center gap-1.5 text-theme-secondary hover:text-cyan-500"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.comments.length}</span>
                    </button>
                  </div>

                  {/* Caption - Editable if editing */}
                  {editingPostId === post._id ? (
                    <div className="space-y-3 p-4 themed-card rounded-lg">
                      <textarea
                        value={editPostData.caption}
                        onChange={(e) => setEditPostData({ ...editPostData, caption: e.target.value })}
                        className="input w-full resize-none"
                        rows={3}
                        placeholder="Caption..."
                      />
                      <input
                        type="text"
                        value={editPostData.location}
                        onChange={(e) => setEditPostData({ ...editPostData, location: e.target.value })}
                        className="input w-full"
                        placeholder="Location..."
                      />
                      <input
                        type="text"
                        value={editPostData.tags}
                        onChange={(e) => setEditPostData({ ...editPostData, tags: e.target.value })}
                        className="input w-full"
                        placeholder="Tags (comma-separated)..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdatePost}
                          className="btn"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingPostId(null);
                            setEditPostData({ caption: "", location: "", tags: "" });
                          }}
                          className="themed-card"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.caption && (
                        <div>
                          <p
                            className="text-heading"
                            style={expandedCaptions[post._id]
                              ? {} as any
                              : ({
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                } as any)}
                          >
                            <span className="font-semibold mr-2">{post.author.username}</span>
                            {post.caption}
                          </p>
                          {post.caption.length > 240 && (
                            <button
                              className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 hover:opacity-80"
                              onClick={() => setExpandedCaptions((prev) => ({ ...prev, [post._id]: !prev[post._id] }))}
                            >
                              {expandedCaptions[post._id] ? 'See less' : 'See more'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {post.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-full text-xs text-cyan-600 dark:text-cyan-400"
                              style={{ border: '1px solid var(--border)' }}
                            >
                              #{tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full text-xs text-theme-secondary" style={{ border: '1px solid var(--border)' }}>…</span>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-xs text-theme-secondary">
                        {formatTimestamp(post.createdAt)}
                        {post.captionEditedAt && (
                          <span className="ml-2 italic">(edited)</span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Comments */}
                  {post.comments.length > 0 && (
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      {!expandedComments[post._id] ? (
                        <button
                          onClick={() => toggleComments(post._id)}
                          className="text-sm text-theme-secondary hover:opacity-80 mb-2"
                        >
                          Show comments ({post.comments.length})
                        </button>
                      ) : (
                        <>
                          {post.comments.length > 3 && !showAllComments[post._id] && (
                            <button
                              onClick={() => toggleShowAll(post._id)}
                              className="text-sm text-theme-secondary hover:opacity-80 mb-2"
                            >
                              View all {post.comments.length} comments
                            </button>
                          )}
                          <div className="space-y-3">
                            {(showAllComments[post._id] ? post.comments : post.comments.slice(-3)).map((comment) => (
                              <div key={comment._id} className="flex gap-2 group">
                                <Avatar
                                  src={makeAvatarUrl(comment.user.avatar)}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                  alt={comment.user.username}
                                />
                                <div className="flex-1 min-w-0">
                                  {editingCommentId === comment._id ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={editCommentText}
                                        onChange={(e) => setEditCommentText(e.target.value)}
                                        className="input w-full text-sm resize-none"
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={async () => {
                                            if (!editCommentText.trim()) return;
                                            try {
                                              const res = await axios.put(
                                                `${API}/api/posts/${post._id}/comment/${comment._id}`,
                                                { text: editCommentText },
                                                { headers: { Authorization: `Bearer ${token}` } }
                                              );
                                              setPosts(posts.map((p) => (p._id === post._id ? res.data : p)));
                                              setEditingCommentId(null);
                                              setEditCommentText("");
                                            } catch (err) {
                                              console.error("Failed to edit comment:", err);
                                              alert("Failed to edit comment");
                                            }
                                          }}
                                          className="btn text-xs"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingCommentId(null)}
                                          className="themed-card text-xs"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <span className="font-semibold text-sm text-heading mr-2">
                                            {comment.user.username}
                                          </span>
                                          <div className="text-sm text-theme-secondary">
                                            <div
                                              style={{
                                                display: expandedCommentText[comment._id] ? 'block' : '-webkit-box',
                                                WebkitLineClamp: expandedCommentText[comment._id] ? undefined : 4,
                                                WebkitBoxOrient: 'vertical' as any,
                                                overflow: expandedCommentText[comment._id] ? 'visible' : 'hidden'
                                              }}
                                            >
                                              {comment.text}
                                            </div>
                                            {comment.text && comment.text.length > 200 && (
                                              <button
                                                className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 hover:opacity-80"
                                                onClick={() => setExpandedCommentText((prev) => ({ ...prev, [comment._id]: !prev[comment._id] }))}
                                              >
                                                {expandedCommentText[comment._id] ? 'See less' : 'See more'}
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-theme-secondary">
                                              {formatTimestamp(comment.createdAt)}
                                            </span>
                                            {comment.likes && comment.likes.length > 0 && (
                                              <span className="text-xs text-theme-secondary">
                                                {comment.likes.length} {comment.likes.length === 1 ? 'like' : 'likes'}
                                              </span>
                                            )}
                                            <button
                                              onClick={() => handleLikeComment(post._id, comment._id)}
                                              className={`text-xs font-medium ${
                                                comment.likes?.includes(currentUserId)
                                                  ? 'text-red-500'
                                                  : 'text-theme-secondary hover:text-red-500'
                                              }`}
                                            >
                                              Like
                                            </button>
                                            <button
                                              onClick={() => {
                                                setReplyingTo(comment._id);
                                                setReplyText('');
                                              }}
                                              className="text-xs text-theme-secondary hover:text-cyan-500 font-medium"
                                            >
                                              Reply
                                            </button>
                                            {comment.user._id === currentUserId && (
                                              <>
                                                <button
                                                  onClick={() => startEditComment(comment)}
                                                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-cyan-500 font-medium"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteComment(post._id, comment._id)}
                                                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                                                >
                                                  Delete
                                                </button>
                                              </>
                                            )}
                                            {post.author._id === currentUserId && comment.user._id !== currentUserId && (
                                              <button
                                                onClick={() => handleDeleteComment(post._id, comment._id)}
                                                className="text-xs text-red-500 hover:text-red-600 font-medium"
                                              >
                                                Delete
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {comment.replies && comment.replies.length > 0 && (
                                    <div className="ml-4 mt-2 border-l-2 pl-3" style={{ borderColor: 'var(--border)' }}>
                                      {!expandedReplies[comment._id] ? (
                                        <button
                                          onClick={() => toggleReplies(comment._id)}
                                          className="text-xs text-theme-secondary hover:opacity-80"
                                        >
                                          View replies ({comment.replies.length})
                                        </button>
                                      ) : (
                                        <>
                                          <div className="space-y-2">
                                            {comment.replies.map((reply: any, idx: number) => (
                                              <div key={idx} className="flex gap-2">
                                                <Avatar
                                                  src={makeAvatarUrl(reply.user.avatar)}
                                                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                                  alt={reply.user.username}
                                                />
                                                <div>
                                                  <span className="font-semibold text-xs text-heading mr-1">
                                                    {reply.user.username}
                                                  </span>
                                                  <div className="text-xs text-theme-secondary">
                                                    <div
                                                      style={{
                                                        display: (expandedReplyText[comment._id]?.[idx]) ? 'block' : '-webkit-box',
                                                        WebkitLineClamp: (expandedReplyText[comment._id]?.[idx]) ? undefined : 3,
                                                        WebkitBoxOrient: 'vertical' as any,
                                                        overflow: (expandedReplyText[comment._id]?.[idx]) ? 'visible' : 'hidden'
                                                      }}
                                                    >
                                                      {reply.text}
                                                    </div>
                                                    {reply.text && reply.text.length > 160 && (
                                                      <button
                                                        className="mt-0.5 text-[10px] text-cyan-600 dark:text-cyan-400 hover:opacity-80"
                                                        onClick={() => setExpandedReplyText((prev) => ({
                                                          ...prev,
                                                          [comment._id]: {
                                                            ...(prev[comment._id] || {}),
                                                            [idx]: !((prev[comment._id] || {})[idx])
                                                          }
                                                        }))}
                                                      >
                                                        {(expandedReplyText[comment._id]?.[idx]) ? 'See less' : 'See more'}
                                                      </button>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-theme-secondary mt-0.5">
                                                    {formatTimestamp(reply.createdAt)}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                          <button
                                            onClick={() => toggleReplies(comment._id)}
                                            className="text-xs text-theme-secondary hover:opacity-80 mt-1"
                                          >
                                            Hide replies
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {replyingTo === comment._id && (
                                    <div className="ml-4 mt-2 flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Write a reply..."
                                        className="input flex-1 text-xs"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            handleReplyToComment(post._id, comment._id);
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleReplyToComment(post._id, comment._id)}
                                        className="btn px-3 py-1.5 text-xs"
                                      >
                                        Send
                                      </button>
                                      <button
                                        onClick={() => {
                                          setReplyingTo(null);
                                          setReplyText('');
                                        }}
                                        className="themed-card px-3 py-1.5 text-xs"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            {post.comments.length > 3 && showAllComments[post._id] && (
                              <button
                                onClick={() => toggleShowAll(post._id)}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                              >
                                Show recent
                              </button>
                            )}
                            <button
                              onClick={() => toggleComments(post._id)}
                              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              Hide comments
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Add Comment (hidden until toggled) */}
                  {commentBoxOpen[post._id] && (
                    <div className="flex items-center gap-2 pt-3 mt-1 border-t rounded-xl" style={{ borderColor: 'var(--border)' }}>
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="input flex-1 min-w-0 text-sm"
                        value={commentTexts[post._id] || ""}
                        onChange={(e) =>
                          setCommentTexts({ ...commentTexts, [post._id]: e.target.value })
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleComment(post._id);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleComment(post._id)}
                        className="btn px-3 py-2 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl p-6 w-full max-w-lg" style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-heading">Create Post</h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 hover:opacity-80 rounded-full themed-card"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                placeholder="What's on your mind?"
                className="input w-full resize-none"
                rows={4}
                value={newPost.caption}
                onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
              />

              <input
                type="text"
                placeholder="Location (optional)"
                className="input w-full"
                value={newPost.location}
                onChange={(e) => setNewPost({ ...newPost, location: e.target.value })}
              />

              <input
                type="text"
                placeholder="Tags (comma-separated)"
                className="input w-full"
                value={newPost.tags}
                onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="post-image-upload"
                />
                <label
                  htmlFor="post-image-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 rounded-xl cursor-pointer hover:border-cyan-400 transition-colors"
                  style={{ border: '2px dashed var(--border)' }}
                >
                  {uploadingImage ? (
                    <span className="text-theme-secondary">Uploading...</span>
                  ) : newPost.imageUrl ? (
                    <img
                      src={newPost.imageUrl}
                      alt="Preview"
                      className="max-h-40 rounded-lg"
                    />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-theme-secondary" />
                      <span className="text-theme-secondary">Click to upload image</span>
                    </>
                  )}
                </label>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={uploadingImage}
                className="btn w-full py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? "Uploading..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50 hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
