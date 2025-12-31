import React, { useState } from 'react';
import { X, ShoppingBag, DollarSign, Package, MapPin, Camera, Tag } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';
import ImageUpload from './ImageUpload';

const API = API_URL.replace(/\/api$/, '');

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

const CATEGORIES = [
  { value: 'Sports Equipment', label: 'Sports Equipment', icon: '🏅' },
  { value: 'Apparel & Clothing', label: 'Apparel & Clothing', icon: '👕' },
  { value: 'Footwear', label: 'Footwear', icon: '👟' },
  { value: 'Accessories', label: 'Accessories', icon: '🎒' },
  { value: 'Supplements & Nutrition', label: 'Supplements & Nutrition', icon: '💊' },
  { value: 'Fitness Tech & Wearables', label: 'Fitness Tech & Wearables', icon: '⌚' },
  { value: 'Training Gear', label: 'Training Gear', icon: '🏋️' },
  { value: 'Recovery & Wellness', label: 'Recovery & Wellness', icon: '💆' },
  { value: 'Team Sports Gear', label: 'Team Sports Gear', icon: '⚽' },
  { value: 'Individual Sports Gear', label: 'Individual Sports Gear', icon: '🎾' },
  { value: 'Outdoor & Adventure', label: 'Outdoor & Adventure', icon: '🏕️' },
  { value: 'Other', label: 'Other', icon: '📦' },
];

const CONDITIONS = [
  { value: 'New', label: 'Brand New' },
  { value: 'Like New', label: 'Like New' },
  { value: 'Good', label: 'Good' },
  { value: 'Fair', label: 'Fair' },
  { value: 'For Parts', label: 'For Parts/Repair' },
];

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
  token: string;
  editProduct?: any;
}

export default function CreateProductModal({
  isOpen,
  onClose,
  onProductCreated,
  token,
  editProduct,
}: CreateProductModalProps) {
  const [formData, setFormData] = useState({
    title: editProduct?.title || '',
    description: editProduct?.description || '',
    category: editProduct?.category || '',
    price: editProduct?.price || '',
    currency: editProduct?.currency || 'USD',
    condition: editProduct?.condition || 'Good',
    brand: editProduct?.brand || '',
    size: editProduct?.size || '',
    color: editProduct?.color || '',
    quantity: editProduct?.quantity || '1',
    location: editProduct?.location || '',
    shippingAvailable: editProduct?.shippingAvailable || false,
    shippingCost: editProduct?.shippingCost || '',
    paymentInstructions: editProduct?.paymentInstructions || '',
    tags: editProduct?.tags?.join(', ') || '',
  });

  const [images, setImages] = useState<string[]>(editProduct?.images || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Frontend validation for required selections not covered by HTML attributes
      if (!formData.category) {
        setError('Please select a category');
        setLoading(false);
        return;
      }
      if (!formData.location || !formData.location.trim()) {
        setError('Please provide a location');
        setLoading(false);
        return;
      }
      const productData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        currency: formData.currency,
        condition: formData.condition,
        brand: formData.brand,
        size: formData.size,
        color: formData.color,
        quantity: parseInt(formData.quantity),
        location: formData.location,
        shippingAvailable: formData.shippingAvailable,
        shippingCost: formData.shippingAvailable ? parseFloat(formData.shippingCost || '0') : 0,
        paymentInstructions: formData.paymentInstructions,
        tags: formData.tags
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => t),
        images: images,
        status: 'active',
      };

      if (editProduct) {
        await axios.put(`${API}/api/marketplace/${editProduct._id}`, productData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API}/api/marketplace`, productData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onProductCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-green-500/20 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between border-b border-green-400/30 z-10">
          <div className="flex items-center">
            <ShoppingBag className="w-6 h-6 text-white mr-3" />
            <h2 className="text-2xl font-bold text-white">
              {editProduct ? 'Edit Product' : 'Sell Product'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
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

          {/* Product Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Product Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Nike Running Shoes Size 10, Yoga Mat Premium"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.category === cat.value
                      ? 'bg-green-600 border-green-400 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:border-green-400/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs font-medium">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Describe the product condition, features, specifications..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-green-400" />
              Product Images (Up to 5)
            </label>
            <ImageUpload images={images} onImagesChange={setImages} maxImages={5} token={token} />
            <p className="text-xs text-gray-400 mt-2">First image will be the main product photo</p>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Pricing & Payment
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Currency *</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-400/50"
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
                  Price ({CURRENCIES.find((c) => c.code === formData.currency)?.symbol}) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
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
                placeholder="e.g., M-Pesa: 0712345678, Bank Transfer: Account 123456, Cash on Delivery available..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Condition *</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-400/50"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond.value} value={cond.value} className="bg-slate-800">
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g., Nike, Adidas"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Size</label>
              <input
                type="text"
                name="size"
                value={formData.size}
                onChange={handleChange}
                placeholder="e.g., M, L, 10, 42"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="e.g., Black, Red, Blue"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Nairobi, Lagos"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
              />
            </div>
          </div>

          {/* Shipping */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="shippingAvailable"
                checked={formData.shippingAvailable}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-600 text-green-600 focus:ring-green-500"
              />
              <span className="text-white font-medium">Shipping Available</span>
            </label>

            {formData.shippingAvailable && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Shipping Cost ({CURRENCIES.find((c) => c.code === formData.currency)?.symbol})
                </label>
                <input
                  type="number"
                  name="shippingCost"
                  value={formData.shippingCost}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
                />
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Tag className="inline w-4 h-4 mr-1" />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., sports, running, shoes, new"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/50"
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
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editProduct ? 'Update Product' : 'List Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
