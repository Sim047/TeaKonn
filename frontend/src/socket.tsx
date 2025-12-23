import React, { createContext, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// Vite exposes runtime env vars through import.meta.env
// use VITE_API_URL to point to your backend (set in Vercel/Render environments)
function normalizeBase(url?: string): string {
  if (!url) return '/';
  let u = url.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) {
    try {
      return (typeof window !== 'undefined' ? window.location.protocol : 'https:') + u;
    } catch {
      return 'https:' + u;
    }
  }
  if (u.startsWith('/')) {
    // Handle common misconfiguration: VITE_API_URL set as "/host.tld" instead of protocol-relative "//host.tld"
    const afterSlash = u.slice(1);
    const firstSegment = afterSlash.split('/')[0] || '';
    if (!u.startsWith('//') && firstSegment.includes('.')) {
      try {
        const proto = typeof window !== 'undefined' ? window.location.protocol : 'https:';
        return `${proto}//${afterSlash}`;
      } catch {
        return 'https://' + afterSlash;
      }
    }
    try {
      return (typeof window !== 'undefined' ? window.location.origin : '') + u;
    } catch {
      return u;
    }
  }
  const isProd = (import.meta as any)?.env?.MODE === 'production';
  return `${isProd ? 'https://' : 'http://'}${u}`;
}

const API = normalizeBase(import.meta.env.VITE_API_URL) || '/';

// lightweight helper — prefer using localStorage token for handshake
function getTokenFromStorage() {
  try {
    return localStorage.getItem('token');
  } catch (e) {
    return null;
  }
}

export const socket = io(API, {
  autoConnect: false,
  // If you want to use auth token with socket handshake:
  auth: { token: getTokenFromStorage() }
});

// React context
export const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Do not auto-connect here. Connection should be triggered by the app
  // once a user + token are available (see App.tsx). On unmount, if
  // the socket is connected we'll disconnect to clean up resources.
  useEffect(() => {
    return () => {
      try {
        if (socket && (socket as any).connected) socket.disconnect();
      } catch (e) {}
    };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
