// Quick test script to check if approval system works
import axios from 'axios';

const API = 'http://localhost:5000';

async function testApprovalSystem() {
  try {
    // You need to replace these with actual values from your database
    const coachToken = 'YOUR_COACH_JWT_TOKEN_HERE';
    
    console.log('Testing pending approvals endpoint...');
    const res = await axios.get(`${API}/api/bookings/pending-approvals/list`, {
      headers: { Authorization: `Bearer ${coachToken}` }
    });
    
    console.log('Response:', res.data);
    console.log('Number of pending approvals:', res.data.count);
    
    if (res.data.bookings && res.data.bookings.length > 0) {
      console.log('\nPending bookings:');
      res.data.bookings.forEach((booking, i) => {
        console.log(`${i + 1}. ${booking.client.username} - ${booking.event?.title || 'Session'}`);
      });
    } else {
      console.log('\nNo pending approvals found.');
      console.log('To test this feature:');
      console.log('1. Create an event as a coach');
      console.log('2. Book that event as a different user');
      console.log('3. The booking will appear here with pending-approval status');
    }
    
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testApprovalSystem();
