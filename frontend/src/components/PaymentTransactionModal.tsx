import React, { useState } from 'react';
import { X, DollarSign, CreditCard, AlertCircle } from 'lucide-react';

interface PaymentTransactionModalProps {
  event: {
    title: string;
    pricing: {
      amount: number;
      currency: string;
      type: string;
      paymentInstructions?: string;
    };
  };
  onSubmit: (transactionCode: string, transactionDetails: string) => void;
  onCancel: () => void;
}

const PaymentTransactionModal: React.FC<PaymentTransactionModalProps> = ({
  event,
  onSubmit,
  onCancel,
}) => {
  const [transactionCode, setTransactionCode] = useState('');
  const [transactionDetails, setTransactionDetails] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!transactionCode.trim()) {
      setError('Transaction code is required for paid events');
      return;
    }
    onSubmit(transactionCode.trim(), transactionDetails.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-cyan-500/20 animate-fade-in">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-cyan-500 to-purple-500 p-6 rounded-t-2xl">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Payment Required</h2>
              <p className="text-white/80 text-sm">Complete your event registration</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Event Info */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 border border-cyan-500/20">
            <h3 className="font-semibold text-white mb-2 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-cyan-400" />
              Event: {event.title}
            </h3>
            <div className="text-2xl font-bold text-cyan-400">
              {event.pricing.currency || '$'} {Number(event.pricing.amount || 0).toLocaleString()}
            </div>
          </div>

          {/* Payment Instructions */}
          {event.pricing.paymentInstructions && (
            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
              <h4 className="font-semibold text-blue-400 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Payment Instructions
              </h4>
              <p className="text-gray-300 text-sm whitespace-pre-line">
                {event.pricing.paymentInstructions}
              </p>
            </div>
          )}

          {/* Transaction Code Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Transaction Code / Reference <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={transactionCode}
              onChange={(e) => {
                setTransactionCode(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter M-PESA code, reference number, etc."
              className="w-full px-4 py-3 bg-gray-800/50 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {/* Transaction Details Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              value={transactionDetails}
              onChange={(e) => setTransactionDetails(e.target.value)}
              placeholder="Add any payment notes or details..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-800/50 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Info Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-400 text-sm">
              Your join request will be sent to the organizer for verification. You'll be notified
              once approved.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-cyan-500/50"
            >
              Submit Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTransactionModal;
