// backend/src/scripts/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Coach from "../models/Coach.js";
import Event from "../models/Event.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Status from "../models/Status.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Sample users data
const usersData = [
  {
    username: "Simo",
    email: "simo@test.com",
    password: "$2b$10$Znmk1jKp7nSFyshdmL7HweYzOmaqQdCG7puBhTyyvxAemacoNHt0W", // "123456"
    avatar: "https://randomuser.me/api/portraits/men/10.jpg",
  },
  {
    username: "Sonnie",
    email: "sonnie@test.com",
    password: "$2b$10$Znmk1jKp7nSFyshdmL7HweYzOmaqQdCG7puBhTyyvxAemacoNHt0W", // "123456"
    avatar: "https://randomuser.me/api/portraits/men/11.jpg",
  },
  {
    username: "Sarah Johnson",
    email: "sarah@teakonn.com",
    password: "$2a$10$XQxQ9h9h9h9h9h9h9h9h9uO", // "password123"
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    username: "Mike Chen",
    email: "mike@teakonn.com",
    password: "$2a$10$XQxQ9h9h9h9h9h9h9h9h9uO",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    username: "Emma Davis",
    email: "emma@teakonn.com",
    password: "$2a$10$XQxQ9h9h9h9h9h9h9h9h9uO",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
  },
  {
    username: "James Wilson",
    email: "james@teakonn.com",
    password: "$2a$10$XQxQ9h9h9h9h9h9h9h9h9uO",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
  },
  {
    username: "Lisa Anderson",
    email: "lisa@teakonn.com",
    password: "$2a$10$XQxQ9h9h9h9h9h9h9h9h9uO",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
  },
  {
    username: "David Martinez",
    email: "david@teakonn.com",
    password: "$2a$10$XQxQ9h9h9h9h9h9h9h9h9uO",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
  },
  {
    username: "Jessica Lee",
    email: "jessica@teakonn.com",
    password: "$2a$10$XQxQ9h9h9h9h9h9h9h9h9uO",
    avatar: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    username: "Chris Brown",
    email: "chris@teakonn.com",
    password: "$2a$10$XQxQ9h9h9h9h9h9h9h9h9uO",
    avatar: "https://randomuser.me/api/portraits/men/4.jpg",
  },
];

