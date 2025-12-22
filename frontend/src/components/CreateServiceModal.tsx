import React, { useState } from "react";
import { X, Stethoscope, DollarSign, MapPin, Award, Clock, Camera, Info } from "lucide-react";
import axios from "axios";
import ImageUpload from "./ImageUpload";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceCreated: () => void;
  token: string;
  editService?: any;
}

const serviceCategories = [
  { value: "personal-training", label: "Personal Training", icon: "💪" },
  { value: "group-classes", label: "Group Classes", icon: "👥" },
  { value: "nutrition", label: "Nutrition & Diet", icon: "🥗" },
  { value: "physiotherapy", label: "Physiotherapy", icon: "🏥" },
  { value: "sports-massage", label: "Sports Massage", icon: "💆" },
  { value: "mental-coaching", label: "Mental Coaching", icon: "🧠" },
  { value: "technique-analysis", label: "Technique Analysis", icon: "📊" },
  { value: "custom-program", label: "Custom Program", icon: "📋" },
  { value: "online-coaching", label: "Online Coaching", icon: "💻" },
  { value: "other", label: "Other", icon: "🔧" },
];

const sports = [
  "Football", "Basketball", "Tennis", "Running", "Swimming", "Cycling",
  "Gym/Fitness", "Volleyball", "Baseball", "Golf", "Boxing", "MMA",
  "Yoga", "Pilates", "Crossfit", "Martial Arts", "Rugby", "Cricket",
  "General Sports", "Multiple Sports", "Other"
];

const pricingTypes = [
  { value: "per-session", label: "Per Session" },
  { value: "per-hour", label: "Per Hour" },
  { value: "package", label: "Package Deal" },
  { value: "monthly", label: "Monthly Subscription" },
  { value: "custom", label: "Custom Pricing" },
];

const locationTypes = [
  { value: "in-person", label: "In-Person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid (Both)" },
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
];

export default function CreateServiceModal({
  isOpen,
  onClose,
  onServiceCreated,
  token,
  editService,
}: CreateServiceModalProps) {
  const [formData, setFormData] = useState({
    name: editService?.name || "",
    description: editService?.description || "",
    category: editService?.category || "",
    sport: editService?.sport || "",
    pricingType: editService?.pricing?.type || "per-session",
    amount: editService?.pricing?.amount || "",
    currency: editService?.pricing?.currency || "USD",
    paymentInstructions: editService?.paymentInstructions || "",
    locationType: editService?.location?.type || "in-person",
    city: editService?.location?.city || "",
    address: editService?.location?.address || "",
    duration: editService?.duration?.value || "60",
    durationUnit: editService?.duration?.unit || "minutes",
    qualifications: editService?.qualifications?.join(", ") || "",
    experience: editService?.experience || "",
  });

  const [images, setImages] = useState<string[]>(editService?.images || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const serviceData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        sport: formData.sport,
        pricing: {
          type: formData.pricingType,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
        },
        paymentInstructions: formData.paymentInstructions,
        duration: {
          value: parseInt(formData.duration),
          unit: formData.durationUnit,
        },
        location: {
          type: formData.locationType,
          city: formData.city,
          address: formData.address,
        },
        qualifications: formData.qualifications
          .split(",")
          .map((q: string) => q.trim())
          .filter((q: string) => q),
        experience: formData.experience,
        images: images,
        active: true,
      };

      if (editService) {
        await axios.put(`${API}/api/services/${editService._id}`, serviceData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API}/api/services`, serviceData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onServiceCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create service");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between border-b border-purple-400/30 z-10">
          <div className="flex items-center">
            <Stethoscope className="w-6 h-6 text-white mr-3" />
            <h2 className="text-2xl font-bold text-white">
              {editService ? "Edit Service" : "Create New Service"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Service Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Elite Personal Training, Sports Physiotherapy"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Service Category *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {serviceCategories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, category: cat.value })
                  }
                  className={`p-3 rounded-lg border transition-all ${
                    formData.category === cat.value
                      ? "bg-purple-600 border-purple-400 text-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:border-purple-400/50"
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs font-medium">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sport */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sport/Activity *
            </label>
            <select
              name="sport"
              value={formData.sport}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400/50"
            >
              <option value="">Select sport...</option>
              {sports.map((sport) => (
                <option key={sport} value={sport} className="bg-slate-800">
                  {sport}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Describe your service, what you offer, who it's for..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          {/* Service Image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-400" />
              Service Image
            </label>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={1}
              token={token}
            />
          </div>

          {/* Pricing & Payment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-400" />
              Pricing & Payment
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pricing Type *
                </label>
                <select
                  name="pricingType"
                  value={formData.pricingType}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400/50"
                >
                  {pricingTypes.map((type) => (
                    <option key={type.value} value={type.value} className="bg-slate-800">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency *
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400/50"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code} className="bg-slate-800">
                      {curr.symbol} {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount ({CURRENCIES.find(c => c.code === formData.currency)?.symbol}) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="50.00"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
                />
              </div>
            </div>

            {/* Payment Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Instructions
              </label>
              <textarea
                name="paymentInstructions"
                value={formData.paymentInstructions}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., M-Pesa: 0712345678, Bank Transfer: Account 123456, Paypal: email@example.com..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Duration
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                placeholder="60"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Unit
              </label>
              <select
                name="durationUnit"
                value={formData.durationUnit}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400/50"
              >
                <option value="minutes" className="bg-slate-800">Minutes</option>
                <option value="hours" className="bg-slate-800">Hours</option>
                <option value="days" className="bg-slate-800">Days</option>
                <option value="weeks" className="bg-slate-800">Weeks</option>
              </select>
            </div>
          </div>

          {/* Location Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              Location Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {locationTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, locationType: type.value })
                  }
                  className={`py-3 rounded-lg border transition-all ${
                    formData.locationType === type.value
                      ? "bg-purple-600 border-purple-400 text-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:border-purple-400/50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* City & Address */}
          {formData.locationType !== "online" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g., New York"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., 123 Main St"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
                />
              </div>
            </div>
          )}

          {/* Qualifications */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Info className="inline w-4 h-4 mr-1" />
              Qualifications (comma-separated)
            </label>
            <input
              type="text"
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              placeholder="e.g., Certified Personal Trainer, ACE Certified, 5 years experience"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Experience Description
            </label>
            <textarea
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              rows={3}
              placeholder="Describe your experience, achievements, specialties..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : editService ? "Update Service" : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
