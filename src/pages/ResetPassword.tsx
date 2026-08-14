import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      // Exchange the PKCE code — single-use, must happen here before anything else consumes it
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data.session) {
          setSessionReady(true);
        } else {
          setError('This reset link is invalid or has already been used.');
        }
      });
    } else {
      // No code — check for an existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSessionReady(true);
        } else {
          setError('No reset link found. Please request a new password reset.');
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/account', { replace: true }), 2500);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg border border-[#CC0000]/10 overflow-hidden">

          {/* Header */}
          <div className="bg-[#CC0000] px-8 py-8 text-white text-center">
            <img src="/logo.jpg" alt="European Market" className="h-14 w-14 object-cover rounded-2xl shadow-md mx-auto mb-4" />
            <h1 className="font-display text-2xl font-black">Reset your password</h1>
            <p className="text-white/75 text-sm mt-1">Choose a new password for your account</p>
          </div>

          <div className="px-8 py-8">
            {success ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-gray-900 mb-1">Password updated!</p>
                <p className="text-sm text-gray-500">Redirecting to your account...</p>
              </div>
            ) : !sessionReady && !error ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Verifying reset link...</p>
              </div>
            ) : error && !sessionReady ? (
              <div className="text-center py-4 space-y-4">
                <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
                <a
                  href="/login"
                  className="inline-block px-6 py-3 bg-[#CC0000] text-white font-bold rounded-xl hover:bg-[#AA0000] transition-colors text-sm"
                >
                  Back to Login
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      autoFocus
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000]"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !password || !confirm}
                  className="w-full py-3 bg-[#CC0000] text-white font-bold rounded-xl hover:bg-[#AA0000] transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Update Password →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
