import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Mail, CheckCircle } from 'lucide-react';

export default function Register() {
  const { signUp } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    marketingOptIn: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const { error: signUpError } = await signUp(formData.email, formData.password, {
      first_name: formData.firstName,
      last_name: formData.lastName,
      marketing_opt_in: formData.marketingOptIn,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    // Add to email subscribers if opted in
    if (formData.marketingOptIn) {
      try {
        const { data: existingSub } = await supabase
          .from('email_subscribers')
          .select('id')
          .eq('email', formData.email.toLowerCase())
          .maybeSingle();

        if (!existingSub) {
          await supabase.from('email_subscribers').insert({
            email: formData.email.toLowerCase(),
            first_name: formData.firstName || null,
            last_name: formData.lastName || null,
            source: 'register',
            is_subscribed: true,
            subscribed_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Non-critical error, continue
        console.error('Error adding email subscriber:', err);
      }
    }

    setRegisteredEmail(formData.email);
    setShowConfirmModal(true);
    setIsLoading(false);
  };

  const handleVerifiedClick = () => {
    window.location.href = '/account';
  };

  // Confirmation screen
  if (showConfirmModal) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-[#FFF8F0]">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 bg-[#CC0000]/10 rounded-full flex items-center justify-center border-2 border-[#CC0000]/20">
              <Mail className="w-9 h-9 text-[#CC0000]" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-black text-gray-900 mb-3">Check Your Email</h1>
          <p className="text-gray-500 mb-2">We've sent a confirmation link to:</p>
          <p className="text-[#CC0000] font-bold mb-6">{registeredEmail}</p>
          <div className="bg-white border border-[#CC0000]/15 rounded-2xl p-5 mb-6 text-left shadow-sm">
            <p className="text-gray-600 text-sm leading-relaxed">
              Click the link in your email to verify your account.
              <span className="block mt-2 text-gray-400">Don't see it? Check your spam or junk folder.</span>
            </p>
          </div>
          <Button onClick={handleVerifiedClick} className="w-full">
            <CheckCircle className="w-5 h-5 mr-2" />
            I've Verified My Email
          </Button>
          <p className="text-gray-400 text-sm mt-4">
            Didn't receive the email?{' '}
            <button
              onClick={() => { setShowConfirmModal(false); setFormData({ ...formData, password: '', confirmPassword: '' }); }}
              className="text-[#CC0000] font-bold hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-[#FFF8F0]">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img src="/logo.jpg" alt="European Market" className="h-14 w-14 object-cover rounded-2xl shadow-md" />
          </Link>
          <h1 className="font-display text-3xl font-black text-gray-900 mb-1">Create Account</h1>
          <p className="text-gray-500">Join us to track orders and save favourites</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl border border-[#CC0000]/15 shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
            />

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="marketingOptIn"
                checked={formData.marketingOptIn}
                onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#CC0000] focus:ring-[#CC0000]"
              />
              <label htmlFor="marketingOptIn" className="text-gray-500 text-sm leading-snug">
                Sign me up for exclusive offers, new product launches, and updates via email
              </label>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#CC0000] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Fresh homemade European specialties from 25+ countries
        </p>
      </div>
    </div>
  );
}
