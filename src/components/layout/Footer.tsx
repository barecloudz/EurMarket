import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, Check, MapPin, Phone, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const COUNTRIES = [
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇵🇱', name: 'Poland' },
  { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'England' },
  { flag: '🇮🇪', name: 'Ireland' },
  { flag: '🇺🇦', name: 'Ukraine' },
  { flag: '🇨🇿', name: 'Czech Rep.' },
  { flag: '🇭🇺', name: 'Hungary' },
  { flag: '🇷🇴', name: 'Romania' },
  { flag: '🇷🇺', name: 'Russia' },
  { flag: '🇸🇰', name: 'Slovakia' },
  { flag: '🇱🇹', name: 'Lithuania' },
  { flag: '🇱🇻', name: 'Latvia' },
];

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
          await supabase.from('email_subscribers')
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
    } catch {
      setError('Failed to subscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="hidden md:block bg-[#1C0A0A] text-white mt-auto">
      {/* ── Countries strip ── */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <p className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">
            Products from 25+ countries
          </p>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <span key={c.name}
                className="flex items-center gap-1.5 bg-white/8 hover:bg-white/12 transition-colors px-3 py-1.5 rounded-full text-xs font-medium text-white/70">
                <span>{c.flag}</span> {c.name}
              </span>
            ))}
            <span className="flex items-center gap-1.5 bg-[var(--color-primary)]/30 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--color-accent)]">
              + 13 more countries
            </span>
          </div>
        </div>
      </div>

      {/* ── Main footer ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand + Store info */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src="/logo.jpg" alt="European Market" className="h-10 w-10 object-cover rounded-lg" />
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Authentic</span>
                <span className="text-base font-black text-white tracking-tight">European Market</span>
              </div>
            </Link>
            <p className="text-white/50 text-sm leading-relaxed mb-5">
              Authentic European groceries, fresh homemade foods, and specialty imports from 25+ countries.
            </p>
            <div className="space-y-2.5 text-sm">
              <a href="https://maps.google.com/?q=155+W+Mills+St+Columbus+NC" target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2.5 text-white/60 hover:text-white transition-colors">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--color-accent)]" />
                <span>155 W Mills Street<br />Columbus, NC 28722</span>
              </a>
              <a href="tel:+18645906760"
                className="flex items-center gap-2.5 text-white/60 hover:text-white transition-colors">
                <Phone className="h-4 w-4 flex-shrink-0 text-[var(--color-accent)]" />
                (864) 590-6760
              </a>
              <div className="flex items-start gap-2.5 text-white/60">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--color-accent)]" />
                <span>Mon – Sat: 9 AM – 7 PM<br />Sunday: 10 AM – 5 PM</span>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Shop</h3>
            <nav className="flex flex-col space-y-2.5">
              {[
                { to: '/products', label: 'All Products' },
                { to: '/products?category=meats', label: 'Meats & Deli' },
                { to: '/products?category=dairy', label: 'Dairy & Cheese' },
                { to: '/products?category=bakery', label: 'Fresh Bakery' },
                { to: '/products?category=beverages', label: 'Beverages' },
                { to: '/products?category=sweets', label: 'Sweets & Candy' },
              ].map((link) => (
                <Link key={link.to} to={link.to}
                  className="text-white/50 hover:text-white text-sm transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Account + Info */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Account</h3>
            <nav className="flex flex-col space-y-2.5 mb-6">
              {[
                { to: '/login',    label: 'Sign In' },
                { to: '/register', label: 'Create Account' },
                { to: '/account',  label: 'My Orders' },
                { to: '/wishlist', label: 'My Wishlist' },
              ].map((link) => (
                <Link key={link.to} to={link.to}
                  className="text-white/50 hover:text-white text-sm transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Info</h3>
            <nav className="flex flex-col space-y-2.5">
              {[
                { to: '/return-policy',  label: 'Return Policy' },
                { to: '/privacy-policy', label: 'Privacy Policy' },
              ].map((link) => (
                <Link key={link.to} to={link.to}
                  className="text-white/50 hover:text-white text-sm transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-widest">Stay Updated</h3>
            <p className="text-white/50 text-sm mb-4 leading-relaxed">
              New arrivals, weekly specials, and seasonal imports — right to your inbox.
            </p>
            {isSubscribed ? (
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <Check className="h-5 w-5" />
                <span>Thanks for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email" required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/8 border border-white/15 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
                    />
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-50">
                    {isLoading
                      ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </button>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </form>
            )}

            {/* Specialty callout */}
            <div className="mt-6 p-3 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10">
              <p className="text-xs text-white/70 leading-relaxed">
                <span className="text-[var(--color-accent)] font-semibold">Fresh daily:</span>{' '}
                Pierogies · Cabbage Rolls · Borscht · Kapusta · Blintzes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Copyright ── */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} European Market. All rights reserved.
          </p>
          <p className="text-white/20 text-xs">
            155 W Mills Street, Columbus, NC 28722 · (864) 590-6760
          </p>
        </div>
      </div>
    </footer>
  );
}
