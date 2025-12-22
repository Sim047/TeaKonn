import express from 'express';
import auth from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * GET /api/conversations
 * returns conversations for current user (populated participants + lastMessage + unread count)
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    let convs = await Conversation.find({ participants: userId })
      .populate('participants', 'username avatar email')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .sort({ updatedAt: -1 });

    // BACKFILL: If user has messages in objectId-like rooms without a Conversation doc,
    // create lightweight conversations so their history appears in lists.
    if (!convs || convs.length === 0) {
      try {
        // Find recent rooms the user participated in (by sender/readBy/deliveredTo)
        const recentRooms = await Message.aggregate([
          {
            $match: {
              hiddenFor: { $ne: new Conversation()._id.constructor(userId) },
              $or: [
                { sender: new Conversation()._id.constructor(userId) },
                { readBy: new Conversation()._id.constructor(userId) },
                { deliveredTo: new Conversation()._id.constructor(userId) },
              ],
            },
          },
          // only consider objectId-like rooms (potential conversation ids)
          { $match: { room: { $regex: /^[0-9a-fA-F]{24}$/ } } },
          {
            $group: {
              _id: '$room',
              lastAt: { $max: '$createdAt' },
            },
          },
          { $sort: { lastAt: -1 } },
          { $limit: 50 },
        ]);

        for (const r of recentRooms) {
          const roomId = String(r._id);
          const existing = await Conversation.findById(roomId);
          if (existing) continue;

          // Gather participants from messages in this room
          const msgs = await Message.find({ room: roomId }).select('sender readBy deliveredTo createdAt').sort({ createdAt: -1 }).limit(200);
          const ids = new Set();
          for (const m of msgs) {
            if (m.sender) ids.add(String(m.sender));
            (m.readBy || []).forEach((u) => ids.add(String(u)));
            (m.deliveredTo || []).forEach((u) => ids.add(String(u)));
          }
          ids.add(String(userId));
          const parts = Array.from(ids);
          if (parts.length < 2) continue;

          const lastMsg = msgs[0];
          try {
            await Conversation.create({
              _id: roomId,
              participants: parts,
              isGroup: parts.length > 2,
              name: '',
              lastMessage: lastMsg ? lastMsg._id : null,
              updatedAt: lastMsg ? lastMsg.createdAt : new Date(),
            });
          } catch (e) {
            // ignore duplicate key or invalid id
          }
        }

        // re-fetch with newly created conversations
        convs = await Conversation.find({ participants: userId })
          .populate('participants', 'username avatar email')
          .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username avatar' } })
          .sort({ updatedAt: -1 });
      } catch (e) {
        console.warn('[conversations/get] backfill failed', e?.message || e);
      }
    }

    // Calculate unread count for each conversation and filter out empty ones
    const convsWithUnread = await Promise.all(
      convs.map(async (conv) => {
        const lastReadAt = conv.lastReadAt?.get(userId.toString()) || new Date(0);
        
        // Count visible messages (not hidden for this user)
        const totalVisibleMessages = await Message.countDocuments({
          room: conv._id.toString(),
          hiddenFor: { $ne: userId },
        });
        
        // Count unread messages (after lastReadAt, not hidden, not sent by current user)
        const unreadCount = await Message.countDocuments({
          room: conv._id.toString(),
          createdAt: { $gt: lastReadAt },
          sender: { $ne: userId },
          hiddenFor: { $ne: userId },
        });

        return {
          ...conv.toObject(),
          unreadCount,
          totalVisibleMessages,
        };
      })
    );

    // Do NOT filter out conversations with no visible messages — legacy data may
    // have messages stored under different room keys. Return all; frontend can decide.
    console.log(`[conversations/get] User ${userId}: ${convs.length} total`);
    console.log(`[conversations/get] Total unread: ${convsWithUnread.reduce((sum, c) => sum + c.unreadCount, 0)}`);
    res.json(convsWithUnread);
  } catch (err) {
    console.error('[conversations/get]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/conversations
 * body: { partnerId }  (for 1:1)
 * creates or returns existing 1:1 conversation
 */
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId, name, isGroup, participants } = req.body;

    if (!isGroup) {
      if (!partnerId) return res.status(400).json({ message: 'partnerId required' });

      // find existing 1:1 conversation
      let conv = await Conversation.findOne({
        participants: { $all: [userId, partnerId] },
        isGroup: false,
      });

      if (!conv) {
        conv = await Conversation.create({
          participants: [userId, partnerId],
          isGroup: false,
        });
      }

      const populated = await Conversation.findById(conv._id).populate('participants', 'username avatar email');
      return res.json(populated);
    } else {
      // create a group conversation
      const groupParticipants = (participants || []).map((p) => p);
      if (!Array.isArray(groupParticipants) || groupParticipants.length < 2) {
        return res.status(400).json({ message: 'participants required for group' });
      }

      const conv = await Conversation.create({
        participants: groupParticipants,
        isGroup: true,
        name: name || 'Group',
      });

      const populated = await Conversation.findById(conv._id).populate('participants', 'username avatar email');
      return res.json(populated);
    }
  } catch (err) {
    console.error('[conversations/post]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/conversations/:id/messages
 * returns messages for the conversation room ID (excluding hidden ones for current user)
 */
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    // Only return messages not hidden for this user
    const msgs = await Message.find({ 
      room: convId,
      hiddenFor: { $ne: userId },
    })
      .populate('sender', 'username avatar')
      .populate('replyTo')
      .populate('readBy', 'username')
      .sort({ createdAt: 1 })
      .limit(2000);

    res.json(msgs);
  } catch (err) {
    console.error('[conversations/messages/get]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/conversations/:id
 * deletes conversation for current user only (removes them from participants, hides messages)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    // Hide all messages in this conversation for the current user
    await Message.updateMany(
      { room: convId },
      { $addToSet: { hiddenFor: userId } }
    );

    // Remove current user from conversation participants
    const conv = await Conversation.findByIdAndUpdate(
      convId,
      { $pull: { participants: userId } },
      { new: true }
    );

    // If no participants left, delete the conversation completely
    if (conv && conv.participants.length === 0) {
      await Conversation.findByIdAndDelete(convId);
      await Message.deleteMany({ room: convId });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[conversations/delete]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/conversations/:id/messages
 * clear messages only, keep conversation (hide for current user only)
 */
router.delete('/:id/messages', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;
    
    // Add current user to hiddenFor array for all messages in this conversation
    await Message.updateMany(
      { room: convId },
      { $addToSet: { hiddenFor: userId } }
    );

    // Update lastReadAt to mark as read
    await Conversation.findByIdAndUpdate(convId, {
      [`lastReadAt.${userId}`]: new Date(),
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('[conversations/clearMessages]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/conversations/:id/read
 * mark conversation as read for current user
 */
router.post('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    // Update lastReadAt timestamp for this user
    await Conversation.findByIdAndUpdate(convId, {
      [`lastReadAt.${userId}`]: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[conversations/markRead]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;