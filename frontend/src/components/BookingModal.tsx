// frontend/src/components/BookingModal.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { X, Calendar, Clock, MapPin, DollarSign, CheckCircle } from 'lucide-react';
import { API_URL } from '../config/api';
const API = API_URL.replace(/\/api$/, '');

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  bookingType: 'service' | 'event' | 'coach-session';
  itemId?: string;
  itemName?: string;
  providerId?: string;
  providerName?: string;
  price?: number;
  currency?: string;
  paymentInstructions?: string;
  token: string;
  onSuccess?: () => void;
};

export default function BookingModal({
  isOpen,
  onClose,
  bookingType,
  itemId,
  itemName,
  providerId,
  providerName,
  price = 0,
  currency = 'USD',
  paymentInstructions = '',
  token,
  onSuccess,
}: BookingModalProps) {
  const [step, setStep] = useState(1); // 1: details, 2: payment, 3: confirmation
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: 'in-person',
    notes: '',
    transactionCode: '',
    transactionDetails: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.time) {
      setError('Please select date and time');
      return;
    }

    // Step 1 to 2 (payment info for paid events)
    if (step === 1 && price > 0) {
      setStep(2);
      return;
    }

    // Step 1 to 3 (confirmation for free events) or Step 2 to 3 (paid events)
    if ((step === 1 && price === 0) || (step === 2 && price > 0)) {
      if (price > 0 && (!formData.transactionCode || !formData.transactionDetails)) {
        setError('Please provide transaction code and details');
        return;
      }
      setStep(price === 0 ? 2 : 3);
      return;
    }

    // Final step: Create booking
    try {
      setLoading(true);
      setError('');

      const bookingData: any = {
        bookingType,
        scheduledDate: formData.date,
        scheduledTime: formData.time,
        location: formData.location,
        notes: formData.notes,
        transactionCode: formData.transactionCode,
        transactionDetails: formData.transactionDetails,
      };

      if (bookingType === 'service') {
        bookingData.serviceId = itemId;
      } else if (bookingType === 'event') {
        bookingData.eventId = itemId;
      } else if (bookingType === 'coach-session') {
        bookingData.providerId = providerId;
        bookingData.pricing = {
          amount: price,
          currency: currency,
        };
        bookingData.duration = {
          value: 60,
          unit: 'minutes',
        };
      }

      await axios.post(`${API}/api/bookings`, bookingData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBookingConfirmed(true);

      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      date: '',
      time: '',
      location: 'in-person',
      notes: '',
      transactionCode: '',
      transactionDetails: '',
    });
    setError('');
    setBookingConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {bookingConfirmed
              ? 'Booking Submitted!'
              : step === 1
                ? 'Book Session'
                : step === 2
                  ? 'Payment Information'
                  : 'Confirm Booking'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {bookingConfirmed ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {price > 0 ? 'Booking request submitted!' : 'Your booking has been confirmed!'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {price > 0
                ? 'The organizer will verify your payment and confirm your booking.'
                : "You'll receive a confirmation email shortly."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {/* Item Info */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {itemName || 'Session'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  with {providerName || 'Coach'}
                </p>
                {price > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-teal-600 dark:text-teal-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold">${price}</span>
                  </div>
                )}
              </div>

              {step === 1 && (
                <>
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Time
                    </label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Location Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location
                    </label>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="in-person">In Person</option>
                      <option value="online">Online</option>
                      <option value="tbd">To Be Determined</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Any special requests or questions..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>
                </>
              )}

              {step === 2 && price > 0 && (
                <>
                  {/* Payment Instructions */}
                  {paymentInstructions && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                        Payment Instructions:
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-line">
                        {paymentInstructions}
                      </p>
                    </div>
                  )}

                  {/* Transaction Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transaction Code / Reference Number *
                    </label>
                    <input
                      type="text"
                      name="transactionCode"
                      value={formData.transactionCode}
                      onChange={handleChange}
                      required
                      placeholder="e.g., MPESA12345ABC or TXN-2025-001"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Transaction Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Details *
                    </label>
                    <textarea
                      name="transactionDetails"
                      value={formData.transactionDetails}
                      onChange={handleChange}
                      required
                      rows={3}
                      placeholder="Provide details: payment method used, sender name, timestamp, etc."
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> Your booking will be pending until the organizer
                      verifies your payment details.
                    </p>
                  </div>
                </>
              )}

              {(step === 3 || (step === 2 && price === 0)) && (
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(formData.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Time:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.time}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Location:</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {formData.location.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Total:</span>
                    <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                      ${price}
                    </span>
                  </div>
                  {formData.notes && (
                    <div className="pt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Notes:</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{formData.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Processing...'
                  : step === 3 || (step === 2 && price === 0)
                    ? 'Confirm Booking'
                    : 'Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
