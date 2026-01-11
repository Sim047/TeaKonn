// frontend/src/components/CreateEventModal.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { X, Calendar, MapPin, Users, DollarSign, Clock, Trophy, Camera } from 'lucide-react';
import ImageUpload from './ImageUpload';
import MapPicker, { PlaceSelection } from './MapPicker';

const API = API_URL.replace(/\/api$/, '');

// Comprehensive Sports List (matching Dashboard)
const SPORTS = [
  'Other / Non-sport',
  'Football/Soccer',
  'Basketball',
  'Volleyball',
  'Tennis',
  'Swimming',
  'Athletics/Track & Field',
  'Gymnastics',
  'Boxing',
  'Cycling',
  'Baseball',
  'Cricket',
  'Rugby',
  'Hockey (Ice)',
  'Hockey (Field)',
  'Golf',
  'Wrestling',
  'Judo',
  'Karate',
  'Taekwondo',
  'Kung Fu',
  'Mixed Martial Arts (MMA)',
  'Kickboxing',
  'Muay Thai',
  'Fencing',
  'Badminton',
  'Table Tennis/Ping Pong',
  'Squash',
  'Racquetball',
  'Pickleball',
  'Diving',
  'Water Polo',
  'Synchronized Swimming',
  'Surfing',
  'Rowing',
  'Canoeing/Kayaking',
  'Sailing',
  'Skiing (Alpine)',
  'Skiing (Cross-Country)',
  'Snowboarding',
  'Ice Skating',
  'Figure Skating',
  'Speed Skating',
  'Curling',
  'Bobsled',
  'Luge',
  'Yoga',
  'Pilates',
  'CrossFit',
  'Aerobics',
  'Zumba',
  'Bodybuilding',
  'Powerlifting',
  'Weightlifting',
  'Skateboarding',
  'BMX',
  'Rock Climbing',
  'Parkour',
  'Bungee Jumping',
  'Skydiving',
  'Paragliding',
  'Archery',
  'Shooting',
  'Darts',
  'Formula 1 Racing',
  'MotoGP',
  'NASCAR',
  'Rally Racing',
  'Karting',
  'Horse Racing',
  'Show Jumping',
  'Dressage',
  'Polo',
  'American Football',
  'Australian Rules Football',
  'Handball',
  'Lacrosse',
  'Netball',
  'Softball',
  'Chess',
  'Checkers',
  'Go (Baduk/Weiqi)',
  'Poker',
  'Bridge',
  'Esports/Gaming',
  'Ballroom Dancing',
  'Hip Hop Dance',
  'Ballet',
  'Breakdancing/Breaking',
  'Triathlon',
  'Marathon Running',
  'Decathlon',
  'Pentathlon',
  'Bowling',
  'Billiards/Pool',
  'Snooker',
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
];

const EVENT_TYPES = [
  { value: 'tournament', label: '🏆 Tournament' },
  { value: 'clinic', label: '🎓 Clinic' },
  { value: 'workshop', label: '🛠️ Workshop' },
  { value: 'bootcamp', label: '💪 Bootcamp' },
  { value: 'social', label: '🤝 Social' },
];

