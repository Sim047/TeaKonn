// backend/src/models/Conversation.js
import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    // participants: user IDs (for 1:1 or group)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],

    // for group chats
    isGroup: { type: Boolean, default: false },
    name: { type: String, default: '' },

    // lastMessage stores reference to last message for preview & sorting
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // Track last read timestamp per user
    lastReadAt: {
      type: Map,
      of: Date,
      default: new Map(),
    },

    // optional metadata
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// index participants for faster lookups
ConversationSchema.index({ participants: 1, updatedAt: -1 });

export default mongoose.model('Conversation', ConversationSchema);
