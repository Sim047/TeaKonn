// frontend/src/pages/Discover.tsx - Improved with Sports, Services & Marketplace
import React, { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Trophy,
  Heart,
  ShoppingBag,
  Activity,
  Sparkles,
  DollarSign,
  ArrowRight,
  Plus,
  Filter,
  X,
  Star,
  Package,
  Stethoscope,
  Dumbbell
} from "lucide-react";

dayjs.extend(relativeTime);

const API = import.meta.env.VITE_API_URL || "";

// Comprehensive Sports List
const ALL_SPORTS = [
  // Olympic Sports
  { name: "Football/Soccer", category: "Team Sports", icon: "⚽", popular: true },
  { name: "Basketball", category: "Team Sports", icon: "🏀", popular: true },
  { name: "Volleyball", category: "Team Sports", icon: "🏐", popular: true },
  { name: "Tennis", category: "Racquet Sports", icon: "🎾", popular: true },
  { name: "Swimming", category: "Aquatic Sports", icon: "🏊", popular: true },
  { name: "Athletics/Track & Field", category: "Individual Sports", icon: "🏃", popular: true },
  { name: "Gymnastics", category: "Artistic Sports", icon: "🤸", popular: true },
  { name: "Boxing", category: "Combat Sports", icon: "🥊", popular: true },
  { name: "Cycling", category: "Individual Sports", icon: "🚴", popular: true },
  { name: "Baseball", category: "Team Sports", icon: "⚾", popular: true },
  
  // Major World Sports
  { name: "Cricket", category: "Team Sports", icon: "🏏", popular: true },
  { name: "Rugby", category: "Team Sports", icon: "🏉", popular: true },
  { name: "Hockey (Ice)", category: "Team Sports", icon: "🏒", popular: true },
  { name: "Hockey (Field)", category: "Team Sports", icon: "🏑", popular: true },
  { name: "Golf", category: "Individual Sports", icon: "⛳", popular: true },
  
  // Combat Sports
  { name: "Wrestling", category: "Combat Sports", icon: "🤼", popular: false },
  { name: "Judo", category: "Combat Sports", icon: "🥋", popular: false },
  { name: "Karate", category: "Combat Sports", icon: "🥋", popular: false },
  { name: "Taekwondo", category: "Combat Sports", icon: "🥋", popular: false },
  { name: "Kung Fu", category: "Combat Sports", icon: "🥋", popular: false },
  { name: "Mixed Martial Arts (MMA)", category: "Combat Sports", icon: "🥊", popular: true },
  { name: "Kickboxing", category: "Combat Sports", icon: "🥊", popular: false },
  { name: "Muay Thai", category: "Combat Sports", icon: "🥊", popular: false },
  { name: "Fencing", category: "Combat Sports", icon: "🤺", popular: false },
  
  // Racquet Sports
  { name: "Badminton", category: "Racquet Sports", icon: "🏸", popular: true },
  { name: "Table Tennis/Ping Pong", category: "Racquet Sports", icon: "🏓", popular: true },
  { name: "Squash", category: "Racquet Sports", icon: "🎾", popular: false },
  { name: "Racquetball", category: "Racquet Sports", icon: "🎾", popular: false },
  { name: "Pickleball", category: "Racquet Sports", icon: "🏸", popular: false },
  
  // Aquatic Sports
  { name: "Diving", category: "Aquatic Sports", icon: "🤿", popular: false },
  { name: "Water Polo", category: "Aquatic Sports", icon: "🤽", popular: false },
  { name: "Synchronized Swimming", category: "Aquatic Sports", icon: "🏊", popular: false },
  { name: "Surfing", category: "Aquatic Sports", icon: "🏄", popular: true },
  { name: "Rowing", category: "Aquatic Sports", icon: "🚣", popular: false },
  { name: "Canoeing/Kayaking", category: "Aquatic Sports", icon: "🛶", popular: false },
  { name: "Sailing", category: "Aquatic Sports", icon: "⛵", popular: false },
  
  // Winter Sports
  { name: "Skiing (Alpine)", category: "Winter Sports", icon: "⛷️", popular: true },
  { name: "Skiing (Cross-Country)", category: "Winter Sports", icon: "⛷️", popular: false },
  { name: "Snowboarding", category: "Winter Sports", icon: "🏂", popular: true },
  { name: "Ice Skating", category: "Winter Sports", icon: "⛸️", popular: true },
  { name: "Figure Skating", category: "Winter Sports", icon: "⛸️", popular: false },
  { name: "Speed Skating", category: "Winter Sports", icon: "⛸️", popular: false },
  { name: "Curling", category: "Winter Sports", icon: "🥌", popular: false },
  { name: "Bobsled", category: "Winter Sports", icon: "🛷", popular: false },
  { name: "Luge", category: "Winter Sports", icon: "🛷", popular: false },
  { name: "Skeleton", category: "Winter Sports", icon: "🛷", popular: false },
  { name: "Biathlon", category: "Winter Sports", icon: "⛷️", popular: false },
  
  // Extreme Sports
  { name: "Skateboarding", category: "Extreme Sports", icon: "🛹", popular: true },
  { name: "BMX", category: "Extreme Sports", icon: "🚴", popular: false },
  { name: "Mountain Biking", category: "Extreme Sports", icon: "🚵", popular: true },
  { name: "Parkour/Freerunning", category: "Extreme Sports", icon: "🏃", popular: false },
  { name: "Rock Climbing", category: "Extreme Sports", icon: "🧗", popular: true },
  { name: "Bouldering", category: "Extreme Sports", icon: "🧗", popular: false },
  { name: "Skydiving", category: "Extreme Sports", icon: "🪂", popular: false },
  { name: "Bungee Jumping", category: "Extreme Sports", icon: "🪂", popular: false },
  { name: "Base Jumping", category: "Extreme Sports", icon: "🪂", popular: false },
  { name: "Hang Gliding", category: "Extreme Sports", icon: "🪂", popular: false },
  { name: "Paragliding", category: "Extreme Sports", icon: "🪂", popular: false },
  
  // Motor Sports
  { name: "Formula 1", category: "Motor Sports", icon: "🏎️", popular: true },
  { name: "NASCAR", category: "Motor Sports", icon: "🏎️", popular: true },
  { name: "Rally Racing", category: "Motor Sports", icon: "🏎️", popular: false },
  { name: "MotoGP", category: "Motor Sports", icon: "🏍️", popular: true },
  { name: "Motocross", category: "Motor Sports", icon: "🏍️", popular: false },
  { name: "Go-Karting", category: "Motor Sports", icon: "🏎️", popular: false },
  
  // Target Sports
  { name: "Archery", category: "Target Sports", icon: "🏹", popular: false },
  { name: "Shooting Sports", category: "Target Sports", icon: "🎯", popular: false },
  { name: "Darts", category: "Target Sports", icon: "🎯", popular: false },
  
  // Equestrian Sports
  { name: "Horse Racing", category: "Equestrian Sports", icon: "🏇", popular: true },
  { name: "Show Jumping", category: "Equestrian Sports", icon: "🏇", popular: false },
  { name: "Dressage", category: "Equestrian Sports", icon: "🏇", popular: false },
  { name: "Polo", category: "Equestrian Sports", icon: "🏇", popular: false },
  
  // Artistic Sports
  { name: "Cheerleading", category: "Artistic Sports", icon: "📣", popular: false },
  { name: "Trampolining", category: "Artistic Sports", icon: "🤸", popular: false },
  { name: "Rhythmic Gymnastics", category: "Artistic Sports", icon: "🤸", popular: false },
  
  // Mind Sports
  { name: "Chess", category: "Mind Sports", icon: "♟️", popular: true },
  { name: "Checkers", category: "Mind Sports", icon: "⚫", popular: false },
  { name: "Go (Baduk/Weiqi)", category: "Mind Sports", icon: "⚫", popular: false },
  { name: "Poker", category: "Mind Sports", icon: "🃏", popular: false },
  { name: "Bridge", category: "Mind Sports", icon: "🃏", popular: false },
  { name: "Esports/Gaming", category: "Mind Sports", icon: "🎮", popular: true },
  
  // Dance Sports
  { name: "Ballroom Dancing", category: "Dance Sports", icon: "💃", popular: false },
  { name: "Hip Hop Dance", category: "Dance Sports", icon: "💃", popular: false },
  { name: "Ballet", category: "Dance Sports", icon: "🩰", popular: false },
  { name: "Breakdancing/Breaking", category: "Dance Sports", icon: "🕺", popular: true },
  
  // Other Individual Sports
  { name: "Triathlon", category: "Individual Sports", icon: "🏃", popular: true },
  { name: "Marathon Running", category: "Individual Sports", icon: "🏃", popular: true },
  { name: "Decathlon", category: "Individual Sports", icon: "🏃", popular: false },
  { name: "Pentathlon", category: "Individual Sports", icon: "🏃", popular: false },
  { name: "Bowling", category: "Individual Sports", icon: "🎳", popular: false },
  { name: "Billiards/Pool", category: "Individual Sports", icon: "🎱", popular: false },
  { name: "Snooker", category: "Individual Sports", icon: "🎱", popular: false },
];

