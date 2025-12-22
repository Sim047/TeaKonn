# Event Booking & Participants Management System - Complete Documentation

## Overview
Fully functional event booking, approval, and participant management system for the TeaKonn platform. Organizers can now manage join requests and view/export participant lists, while participants can see other attendees.

---

## ✅ Features Implemented

### 1. **Event Participants Modal** (`EventParticipantsModal.tsx`)
   - **Dual Tab Interface**:
     - **Confirmed Tab**: Shows all confirmed participants
     - **Pending Approval Tab**: Shows pending join requests (organizer only)
   
   - **Participant Management**:
     - View all participants with avatars and usernames
     - Click participant to view profile
     - Message any participant directly
     - Export participant list to CSV
   
   - **Approval Workflow**:
     - Approve/Reject pending join requests
     - View transaction codes for paid events
     - Real-time updates after approval/rejection
   
   - **Smart Display**:
     - Shows capacity (e.g., "15 / 20 Confirmed")
     - Shows pending count in yellow badge
     - Distinguishes organizer and current user
     - Responsive grid layout

### 2. **Backend Improvements**

   **Event Routes** (`backend/src/routes/events.js`):
   - ✅ GET `/api/events` - Populate `joinRequests.user` in list
   - ✅ GET `/api/events/:id` - Populate `joinRequests.user` in detail
   - ✅ POST `/api/events/:id/approve-request/:requestId` - Approve join request
   - ✅ POST `/api/events/:id/reject-request/:requestId` - Reject join request
   - ✅ GET `/api/events/my-events-requests` - Fetch pending requests for organizer

   **Key Changes**:
   ```javascript
   // Now populates join requests with full user data
   .populate("joinRequests.user", "username avatar email")
   
   // Approve flow:
   // 1. Validates organizer
   // 2. Checks capacity
   // 3. Updates request.status = "approved"
   // 4. Adds user to participants array
   // 5. Increments capacity.current
   // 6. Emits socket notification
   ```

### 3. **Discover Page Integration** (`Discover.tsx`)

   **New Handlers**:
   ```typescript
   handleApproveRequest(eventId, requestId) // Approve join request
   handleRejectRequest(eventId, requestId)  // Reject join request
   ```

   **New State**:
   ```typescript
   const [participantsModalEvent, setParticipantsModalEvent] = useState<Event | null>(null);
   ```

   **EventDetailModal Updates**:
   - Added "View All" button next to participant count
   - Opens EventParticipantsModal when clicked
   - Passes approve/reject handlers to modal

### 4. **My Events Page Integration** (`MyEvents.tsx`)

   **New Features**:
   - "View" button next to participant count in event cards
   - Shows button only if event has participants or pending requests
   - Opens EventParticipantsModal with full management capabilities
   - Export participants list to CSV

   **New Handlers**:
   ```typescript
   handleApproveRequest(eventId, requestId)
   handleRejectRequest(eventId, requestId)
   handleMessageUser(userId)
   handleViewProfile(userId)
   ```

### 5. **EventDetailModal Updates**

   **New Prop**:
   ```typescript
   onViewParticipants?: (event: Event) => void
   ```

   **UI Enhancement**:
   - "View All" button next to "Participants (X)" heading
   - Displayed when participants exist
   - Closes detail modal and opens participants modal

---

## 📋 User Flows

### Flow 1: User Joins Event (Requires Approval)
1. User clicks "Join" on event in Discover page
2. If paid event, prompted for transaction code
3. System creates join request with status "pending"
4. User sees message: "Join request submitted! Waiting for organizer approval."
5. Request appears in organizer's "Pending Approval" tab

### Flow 2: Organizer Approves Join Request
1. Organizer views their event in MyEvents page
2. Clicks "View" button next to participant count
3. Switches to "Pending Approval" tab
4. Sees requestor's name, avatar, transaction code (if paid)
5. Clicks "Approve" button
6. System:
   - Updates request.status = "approved"
   - Adds user to participants array
   - Increments capacity.current
   - Emits socket notification to user
7. User appears in "Confirmed" tab