// Coaches data
const coachesData = [
  {
    sports: ["Football", "Soccer"],
    specialties: ["Youth Training", "Professional Coaching"],
    bio: "Former professional player with 10+ years coaching experience",
    experience: 10,
    certifications: [
      { name: "UEFA Pro License", issuer: "UEFA", year: 2015 },
      { name: "Advanced Coaching", issuer: "FA", year: 2013 },
    ],
    location: {
      city: "New York",
      state: "NY",
      country: "USA",
      coordinates: [-74.006, 40.7128],
    },
    pricing: {
      hourlyRate: 85,
      currency: "USD",
      packageDeals: [
        {
          name: "10 Session Package",
          sessions: 10,
          price: 750,
          description: "Save $100 with this package",
        },
      ],
    },
    rating: {
      average: 4.8,
      count: 24,
    },
    verified: true,
    featured: true,
    totalSessions: 156,
    totalClients: 45,
  },
  {
    sports: ["Tennis"],
    specialties: ["Beginner Training", "Advanced Techniques"],
    bio: "Professional tennis coach specializing in technique and strategy",
    experience: 8,
    certifications: [
      { name: "PTR Professional", issuer: "PTR", year: 2016 },
    ],
    location: {
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      coordinates: [-118.2437, 34.0522],
    },
    pricing: {
      hourlyRate: 75,
      currency: "USD",
    },
    rating: {
      average: 4.9,
      count: 18,
    },
    verified: true,
    featured: true,
    totalSessions: 98,
    totalClients: 32,
  },
  {
    sports: ["Basketball"],
    specialties: ["Shooting", "Ball Handling", "Defense"],
    bio: "College basketball coach with focus on skill development",
    experience: 12,
    location: {
      city: "Chicago",
      state: "IL",
      country: "USA",
      coordinates: [-87.6298, 41.8781],
    },
    pricing: {
      hourlyRate: 90,
      currency: "USD",
    },
    rating: {
      average: 4.7,
      count: 31,
    },
    verified: true,
    featured: false,
    totalSessions: 203,
    totalClients: 58,
  },
  {
    sports: ["Yoga", "Fitness"],
    specialties: ["Hatha Yoga", "Vinyasa", "Meditation"],
    bio: "Certified yoga instructor helping you find balance and strength",
    experience: 6,
    certifications: [
      { name: "RYT-500", issuer: "Yoga Alliance", year: 2018 },
    ],
    location: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      coordinates: [-122.4194, 37.7749],
    },
    pricing: {
      hourlyRate: 65,
      currency: "USD",
    },
    rating: {
      average: 5.0,
      count: 42,
    },
    verified: true,
    featured: true,
    totalSessions: 287,
    totalClients: 76,
  },
  {
    sports: ["Swimming"],
    specialties: ["Competitive Swimming", "Technique", "Endurance"],
    bio: "Olympic swimmer turned coach, specializing in competitive training",
    experience: 15,
    location: {
      city: "Miami",
      state: "FL",
      country: "USA",
      coordinates: [-80.1918, 25.7617],
    },
    pricing: {
      hourlyRate: 95,
      currency: "USD",
    },
    rating: {
      average: 4.9,
      count: 27,
    },
    verified: true,
    featured: true,
    totalSessions: 189,
    totalClients: 51,
  },
  {
    sports: ["Hockey"],
    specialties: ["Skating", "Stick Handling", "Game Strategy"],
    bio: "Professional hockey coach with NHL experience",
    experience: 9,
    location: {
      city: "Boston",
      state: "MA",
      country: "USA",
      coordinates: [-71.0589, 42.3601],
    },
    pricing: {
      hourlyRate: 100,
      currency: "USD",
    },
    rating: {
      average: 4.8,
      count: 19,
    },
    verified: true,
    featured: false,
    totalSessions: 134,
    totalClients: 38,
  },
];

// Events data
const eventsData = [];

// Services data
const servicesData = [
  {
    name: "Personalized Training Program",
    description: "One-on-one coaching tailored to your goals with customized workout plans",
    category: "personal-training",
    sport: "Football",
    pricing: {
      type: "per-session",
      amount: 85,
      currency: "USD",
      packages: [
        {
          name: "Starter Pack",
          sessions: 5,
          price: 400,
          validityDays: 30,
          description: "5 sessions to get started",
        },
        {
          name: "Pro Pack",
          sessions: 10,
          price: 750,
          validityDays: 60,
          description: "Best value - save $100",
        },
      ],
    },
    duration: {
      value: 60,
      unit: "minutes",
    },
    location: {
      type: "in-person",
      city: "New York",
      state: "NY",
      country: "USA",
    },
    skillLevel: "all",
    rating: {
      average: 4.8,
      count: 24,
    },
    active: true,
    featured: true,
  },
  {
    name: "Group Tennis Classes",
    description: "Fun and engaging group tennis lessons for beginners and intermediates",
    category: "group-classes",
    sport: "Tennis",
    pricing: {
      type: "per-session",
      amount: 40,
      currency: "USD",
    },
    duration: {
      value: 90,
      unit: "minutes",
    },
    location: {
      type: "in-person",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
    },
    maxParticipants: 8,
    skillLevel: "beginner",
    rating: {
      average: 4.9,
      count: 18,
    },
    active: true,
    featured: true,
  },
  {
    name: "Basketball Technique Analysis",
    description: "Video analysis of your game with detailed feedback and improvement plan",
    category: "technique-analysis",
    sport: "Basketball",
    pricing: {
      type: "per-session",
      amount: 120,
      currency: "USD",
    },
    duration: {
      value: 90,
      unit: "minutes",
    },
    location: {
      type: "hybrid",
      city: "Chicago",
      state: "IL",
      country: "USA",
    },
    skillLevel: "intermediate",
    rating: {
      average: 4.7,
      count: 15,
    },
    active: true,
    featured: false,
  },
  {
    name: "Online Yoga Sessions",
    description: "Live virtual yoga classes from the comfort of your home",
    category: "online-coaching",
    sport: "Yoga",
    pricing: {
      type: "monthly",
      amount: 99,
      currency: "USD",
      packages: [
        {
          name: "Monthly Unlimited",
          sessions: 999,
          price: 99,
          validityDays: 30,
          description: "Unlimited classes per month",
        },
      ],
    },
    duration: {
      value: 60,
      unit: "minutes",
    },
    location: {
      type: "online",
    },
    maxParticipants: 20,
    skillLevel: "all",
    rating: {
      average: 5.0,
      count: 42,
    },
    active: true,
    featured: true,
  },
  {
    name: "Swimming Performance Program",
    description: "Elite training program for competitive swimmers focusing on speed and endurance",
    category: "custom-program",
    sport: "Swimming",
    pricing: {
      type: "package",
      amount: 500,
      currency: "USD",
      packages: [
        {
          name: "4-Week Program",
          sessions: 12,
          price: 500,
          validityDays: 28,
          description: "3 sessions per week",
        },
      ],
    },
    duration: {
      value: 75,
      unit: "minutes",
    },
    location: {
      type: "in-person",
      city: "Miami",
      state: "FL",
      country: "USA",
    },
    skillLevel: "advanced",
    rating: {
      average: 4.9,
      count: 27,
    },
    active: true,
    featured: true,
  },
];