export default function Discover({ token, onViewProfile }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAllSports, setShowAllSports] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [transactionCode, setTransactionCode] = useState("");

  useEffect(() => {
    loadEvents();
  }, [token, selectedSport]);

  async function loadEvents() {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Load all published events
      const eventParams = new URLSearchParams();
      if (selectedSport) eventParams.append('sport', selectedSport);
      eventParams.append('status', 'published');
      eventParams.append('limit', '50');
      
      const eventRes = await axios.get(`${API}/api/events?${eventParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setEvents(eventRes.data.events || []);
      
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleJoinEvent = async (eventId: string) => {
    const event = events.find(e => e._id === eventId);
    if (!event) return;

    // If paid event, show modal to enter transaction code
    if (event.pricing?.type === "paid") {
      setSelectedEvent(event);
      setJoinModalOpen(true);
    } else {
      // For free events, submit join request without transaction code
      submitJoinRequest(eventId, "");
    }
  };

  const submitJoinRequest = async (eventId: string, txCode: string) => {
    try {
      console.log("📝 SIMPLE: Submitting booking for event:", eventId);
      
      // Use NEW simple booking system
      const response = await axios.post(`${API}/api/bookings-simple/create`, 
        { eventId, transactionCode: txCode }, 
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("✅ SIMPLE: Booking created:", response.data);
      alert("✅ Join request submitted! Check 'My Join Requests' in your dashboard.");
      
      setJoinModalOpen(false);
      setTransactionCode("");
      setSelectedEvent(null);
      loadEvents();
    } catch (err: any) {
      console.error("❌ SIMPLE: Booking error:", err);
      const errorMsg = err.response?.data?.error || "Failed to submit request";
      alert("❌ " + errorMsg);
    }
  };

  // Filter logic
  const categories = ["All", ...new Set(ALL_SPORTS.map(s => s.category))];
  
  // Filter sports by category
  const categorizedSports = !selectedCategory || selectedCategory === "All" 
    ? ALL_SPORTS 
    : ALL_SPORTS.filter(s => s.category === selectedCategory);
  
  // Filter sports by search query
  const searchFilteredSports = searchQuery.trim() 
    ? categorizedSports.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categorizedSports;
  
  const popularSports = ALL_SPORTS.filter(s => s.popular);
  const displaySports = showAllSports ? searchFilteredSports : popularSports;

  // Show sports grid when: expanded, category selected (not empty/All), or searching
  const shouldShowSportsGrid = showAllSports || (selectedCategory && selectedCategory !== "All") || searchQuery.trim();

  // Filter events by search
  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.sport?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>
          Discover Sports Events
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Browse events across all sports or filter by your favorite category
        </p>
        
        {/* Search */}
        <div className="flex items-center bg-slate-800/50 rounded-xl p-4 border border-slate-700 max-w-xl">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            placeholder="Search events by title, sport, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none"
            style={{ 
              background: 'transparent',
              color: 'var(--text)',
              caretColor: 'var(--text)'
            }}
          />
        </div>
      </div>

      {/* Browse All Sports Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Trophy className="w-6 h-6 text-slate-400 mr-2" />
            <h2 className="text-3xl font-bold">Browse All Sports</h2>
          </div>
          <button
            onClick={() => setShowAllSports(!showAllSports)}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded-lg transition-all flex items-center gap-2"
          >
            {showAllSports ? 'Show Popular' : 'Show All Sports'}
            <ArrowRight className={`w-4 h-4 transition-transform ${showAllSports ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Category Filter */}
        {shouldShowSportsGrid && (
          <div className="flex gap-3 mb-6 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  if (cat !== "All" && !showAllSports) {
                    setShowAllSports(true);
                  }
                }}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-600 border-2 border-slate-400 text-white'
                    : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Sports Grid - only show when expanded, category selected, or searching */}
        {shouldShowSportsGrid && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displaySports.map((sport) => (
              <div
                key={sport.name}
                className="cursor-pointer group relative"
              >
                <div 
                  onClick={() => setSelectedSport(sport.name)}
                  className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur rounded-2xl p-4 border border-slate-600 hover:border-slate-400 transition-all duration-300 hover:scale-105 text-center min-h-[120px] flex flex-col items-center justify-center"
                >
                  <div className="text-3xl mb-2">{sport.icon}</div>
                  <h3 className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors line-clamp-2 px-1">
                    {sport.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events Section */}
      {selectedSport && (
        <div className="max-w-7xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 text-slate-400 mr-2" />
              <h2 className="text-3xl font-bold">{selectedSport} Events</h2>
            </div>
            <button
              onClick={() => setSelectedSport('')}
              className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded-lg transition-all"
            >
              Clear Filter
            </button>
          </div>
          {loading ? (
            <p className="text-slate-300 text-center">Loading events...</p>
          ) : filteredEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <div
                  key={event._id}
                  className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur rounded-2xl p-6 border border-slate-600 hover:border-slate-400 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-white">{event.title}</h3>
                    <Award className="w-6 h-6 text-slate-400" />
                  </div>
                  
                  {/* Organizer Info */}
                  {event.organizer && (
                    <div 
                      onClick={() => onViewProfile && onViewProfile(event.organizer._id)}
                      className="flex items-center text-sm text-slate-400 mb-3 cursor-pointer hover:text-slate-200 transition-colors"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      <span>Organized by <span className="font-semibold">{event.organizer.username}</span></span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-slate-300 mb-2">
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    {dayjs(event.startDate).format("MMM D, YYYY • h:mm A")}
                  </div>
                  <div className="flex items-center text-sm text-slate-300 mb-3">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    {event.location?.city ? (
                      <span>
                        {event.location.name && `${event.location.name}, `}
                        {event.location.city}
                        {event.location.state && `, ${event.location.state}`}
                      </span>
                    ) : (
                      <span className="text-slate-500">Location TBD</span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center text-slate-400">
                      <Users className="w-4 h-4 mr-1" />
                      {event.participants?.length || 0}/{event.maxParticipants}
                    </div>
                    {event.entryFee > 0 ? (
                      <div className="flex items-center text-slate-300 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        {event.entryFee} {event.currency || 'USD'}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold">Free</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleJoinEvent(event._id)}
                    className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 px-4 py-2 rounded-lg font-medium transition-all border border-slate-500"
                  >
                    Join Event
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
              <Sparkles className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No events found for {selectedSport}</p>
              <p className="text-slate-500 text-sm mt-2">Try selecting a different sport</p>
            </div>
          )}
        </div>
      )}

      {/* All Events Section (when no sport selected) */}
      {!selectedSport && (
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <Calendar className="w-6 h-6 text-slate-400 mr-2" />
            <h2 className="text-3xl font-bold">All Upcoming Events</h2>
          </div>
          {loading ? (
            <p className="text-slate-300 text-center">Loading events...</p>
          ) : filteredEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <div
                  key={event._id}
                  className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur rounded-2xl p-6 border border-slate-600 hover:border-slate-400 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
                      <span className="text-sm text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                        {event.sport}
                      </span>
                    </div>
                    <Award className="w-6 h-6 text-slate-400" />
                  </div>
                  
                  {/* Organizer Info */}
                  {event.organizer && (
                    <div 
                      onClick={() => onViewProfile && onViewProfile(event.organizer._id)}
                      className="flex items-center text-sm text-slate-400 mb-3 mt-2 cursor-pointer hover:text-slate-200 transition-colors"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      <span>Organized by <span className="font-semibold">{event.organizer.username}</span></span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-slate-300 mb-2 mt-3">
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    {dayjs(event.startDate).format("MMM D, YYYY • h:mm A")}
                  </div>
                  <div className="flex items-center text-sm text-slate-300 mb-3">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    {event.location?.city ? (
                      <span>
                        {event.location.name && `${event.location.name}, `}
                        {event.location.city}
                        {event.location.state && `, ${event.location.state}`}
                      </span>
                    ) : (
                      <span className="text-slate-500">Location TBD</span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center text-slate-400">
                      <Users className="w-4 h-4 mr-1" />
                      {event.participants?.length || 0}/{event.maxParticipants}
                    </div>
                    {event.entryFee > 0 ? (
                      <div className="flex items-center text-slate-300 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        {event.entryFee} {event.currency || 'USD'}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold">Free</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleJoinEvent(event._id)}
                    className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 px-4 py-2 rounded-lg font-medium transition-all border border-slate-500"
                  >
                    Join Event
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
              <Sparkles className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No events available yet</p>
              <p className="text-slate-500 text-sm mt-2">Check back soon for upcoming events</p>
            </div>
          )}
        </div>
      )}

      {/* Join Request Modal */}
      {joinModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Join Event
            </h3>
            
            <div className="mb-6">
              <h4 className="font-semibold text-white mb-2">{selectedEvent.title}</h4>
              <div className="flex items-center gap-2 text-sm text-slate-300 mb-3">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">
                  {selectedEvent.pricing?.amount} {selectedEvent.pricing?.currency || 'USD'}
                </span>
              </div>
              
              {selectedEvent.pricing?.paymentInstructions && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-4">
                  <p className="text-sm text-slate-300 font-medium mb-1">Payment Instructions:</p>
                  <p className="text-sm text-slate-400">{selectedEvent.pricing.paymentInstructions}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Transaction Code / Reference Number *
                </label>
                <input
                  type="text"
                  value={transactionCode}
                  onChange={(e) => setTransactionCode(e.target.value)}
                  placeholder="Enter your payment transaction code"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <p className="text-xs text-slate-400 mt-1">
                  This will be sent to the event organizer for verification
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setJoinModalOpen(false);
                  setTransactionCode("");
                  setSelectedEvent(null);
                }}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-all border border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => submitJoinRequest(selectedEvent._id, transactionCode)}
                disabled={!transactionCode.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