### Flow 3: Organizer Exports Participant List
1. Organizer opens EventParticipantsModal
2. Clicks "Export" icon in header
3. CSV file downloads with columns:
   - Name
   - Email
   - Username
   - Status (Confirmed/Pending)

### Flow 4: Participant Views Other Attendees
1. User clicks on event in Discover page
2. EventDetailModal opens showing event details
3. Clicks "View All" button next to participant count
4. EventParticipantsModal opens showing all confirmed participants
5. Can click on any participant to view their profile
6. Can message any participant directly

---

## 🎨 UI/UX Highlights

### EventParticipantsModal Design
- **Gradient Header**: Cyan to purple gradient
- **Capacity Badge**: Shows "15 / 20 Confirmed" in white
- **Pending Badge**: Shows "3 Pending" in yellow
- **Tab System**: Toggle between Confirmed and Pending
- **Export Button**: Download icon in header (organizer only)
- **Participant Cards**: 2-column grid on mobile, 4-column on desktop
- **Approval Actions**: Green "Approve" and Red "Reject" buttons
- **Transaction Info**: Shows transaction code for paid events

### Visual Indicators
- **Organizer**: Labeled as "Organizer" under name
- **Current User**: Labeled as "You" under name
- **Other Participants**: Labeled as "Participant"
- **Clickable Avatars**: Hover effect with scale transform
- **Message Button**: Cyan-themed icon button

---

## 🔧 Technical Details

### Event Model Schema
```javascript
{
  requiresApproval: { type: Boolean, default: false },
  joinRequests: [{
    user: { type: ObjectId, ref: "User" },
    transactionCode: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending" 
    }
  }],
  participants: [{ type: ObjectId, ref: "User" }],
  capacity: {
    max: { type: Number, default: 20 },
    current: { type: Number, default: 0 }
  },
  pricing: {
    type: { type: String, enum: ["free", "paid"], default: "free" },
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "USD" },
    paymentInstructions: { type: String, maxlength: 1000 }
  }
}
```

### API Endpoints

**Event Management**:
```
GET    /api/events                    - List all events (populate joinRequests)
GET    /api/events/:id                - Get single event (populate joinRequests)
POST   /api/events/:id/join           - Join event / create join request
POST   /api/events/:id/approve-request/:requestId - Approve request
POST   /api/events/:id/reject-request/:requestId  - Reject request
GET    /api/events/my-events-requests - Get pending requests for organizer
GET    /api/events/my/created         - Get organizer's created events
```

### Socket Events
- `join_request_approved` - Emitted when organizer approves request
- `join_request_rejected` - Emitted when organizer rejects request
- Payload: `{ eventId, eventTitle, userId }`

### CSV Export Format
```csv
Name,Email,Username,Status
John Doe,john@example.com,johndoe,Confirmed
Jane Smith,jane@example.com,janesmith,Pending
```

---

## 🧪 Testing Checklist

### Test Scenario 1: Free Event with Instant Join
- [x] Create free event with `requiresApproval: false`
- [x] User clicks "Join"
- [x] User immediately added to participants
- [x] No join request created
- [x] Capacity increments

### Test Scenario 2: Paid Event with Approval Required
- [x] Create paid event with `requiresApproval: true`
- [x] User clicks "Join"
- [x] Prompted for transaction code
- [x] Join request created with status "pending"
- [x] Request shows in organizer's Pending tab
- [x] Organizer approves
- [x] User added to participants
- [x] User removed from Pending tab

### Test Scenario 3: Capacity Management
- [x] Create event with max capacity 5
- [x] 5 users join
- [x] 6th user tries to join
- [x] Error: "Event is at full capacity"

### Test Scenario 4: Export Participants
- [x] Event has 10 confirmed participants
- [x] Event has 3 pending requests
- [x] Organizer clicks Export
- [x] CSV contains 13 rows (all participants + pending)

### Test Scenario 5: Message Participant
- [x] Participant views EventParticipantsModal
- [x] Clicks message icon on another participant
- [x] Message handler triggered with userId

---

## 🚀 Deployment Notes

### Environment Variables Required
```env
# Backend
MONGO_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
FRONTEND_URL=<your_vercel_url>

# Frontend
VITE_API_URL=<your_backend_url>
```

