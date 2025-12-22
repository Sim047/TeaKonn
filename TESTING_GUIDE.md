# Quick Test Guide - Booking & Participants System

## 🧪 How to Test the New Features

### Prerequisites
- Backend deployed and running (Railway)
- Frontend deployed and running (Vercel)
- At least 2 user accounts (one organizer, one participant)

---

## Test 1: Create Event with Approval Required

### Steps:
1. Log in as **Organizer**
2. Navigate to **My Events** page
3. Click **"Create New Event"**
4. Fill in event details:
   - Title: "Test Basketball Game"
   - Sport: "Basketball"
   - Date: Tomorrow
   - Location: "Community Center"
   - Max Participants: 10
   - **Enable "Requires Approval"**
   - Set as "Free" event
5. Click **"Create Event"**
6. Verify event appears in your list

**Expected Result**: ✅ Event created with `requiresApproval: true`

---

## Test 2: User Requests to Join Event

### Steps:
1. Log out and log in as **Participant User**
2. Navigate to **Discover** page
3. Select **"Sports & Events"** category
4. Find "Test Basketball Game" event
5. Click on the event card
6. EventDetailModal opens showing event details
7. Click **"Join Event"** button
8. Alert message: "Join request submitted! Waiting for organizer approval."

**Expected Result**: ✅ Join request created with status "pending"

---

## Test 3: Organizer Views Pending Requests

### Steps:
1. Log in as **Organizer**
2. Navigate to **My Events** page
3. Find "Test Basketball Game" event
4. Notice participant count shows: "0 / 10 participants"
5. Click **"View"** button next to participant count
6. EventParticipantsModal opens
7. Notice two tabs: "Confirmed (0)" and "Pending Approval (1)"
8. Click **"Pending Approval"** tab
9. See participant's join request with:
   - Avatar and username
   - "Requested X minutes ago"
   - Approve and Reject buttons

**Expected Result**: ✅ Pending request visible in organizer's view

---

## Test 4: Organizer Approves Join Request

### Steps:
1. In the **"Pending Approval"** tab
2. Click **"Approve"** button next to the participant
3. Alert: "Join request approved"
4. Notice request disappears from Pending tab
5. Click **"Confirmed"** tab
6. See participant now appears in confirmed list
7. Notice count updated: "Confirmed (1)"
8. Close modal
9. Notice event card now shows: "1 / 10 participants"

**Expected Result**: ✅ User approved and added to participants

---

## Test 5: Participant Views Other Attendees

### Steps:
1. Log in as **Participant User**
2. Navigate to **Discover** page
3. Click on "Test Basketball Game" event
4. EventDetailModal shows participant count
5. Click **"View All"** button next to "Participants (1)"
6. EventParticipantsModal opens
7. See all confirmed participants including yourself
8. Notice your name shows "You" label
9. Can click message button to contact other participants
10. Can click avatar to view profile

**Expected Result**: ✅ Participants can see other confirmed attendees

---

## Test 6: Export Participant List (Organizer)

### Steps:
1. Log in as **Organizer**
2. Navigate to **My Events** page
3. Find event with participants
4. Click **"View"** button
5. In EventParticipantsModal header, click **download icon**
6. CSV file downloads: `Test_Basketball_Game_participants.csv`
7. Open CSV file
8. Verify columns: Name, Email, Username, Status
9. Verify data is correct

**Expected Result**: ✅ CSV export successful with correct data

---

## Test 7: Reject Join Request

### Steps:
1. Have another user request to join the event
2. Log in as **Organizer**
3. Open EventParticipantsModal for the event
4. Switch to **"Pending Approval"** tab
5. Click **"Reject"** button next to the new request
6. Alert: "Request rejected successfully!"
7. Request disappears from Pending tab
8. Request status in database changed to "rejected"

**Expected Result**: ✅ Request rejected, not added to participants

---

## Test 8: Paid Event with Transaction Code

