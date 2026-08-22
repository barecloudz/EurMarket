import { useState, useEffect } from 'react';
import { CheckCircle, Phone, MapPin, Clock, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CITIES = [
  'Hendersonville, NC',
  'Asheville, NC',
  'Marshall, NC',
  'Burnsville, NC',
  'Swannanoa, NC',
  'Hickory, NC',
  'Indian Land, NC',
  'Lexington, SC',
  'Columbia, SC',
  'Greenville, SC',
  'Anderson, SC',
];

interface DeliveryDate {
  date: string;
  label: string;
  cities: string[];
  time?: string;
  location_address?: string;
}

interface PreorderSettings {
  orders_open: boolean;
  order_deadline: string | null;
  delivery_dates: DeliveryDate[];
  menu: MenuItem[] | null;
}

interface MenuItem {
  id: string;
  flag?: string;
  emoji: string;
  name: string;
  sizes: { label: string; priceNote: string }[];
  flavors: string[];
}

const MENU: MenuItem[] = [
  {
    id: 'paczki',
    flag: '🇵🇱',
    emoji: '🍩',
    name: 'Homemade Paczki — Polish Donuts',
    sizes: [
      { label: 'Medium', priceNote: '$5 each  ·  4 for $16' },
      { label: 'Large', priceNote: '$6 each  ·  4 for $20' },
    ],
    flavors: ['Custard', 'Lemon', 'Cranberry', 'Strawberry', 'Blueberry', 'Lingonberry', 'Plum', 'Nutella', 'Dulce De Leche'],
  },
  {
    id: 'pierogies',
    emoji: '🥟',
    name: 'Homemade Pierogies',
    sizes: [
      { label: '6 pieces', priceNote: '$10' },
      { label: '12 pieces', priceNote: '$20' },
    ],
    flavors: ['Potato & Onion', 'Potato & Cheese', 'Potato & Cheddar Cheese', 'Sauerkraut', 'Sauerkraut & Mushroom', 'Spinach', 'Pork & Beef'],
  },
  {
    id: 'sweet-pierogies',
    emoji: '🍓',
    name: 'Sweet Pierogies with Sour Cream Topping',
    sizes: [
      { label: '6 pieces', priceNote: '$12' },
    ],
    flavors: ['Strawberry', 'Cherry'],
  },
  {
    id: 'pirozhki',
    emoji: '🥟',
    name: 'Ukrainian Pirozhki',
    sizes: [
      { label: 'Each', priceNote: '$3 each  ·  4 for $10' },
    ],
    flavors: ['Potato Filling', 'Cabbage'],
  },
  {
    id: 'cabbage-rolls',
    emoji: '🥬',
    name: 'Homemade Cabbage Rolls',
    sizes: [
      { label: 'Small Container', priceNote: '$8–$10' },
      { label: 'Medium Container', priceNote: '$13–$17' },
      { label: 'Large Container', priceNote: '$24–$30' },
    ],
    flavors: [],
  },
  {
    id: 'poppy-seed-rolls',
    emoji: '🍞',
    name: 'Homemade Poppy Seed Rolls',
    sizes: [
      { label: 'Small', priceNote: '$5–$6' },
      { label: 'Medium', priceNote: '$7–$8' },
      { label: 'Large', priceNote: '$10–$12' },
    ],
    flavors: [],
  },
  {
    id: 'cheese-rolls',
    emoji: '🧀',
    name: 'Homemade Sweet Cheese Rolls',
    sizes: [
      { label: 'Small', priceNote: '$6–$7' },
      { label: 'Medium', priceNote: '$8–$9' },
      { label: 'Large', priceNote: '$10–$12' },
    ],
    flavors: ['With Raisins', 'Without Raisins'],
  },
];

const tnr: React.CSSProperties = { fontFamily: '"Times New Roman", Times, Georgia, serif' };

function QtyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button type="button" onClick={() => onChange(value - 1)}
        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-2xl font-bold flex items-center justify-center transition-colors leading-none">−</button>
      <span className="w-8 text-center text-xl font-bold text-gray-900" style={tnr}>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-10 h-10 rounded-full bg-[#CC0000] hover:bg-[#AA0000] text-white text-2xl font-bold flex items-center justify-center transition-colors leading-none">+</button>
    </div>
  );
}