### Build Commands
```bash
# Backend (Railway)
npm install
npm start

# Frontend (Vercel)
npm install
npm run build
```

### Database Migration
No migration required. The Event model already has all necessary fields:
- `requiresApproval` defaults to `false`
- `joinRequests` defaults to empty array
- `capacity` has default values

Existing events will work without changes.

---

## 📚 Component API Reference

### EventParticipantsModal Props
```typescript
interface EventParticipantsModalProps {
  event: Event | null;              // Event with participants and joinRequests
  onClose: () => void;              // Close modal handler
  onMessage: (userId: string) => void;  // Message user handler
  onViewProfile?: (userId: string) => void;  // View profile handler
  onApproveRequest?: (eventId: string, requestId: string) => void;  // Approve handler
  onRejectRequest?: (eventId: string, requestId: string) => void;   // Reject handler
  currentUserId?: string;           // Current logged-in user ID
  isOrganizer?: boolean;            // Is current user the organizer
}
```

### EventDetailModal New Props
```typescript
interface EventDetailModalProps {
  // ... existing props
  onViewParticipants?: (event: Event) => void;  // Open participants modal
}
```

---

## 🎯 Future Enhancements

### Potential Improvements
1. **Bulk Actions**: Select multiple requests to approve/reject at once
2. **Filters**: Filter participants by join date, status, etc.
3. **Search**: Search participants by name/username
4. **Advanced Export**: Export to Excel with formatting
5. **Email Notifications**: Auto-email approved/rejected users
6. **QR Code Check-in**: Generate QR codes for event check-in
7. **Attendance Tracking**: Mark participants as "attended"
8. **Waitlist Management**: Auto-promote from waitlist when approved user cancels
9. **Payment Verification**: Admin interface to verify transaction codes
10. **Analytics Dashboard**: Track approval rates, attendance rates, etc.

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Join requests not showing in Pending tab
- **Solution**: Ensure `requiresApproval: true` on event
- Check backend logs for "=== FETCHING EVENT REQUESTS ===" output

**Issue**: "Event not found" when approving request
- **Solution**: Ensure event ID and request ID are valid ObjectIds
- Check if request was already processed (status !== "pending")

**Issue**: CSV export shows undefined emails
- **Solution**: Email field may be private. Backend needs to populate email field explicitly.

**Issue**: Socket notification not received
- **Solution**: Ensure `io` is set on Express app: `app.set('io', io)`
- Check frontend socket connection status

---

## ✅ Completion Summary

### Files Created
1. ✅ `frontend/src/components/EventParticipantsModal.tsx` (323 lines)

### Files Modified
1. ✅ `frontend/src/components/EventDetailModal.tsx`
   - Added `onViewParticipants` prop
   - Added "View All" button next to participant count

2. ✅ `frontend/src/pages/Discover.tsx`
   - Added `participantsModalEvent` state
   - Added `handleApproveRequest` function
   - Added `handleRejectRequest` function
   - Integrated EventParticipantsModal

3. ✅ `frontend/src/pages/MyEvents.tsx`
   - Added "View" button to event cards
   - Added approve/reject handlers
   - Integrated EventParticipantsModal

4. ✅ `backend/src/routes/events.js`
   - Populated `joinRequests.user` in GET / route
   - Populated `joinRequests.user` in GET /:id route
   - Existing approve/reject routes verified

### System Status
- ✅ All routes functional
- ✅ No TypeScript errors
- ✅ All components integrated
- ✅ Socket notifications working
- ✅ CSV export implemented
- ✅ Ready for deployment

---

## 🎉 Success Metrics

### Before Implementation
- ❌ Organizers couldn't see pending join requests
- ❌ No way to approve/reject requests from UI
- ❌ Participants couldn't see other attendees
- ❌ No participant list export functionality

### After Implementation
- ✅ Full-featured participant management modal
- ✅ Dual-tab interface for confirmed/pending
- ✅ One-click approve/reject with real-time updates
- ✅ CSV export for participant lists
- ✅ View profiles and message participants
- ✅ Works for both organizers and regular participants

**Result**: Complete, production-ready booking and participant management system! 🚀
