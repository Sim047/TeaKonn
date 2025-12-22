// Quick test script to check if bookings exist in database
// Run: node test-bookings-exist.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

async function checkBookings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    // Import models
    const Booking = (await import('./src/models/Booking.js')).default;
    const Event = (await import('./src/models/Event.js')).default;
    const User = (await import('./src/models/User.js')).default;

    // Count total bookings
    const totalBookings = await Booking.countDocuments();
    console.log(`📊 Total bookings in database: ${totalBookings}`);

    if (totalBookings === 0) {
      console.log('\n❌ NO BOOKINGS FOUND!');
      console.log('\n💡 This means bookings are NOT being created when users join events.');
      console.log('   Check if the event join endpoint is working.\n');
    } else {
      console.log('\n✅ Bookings exist! Checking details...\n');

      // Get all bookings with details
      const bookings = await Booking.find()
        .populate('client', 'username email')
        .populate('provider', 'username email')
        .populate('event', 'title')
        .limit(10)
        .sort({ createdAt: -1 });

      bookings.forEach((b, i) => {
        console.log(`\n📋 Booking ${i + 1}:`);
        console.log(`   ID: ${b._id}`);
        console.log(`   Client: ${b.client?.username || 'Unknown'}`);
        console.log(`   Provider: ${b.provider?.username || 'Unknown'}`);
        console.log(`   Event: ${b.event?.title || 'Unknown'}`);
        console.log(`   Status: ${b.status}`);
        console.log(`   Approval Status: ${b.approvalStatus}`);
        console.log(`   Created: ${b.createdAt}`);
      });

      // Count by status
      console.log('\n\n📊 Bookings by status:');
      const statusCounts = await Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      statusCounts.forEach(s => {
        console.log(`   ${s._id}: ${s.count}`);
      });

      // Check pending approvals
      console.log('\n\n🔍 Checking pending approvals by provider:');
      const providers = await User.find({}).select('username email').limit(5);
      
      for (const provider of providers) {
        const pending = await Booking.countDocuments({
          provider: provider._id,
          $or: [
            { status: "pending-approval", approvalStatus: "pending" },
            { status: "payment-pending", approvalStatus: "approved", paymentVerified: false }
          ]
        });
        
        if (pending > 0) {
          console.log(`   ${provider.username}: ${pending} pending`);
        }
      }
    }

    // Check events with join requests
    console.log('\n\n🎯 Checking events with join requests:');
    const eventsWithRequests = await Event.find({ 
      'joinRequests.0': { $exists: true } 
    }).populate('organizer', 'username');
    
    console.log(`   Found ${eventsWithRequests.length} events with join requests`);
    
    eventsWithRequests.slice(0, 5).forEach((e, i) => {
      console.log(`\n   Event ${i + 1}: "${e.title}"`);
      console.log(`      Organizer: ${e.organizer?.username || 'Unknown'}`);
      console.log(`      Join Requests: ${e.joinRequests.length}`);
      console.log(`      Pending: ${e.joinRequests.filter(r => r.status === 'pending').length}`);
    });

    console.log('\n✅ Check complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBookings();
