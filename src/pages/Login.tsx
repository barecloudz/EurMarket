import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error: signInError } = await signIn(formData.email, formData.password);

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    const updatedProfile = useAuthStore.getState().profile;
    if (updatedProfile?.role === 'supplier') {
      navigate('/supplier/orders', { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-[#FFF8F0]">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img src="/logo.jpg" alt="European Market" className="h-14 w-14 object-cover rounded-2xl shadow-md" />
          </Link>
          <h1 className="font-display text-3xl font-black text-gray-900 mb-1">Welcome Back</h1>
          <p className="text-gray-500">Sign in to your European Market account</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl border border-[#CC0000]/15 shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <div className="text-right mt-1">
                <Link to="/reset-password" className="text-xs text-[#CC0000] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#CC0000] font-bold hover:underline">
                Create one free
              </Link>
            </p>
          </div>
        </div>

        {/* Footer tagline */}
        <p className="text-center text-gray-400 text-xs mt-6">
          Fresh homemade European specialties from 25+ countries
        </p>
      </div>
    </div>
  );
}
