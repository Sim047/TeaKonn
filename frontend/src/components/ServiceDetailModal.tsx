// frontend/src/components/ServiceDetailModal.tsx
import React from 'react';
import { X, MapPin, Star, DollarSign, Clock, Award, MessageCircle, Heart, Eye } from 'lucide-react';

interface Service {
  _id: string;
  name: string;
  description: string;
  category: string;
  sport?: string;
  pricing: {
    type: string;
    amount: number;
    currency?: string;
  };
  location: {
    type: string;
    city?: string;
    address?: string;
  };
  provider: {
    _id: string;
    username: string;
    avatar?: string;
  };
  qualifications?: string[];
  experience?: string;
  images?: string[];
  duration?: {
    value: number;
    unit: string;
  };
  requirements?: string[];
  included?: string[];
  views?: number;
  likes?: string[];
}

interface ServiceDetailModalProps {
  service: Service | null;
  onClose: () => void;
  onMessage: (providerId: string) => void;
  onLike: (serviceId: string) => void;
  currentUserId?: string;
}

export default function ServiceDetailModal({
  service,
  onClose,
  onMessage,
  onLike,
  currentUserId,
}: ServiceDetailModalProps) {
  if (!service) return null;

  const isLiked = currentUserId && service.likes && service.likes.includes(currentUserId);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-start justify-between z-10">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">{service.name}</h2>
            <p className="text-purple-100 capitalize">{service.category.replace(/-/g, ' ')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Images */}
          {service.images && service.images.length > 0 && (
            <div className="rounded-xl overflow-hidden">
              <img
                src={service.images[0]}
                alt={service.name}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Provider Info */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={
                    service.provider.avatar ||
                    `https://ui-avatars.com/api/?name=${service.provider.username}`
                  }
                  alt={service.provider.username}
                  className="w-12 h-12 rounded-full border-2 border-purple-400"
                />
                <div>
                  <p className="text-white font-semibold">{service.provider.username}</p>
                  <p className="text-gray-400 text-sm">Service Provider</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(
                    '[ServiceDetailModal] Message button clicked, provider ID:',
                    service.provider._id,
                  );
                  console.log('[ServiceDetailModal] onMessage function:', onMessage);
                  onMessage(service.provider._id);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-400' : ''}`} />
                <span className="text-sm font-semibold">Likes</span>
              </div>
              <p className="text-xl font-bold text-white">{service.likes?.length || 0}</p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-semibold">Views</span>
              </div>
              <p className="text-xl font-bold text-white">{service.views || 0}</p>
            </div>
          </div>

          {/* Pricing & Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 backdrop-blur rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Pricing</span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${service.pricing.amount}
                <span className="text-sm text-gray-400 ml-2">/ {service.pricing.type}</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 backdrop-blur rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="font-semibold">Location</span>
              </div>
              <p className="text-white font-medium">
                {service.location?.city || service.location?.type || 'Not specified'}
              </p>
              <p className="text-gray-400 text-sm capitalize">{service.location?.type}</p>
            </div>
          </div>

          {/* Duration */}
          {service.duration && (
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Duration</span>
              </div>
              <p className="text-white">
                {service.duration.value} {service.duration.unit}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-3">About This Service</h3>
            <p className="text-gray-300 leading-relaxed">{service.description}</p>
          </div>

          {/* Experience */}
          {service.experience && (
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Star className="w-5 h-5" />
                <span className="font-semibold">Experience</span>
              </div>
              <p className="text-gray-300">{service.experience}</p>
            </div>
          )}

          {/* Qualifications */}
          {service.qualifications && service.qualifications.length > 0 && (
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-purple-400 mb-3">
                <Award className="w-5 h-5" />
                <span className="font-semibold">Qualifications</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {service.qualifications.map((qual, idx) => (
                  <span
                    key={idx}
                    className="bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full text-sm border border-purple-500/30"
                  >
                    {qual}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* What's Included */}
          {service.included && service.included.length > 0 && (
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">What's Included</h3>
              <ul className="space-y-2">
                {service.included.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {service.requirements && service.requirements.length > 0 && (
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">Requirements</h3>
              <ul className="space-y-2">
                {service.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Like Button */}
          <button
            onClick={() => onLike(service._id)}
            className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              isLiked
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
            {isLiked ? 'Unlike this service' : 'Like this service'}
          </button>
        </div>
      </div>
    </div>
  );
}
