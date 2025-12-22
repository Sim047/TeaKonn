// Test script for booking system endpoints
// Run with: node test-booking-endpoints.js

import axios from 'axios';

const API = process.env.API_URL || 'http://localhost:5000';

// Replace with actual tokens from your test users
const ORGANIZER_TOKEN = 'your_organizer_token_here';
const USER_TOKEN = 'your_user_token_here';

async function testBookingSystem() {
  console.log('🧪 Testing Booking System Endpoints\n');

  try {
    // 1. Test: Get all bookings
    console.log('1️⃣ Testing GET /api/bookings');
    const bookingsRes = await axios.get(`${API}/api/bookings`, {
      headers: { Authorization: `Bearer ${USER_TOKEN}` }
    });
    console.log(`✅ Found ${bookingsRes.data.bookings.length} bookings`);
    console.log('Sample booking:', bookingsRes.data.bookings[0]);

    // 2. Test: Get pending approvals (as organizer)
    console.log('\n2️⃣ Testing GET /api/bookings/pending-approvals/list');
    const pendingRes = await axios.get(`${API}/api/bookings/pending-approvals/list`, {
      headers: { Authorization: `Bearer ${ORGANIZER_TOKEN}` }
    });
    console.log(`✅ Found ${pendingRes.data.bookings.length} pending approvals`);

    if (pendingRes.data.bookings.length > 0) {
      const testBookingId = pendingRes.data.bookings[0]._id;
      
      // 3. Test: Approve booking
      console.log('\n3️⃣ Testing POST /api/bookings/:id/approve');
      const approveRes = await axios.post(
        `${API}/api/bookings/${testBookingId}/approve`,
        { approved: true },
        { headers: { Authorization: `Bearer ${ORGANIZER_TOKEN}` } }
      );
      console.log('✅ Booking approved:', approveRes.data.approvalStatus);

      // 4. Test: Verify payment (if paid booking)
      if (approveRes.data.pricing.amount > 0) {
        console.log('\n4️⃣ Testing POST /api/bookings/:id/verify-payment');
        const verifyRes = await axios.post(
          `${API}/api/bookings/${testBookingId}/verify-payment`,
          { verified: true, notes: 'Payment confirmed via test' },
          { headers: { Authorization: `Bearer ${ORGANIZER_TOKEN}` } }
        );
        console.log('✅ Payment verified:', verifyRes.data.paymentVerified);
        console.log('Final status:', verifyRes.data.status);
      }
    }

    console.log('\n✨ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Instructions
console.log('📋 Setup Instructions:');
console.log('1. Make sure backend server is running on port 5000');
console.log('2. Replace ORGANIZER_TOKEN and USER_TOKEN with actual JWT tokens');
console.log('3. Create a test event and have a user join it first');
console.log('4. Run: node test-booking-endpoints.js\n');

// Uncomment to run:
// testBookingSystem();

export default testBookingSystem;
