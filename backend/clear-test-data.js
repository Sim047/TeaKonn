// Clear old join requests and bookings for testing
// Run: node clear-test-data.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function clearTestData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    const Booking = (await import('./src/models/Booking.js')).default;
    const Event = (await import('./src/models/Event.js')).default;

    console.log('🗑️  Clearing old join requests from events...');
    const result1 = await Event.updateMany(
      {},
      { $set: { joinRequests: [] } }
    );
    console.log(`   Updated ${result1.modifiedCount} events`);

    console.log('🗑️  Clearing all bookings...');
    const result2 = await Booking.deleteMany({});
    console.log(`   Deleted ${result2.deletedCount} bookings`);

    console.log('\n✅ Test data cleared! You can now make fresh join requests.\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearTestData();