function formatDeadline(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isDeadlinePassed(isoString: string | null) {
  if (!isoString) return false;
  return new Date() > new Date(isoString);
}

export default function PreOrder() {
  const [settings, setSettings] = useState<PreorderSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setLoadingSettings(false), 5000);
    fetch('/.netlify/functions/get-preorder-settings')
      .then(res => res.json())
      .then(data => { if (data) setSettings(data as PreorderSettings); })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setLoadingSettings(false);
      });
    return () => clearTimeout(timeout);
  }, []);

  const makeKey = (id: string, size: string, flavor: string) =>
    flavor ? `${id}||${size}||${flavor}` : `${id}||${size}`;

  const getQty = (id: string, size: string, flavor: string) =>
    qtys[makeKey(id, size, flavor)] ?? 0;

  const setQty = (id: string, size: string, flavor: string, val: number) =>
    setQtys((prev) => ({ ...prev, [makeKey(id, size, flavor)]: Math.max(0, val) }));

  const orderLines = Object.entries(qtys)
    .filter(([, qty]) => qty > 0)
    .map(([k, qty]) => {
      const [id, size, flavor] = k.split('||');
      const item = MENU.find((m) => m.id === id);
      return { product: item?.name ?? id, size, flavor: flavor ?? '', qty };
    });

  const hasItems = orderLines.length > 0;
  const totalQty = orderLines.reduce((sum, l) => sum + l.qty, 0);

  // Available dates for selected city
  const availableDates = settings?.delivery_dates?.filter(d =>
    d.cities.includes('all') || d.cities.includes(city)
  ) ?? [];

  const pickedDate = availableDates.find(d => d.date === deliveryDate);

  // Use DB menu if configured, otherwise fall back to hardcoded defaults
  const activeMenu = (settings?.menu && settings.menu.length > 0) ? settings.menu : MENU;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !city || !deliveryDate) {
      setError('Please fill in your name, phone number, pickup city, and delivery date.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address so we can send you your order confirmation.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!hasItems) {
      setError('Please select at least one item.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/submit-preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          city,
          delivery_date: deliveryDate,
          items: orderLines,
          notes: notes.trim(),
          suggestions: suggestions.trim(),
        }),
      });
      if (res.status === 409) {
        setError('Orders are currently closed. Please follow our Facebook page to be notified when the next order window opens.');
        return;
      }
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Something went wrong. Please text us at (864) 590-6760 to place your order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) return;
    setNotifySubmitting(true);
    try {
      const { data: existing } = await supabase
        .from('email_subscribers')
        .select('id, is_subscribed')
        .eq('email', notifyEmail.toLowerCase())
        .single();
      if (existing) {
        if (!existing.is_subscribed) {
          await supabase.from('email_subscribers')
            .update({ is_subscribed: true, source: 'preorder_notify', unsubscribed_at: null })
            .eq('id', existing.id);
        }
      } else {
        await supabase.from('email_subscribers').insert({
          email: notifyEmail.toLowerCase(),
          source: 'preorder_notify',
          is_subscribed: true,
          subscribed_at: new Date().toISOString(),
        });
      }
      setNotifySubmitted(true);
    } catch {
      setNotifySubmitted(true);
    } finally {
      setNotifySubmitting(false);
    }
  };

  // ── Loading ──
  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500" style={tnr}>Loading...</p>
        </div>
      </div>
    );
  }

  // ── Orders closed ──
  const ordersEffectivelyClosed = !settings?.orders_open || isDeadlinePassed(settings?.order_deadline ?? null);
  if (ordersEffectivelyClosed) {
    const deadlinePassed = isDeadlinePassed(settings?.order_deadline ?? null);
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <div className="bg-[#CC0000] text-white text-center py-8 px-4">
          <h1 className="font-display text-4xl md:text-5xl font-black mb-2">Pre-Order</h1>
          <p className="font-script text-xl md:text-2xl text-white/85">Homemade European Specialties</p>
        </div>

        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="flex justify-center gap-3 text-4xl mb-6 select-none">
            <span>🥟</span><span>🍩</span><span>🥬</span><span>🍞</span><span>🧀</span>
          </div>

          <h2 className="font-display text-3xl md:text-4xl font-black text-gray-900 mb-3 leading-tight">
            {deadlinePassed ? 'Order Window Has Closed' : 'Orders Opening Soon'}
          </h2>
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            {deadlinePassed
              ? "The deadline for this order period has passed. Sign up below and we'll email you when the next window opens!"
              : "We're not taking orders right now. Enter your email and we'll notify you as soon as orders open!"}
          </p>

          <div className="bg-white border-2 border-[#CC0000]/20 rounded-2xl p-5 mb-8 text-left shadow-sm">
            <p className="font-display font-bold text-[#CC0000] text-sm uppercase tracking-widest mb-3 text-center">Available to Pre-Order</p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {['🥟 Pierogies', '🍩 Paczki', '🥬 Cabbage Rolls', '🍞 Poppy Seed Rolls', '🧀 Sweet Cheese Rolls', '🥟 Ukrainian Pirozhki'].map(item => (
                <span key={item} className="text-sm text-gray-700 font-medium">{item}</span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            {notifySubmitted ? (
              <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-5 py-4 font-semibold">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                We'll email you when orders open!
              </div>
            ) : (
              <>
                <p className="text-gray-700 font-semibold mb-3">Get notified when orders open:</p>
                <form onSubmit={handleNotifySubmit} className="flex gap-2">
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#CC0000] text-gray-900 text-base transition-colors"
                  />
                  <button type="submit" disabled={notifySubmitting}
                    className="bg-[#CC0000] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#AA0000] transition-colors flex-shrink-0 disabled:opacity-60">
                    {notifySubmitting ? '...' : 'Notify Me'}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="text-gray-400 text-sm mb-4">— or —</div>

          <a href="https://www.facebook.com/profile.php?id=100085334597598" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#CC0000] font-bold border-2 border-[#CC0000] px-6 py-3 rounded-xl hover:bg-[#CC0000]/5 transition-colors mb-10">
            Follow Us on Facebook for Updates
          </a>

          <div className="bg-white border-2 border-[#CC0000]/20 rounded-2xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm mb-1">Questions? Text us:</p>
            <a href="sms:8645906760" className="font-display text-2xl font-black text-[#CC0000]">(864) 590-6760</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-lg w-full" style={tnr}>
          <CheckCircle className="h-20 w-20 text-[#CC0000] mx-auto mb-5" />
          <h1 className="font-display text-4xl md:text-5xl font-black text-[#CC0000] mb-4">Order Received!</h1>
          <p className="text-2xl text-gray-700 mb-4 leading-relaxed">
            Thank you, <strong>{name}</strong>!<br />
            Pickup in <strong>{city}</strong> on <strong>{pickedDate?.label ?? deliveryDate}</strong>.
          </p>
          {(pickedDate?.time || pickedDate?.location_address) && (
            <div className="bg-white border-2 border-[#CC0000]/20 rounded-2xl p-5 mb-6 text-left">
              {pickedDate?.time && (
                <p className="text-lg text-gray-700 mb-1.5">🕐 <strong>Time:</strong> {pickedDate.time}</p>
              )}
              {pickedDate?.location_address && (
                <p className="text-lg text-gray-700">📍 <strong>Location:</strong> {pickedDate.location_address}</p>
              )}
            </div>
          )}
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            We will <strong>text</strong> you at <strong>{phone}</strong> to confirm your order.
          </p>
          <div className="bg-[#CC0000] text-white rounded-2xl p-6 mb-6">
            <p className="text-xl font-bold mb-1">Questions? Text us:</p>
            <a href="sms:8645906760" className="text-3xl font-bold">(864) 590-6760</a>
          </div>
          <p className="text-lg text-gray-500 italic leading-relaxed">
            ❤️ Thank you for supporting our small family business!<br />
            Fresh homemade European favorites made with love. 🇪🇺✨
          </p>
        </div>
      </div>
    );
  }

  const menuUnlocked = !!city && !!deliveryDate;

  // ── Order form ──
  return (
    <div className="min-h-screen bg-[#FFF8F0]" style={tnr}>

      {/* Header */}
      <div className="bg-[#CC0000] text-white text-center py-8 px-4">
        <h1 className="font-display text-4xl md:text-5xl font-black mb-2">Place a Pre-Order</h1>
        <p className="font-script text-xl md:text-2xl text-white/85">Homemade European Specialties — Fresh Made to Order</p>
      </div>

      {/* Deadline banner */}
      {settings?.order_deadline && (
        <div className="bg-amber-50 border-b-2 border-amber-300 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-800">
            <Clock className="h-5 w-5 flex-shrink-0" />
            <p className="text-lg font-bold">
              Order deadline: <span className="text-amber-900">{formatDeadline(settings.order_deadline)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Contact bar */}
      <div className="bg-white border-b-2 border-[#CC0000]/20 py-3 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2 sm:gap-8 items-center justify-center">
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="h-4 w-4 text-[#CC0000] flex-shrink-0" />
            <span className="text-lg"><strong>Text us:</strong> (864) 590-6760</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="h-4 w-4 text-[#CC0000] flex-shrink-0" />
            <span className="text-lg">Pickup in <strong>NC &amp; SC</strong></span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} noValidate>

          {/* ── STEP 1: YOUR INFO ── */}
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 border-b-2 border-[#CC0000] pb-3 mb-5">
              <span className="w-8 h-8 rounded-full bg-[#CC0000] text-white text-sm font-black flex items-center justify-center flex-shrink-0">1</span>
              <h2 className="text-2xl font-bold text-gray-900">Your Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xl font-bold text-gray-800 mb-2">Your Name <span className="text-[#CC0000]">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="First and Last Name" style={tnr}
                  className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] transition-colors" />
              </div>

              <div>
                <label className="block text-xl font-bold text-gray-800 mb-2">Phone Number <span className="text-[#CC0000]">*</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="(000) 000-0000" style={tnr}
                  className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] transition-colors" />
                <p className="text-base text-gray-500 mt-1.5">We will <strong>text</strong> you to confirm your order and pickup details.</p>
              </div>

              <div>
                <label className="block text-xl font-bold text-gray-800 mb-2">Email <span className="text-[#CC0000]">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" style={tnr}
                  className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] transition-colors" />
                <p className="text-base text-gray-500 mt-1.5">We'll email you your confirmed order with prices and payment options.</p>
              </div>

              <div>
                <label className="block text-xl font-bold text-gray-800 mb-2">Pickup City <span className="text-[#CC0000]">*</span></label>
                <div className="relative">
                  <select value={city} onChange={(e) => { setCity(e.target.value); setDeliveryDate(''); }} style={tnr}
                    className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] bg-white transition-colors appearance-none pr-10">
                    <option value="">— Select your city —</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {city && (
                <div>
                  <label className="block text-xl font-bold text-gray-800 mb-2">Pickup Date <span className="text-[#CC0000]">*</span></label>
                  {availableDates.length === 0 ? (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3.5">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <p className="text-lg">No dates available for {city} yet. Please check back or text us.</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <select value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} style={tnr}
                          className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] bg-white transition-colors appearance-none pr-10">
                          <option value="">— Select a date —</option>
                          {availableDates.map((d) => {
                            const dateStr = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                            const label = d.label && d.label !== dateStr ? `${dateStr} — ${d.label}` : dateStr;
                            return <option key={d.date} value={d.date}>{label}</option>;
                          })}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                      {deliveryDate && (pickedDate?.time || pickedDate?.location_address) && (
                        <div className="mt-3 bg-[#FFF8F0] border-2 border-[#CC0000]/20 rounded-xl px-4 py-3 space-y-1">
                          {pickedDate?.time && (
                            <p className="text-lg text-gray-700">🕐 <strong>Time:</strong> {pickedDate.time}</p>
                          )}
                          {pickedDate?.location_address && (
                            <p className="text-lg text-gray-700">📍 <strong>Location:</strong> {pickedDate.location_address}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 2: CHOOSE ITEMS ── */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-8 h-8 rounded-full text-sm font-black flex items-center justify-center flex-shrink-0 transition-colors ${menuUnlocked ? 'bg-[#CC0000] text-white' : 'bg-gray-200 text-gray-400'}`}>2</span>
            <h2 className={`text-2xl font-bold transition-colors ${menuUnlocked ? 'text-gray-900' : 'text-gray-400'}`}>Choose Your Items</h2>
          </div>

          {!menuUnlocked ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center mb-6">
              <div className="flex justify-center gap-2 text-3xl mb-4 opacity-40 select-none">
                <span>🥟</span><span>🍩</span><span>🥬</span><span>🍞</span><span>🧀</span>
              </div>
              <p className="text-xl text-gray-400 font-medium">
                Select your <strong className="text-gray-500">city</strong> and <strong className="text-gray-500">pickup date</strong> above to see the menu
              </p>
            </div>
          ) : (
            <>
              {activeMenu.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-4 shadow-sm">
                  <div className="border-b-2 border-[#CC0000] pb-3 mb-4">
                    <h3 className="text-2xl md:text-3xl font-bold text-[#CC0000] leading-tight">
                      {item.flag && <span className="mr-1">{item.flag}</span>}{item.emoji} {item.name}
                    </h3>
                  </div>

                  {item.flavors.length === 0 ? (
                    <div className="divide-y divide-gray-100">
                      {item.sizes.map((size) => (
                        <div key={size.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                          <div>
                            <p className="text-xl font-bold text-gray-900">{size.label}</p>
                            <p className="text-lg text-[#CC0000] font-semibold">{size.priceNote}</p>
                          </div>
                          <QtyInput value={getQty(item.id, size.label, '')} onChange={(v) => setQty(item.id, size.label, '', v)} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    item.sizes.map((size) => (
                      <div key={size.label} className="mb-5 last:mb-0">
                        <div className="flex items-baseline gap-3 mb-3">
                          <span className="text-xl font-bold text-gray-900">{size.label}</span>
                          <span className="text-lg text-[#CC0000] font-semibold">{size.priceNote}</span>
                        </div>
                        <div className="divide-y divide-gray-50 pl-2">
                          {item.flavors.map((flavor) => (
                            <div key={flavor} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                              <p className="text-lg text-gray-700">{flavor}</p>
                              <QtyInput value={getQty(item.id, size.label, flavor)} onChange={(v) => setQty(item.id, size.label, flavor, v)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}

              {/* Order summary */}
              {hasItems && (
                <div className="bg-[#CC0000] text-white rounded-2xl p-6 mb-5 shadow-md">
                  <h3 className="text-2xl font-bold mb-4 border-b border-white/30 pb-2">Your Order So Far</h3>
                  <div className="space-y-2">
                    {orderLines.map((line, i) => (
                      <div key={i} className="flex justify-between items-start gap-4 text-lg">
                        <span className="leading-snug">
                          {line.product}
                          {line.size ? <span className="text-white/80"> ({line.size})</span> : null}
                          {line.flavor ? <span className="text-white/80"> — {line.flavor}</span> : null}
                        </span>
                        <span className="font-bold flex-shrink-0">× {line.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes + Suggestions */}
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-5 shadow-sm space-y-4">
                <div>
                  <label className="block text-xl font-bold text-gray-800 mb-2">Special Notes <span className="text-lg font-normal text-gray-500">(optional)</span></label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests..." rows={3} style={tnr}
                    className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] resize-none transition-colors" />
                </div>

                <div className="bg-[#FFF8F0] border-2 border-[#CC0000]/20 rounded-xl p-5">
                  <label className="block text-xl font-bold text-gray-800 mb-2">
                    🌟 What else would you like to see?
                  </label>
                  <p className="text-base text-gray-600 mb-3 leading-relaxed">
                    Is there another homemade dish or European product you'd love us to make or carry? Let us know!
                  </p>
                  <textarea value={suggestions} onChange={(e) => setSuggestions(e.target.value)}
                    placeholder="e.g. Borscht, German bread, Ukrainian sausage, stuffed peppers..." rows={3} style={tnr}
                    className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] resize-none transition-colors bg-white" />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-xl px-5 py-4 mb-4 text-xl leading-snug">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full bg-[#CC0000] hover:bg-[#AA0000] disabled:opacity-60 text-white text-2xl font-bold py-5 rounded-2xl transition-colors shadow-lg" style={tnr}>
                {submitting ? 'Sending Your Order...' : 'Submit Order'}
              </button>

              <p className="text-center text-xl text-gray-500 mt-6 mb-4 italic leading-relaxed" style={tnr}>
                ❤️ Thank you for supporting our small family business!<br />
                Fresh homemade European favorites made with love. 🇪🇺✨
              </p>
            </>
          )}

          {/* Error shown even if menu not unlocked yet (e.g. city/date missing on submit) */}
          {!menuUnlocked && error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-xl px-5 py-4 mb-4 text-xl leading-snug">
              {error}
            </div>
          )}

        </form>
      </div>

      {/* Sticky floating order bar */}
      {hasItems && menuUnlocked && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-3xl mx-auto px-4 pb-4 pointer-events-auto">
            <div className="bg-gray-900 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#CC0000] text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                  {totalQty}
                </span>
                <span className="font-bold text-base">
                  {totalQty === 1 ? '1 item' : `${totalQty} items`} in your order
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const btn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
                  btn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="bg-[#CC0000] hover:bg-[#AA0000] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
                Submit Order ↓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
