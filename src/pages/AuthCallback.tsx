import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { fetchProfile, setUser, setSession } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/';

    // Check for error in the hash (e.g. otp_expired)
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const desc = hashParams.get('error_description') || 'This link is invalid or has expired.';
      setError(desc.replace(/\+/g, ' '));
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session) {
          setUser(session.user);
          setSession(session);
          await fetchProfile();
          navigate(next, { replace: true });
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setSession(session);
        await fetchProfile();
        navigate(next, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden text-center">
          <div className="bg-[#2E7D32] px-8 py-8">
            <img src="/images/logo.png" alt="Genova's Merch" className="h-14 w-auto object-contain mx-auto" />
          </div>
          <div className="px-8 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link expired</h2>
            <p className="text-gray-500 text-sm mb-6">
              This invite link has expired. Please ask the store admin to send you a new invite.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-[#2E7D32] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Go to Store
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <img src="/images/logo.png" alt="Genova's Merch" className="h-16 w-auto mx-auto mb-4 object-contain" />
        <div className="w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-4 text-sm">Setting up your account...</p>
      </div>
    </div>
  );
}