const SKILL_LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function CreateEventModal({ isOpen, onClose, token, onSuccess, editingEvent, initialToken }: any) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sport: 'Football/Soccer',
    eventType: 'tournament',
    startDate: '',
    endDate: '',
    time: '',
    // Location fields are populated via booking token validation
    locationName: '',
    address: '',
    city: '',
    state: '',
    country: '',
    maxCapacity: 20,
    pricingType: 'free',
    amount: 0,
    currency: 'USD',
    paymentInstructions: '',
    skillLevel: 'all',
  });
  const [images, setImages] = useState<string[]>(editingEvent?.image ? [editingEvent.image] : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingTokenCode, setBookingTokenCode] = useState<string>(initialToken || '');
  const [tokenStatus, setTokenStatus] = useState<{ valid: boolean; message?: string } | null>(null);
  const [noTokenMode, setNoTokenMode] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // Load editing data when modal opens
  useEffect(() => {
    if (editingEvent && isOpen) {
      setFormData({
        title: editingEvent.title || '',
        description: editingEvent.description || '',
        sport: editingEvent.sport || 'Football/Soccer',
        eventType: editingEvent.eventType || 'tournament',
        startDate: editingEvent.startDate ? editingEvent.startDate.split('T')[0] : '',
        endDate: editingEvent.endDate ? editingEvent.endDate.split('T')[0] : '',
        time: editingEvent.time || '',
        locationName: editingEvent.location?.name || '',
        address: editingEvent.location?.address || '',
        city: editingEvent.location?.city || '',
        state: editingEvent.location?.state || '',
        country: editingEvent.location?.country || '',
        maxCapacity: editingEvent.capacity?.max || 20,
        pricingType: editingEvent.pricing?.type || 'free',
        amount: editingEvent.pricing?.amount || 0,
        currency: editingEvent.pricing?.currency || 'USD',
        paymentInstructions: editingEvent.pricing?.paymentInstructions || '',
        skillLevel: editingEvent.skillLevel || 'all',
      });
    } else if (!editingEvent && isOpen) {
      // Reset for new event
      setFormData({
        title: '',
        description: '',
        sport: 'Football/Soccer',
        eventType: 'tournament',
        startDate: '',
        endDate: '',
        time: '',
        locationName: '',
        address: '',
        city: '',
        state: '',
        country: '',
        maxCapacity: 20,
        pricingType: 'free',
        amount: 0,
        currency: 'USD',
        paymentInstructions: '',
        skillLevel: 'all',
      });
      setCoords(undefined);
    }
  }, [editingEvent, isOpen]);

  async function verifyToken() {
    setTokenStatus(null);
    if (!bookingTokenCode) {
      setTokenStatus({ valid: false, message: 'Booking token is required' });
      return;
    }
    try {
      const API = API_URL.replace(/\/api$/, '');
      const res = await axios.post(`${API}/api/tokens/verify`, { code: bookingTokenCode }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { venue } = res.data;
      // Populate locked venue/location fields
      setFormData((prev) => ({
        ...prev,
        locationName: venue.location?.name || venue.name,
        address: venue.location?.address || '',
        city: venue.location?.city || '',
        state: venue.location?.state || '',
        country: venue.location?.country || '',
      }));
      setTokenStatus({ valid: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Token verification failed';
      setTokenStatus({ valid: false, message: msg });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Token is optional: if provided, backend uses venue token flow; otherwise general event
      const eventData: any = {
        title: formData.title,
        description: formData.description,
        sport: formData.sport,
        eventType: formData.eventType,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate
          ? new Date(formData.endDate).toISOString()
          : new Date(formData.startDate).toISOString(),
        time: formData.time,
        bookingTokenCode,
        capacity: {
          max: Number(formData.maxCapacity),
          current: editingEvent?.capacity?.current || 0,
        },
        pricing: {
          type: formData.pricingType,
          amount: formData.pricingType === 'paid' ? Number(formData.amount) : 0,
          currency: formData.pricingType === 'paid' ? formData.currency : 'USD',
          paymentInstructions: formData.pricingType === 'paid' ? formData.paymentInstructions : '',
        },
        skillLevel: formData.skillLevel,
        image: images.length > 0 ? images[0] : undefined,
        status: 'published',
      };
      // Allow non-sport events by omitting sport when "Other / Non-sport" is selected
      if (formData.sport === 'Other / Non-sport') {
        delete eventData.sport;
      }
      // In no-token mode, include user-provided location fields
      if (!bookingTokenCode || noTokenMode) {
        eventData.locationName = formData.locationName || undefined;
        eventData.address = formData.address || undefined;
        eventData.city = formData.city || undefined;
        eventData.state = formData.state || undefined;
        eventData.country = formData.country || undefined;
        if (coords) {
          eventData.location = eventData.location || {};
          eventData.location.coordinates = coords;
        }
      }

      if (editingEvent) {
        // Update existing event
        await axios.put(`${API}/api/events/${editingEvent._id}`, eventData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new event
        await axios.post(`${API}/api/events`, eventData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onSuccess && onSuccess();
      onClose();

      // Reset form
      setFormData({
        title: '',
        description: '',
        sport: 'Football/Soccer',
        eventType: 'tournament',
        startDate: '',
        endDate: '',
        time: '',
        locationName: '',
        address: '',
        city: '',
        state: '',
        country: '',
        maxCapacity: 20,
        pricingType: 'free',
        amount: 0,
        currency: 'USD',
        skillLevel: 'all',
      });
      setBookingTokenCode('');
      setTokenStatus(null);
      setCoords(undefined);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl themed-card">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </h2>
            <p className="text-white/90 text-sm">
              {editingEvent ? 'Update your event details' : 'Share your event with the community'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-teal-500" />
              Event Details
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="e.g., Summer Basketball Tournament"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="input"
                placeholder="Describe your event..."
              />
            </div>

            {/* Event Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-500" />
                Event Image
              </label>
              <ImageUpload images={images} onImagesChange={setImages} maxImages={1} token={token} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sport *
                </label>
                <select
                  value={formData.sport}
                  onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  className="input"
                >
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Type *
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="input"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Skill Level
                </label>
                <select
                  value={formData.skillLevel}
                  onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                  className="input"
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-500" />
              Date & Time
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Venue Token & Location (locked after token validation) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-500" />
              Venue Booking Token
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Booking Token *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required={!noTokenMode}
                    value={bookingTokenCode}
                    onChange={(e) => setBookingTokenCode(e.target.value.trim())}
                    className="input flex-1"
                    placeholder="Enter token provided by venue owner"
                  />
                  <button
                    type="button"
                    onClick={verifyToken}
                    className="px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
                  >Verify</button>
                </div>
                {tokenStatus && (
                  <p className={tokenStatus.valid ? "text-teal-600 mt-2" : "text-red-600 mt-2"}>
                    {tokenStatus.valid ? 'Token valid. Venue details loaded.' : tokenStatus.message}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <input id="noTokenMode" type="checkbox" checked={noTokenMode} onChange={(e) => setNoTokenMode(e.target.checked)} />
                  <label htmlFor="noTokenMode" className="text-sm text-gray-700 dark:text-gray-300">I don't have a venue token (create a general event)</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Venue Name</label>
                <input
                  type="text"
                  value={formData.locationName}
                  disabled={!noTokenMode}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  disabled={!noTokenMode}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  disabled={!noTokenMode}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State/Province</label>
                <input
                  type="text"
                  value={formData.state}
                  disabled={!noTokenMode}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  disabled={!noTokenMode}
                  className="input w-full"
                />
              </div>
            </div>

            {noTokenMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pick on Map (optional)</label>
                <MapPicker
                  value={{
                    name: formData.locationName || undefined,
                    address: formData.address || undefined,
                    city: formData.city || undefined,
                    state: formData.state || undefined,
                    country: formData.country || undefined,
                    coordinates: coords,
                  }}
                  onChange={(next: PlaceSelection) => {
                    setFormData({
                      ...formData,
                      locationName: next.name || formData.locationName,
                      address: next.address || formData.address,
                      city: next.city || formData.city,
                      state: next.state || formData.state,
                      country: next.country || formData.country,
                    });
                    setCoords(next.coordinates);
                  }}
                />
              </div>
            )}
          </div>

          {/* Capacity & Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              Capacity & Pricing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Participants *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.maxCapacity}
                  onChange={(e) =>
                    setFormData({ ...formData, maxCapacity: Number(e.target.value) })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pricing Type
                </label>
                <select
                  value={formData.pricingType}
                  onChange={(e) => setFormData({ ...formData, pricingType: e.target.value })}
                  className="input"
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {formData.pricingType === 'paid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {formData.pricingType === 'paid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price ({CURRENCIES.find((c) => c.code === formData.currency)?.symbol || '$'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="input"
                  placeholder="0.00"
                />
              </div>
            )}

            {formData.pricingType === 'paid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Instructions
                </label>
                <textarea
                  value={formData.paymentInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentInstructions: e.target.value })
                  }
                  className="input resize-none"
                  rows={3}
                  placeholder="E.g., Send M-Pesa payment to 0712345678, Account Name: John Doe. Include your name in the description."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Provide clear instructions for how participants should pay (bank transfer, mobile
                  money, etc.)
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-xl transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all duration-300 shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? editingEvent
                  ? 'Updating...'
                  : 'Creating...'
                : editingEvent
                  ? 'Update Event'
                  : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
