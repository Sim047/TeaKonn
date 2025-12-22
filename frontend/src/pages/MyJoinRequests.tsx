// My Join Requests - Dedicated Page
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

export default function MyJoinRequests({ onBack }: any) {
  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-theme-secondary hover:text-heading mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="rounded-2xl p-8 themed-card text-center">
          <h1 className="text-2xl font-bold text-heading mb-2">Join Requests Retired</h1>
          <p className="text-theme-secondary">
            The booking system has been removed. This page is no longer available.
          </p>
        </div>
      </div>
    </div>
  );
}
    location?: { name: string; city?: string; state?: string };