async function seed() {
  try {
    console.log("🌱 Starting seed process...");

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await User.deleteMany({});
    await Coach.deleteMany({});
    await Event.deleteMany({});
    await Service.deleteMany({});
    await Booking.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await Status.deleteMany({});
    console.log("✅ Existing data cleared");

    // Create users
    console.log("👥 Creating users...");
    const users = await User.insertMany(usersData);
    console.log(`✅ Created ${users.length} users`);

    // Create coaches (assign to first 6 users)
    console.log("🏆 Creating coaches...");
    const coaches = [];
    for (let i = 0; i < coachesData.length && i < users.length; i++) {
      const coachData = { ...coachesData[i], userId: users[i]._id };
      const coach = await Coach.create(coachData);
      coaches.push(coach);
    }
    console.log(`✅ Created ${coaches.length} coaches`);

    // Create events (assign organizers)
    console.log("📅 Creating events...");
    const events = [];
    for (let i = 0; i < eventsData.length; i++) {
      const organizerIndex = i % users.length;
      const eventData = { ...eventsData[i], organizer: users[organizerIndex]._id };
      
      // Add some participants
      const participantCount = eventData.capacity.current;
      const participants = [];
      for (let j = 0; j < participantCount; j++) {
        const participantIndex = (organizerIndex + j + 1) % users.length;
        participants.push(users[participantIndex]._id);
      }
      eventData.participants = participants;
      
      const event = await Event.create(eventData);
      events.push(event);
    }
    console.log(`✅ Created ${events.length} events`);

    // Create services (assign to coaches)
    console.log("💼 Creating services...");
    const services = [];
    for (let i = 0; i < servicesData.length && i < coaches.length; i++) {
      const serviceData = { ...servicesData[i], provider: coaches[i].userId };
      const service = await Service.create(serviceData);
      services.push(service);
    }
    console.log(`✅ Created ${services.length} services`);

    console.log("\n🎉 Seed completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Users: ${users.length}`);
    console.log(`   Coaches: ${coaches.length}`);
    console.log(`   Events: ${events.length}`);
    console.log(`   Services: ${services.length}`);
    console.log("\n🔐 All users have password: password123");
    console.log("\n✨ You can now login and explore the app!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
