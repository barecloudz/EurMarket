import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const { data: existingSub } = await supabase
        .from('email_subscribers')
        .select('id, is_subscribed')
        .eq('email', email.toLowerCase())
        .single();

      if (existingSub) {
        if (existingSub.is_subscribed) {
          setError('This email is already subscribed!');
        } else {
          await supabase
            .from('email_subscribers')
            .update({ is_subscribed: true, unsubscribed_at: null })
            .eq('id', existingSub.id);
          setIsSubscribed(true);
        }
      } else {
        await supabase.from('email_subscribers').insert({
          email: email.toLowerCase(),
          source: 'footer',
          is_subscribed: true,
          subscribed_at: new Date().toISOString(),
        });
        setIsSubscribed(true);
      }
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
      console.error('Subscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="hidden md:block bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <span className="text-xl font-bold text-gray-900">GENOVA'S</span>
              <span className="text-sm text-gray-400">MERCH</span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              Custom 3D printing and laser engraving. Bringing your ideas to life.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wide">
              Quick Links
            </h3>
            <nav className="flex flex-col space-y-2.5">
              {[
                { to: '/products', label: 'Products' },
                { to: '/cart', label: 'Cart' },
                { to: '/return-policy', label: 'Return Policy' },
                { to: '/privacy-policy', label: 'Privacy Policy' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-gray-500 hover:text-gray-900 text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wide">
              Account
            </h3>
            <nav className="flex flex-col space-y-2.5">
              {[
                { to: '/login', label: 'Sign In' },
                { to: '/register', label: 'Create Account' },
                { to: '/account', label: 'My Account' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-gray-500 hover:text-gray-900 text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wide">
              Stay Updated
            </h3>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed">
              Get notified about new products and exclusive offers.
            </p>
            {isSubscribed ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <Check className="h-5 w-5" />
                <span>Thanks for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-[var(--color-primary)] text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Genova's Merch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