### Steps:
1. Create new event as **Organizer**:
   - Set pricing type: "Paid"
   - Amount: 25
   - Currency: USD
   - Add payment instructions
   - Enable "Requires Approval"
2. Log in as **Participant**
3. Click "Join" on paid event
4. Prompted: "This is a paid event (USD 25). Enter transaction code:"
5. Enter transaction code: "TXN-12345"
6. Click OK
7. Optional: Enter payment details
8. Request submitted
9. **Organizer** views Pending tab
10. See transaction code "TXN-12345" displayed
11. Approve request after verifying payment

**Expected Result**: ✅ Transaction code captured and displayed to organizer

---

## Test 9: Capacity Limit Reached

### Steps:
1. Create event with max capacity: 2
2. Have 2 users join and get approved
3. Event shows: "2 / 2 participants"
4. Have 3rd user try to join
5. Error message: "Event is at full capacity"

**Expected Result**: ✅ Capacity enforced, 3rd user cannot join

---

## Test 10: Multiple Pending Requests

### Steps:
1. Create event with approval required
2. Have 5 different users request to join
3. **Organizer** views Pending tab
4. See all 5 requests listed with:
   - User avatars
   - Usernames
   - Request times
   - Transaction codes (if paid)
5. Approve 3 users
6. Reject 2 users
7. Verify counts: "Confirmed (3)", "Pending (0)"

**Expected Result**: ✅ Bulk management of multiple requests works

---

## 🐛 Debugging Tips

### If requests don't show up:
```bash
# Check backend logs for:
=== FETCHING EVENT REQUESTS ===
Organizer ID: <id>
Events with join requests: <count>
```

### If approve/reject fails:
```bash
# Check backend response:
POST /api/events/:id/approve-request/:requestId
Response: { message: "Join request approved", event: {...} }
```

### If participants modal is empty:
- Check browser console for errors
- Verify event has `joinRequests` array populated
- Check API response includes `joinRequests.user` data

---

## ✅ Success Criteria

All tests should pass with:
- [x] Join requests created correctly
- [x] Pending tab shows requests
- [x] Approve adds to participants
- [x] Reject updates status
- [x] CSV export works
- [x] Capacity limits enforced
- [x] Transaction codes captured
- [x] Socket notifications sent
- [x] UI updates in real-time

---

## 📊 Expected Database State

### After Test 1-4:
```javascript
{
  title: "Test Basketball Game",
  requiresApproval: true,
  participants: [ObjectId("user1")],
  joinRequests: [
    {
      _id: ObjectId("request1"),
      user: ObjectId("user1"),
      status: "approved",
      transactionCode: "FREE",
      requestedAt: Date
    }
  ],
  capacity: {
    max: 10,
    current: 1
  }
}
```

### After Test 7 (with rejection):
```javascript
{
  joinRequests: [
    {
      _id: ObjectId("request1"),
      user: ObjectId("user1"),
      status: "approved",
      ...
    },
    {
      _id: ObjectId("request2"),
      user: ObjectId("user2"),
      status: "rejected",  // ← Rejected request
      ...
    }
  ]
}
```

---

## 🎯 Key Features to Verify

### Organizer View:
- ✅ See "View" button on events with participants
- ✅ Access EventParticipantsModal
- ✅ Switch between Confirmed and Pending tabs
- ✅ Approve/Reject requests with one click
- ✅ Export participant list to CSV
- ✅ See transaction codes for paid events

### Participant View:
- ✅ See "View All" button in EventDetailModal
- ✅ Access EventParticipantsModal
- ✅ View all confirmed participants (only Confirmed tab visible)
- ✅ Click to view profiles
- ✅ Message other participants
- ✅ See self labeled as "You"

---

## 🚀 Ready to Test!

The system is fully deployed and ready for testing. Start with Test 1 and work through all scenarios to verify complete functionality.

**Happy Testing! 🎉**
