// backend/src/routes/posts.js
import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Get all posts (feed) with pagination
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // Optional field selection to slim payloads in preview lists
    const fieldsParam = String(req.query.fields || "").trim();
    const selectFields = fieldsParam ? fieldsParam.split(/[,\s]+/).filter(Boolean).join(" ") : null;

    const baseQuery = Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (selectFields) baseQuery.select(selectFields);

    const posts = await baseQuery
      .populate("author", "username avatar email")
      .populate("comments.user", "username avatar");

    const total = await Post.countDocuments();

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total,
    });
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get posts by specific user
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const q = { author: req.params.userId };
    const search = String(req.query.search || '').trim();
    if (search) {
      q.$or = [
        { title: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    // Optional field selection to slim payloads in preview lists
    const fieldsParam = String(req.query.fields || "").trim();
    const selectFields = fieldsParam ? fieldsParam.split(/[,\s]+/).filter(Boolean).join(" ") : null;

    const baseQuery = Post.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (selectFields) baseQuery.select(selectFields);

    const [posts, total] = await Promise.all([
      baseQuery
        .populate("author", "username avatar email")
        .populate("comments.user", "username avatar"),
      Post.countDocuments(q),
    ]);

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total,
    });
  } catch (err) {
    console.error("Get user posts error:", err);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

// Get single post
router.get("/:id", auth, async (req, res) => {
  try {
    const fieldsParam = String(req.query.fields || "").trim();
    const selectFields = fieldsParam ? fieldsParam.split(/[,\s]+/).filter(Boolean).join(" ") : null;
    const byIdQuery = Post.findById(req.params.id);
    if (selectFields) byIdQuery.select(selectFields);
    const post = await byIdQuery
      .populate("author", "username avatar email")
      .populate("comments.user", "username avatar")
      .populate("participants", "username avatar");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});
// Join a post (used for Other Events)
router.post("/:id/join", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.participants = post.participants || [];
    const already = post.participants.some((p) => String(p) === String(req.user.id));
    if (already) return res.status(400).json({ error: "You have already joined" });

    post.participants.push(req.user.id);
    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("participants", "username avatar");

    const io = req.app.get("io");
    if (io) io.emit("post_joined", { postId: post._id, userId: req.user.id });

    res.json({ success: true, post });
  } catch (err) {
    console.error("Join post error:", err);
    res.status(500).json({ error: "Failed to join" });
  }
});

// Leave a post
router.post("/:id/leave", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.participants = post.participants || [];
    const idx = post.participants.findIndex((p) => String(p) === String(req.user.id));
    if (idx === -1) return res.status(400).json({ error: "Not a participant" });

    post.participants.splice(idx, 1);
    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("participants", "username avatar");

    const io = req.app.get("io");
    if (io) io.emit("post_left", { postId: post._id, userId: req.user.id });

    res.json({ success: true, post });
  } catch (err) {
    console.error("Leave post error:", err);
    res.status(500).json({ error: "Failed to leave" });
  }
});

// Create new post
router.post("/", auth, async (req, res) => {
  try {
    const { title, caption, imageUrl, tags, location, eventDate } = req.body;

    const post = new Post({
      author: req.user.id,
      title: title || "",
      caption,
      imageUrl,
      tags: tags || [],
      location: location || "",
      eventDate: eventDate ? new Date(eventDate) : undefined,
    });

    await post.save();
    await post.populate("author", "username avatar email");

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    if (io) {
      io.emit("new_post", post);
    }

    res.status(201).json(post);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Update post
router.put("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { title, caption, tags, location, eventDate } = req.body;
      if (title !== undefined) post.title = title;
    
    // Track if caption was actually changed
    if (caption !== undefined && caption !== post.caption) {
      post.caption = caption;
      post.captionEditedAt = new Date();
    }
    if (tags !== undefined) post.tags = tags;
    if (location !== undefined) post.location = location;
    if (eventDate !== undefined) post.eventDate = eventDate ? new Date(eventDate) : undefined;

    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("comments.user", "username avatar");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("post_updated", post);
    }

    res.json(post);
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Delete post
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await post.deleteOne();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("post_deleted", { postId: req.params.id });
    }

    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Like/Unlike post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userId = req.user.id;
    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex === -1) {
      // Like
      post.likes.push(userId);
    } else {
      // Unlike
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("comments.user", "username avatar");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("post_liked", { postId: post._id, likes: post.likes });
    }

    res.json(post);
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ error: "Failed to like post" });
  }
});

// Like/Unlike comment (MUST come before generic comment routes)
router.post("/:id/comment/:commentId/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Initialize likes array if it doesn't exist
    if (!comment.likes) {
      comment.likes = [];
    }

    const userId = req.user.id;
    const likeIndex = comment.likes.indexOf(userId);

    if (likeIndex === -1) {
      // Like
      comment.likes.push(userId);
    } else {
      // Unlike
      comment.likes.splice(likeIndex, 1);
    }

    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("comments.user", "username avatar");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("comment_liked", { postId: post._id, commentId: req.params.commentId, likes: comment.likes });
    }

    res.json(post);
  } catch (err) {
    console.error("Like comment error:", err);
    res.status(500).json({ error: "Failed to like comment" });
  }
});

// Reply to comment (MUST come before generic comment routes)
router.post("/:id/comment/:commentId/reply", auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Reply text is required" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Initialize replies array if it doesn't exist
    if (!comment.replies) {
      comment.replies = [];
    }

    comment.replies.push({
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("comments.user", "username avatar");
    await post.populate("comments.replies.user", "username avatar");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("comment_replied", { postId: post._id, commentId: req.params.commentId });
    }

    res.json(post);
  } catch (err) {
    console.error("Reply to comment error:", err);
    res.status(500).json({ error: "Failed to reply to comment" });
  }
});

// Add comment
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = {
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date(),
    };

    post.comments.push(comment);
    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("comments.user", "username avatar");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("post_commented", { postId: post._id, comment: post.comments[post.comments.length - 1] });
    }

    res.json(post);
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Edit comment
router.put("/:id/comment/:commentId", auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user is the comment author
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    comment.text = text.trim();
    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("comments.user", "username avatar");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("post_comment_edited", { postId: post._id, comment });
    }

    res.json(post);
  } catch (err) {
    console.error("Edit comment error:", err);
    res.status(500).json({ error: "Failed to edit comment" });
  }
});

// Delete comment
router.delete("/:id/comment/:commentId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user is the comment author or post author
    if (comment.user.toString() !== req.user.id && post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    comment.deleteOne();
    await post.save();
    await post.populate("author", "username avatar email");
    await post.populate("comments.user", "username avatar");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("post_comment_deleted", { postId: post._id, commentId: req.params.commentId });
    }

    res.json(post);
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
