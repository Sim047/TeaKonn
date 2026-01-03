import { useEffect, useRef } from 'react';
import api from '../utils/api';

type Props = {
  onSuccess: (payload: { token: string; user: any }) => void;
  className?: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleLoginButton({ onSuccess, className }: Props) {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const clientId =
    (typeof window !== 'undefined' && ((window as any).__GOOGLE_CLIENT_ID || localStorage.getItem('GOOGLE_CLIENT_ID'))) ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return; // Not configured

    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve();
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google script'));
        document.head.appendChild(script);
      });

    ensureScript()
      .then(() => {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            try {
              const idToken = response?.credential;
              if (!idToken) return;
              const { data } = await api.post('/auth/google', { idToken });
              const { token, user } = data;
              localStorage.setItem('token', token);
              localStorage.setItem('user', JSON.stringify(user));
              onSuccess({ token, user });
            } catch (e) {
              // swallow or show toast
              console.error('Google login failed', e);
            }
          },
        });
        if (btnRef.current) {
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            width: 320,
          });
        }
      })
      .catch((e) => console.error(e));
  }, [clientId]);

  if (!clientId) {
    return (
      <div className={className}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px',
            borderRadius: 9999,
            border: '1px solid var(--border, #334155)',
            background: 'var(--card, #0f172a)',
            color: 'var(--text, #e2e8f0)',
            opacity: 0.6,
            width: 320,
            cursor: 'not-allowed',
          }}
          title="Google login not configured (set VITE_GOOGLE_CLIENT_ID or window.__GOOGLE_CLIENT_ID/localStorage.GOOGLE_CLIENT_ID)"
        >
          Continue with Google
        </div>
      </div>
    );
  }

  return <div ref={btnRef} className={className} />;
}
