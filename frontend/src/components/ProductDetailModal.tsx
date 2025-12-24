// frontend/src/components/ProductDetailModal.tsx
import React, { useState } from 'react';
import {
  X,
  MapPin,
  Heart,
  Package,
  Tag,
  User,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface MarketplaceItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  condition: string;
  images: string[];
  location?: string;
  seller: {
    _id: string;
    username: string;
    avatar?: string;
  };
  likes: string[];
  views: number;
  status: string;
  brand?: string;
  size?: string;
  color?: string;
  shippingAvailable?: boolean;
  shippingCost?: number;
  quantity?: number;
  createdAt: string;
}

interface ProductDetailModalProps {
  product: MarketplaceItem | null;
  onClose: () => void;
  onLike: (productId: string) => void;
  onMessage: (sellerId: string) => void;
  currentUserId?: string;
}

export default function ProductDetailModal({
  product,
  onClose,
  onLike,
  onMessage,
  currentUserId,
}: ProductDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  const nextImage = () => {
    if (product.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const isLiked = currentUserId && product.likes.includes(currentUserId);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-green-500/30 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex items-start justify-between z-10">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">{product.title}</h2>
            <div className="flex items-center gap-3 text-green-100">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{product.category}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {product.condition}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-square">
                {product.images && product.images.length > 0 ? (
                  <>
                    <img
                      src={product.images[currentImageIndex]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    {product.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-white text-sm">
                          {currentImageIndex + 1} / {product.images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-24 h-24 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? 'border-green-400 scale-105'
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.title} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Details */}
            <div className="space-y-5">
              {/* Price */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 backdrop-blur rounded-xl p-5 border border-green-500/30">
                <p className="text-4xl font-bold text-green-400">
                  ${product.price}
                  <span className="text-lg text-gray-400 ml-2">{product.currency}</span>
                </p>
              </div>

              {/* Seller Info */}
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        product.seller.avatar ||
                        `https://ui-avatars.com/api/?name=${product.seller.username}`
                      }
                      alt={product.seller.username}
                      className="w-12 h-12 rounded-full border-2 border-green-400"
                    />
                    <div>
                      <p className="text-white font-semibold">{product.seller.username}</p>
                      <p className="text-gray-400 text-sm">Seller</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(
                        '[ProductDetailModal] Contact button clicked, seller ID:',
                        product.seller._id,
                      );
                      console.log('[ProductDetailModal] onMessage function:', onMessage);
                      onMessage(product.seller._id);
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact
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
                  <p className="text-xl font-bold text-white">{product.likes.length}</p>
                </div>
                <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
                  <div className="flex items-center gap-2 text-cyan-400 mb-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-semibold">Views</span>
                  </div>
                  <p className="text-xl font-bold text-white">{product.views}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 space-y-3">
                {product.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </span>
                    <span className="text-white font-medium">{product.location}</span>
                  </div>
                )}
                {product.brand && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Brand
                    </span>
                    <span className="text-white font-medium">{product.brand}</span>
                  </div>
                )}
                {product.size && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Size</span>
                    <span className="text-white font-medium">{product.size}</span>
                  </div>
                )}
                {product.color && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Color</span>
                    <span className="text-white font-medium">{product.color}</span>
                  </div>
                )}
                {product.quantity !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Quantity
                    </span>
                    <span className="text-white font-medium">{product.quantity}</span>
                  </div>
                )}
              </div>

              {/* Shipping */}
              {product.shippingAvailable && (
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 backdrop-blur rounded-xl p-4 border border-blue-500/30">
                  <p className="text-blue-400 font-semibold mb-1">✓ Shipping Available</p>
                  {product.shippingCost !== undefined && (
                    <p className="text-gray-300 text-sm">
                      Shipping: ${product.shippingCost === 0 ? 'Free' : product.shippingCost}
                    </p>
                  )}
                </div>
              )}

              {/* Like Button */}
              <button
                onClick={() => onLike(product._id)}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  isLiked
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
                {isLiked ? 'Unlike' : 'Like this item'}
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-5 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-3">Description</h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
