// frontend/src/components/NotificationToast.tsx
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface NotificationToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export default function NotificationToast({
  message,
  type,
  onClose,
  duration = 5000,
}: NotificationToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-6 h-6" />,
    error: <AlertCircle className="w-6 h-6" />,
    warning: <AlertTriangle className="w-6 h-6" />,
    info: <Info className="w-6 h-6" />,
  };

  const colors = {
    success: 'from-green-600 to-emerald-600 border-green-500',
    error: 'from-red-600 to-rose-600 border-red-500',
    warning: 'from-yellow-600 to-orange-600 border-yellow-500',
    info: 'from-cyan-600 to-blue-600 border-cyan-500',
  };

  return (
    <div className="fixed top-4 right-4 z-[60] animate-slide-in-right">
      <div
        className={`bg-gradient-to-r ${colors[type]} border-2 rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md`}
      >
        <div className="flex items-start gap-3">
          <div className="text-white">{icons[type]}</div>
          <div className="flex-1">
            <p className="text-white font-semibold leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
