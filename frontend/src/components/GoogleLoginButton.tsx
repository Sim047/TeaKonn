import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [rendered, setRendered] = useState(false);

  // Runtime sources in order of precedence
  const runtimeId =
    (typeof window !== 'undefined' && ((window as any).__GOOGLE_CLIENT_ID || localStorage.getItem('GOOGLE_CLIENT_ID'))) ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    // Final safety fallback using provided ID to keep things clickable
    '50477811908-dr8piak3f09p7k624a8oqdh25u5odnkr.apps.googleusercontent.com';

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || runtimeId;

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
        console.log('[GoogleLogin] GSI script loaded. Initializing…');
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            try {
              const idToken = response?.credential;
              if (!idToken) return;
              console.log('[GoogleLogin] Received credential. Exchanging with backend…');
              const { data } = await api.post('/auth/google', { idToken });
              const { token, user } = data;
              localStorage.setItem('token', token);
              localStorage.setItem('user', JSON.stringify(user));
              onSuccess({ token, user });
            } catch (e) {
              // Surface backend error details
              const detail = e?.response?.data || e?.message || e;
              console.error('[GoogleLogin] Exchange failed:', detail);
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
          setRendered(true);
          console.log('[GoogleLogin] Rendered Google button.');
        }
      })
      .catch((e) => console.error(e));
  }, [clientId]);

  const bootstrapFallback = useCallback(async () => {
    try {
      console.log('[GoogleLogin] Fallback click. Using client ID:', runtimeId);
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
      await ensureScript();
      window.google.accounts.id.initialize({
        client_id: runtimeId,
        callback: async (response: any) => {
          try {
            const idToken = response?.credential;
            if (!idToken) {
              console.warn('[GoogleLogin] No credential returned from Google.');
              return;
            }
            console.log('[GoogleLogin] Fallback credential received. Exchanging…');
            const { data } = await api.post('/auth/google', { idToken });
            const { token, user } = data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            onSuccess({ token, user });
          } catch (e: any) {
            console.error('[GoogleLogin] Fallback exchange failed:', e?.response?.data || e?.message || e);
          }
        },
      });
      if (btnRef.current && !rendered) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: 320,
        });
        setRendered(true);
        console.log('[GoogleLogin] Fallback rendered Google button.');
      }
      try {
        window.google.accounts.id.prompt();
      } catch {
        // prompt may be blocked; rely on button interaction
      }
    } catch (e) {
      console.error('[GoogleLogin] Fallback bootstrap failed:', e);
    }
  }, [runtimeId, rendered, onSuccess]);

  if (!clientId) {
    return (
      <div className={className}>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px',
            borderRadius: 9999,
            border: '1px solid var(--border, #334155)',
            background: 'var(--card, #0f172a)',
            color: 'var(--text, #e2e8f0)',
            opacity: 1,
            width: 320,
            cursor: 'pointer',
          }}
          title="Using runtime client ID fallback; click to initialize"
          onClick={bootstrapFallback}
        >
          Continue with Google
        </button>
        <div ref={btnRef} style={{ height: 0, overflow: 'hidden' }} />
      </div>
    );
  }

  return <div ref={btnRef} className={className} />;
}
