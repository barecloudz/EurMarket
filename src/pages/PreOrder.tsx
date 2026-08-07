import { useState } from 'react';
import { CheckCircle, Phone, MapPin } from 'lucide-react';

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
      { label: 'Small Container', priceNote: '$9' },
      { label: 'Medium Container', priceNote: '$10' },
      { label: 'Large Container', priceNote: '$11' },
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
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-2xl font-bold flex items-center justify-center transition-colors leading-none"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-8 text-center text-xl font-bold text-gray-900" style={tnr}>{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-10 h-10 rounded-full bg-[#CC0000] hover:bg-[#AA0000] text-white text-2xl font-bold flex items-center justify-center transition-colors leading-none"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

export default function PreOrder() {
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const makeKey = (id: string, size: string, flavor: string) =>
    flavor ? `${id}||${size}||${flavor}` : `${id}||${size}`;

  const getQty = (id: string, size: string, flavor: string) =>
    qtys[makeKey(id, size, flavor)] ?? 0;

  const setQty = (id: string, size: string, flavor: string, val: number) => {
    setQtys((prev) => ({ ...prev, [makeKey(id, size, flavor)]: Math.max(0, val) }));
  };

  const orderLines = Object.entries(qtys)
    .filter(([, qty]) => qty > 0)
    .map(([k, qty]) => {
      const [id, size, flavor] = k.split('||');
      const item = MENU.find((m) => m.id === id);
      return { product: item?.name ?? id, size, flavor: flavor ?? '', qty };
    });

  const hasItems = orderLines.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !city) {
      setError('Please fill in your name, phone number, and pickup city.');
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
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), city, items: orderLines, notes: notes.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Something went wrong. Please call or text us at (864) 590-6760 to place your order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-lg w-full" style={tnr}>
          <CheckCircle className="h-20 w-20 text-[#CC0000] mx-auto mb-5" />
          <h1 className="text-4xl md:text-5xl font-bold text-[#CC0000] mb-4">Order Received!</h1>
          <p className="text-2xl text-gray-700 mb-4 leading-relaxed">
            Thank you, <strong>{name}</strong>!<br />
            We received your order for pickup in <strong>{city}</strong>.
          </p>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            We will contact you at <strong>{phone}</strong> to confirm your order and share the pickup location and time.
          </p>
          <div className="bg-[#CC0000] text-white rounded-2xl p-6 mb-6">
            <p className="text-xl font-bold mb-1">Questions? Text or call us:</p>
            <p className="text-3xl font-bold">(864) 590-6760</p>
          </div>
          <p className="text-lg text-gray-500 italic leading-relaxed">
            ❤️ Thank you for supporting our small family business!<br />
            Fresh homemade European favorites made with love. 🇪🇺✨
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]" style={tnr}>

      {/* Page header */}
      <div className="bg-[#CC0000] text-white text-center py-7 px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Place a Pre-Order</h1>
        <p className="text-xl md:text-2xl text-white/85">Homemade European Specialties — Fresh Made to Order</p>
      </div>

      {/* Contact bar */}
      <div className="bg-white border-b-2 border-[#CC0000]/20 py-4 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 sm:gap-10 items-center justify-center">
          <div className="flex items-center gap-2.5 text-gray-700">
            <Phone className="h-5 w-5 text-[#CC0000] flex-shrink-0" />
            <span className="text-xl"><strong>Text or call:</strong> (864) 590-6760</span>
          </div>
          <div className="flex items-center gap-2.5 text-gray-700">
            <MapPin className="h-5 w-5 text-[#CC0000] flex-shrink-0" />
            <span className="text-xl">Pickup in <strong>NC &amp; SC</strong></span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Instructions */}
        <div className="bg-white border-2 border-[#CC0000]/25 rounded-2xl p-6 mb-8 text-center">
          <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
            Choose what you would like below, then fill in your<br className="hidden sm:block" />
            <strong>name</strong>, <strong>phone number</strong>, and <strong>pickup city</strong> at the bottom.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Menu items */}
          {MENU.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-5 shadow-sm">
              {/* Section header */}
              <div className="border-b-2 border-[#CC0000] pb-3 mb-4">
                <h2 className="text-2xl md:text-3xl font-bold text-[#CC0000] leading-tight">
                  {item.flag && <span className="mr-1">{item.flag}</span>}{item.emoji}{' '}
                  {item.name}
                </h2>
              </div>

              {item.flavors.length === 0 ? (
                /* No flavors — one row per size */
                <div className="divide-y divide-gray-100">
                  {item.sizes.map((size) => (
                    <div key={size.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xl font-bold text-gray-900">{size.label}</p>
                        <p className="text-lg text-[#CC0000] font-semibold">{size.priceNote}</p>
                      </div>
                      <QtyInput
                        value={getQty(item.id, size.label, '')}
                        onChange={(v) => setQty(item.id, size.label, '', v)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Has flavors */
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
                          <QtyInput
                            value={getQty(item.id, size.label, flavor)}
                            onChange={(v) => setQty(item.id, size.label, flavor, v)}
                          />
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
            <div className="bg-[#CC0000] text-white rounded-2xl p-6 mb-6 shadow-md">
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

          {/* Customer info */}
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-5 shadow-sm">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 border-b-2 border-[#CC0000] pb-3 mb-6">
              Your Information
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-xl font-bold text-gray-800 mb-2">
                  Your Name <span className="text-[#CC0000]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First and Last Name"
                  style={tnr}
                  className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xl font-bold text-gray-800 mb-2">
                  Phone Number <span className="text-[#CC0000]">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(000) 000-0000"
                  style={tnr}
                  className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] transition-colors"
                />
                <p className="text-lg text-gray-500 mt-1.5">We will text you to confirm your order and pickup details.</p>
              </div>

              <div>
                <label className="block text-xl font-bold text-gray-800 mb-2">
                  Pickup City <span className="text-[#CC0000]">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={tnr}
                  className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] bg-white transition-colors"
                >
                  <option value="">— Select your city —</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xl font-bold text-gray-800 mb-2">
                  Special Notes <span className="text-lg font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or questions..."
                  rows={3}
                  style={tnr}
                  className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#CC0000] resize-none transition-colors"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-xl px-5 py-4 mb-4 text-xl leading-snug">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#CC0000] hover:bg-[#AA0000] disabled:opacity-60 text-white text-2xl font-bold py-5 rounded-2xl transition-colors shadow-lg"
            style={tnr}
          >
            {submitting ? 'Sending Your Order...' : 'Submit Order'}
          </button>

          <p className="text-center text-xl text-gray-500 mt-6 italic leading-relaxed" style={tnr}>
            ❤️ Thank you for supporting our small family business!<br />
            Fresh homemade European favorites made with love. 🇪🇺✨
          </p>
        </form>
      </div>
    </div>
  );
}
