import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, Check, MapPin, Phone, Clock, Facebook } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStoreLocation } from '../../hooks/useStoreLocation';

const COUNTRIES = [
  { code: 'de', name: 'Germany'    },
  { code: 'pl', name: 'Poland'     },
  { code: 'gb', name: 'England'    },
  { code: 'ie', name: 'Ireland'    },
  { code: 'ua', name: 'Ukraine'    },
  { code: 'cz', name: 'Czech Rep.' },
  { code: 'hu', name: 'Hungary'    },
  { code: 'ro', name: 'Romania'    },
  { code: 'ru', name: 'Russia'     },
  { code: 'sk', name: 'Slovakia'   },
  { code: 'lt', name: 'Lithuania'  },
  { code: 'lv', name: 'Latvia'     },
];

export default function Footer() {
  const { data: store, compactHours } = useStoreLocation('columbus-nc');
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
    <footer className="bg-[#FFF8F0] border-t-4 border-[#CC0000] mt-auto">

      {/* ── Pre-order CTA strip ── */}
      <div className="bg-[#CC0000] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-display font-bold text-lg leading-tight">Ready to order homemade goodies?</p>
            <p className="text-white/80 text-sm">Pierogies · Paczki · Cabbage Rolls · Poppyseed Rolls &amp; more</p>
          </div>
          <Link to="/preorder"
            className="flex-shrink-0 bg-white text-[#CC0000] font-bold px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm shadow-sm">
            Place a Pre-Order →
          </Link>
        </div>
      </div>

      {/* ── Countries strip ── */}
      <div className="border-b border-[#CC0000]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
            Products from 25+ countries
          </p>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <span key={c.name}
                className="flex items-center gap-1.5 bg-white border border-[#CC0000]/15 px-2.5 py-1 rounded-full text-xs font-medium text-gray-600">
                <img src={`https://flagcdn.com/20x15/${c.code}.png`} alt={c.name} className="w-4 h-auto rounded-sm" />
                {c.name}
              </span>
            ))}
            <span className="flex items-center gap-1.5 bg-[#CC0000]/10 border border-[#CC0000]/20 px-2.5 py-1 rounded-full text-xs font-medium text-[#CC0000]">
              + 13 more
            </span>
          </div>
        </div>
      </div>

      {/* ── Main footer ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand + Store info */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src="/logo.jpg" alt="European Market" className="h-10 w-10 object-cover rounded-lg shadow-sm" />
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Authentic</span>
                <span className="font-display text-base font-black text-[#CC0000] tracking-tight">European Market</span>
              </div>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Fresh homemade European specialties &amp; imported groceries from 25+ countries.
            </p>
            <div className="space-y-2.5 text-sm">
              <a href="https://maps.google.com/?q=155+W+Mills+St+Columbus+NC" target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2.5 text-gray-600 hover:text-[#CC0000] transition-colors">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#CC0000]" />
                <span>155 W Mills Street<br />Columbus, NC 28722</span>
              </a>
              <a href="tel:+18645906760"
                className="flex items-center gap-2.5 text-gray-600 hover:text-[#CC0000] transition-colors">
                <Phone className="h-4 w-4 flex-shrink-0 text-[#CC0000]" />
                (864) 590-6760
              </a>
              <div className="flex items-start gap-2.5 text-gray-600">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#CC0000]" />
                {compactHours.length > 0 ? (
                  <span>
                    {compactHours.map((line, i) => {
                      const isClosed = line.toLowerCase().includes('closed');
                      return (
                        <span key={i} className={isClosed ? 'text-gray-400' : undefined}>
                          {line}{i < compactHours.length - 1 && <br />}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <span>Mon – Thu: 11AM – 6PM<br /><span className="text-gray-400">Fri – Sun: Closed</span></span>
                )}
              </div>
              <a href="https://www.facebook.com/profile.php?id=100085334597598" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-gray-600 hover:text-[#CC0000] transition-colors">
                <Facebook className="h-4 w-4 flex-shrink-0 text-[#CC0000]" />
                Follow us on Facebook
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-widest">Shop</h3>
            <nav className="flex flex-col space-y-2.5">
              {[
                { to: '/preorder',               label: 'Place a Pre-Order' },
                { to: '/products',               label: 'All Products' },
                { to: '/products?category=meats',     label: 'Meats & Deli' },
                { to: '/products?category=dairy',     label: 'Dairy & Cheese' },
                { to: '/products?category=bakery',    label: 'Fresh Bakery' },
                { to: '/products?category=beverages', label: 'Beverages' },
              ].map((link) => (
                <Link key={link.to} to={link.to}
                  className={`text-sm transition-colors ${link.to === '/preorder' ? 'text-[#CC0000] font-bold' : 'text-gray-500 hover:text-[#CC0000]'}`}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Account + Info */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-widest">Account</h3>
            <nav className="flex flex-col space-y-2.5 mb-6">
              {[
                { to: '/login',    label: 'Sign In' },
                { to: '/register', label: 'Create Account' },
                { to: '/account',  label: 'My Orders' },
                { to: '/wishlist', label: 'My Wishlist' },
              ].map((link) => (
                <Link key={link.to} to={link.to}
                  className="text-gray-500 hover:text-[#CC0000] text-sm transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
            <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-widest">Info</h3>
            <nav className="flex flex-col space-y-2.5">
              {[
                { to: '/return-policy',  label: 'Return Policy' },
                { to: '/privacy-policy', label: 'Privacy Policy' },
              ].map((link) => (
                <Link key={link.to} to={link.to}
                  className="text-gray-500 hover:text-[#CC0000] text-sm transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-gray-900 font-bold mb-2 text-sm uppercase tracking-widest">Stay Updated</h3>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed">
              Market dates, seasonal specials &amp; new arrivals — right to your inbox.
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
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email" required
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CC0000]/25 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-all"
                    />
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="px-4 py-2.5 bg-[#CC0000] text-white rounded-xl hover:bg-[#AA0000] transition-colors disabled:opacity-50">
                    {isLoading
                      ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </button>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
              </form>
            )}

            <div className="mt-5 p-4 rounded-xl border-2 border-[#CC0000]/20 bg-[#FFF8F0]">
              <p className="font-display font-bold text-[#CC0000] text-sm mb-1.5">Made Fresh Daily</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Pierogies · Paczki · Cabbage Rolls<br />
                Poppyseed Rolls · Borscht · Blintzes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Copyright ── */}
      <div className="border-t border-[#CC0000]/15 bg-[#CC0000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/70 text-xs">
            &copy; {new Date().getFullYear()} European Market — Columbus, NC. All rights reserved.
          </p>
          <p className="text-white/50 text-xs">
            {store?.address ?? '155 W Mills Street, Columbus, NC 28722'} · {store?.phoneNumber ?? '(864) 590-6760'}
            {compactHours[0] ? ` · ${compactHours[0]}` : ' · Mon–Thu 11AM–6PM'}
          </p>
        </div>
      </div>
    </footer>
  );
}
