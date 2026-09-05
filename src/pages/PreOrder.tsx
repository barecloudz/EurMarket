import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Phone, MapPin, Clock, AlertCircle, ChevronLeft, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  served_cities: string[];
}

interface MenuItem {
  id: string;
  flag?: string;
  emoji: string;
  name: string;
  category?: string;
  sizes: { label: string; priceNote: string }[];
  flavors: string[];
}

const MENU: MenuItem[] = [
  {
    id: 'paczki',
    flag: '🇵🇱',
    emoji: '🍩',
    category: 'Preorder Homemade',
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
    category: 'Preorder Homemade',
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
    category: 'Preorder Homemade',
    name: 'Sweet Pierogies with Sour Cream Topping',
    sizes: [
      { label: '6 pieces', priceNote: '$12' },
    ],
    flavors: ['Strawberry', 'Cherry'],
  },
  {
    id: 'pirozhki',
    emoji: '🥟',
    category: 'Preorder Homemade',
    name: 'Ukrainian Pirozhki',
    sizes: [
      { label: 'Each', priceNote: '$3 each  ·  4 for $10' },
    ],
    flavors: ['Potato Filling', 'Cabbage'],
  },
  {
    id: 'cabbage-rolls',
    emoji: '🥬',
    category: 'Preorder Homemade',
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
    category: 'Preorder Homemade',
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
    category: 'Preorder Homemade',
    name: 'Homemade Sweet Cheese Rolls',
    sizes: [
      { label: 'Small', priceNote: '$6–$7' },
      { label: 'Medium', priceNote: '$8–$9' },
      { label: 'Large', priceNote: '$10–$12' },
    ],
    flavors: ['With Raisins', 'Without Raisins'],
  },
  // ── British Meats ──────────────────────────────────────────────────────────
  { id: 'brit-chipolata', flag: '🇬🇧', emoji: '🌭', category: 'Preorder British Meats', name: 'Classic English Chipolata Sausages', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-classic-sausages', flag: '🇬🇧', emoji: '🌭', category: 'Preorder British Meats', name: "Classic Sausages - Parker's Finest", sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-white-pudding', flag: '🇬🇧', emoji: '🍖', category: 'Preorder British Meats', name: 'White Pudding', sizes: [{ label: '9-10 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-bacon-smoked', flag: '🇬🇧', emoji: '🥓', category: 'Preorder British Meats', name: 'English Bacon - Smoked', sizes: [{ label: '16 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-black-pudding', flag: '🇬🇧', emoji: '🍖', category: 'Preorder British Meats', name: 'Black Pudding', sizes: [{ label: '9-10 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-cocktail-sausages', flag: '🇬🇧', emoji: '🌭', category: 'Preorder British Meats', name: 'British Cocktail Sausages', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-welsh-dragon', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', emoji: '🌭', category: 'Preorder British Meats', name: 'Welsh Dragon Sausages', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-jumbo-roll', flag: '🇬🇧', emoji: '🥐', category: 'Preorder British Meats', name: "Jumbo Sausage Roll - Parker's Finest", sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-bacon-wet', flag: '🇬🇧', emoji: '🥓', category: 'Preorder British Meats', name: 'English Bacon - Wet Cured', sizes: [{ label: '16 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-pork-pie', flag: '🇬🇧', emoji: '🥧', category: 'Preorder British Meats', name: "Classic Pork Pie - Parker's Finest", sizes: [{ label: '7 oz', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-lincolnshire', flag: '🇬🇧', emoji: '🌭', category: 'Preorder British Meats', name: 'Lincolnshire Chipolata Sausages', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-cornish-pasty', flag: '🇬🇧', emoji: '🥧', category: 'Preorder British Meats', name: "Cornish Pasty - Parker's Finest", sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-shepherds-pie', flag: '🇬🇧', emoji: '🥘', category: 'Preorder British Meats', name: "Shepherd's Pie", sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-bread-rolls', flag: '🇬🇧', emoji: '🍞', category: 'Preorder British Meats', name: 'Large White Bread Rolls', sizes: [{ label: 'Per Pack', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-sticky-toffee', flag: '🇬🇧', emoji: '🍮', category: 'Preorder British Meats', name: 'Sticky Toffee Sponge Pudding', sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-syrup-sponge', flag: '🇬🇧', emoji: '🍮', category: 'Preorder British Meats', name: 'Syrup Sponge Pudding', sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
  { id: 'brit-beef-onion-pie', flag: '🇬🇧', emoji: '🥧', category: 'Preorder British Meats', name: 'Beef & Onion Pie', sizes: [{ label: 'Each', priceNote: 'Price TBD' }], flavors: [] },
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

function parseCityParts(cityStr: string) {
  const commaIdx = cityStr.lastIndexOf(',');
  if (commaIdx === -1) return { cityName: cityStr, state: '' };
  return { cityName: cityStr.slice(0, commaIdx).trim(), state: cityStr.slice(commaIdx + 1).trim() };
}

function formatDateCard(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'long' }),
    monthDay: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
  };
}

type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = ['Where & When', 'Menu', 'Your Info', 'Review'];

export default function PreOrder() {
  const [settings, setSettings] = useState<PreorderSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [stepDir, setStepDir] = useState<'fwd' | 'back'>('fwd');

  // Step 1: Where & When
  const [city, setCity] = useState('');
  const [selectedDateIdx, setSelectedDateIdx] = useState('');

  // Step 2: Menu
  const [qtys, setQtys] = useState<Record<string, number>>({});

  // Step 3: Your Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Notify me (orders closed)
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setLoadingSettings(false), 5000);
    fetch('/.netlify/functions/get-preorder-settings')
      .then(res => res.json())
      .then(data => { if (data) setSettings(data as PreorderSettings); })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setLoadingSettings(false); });
    return () => clearTimeout(timeout);
  }, []);

  const makeKey = (id: string, size: string, flavor: string) =>
    flavor ? `${id}||${size}||${flavor}` : `${id}||${size}`;
  const getQty = (id: string, size: string, flavor: string) =>
    qtys[makeKey(id, size, flavor)] ?? 0;
  const setQty = (id: string, size: string, flavor: string, val: number) =>
    setQtys(prev => ({ ...prev, [makeKey(id, size, flavor)]: Math.max(0, val) }));

  const orderLines = Object.entries(qtys)
    .filter(([, qty]) => qty > 0)
    .map(([k, qty]) => {
      const [id, size, flavor] = k.split('||');
      const item = (settings?.menu && settings.menu.length > 0 ? settings.menu : MENU).find(m => m.id === id);
      return { product: item?.name ?? id, size, flavor: flavor ?? '', qty };
    });

  const hasItems = orderLines.length > 0;
  const totalQty = orderLines.reduce((sum, l) => sum + l.qty, 0);

  const availableDates = useMemo(() => {
    const filtered = settings?.delivery_dates?.filter(d =>
      d.cities.includes(city)
    ) ?? [];
    return filtered.slice().sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.time ?? '').localeCompare(b.time ?? '');
    });
  }, [settings?.delivery_dates, city]);

  const selectedIdx = selectedDateIdx !== '' ? parseInt(selectedDateIdx) : -1;
  const pickedDate = selectedIdx >= 0 ? availableDates[selectedIdx] : undefined;
  const deliveryDate = pickedDate?.date ?? '';

  const activeMenu = (settings?.menu && settings.menu.length > 0) ? settings.menu : MENU;

  // Read cities directly from served_cities (first-class admin concept)
  const availableCities: string[] = settings?.served_cities ?? [];

  const goToStep = (s: Step) => {
    setError('');
    setStepDir(s > step ? 'fwd' : 'back');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s);
  };

  const validateStep3 = (): boolean => {
    if (!name.trim()) { setError('Please enter your name.'); return false; }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) { setError('Please enter a valid phone number (at least 10 digits).'); return false; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.'); return false;
    }
    return true;
  };

  const handleSubmit = async () => {
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

  // ── Wizard ──
  const step1Done = !!city && !!deliveryDate;

  return (
    <div className="min-h-screen bg-[#FFF8F0]" style={tnr}>

      {/* Header */}
      <div className="bg-[#CC0000] text-white text-center py-5 px-4">
        <h1 className="font-display text-3xl md:text-4xl font-black mb-0.5">Pre-Order</h1>
        <p className="text-white/80 text-sm">Homemade European Specialties</p>
      </div>

      {/* Deadline banner */}
      {settings?.order_deadline && !isDeadlinePassed(settings.order_deadline) && (
        <div className="bg-amber-50 border-b-2 border-amber-300 px-4 py-2.5 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-800">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-bold">
              Order deadline: <span className="text-amber-900">{formatDeadline(settings.order_deadline)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Progress bar — sticky */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center">
            {STEP_LABELS.map((label, i) => {
              const stepNum = (i + 1) as Step;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={label} className="flex items-center flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => isDone ? goToStep(stepNum) : undefined}
                    aria-label={`Step ${stepNum}: ${label}${isDone ? ' (completed)' : isActive ? ' (current)' : ''}`}
                    className={`flex flex-col items-center gap-0.5 flex-shrink-0 ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                      isActive ? 'bg-[#CC0000] text-white' :
                      isDone ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-400'
                    }`}>
                      {isDone ? '✓' : stepNum}
                    </div>
                    <span className={`text-[9px] font-bold leading-tight whitespace-nowrap ${
                      isActive ? 'text-[#CC0000]' : isDone ? 'text-green-600' : 'text-gray-400'
                    }`}>{label}</span>
                  </button>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1.5 rounded-full transition-colors ${step > stepNum ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-32">

        {/* ── Step 1: Where & When ── */}
        {step === 1 && (
          <div className={stepDir === 'fwd' ? 'animate-step-in-fwd' : 'animate-step-in-back'}>
            <h2 className="text-2xl font-black text-gray-900 mb-0.5">Where are you picking up?</h2>
            <p className="text-gray-500 text-sm mb-5">Select your city, then choose a date</p>

            {/* City cards */}
            {availableCities.length === 0 ? (
              <div className="text-center py-12 mb-6 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                <p className="text-lg font-black text-gray-700">No cities set up yet</p>
                <p className="text-sm text-gray-400 mt-1">Check back soon — we're adding locations!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {availableCities.map((c, idx) => {
                  const { cityName, state } = parseCityParts(c);
                  const isSelected = city === c;
                  const isLastOdd = idx === availableCities.length - 1 && availableCities.length % 2 !== 0;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setCity(c); setSelectedDateIdx(''); }}
                      className={`rounded-2xl border-2 p-4 text-left transition-all active:scale-95 ${isLastOdd ? 'col-span-2 max-w-[calc(50%-6px)]' : ''} ${
                        isSelected
                          ? 'border-[#CC0000] bg-[#CC0000]/5 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <MapPin className={`w-4 h-4 ${isSelected ? 'text-[#CC0000]' : 'text-gray-400'}`} />
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#CC0000] flex items-center justify-center">
                            <span className="text-white text-[9px] font-black">✓</span>
                          </div>
                        )}
                      </div>
                      <p className={`font-black text-base leading-tight ${isSelected ? 'text-[#CC0000]' : 'text-gray-800'}`}>{cityName}</p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-[#CC0000]/70' : 'text-gray-400'}`}>{state}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Date slot cards — appears after city selected */}
            {city && (
              <div>
                <h3 className="text-base font-black text-gray-900 mb-3">
                  Pick a pickup date in <span className="text-[#CC0000]">{city}</span>
                </h3>
                {availableDates.length === 0 ? (
                  <div className="flex items-center gap-3 text-amber-700 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">No dates available for {city} yet. Please check back soon or text us at (864) 590-6760.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableDates.map((d, i) => {
                      const { dayOfWeek, monthDay } = formatDateCard(d.date);
                      const isSelected = selectedDateIdx === String(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedDateIdx(String(i))}
                          className={`w-full rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                            isSelected
                              ? 'border-[#CC0000] bg-[#CC0000]/5 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className={`font-black text-lg leading-tight ${isSelected ? 'text-[#CC0000]' : 'text-gray-800'}`}>{dayOfWeek}</p>
                              <p className={`text-sm ${isSelected ? 'text-[#CC0000]/80' : 'text-gray-500'}`}>{monthDay}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                {d.time && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#CC0000]' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${isSelected ? 'text-[#CC0000]' : 'text-gray-600'}`}>{d.time}</span>
                                  </div>
                                )}
                                {d.location_address && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#CC0000]' : 'text-gray-400'}`} />
                                    <span className={`text-sm ${isSelected ? 'text-[#CC0000]/80' : 'text-gray-500'} truncate`}>{d.location_address}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-8 h-8 rounded-full bg-[#CC0000] flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Menu ── */}
        {step === 2 && (
          <div className={stepDir === 'fwd' ? 'animate-step-in-fwd' : 'animate-step-in-back'}>
            <button type="button" onClick={() => goToStep(1)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm font-bold">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-0.5">What would you like?</h2>
            <p className="text-gray-500 text-sm mb-5">
              Pickup: <strong className="text-gray-700">{city}</strong>
              {pickedDate?.label && <span> · {pickedDate.label}</span>}
              {pickedDate?.time && <span> · {pickedDate.time}</span>}
            </p>

            {Array.from(new Set(activeMenu.map(item => item.category ?? 'Menu'))).map(cat => (
              <div key={cat}>
                <h3 className="text-xl font-black text-gray-900 mt-6 mb-3 pb-2 border-b-2 border-gray-100" style={tnr}>{cat}</h3>
                {activeMenu.filter(item => (item.category ?? 'Menu') === cat).map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-4 shadow-sm">
                    <div className="border-b border-[#CC0000]/20 pb-3 mb-4">
                      <h3 className="text-lg font-black text-gray-900 leading-tight">
                        {item.flag && <span className="mr-1">{item.flag}</span>}{item.emoji} {item.name}
                      </h3>
                    </div>

                    {item.flavors.length === 0 ? (
                      <div className="divide-y divide-gray-100">
                        {item.sizes.map(size => (
                          <div key={size.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                            <div>
                              <p className="font-bold text-gray-900">{size.label}</p>
                              <p className="text-[#CC0000] font-semibold text-sm">{size.priceNote}</p>
                            </div>
                            <QtyInput value={getQty(item.id, size.label, '')} onChange={v => setQty(item.id, size.label, '', v)} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      item.sizes.map(size => (
                        <div key={size.label} className="mb-5 last:mb-0">
                          <div className="flex items-baseline gap-3 mb-3">
                            <span className="font-bold text-gray-900">{size.label}</span>
                            <span className="text-[#CC0000] font-semibold text-sm">{size.priceNote}</span>
                          </div>
                          <div className="divide-y divide-gray-50 pl-2">
                            {item.flavors.map(flavor => (
                              <div key={flavor} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                                <p className="text-gray-700 text-sm">{flavor}</p>
                                <QtyInput value={getQty(item.id, size.label, flavor)} onChange={v => setQty(item.id, size.label, flavor, v)} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            ))}

            {!hasItems && (
              <p className="text-center text-gray-400 text-sm py-2">Select at least one item to continue</p>
            )}
          </div>
        )}

        {/* ── Step 3: Your Info ── */}
        {step === 3 && (
          <div className={stepDir === 'fwd' ? 'animate-step-in-fwd' : 'animate-step-in-back'}>
            <button type="button" onClick={() => goToStep(2)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm font-bold">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-0.5">Your information</h2>
            <p className="text-gray-500 text-sm mb-5">We'll text you to confirm your order</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Name <span className="text-[#CC0000]">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="First and Last Name" style={tnr}
                  className="w-full text-lg border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#CC0000] transition-colors" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Phone Number <span className="text-[#CC0000]">*</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="(000) 000-0000" style={tnr}
                  className="w-full text-lg border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#CC0000] transition-colors" />
                <p className="text-xs text-gray-500 mt-1">We'll text you to confirm your order and pickup details</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Email <span className="text-[#CC0000]">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" style={tnr}
                  className="w-full text-lg border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#CC0000] transition-colors" />
                <p className="text-xs text-gray-500 mt-1">We'll email you your confirmed order with prices and payment options</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">
                  Special Notes <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any special requests..." rows={3} style={tnr}
                  className="w-full text-lg border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#CC0000] resize-none transition-colors" />
              </div>

              <div className="bg-[#FFF8F0] border-2 border-[#CC0000]/20 rounded-2xl p-4">
                <label className="block text-sm font-bold text-gray-800 mb-1">🌟 What else would you like to see?</label>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                  Another homemade dish or European product you'd love us to make or carry?
                </p>
                <textarea value={suggestions} onChange={e => setSuggestions(e.target.value)}
                  placeholder="e.g. Borscht, German bread, Ukrainian sausage, stuffed peppers..." rows={3} style={tnr}
                  className="w-full text-lg border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-[#CC0000] resize-none transition-colors bg-white" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-xl px-5 py-4 mt-4 text-sm leading-snug">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Review & Submit ── */}
        {step === 4 && (
          <div className={stepDir === 'fwd' ? 'animate-step-in-fwd' : 'animate-step-in-back'}>
            <button type="button" onClick={() => goToStep(3)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm font-bold">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-0.5">Review your order</h2>
            <p className="text-gray-500 text-sm mb-5">Everything look right? Tap submit and we'll be in touch!</p>

            {/* Pickup */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Pickup Details</p>
                <button type="button" onClick={() => goToStep(1)} className="text-xs text-[#CC0000] font-bold hover:underline">Edit</button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#CC0000] flex-shrink-0" />
                  <p className="font-bold text-gray-800">{city}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#CC0000] flex-shrink-0" />
                  <p className="text-gray-700">{pickedDate?.label ?? deliveryDate}</p>
                </div>
                {pickedDate?.time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#CC0000] flex-shrink-0" />
                    <p className="text-gray-700">{pickedDate.time}</p>
                  </div>
                )}
                {pickedDate?.location_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-500 text-sm">{pickedDate.location_address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Your Items ({totalQty})</p>
                <button type="button" onClick={() => goToStep(2)} className="text-xs text-[#CC0000] font-bold hover:underline">Edit</button>
              </div>
              <div className="divide-y divide-gray-50">
                {orderLines.map((line, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-bold text-gray-800 text-sm leading-snug">{line.product}</p>
                      <p className="text-xs text-gray-400">
                        {line.size}{line.flavor ? ` · ${line.flavor}` : ''}
                      </p>
                    </div>
                    <span className="text-[#CC0000] font-black flex-shrink-0">×{line.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact info */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Your Info</p>
                <button type="button" onClick={() => goToStep(3)} className="text-xs text-[#CC0000] font-bold hover:underline">Edit</button>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-gray-800">{name}</p>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-gray-600 text-sm">{phone}</p>
                </div>
                <p className="text-gray-600 text-sm">{email}</p>
                {notes && <p className="text-gray-400 text-xs italic mt-1.5">"{notes}"</p>}
              </div>
            </div>

            <p className="text-center text-sm text-gray-400 italic leading-relaxed mt-4">
              ❤️ Thank you for supporting our small family business!<br />
              Fresh homemade European favorites made with love. 🇪🇺✨
            </p>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-xl px-5 py-4 mt-4 text-sm leading-snug">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom action bar — z-50 to sit above BottomNav (z-40) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
        <div className="max-w-lg mx-auto px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {step === 1 && (
            <button
              type="button"
              onClick={() => step1Done && goToStep(2)}
              disabled={!step1Done}
              className="w-full bg-[#CC0000] hover:bg-[#AA0000] disabled:opacity-40 disabled:cursor-not-allowed text-white text-lg font-black py-4 rounded-2xl transition-colors"
            >
              {step1Done ? 'Continue to Menu →' : 'Select city & date to continue'}
            </button>
          )}

          {step === 2 && (
            <div className="flex items-center gap-3">
              {hasItems && (
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700 flex-shrink-0">
                  <span className="w-7 h-7 rounded-full bg-[#CC0000] text-white text-xs font-black flex items-center justify-center">{totalQty}</span>
                  item{totalQty !== 1 ? 's' : ''}
                </div>
              )}
              <button
                type="button"
                onClick={() => hasItems && goToStep(3)}
                disabled={!hasItems}
                className="flex-1 bg-[#CC0000] hover:bg-[#AA0000] disabled:opacity-40 disabled:cursor-not-allowed text-white text-lg font-black py-4 rounded-2xl transition-colors"
              >
                {hasItems ? 'Continue →' : 'Select items to continue'}
              </button>
            </div>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={() => {
                setError('');
                if (validateStep3()) goToStep(4);
              }}
              className="w-full bg-[#CC0000] hover:bg-[#AA0000] text-white text-lg font-black py-4 rounded-2xl transition-colors"
            >
              Review Order →
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#CC0000] hover:bg-[#AA0000] disabled:opacity-60 text-white text-lg font-black py-4 rounded-2xl transition-colors"
            >
              {submitting ? 'Submitting...' : '🥟 Submit Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
