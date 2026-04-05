import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { fetchProfile, setUser, setSession } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/';

    // onAuthStateChange fires when Supabase processes the hash tokens
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

    // Also try getSession immediately in case it's already resolved
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
